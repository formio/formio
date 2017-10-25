'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');

module.exports = function(router) {
  // Implement our hook system.
  let hook = require('../util/hook')(router.formio);

  // Define our schemas.
  let models = hook.alter('models', {
    action: require('./Action')(router.formio),
    form: require('./Form')(router.formio),
    submission: require('./Submission')(router.formio),
    role: require('./Role')(router.formio)
  });

  let defs = {
    schemas: {},
    models: {},
    specs: {}
  };

  _.each(models, (model, name) => {
    mongoose.model(name, model.schema);
    defs.models[name] = model;
    defs.schemas[name] = hook.alter(name + 'Schema', model.schema, false);
    defs.specs[name] = model.spec;
  });

  // Export the model definitions.
  return defs;
};
