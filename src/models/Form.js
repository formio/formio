'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var debug = require('debug')('formio:models:form');

module.exports = function(formio) {
  var hook = require('../util/hook')(formio);
  var util = formio.util;
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
        required: true
      },
      path: {
        type: String,
        description: 'The path for this resource.',
        index: true,
        required: true,
        lowercase: true,
        trim: true
      },
      type: {
        type: String,
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
        description: 'An array of components within the form.'
      },
      settings: {
        type: mongoose.Schema.Types.Mixed,
        description: 'Custom form settings object.'
      }
    })
  });

  // Validate the name.
  var invalidRegex = /[^0-9a-zA-Z\-\/]|^\-|\-$|^\/|\/$/;
  model.schema.path('name').validate(function(name, done) {
    return done(!invalidRegex.test(name));
  }, 'The Name may only contain letters, numbers, hyphens, and forward slashes (but cannot start or end with a hyphen '
      + 'or forward slash)');

  // Validate the uniqueness of the value given for the name.
  model.schema.path('name').validate(function(value, done) {
    var search = hook.alter('formSearch', {
      name: value,
      deleted: {$eq: null}
    }, this, value);

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
  }, 'The Name must be unique per Project.');

  // Validate the path.
  model.schema.path('path').validate(function(value, done) {
    return done(!invalidRegex.test(value));
  }, 'The Path may only contain letters, numbers, hyphens, and forward slashes (but cannot start or end with a hyphen '
      + 'or forward slash)'
  );

  // Validate the uniqueness of the value given for the name.
  model.schema.path('path').validate(function(value, done) {
    var search = hook.alter('formSearch', {
      path: value,
      deleted: {$eq: null}
    }, this, value);

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
  }, 'The Path must be unique per Project.');

  // Validate component keys are unique
  model.schema.path('components').validate(function(components, valid) {
    var keys = [];
    util.eachComponent(components, function(component) {
      keys.push(component.key);
    }, true);

    var msg = 'Component keys must be unique: ';
    var uniq = _.unique(keys);
    var diff = _.filter(keys, function(value, index, collection) {
      return _.includes(collection, value, index + 1);
    });

    if (_.isEqual(keys, uniq)) {
      return valid(true);
    }

    return valid(false, (msg + (diff).join(', ')));
  });

  // Validate component keys have valid characters
  model.schema.path('components').validate(function(components) {
    var validRegex = /^[A-Za-z]+[A-Za-z0-9\-.]*$/g;
    var keys = [];
    util.eachComponent(components, function(component) {
      keys.push(component.key);
    }, true);

    return _(keys).filter(function(key) {
      return !_.isUndefined(key);
    }).all(function(key) {
      return key.match(validRegex);
    });
  }, 'A component on this form has an invalid or missing API key. Keys must only contain alphanumeric characters or '
      + 'hyphens, and must start with a letter. Please check each component\'s API Property Name.'
  );

  model.schema.path('path').validate(function(path) {
    return !path.match(/(submission|action)\/?$/);
  }, 'Path cannot end in `submission` or `action`');

  // Add machineName to the schema.
  model.schema.plugin(require('../plugins/machineName'));

  // Set the default machine name.
  model.schema.machineName = function(document, done) {
    hook.alter('formMachineName', document.name, document, done);
  };

  return model;
};
