'use strict';

const mongoose = require('mongoose');
const _ = require('lodash');
const debug = require('debug')('formio:models:form');

module.exports = (formio) => {
  const hook = require('../util/hook')(formio);
  const util = formio.util;
  /* eslint-disable no-useless-escape */
  const invalidRegex = /[^0-9a-zA-Z\-\/]|^\-|\-$|^\/|\/$/;
  const validKeyRegex = /^[A-Za-z_]+[A-Za-z0-9\-._]*$/g;
  const validShortcutRegex = /^([A-Z]|Enter|Esc)$/i;
  /* eslint-enable no-useless-escape */
  const componentKeys = (components) => {
    const keys = [];
    util.eachComponent(components, (component) => {
      if (!_.isUndefined(component.key) && !_.isNull(component.key)) {
        keys.push(component.key);
      }
    }, true);
    return _(keys);
  };

  const componentPaths = (components) => {
    const paths = [];
    util.eachComponent(components, (component, path) => {
      if (!_.isUndefined(component.key) && !_.isNull(component.key)) {
        paths.push(path);
      }
    }, true);
    return _(paths);
  };

  const componentShortcuts = (components) => {
    const shortcuts = [];
    util.eachComponent(components, (component, path) => {
      if (component.shortcut) {
        shortcuts.push(_.capitalize(component.shortcut));
      }
      if (component.values) {
        _.forEach(component.values, (value) => {
          const shortcut = _.get(value, 'shortcut');
          if (shortcut) {
            shortcuts.push(_.capitalize(shortcut));
          }
        });
      }
    }, true);
    return _(shortcuts);
  };

  const uniqueMessage = 'may only contain letters, numbers, hyphens, and forward slashes ' +
    '(but cannot start or end with a hyphen or forward slash)';
  const uniqueValidator = (property) => function(value, done) {
    const query = {deleted: {$eq: null}};
    query[property] = value;
    const search = hook.alter('formSearch', query, this, value);

    // Ignore the id if this is an update.
    if (this._id) {
      search._id = {$ne: this._id};
    }

    mongoose.model('form').findOne(search).exec((err, result) => {
      if (err) {
        debug(err);
        return done(false);
      }
      if (result) {
        debug(result);
        return done(false);
      }

      done(true);
    });
  };

  const keyError = 'A component on this form has an invalid or missing API key. Keys must only contain alphanumeric ' +
    'characters or hyphens, and must start with a letter. Please check each component\'s API Property Name.';

  const shortcutError = 'A component on this form has an invalid shortcut. Shortcuts must only contain alphabetic ' +
    'characters or must be equal to \'Enter\' or \'Esc\'';

  const model = require('./BaseModel')({
    schema: new mongoose.Schema({
      title: {
        type: String,
        description: 'The title for the form.',
        required: true
      },
      name: {
        type: String,
        description: 'The machine name for this form.',
        required: true,
        validate: [
          {
            message: 'The Name ' + uniqueMessage,
            validator: (value) => !invalidRegex.test(value)
          },
          {
            isAsync: true,
            message: 'The Name must be unique per Project.',
            validator: uniqueValidator('name')
          }
        ]
      },
      path: {
        type: String,
        description: 'The path for this resource.',
        index: true,
        required: true,
        lowercase: true,
        trim: true,
        validate: [
          {
            message: 'The Path ' + uniqueMessage,
            validator: (value) => !invalidRegex.test(value)
          },
          {
            message: 'Path cannot end in `submission` or `action`',
            validator: (path) => !path.match(/(submission|action)\/?$/)
          },
          {
            isAsync: true,
            message: 'The Path must be unique per Project.',
            validator: uniqueValidator('path')
          }
        ]
      },
      type: {
        type: String,
        enum: ['form', 'resource'],
        required: true,
        default: 'form',
        description: 'The form type.',
        index: true
      },
      display: {
        type: String,
        description: 'The display method for this form'
      },
      action: {
        type: String,
        description: 'A custom action URL to submit the data to.'
      },
      tags: {
        type: [String],
        index: true
      },
      deleted: {
        type: Number,
        default: null
      },
      access: [formio.schemas.PermissionSchema],
      submissionAccess: [formio.schemas.PermissionSchema],
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'submission',
        index: true,
        default: null
      },
      components: {
        type: [mongoose.Schema.Types.Mixed],
        description: 'An array of components within the form.',
        validate: [
          {
            message: keyError,
            validator: (components) => componentKeys(components).every((key) => key.match(validKeyRegex))
          },
          {
            message: shortcutError,
            validator: (components) => componentShortcuts(components)
              .every((shortcut) => shortcut.match(validShortcutRegex))
          },
          {
            isAsync: true,
            validator: (components, valid) => {
              const paths = componentPaths(components);
              const msg = 'Component keys must be unique: ';
              const uniq = paths.uniq();
              const diff = paths.filter((value, index, collection) => _.includes(collection, value, index + 1));

              if (_.isEqual(paths.value(), uniq.value())) {
                return valid(true);
              }

              return valid(false, (msg + diff.value().join(', ')));
            }
          },
          {
            isAsync: true,
            validator: (components, valid) => {
              const shortcuts = componentShortcuts(components);
              const msg = 'Component shortcuts must be unique: ';
              const uniq = shortcuts.uniq();
              const diff = shortcuts.filter((value, index, collection) => _.includes(collection, value, index + 1));

              if (_.isEqual(shortcuts.value(), uniq.value())) {
                return valid(true);
              }

              return valid(false, (msg + diff.value().join(', ')));
            }
          }
        ]
      },
      settings: {
        type: mongoose.Schema.Types.Mixed,
        description: 'Custom form settings object.'
      }
    })
  });

  // Add a partial index for deleted forms.
  model.schema.index({
    deleted: 1
  }, {
    partialFilterExpression: {deleted: {$eq: null}}
  });

  // Add machineName to the schema.
  model.schema.plugin(require('../plugins/machineName')('form'));

  // Set the default machine name.
  model.schema.machineName = (document, done) => {
    hook.alter('formMachineName', document.name, document, done);
  };

  return model;
};
