'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');

module.exports = function(router) {
  // Implement our hook system.
  let hook = require('../util/hook')(router.formio);

  // Define our schemas.
  let schemas = hook.alter('models', {
    action: require('./Action')(router.formio),
    form: require('./Form')(router.formio),
    submission: require('./Submission')(router.formio),
    role: require('./Role')(router.formio)
  });

  let defs = {
    classes: {},
    schemas: {},
    models: {},
    specs: {}
  };

  _.each(schemas, (schema, name) => {
    defs.classes[name] = schema;
    defs.schemas[name] = hook.alter(name + 'Schema', schema.schema, false);
    defs.models[name] = mongoose.model(name, schema.schema);
    defs.specs[name] = schema.spec;
  });

  // Export the model definitions.
  return defs;
};
