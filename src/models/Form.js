'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var debug = require('debug')('formio:models:form');

module.exports = function(formio) {
  var hook = require('../util/hook')(formio);
  var util = formio.util;
  var invalidRegex = /[^0-9a-zA-Z\-\/]|^\-|\-$|^\/|\/$/;
  var componentKeys = function(components) {
    var keys = [];
    util.eachComponent(components, function(component) {
      if (!_.isUndefined(component.key) && !_.isNull(component.key)) {
        keys.push(component.key);
      }
    }, true);
    return _(keys);
  };

  var uniqueMessage = 'may only contain letters, numbers, hyphens, and forward slashes ';
  uniqueMessage += '(but cannot start or end with a hyphen or forward slash)';
  var uniqueValidator = function(property) {
    return function(value, done) {
      var query = {deleted: {$eq: null}};
      query[property] = value;
      var search = hook.alter('formSearch', query, this, value);

      // Ignore the id if this is an update.
      if (this._id) {
        search._id = {$ne: this._id};
      }

      mongoose.model('form').findOne(search).exec(function(err, result) {
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
  };

  var model = require('./BaseModel')({
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
            validator: function(value) {
              return !invalidRegex.test(value);
            }
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
            validator: function(value) {
              return !invalidRegex.test(value);
            }
          },
          {
            message: 'Path cannot end in `submission` or `action`',
            validator: function(path) {
              return !path.match(/(submission|action)\/?$/);
            }
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
            message: 'A component on this form has an invalid or missing API key. Keys must only contain alphanumeric characters or hyphens, and must start with a letter. Please check each component\'s API Property Name.',
            validator: function(components) {
              var validRegex = /^[A-Za-z]+[A-Za-z0-9\-.]*$/g;
              return componentKeys(components).every(function(key) {
                return key.match(validRegex);
              });
            }
          },
          {
            isAsync: true,
            validator: function(components, valid) {
              var keys = componentKeys(components);
              var msg = 'Component keys must be unique: ';
              var uniq = keys.uniq();
              var diff = keys.filter(function(value, index, collection) {
                return _.includes(collection, value, index + 1);
              });

              if (_.isEqual(keys.value(), uniq.value())) {
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

  // Add machineName to the schema.
  model.schema.plugin(require('../plugins/machineName'));

  // Set the default machine name.
  model.schema.machineName = function(document, done) {
    hook.alter('formMachineName', document.name, document, done);
  };

  return model;
};
