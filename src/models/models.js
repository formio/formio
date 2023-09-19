'use strict';

const _ = require('lodash');

module.exports = (router) => {
  // Implement our hook system.
  const hook = require('../util/hook')(router.formio);

  // Define our schemas.
  const models = hook.alter('models', {
    action: require('./Action')(router.formio),
    form: require('./Form')(router.formio),
    role: require('./Role')(router.formio),
    schema: require('./Schema')(router.formio),
    submission: require('./Submission')(router.formio),
    token: require('./Token')(router.formio),
  });

  const defs = {
    schemas: {},
    models: {},
    specs: {},
  };

  _.each(models, (model, name) => {
    router.formio.mongoose.model(name, model.schema);
    defs.models[name] = model;
    defs.schemas[name] = hook.alter(`${name}Schema`, model.schema, false);
    defs.specs[name] = model.spec;
  });

  // Export the model definitions.
  return defs;
};
