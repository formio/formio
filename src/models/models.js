'use strict';

var _ = require('lodash');

module.exports = function(router) {

  // Implement our hook system.
  var hook = require('../util/hook')(router.formio);

  // Define our models.
  var models = hook.alter('models', {
    form: require('./Form')(router.formio),
    submission: require('./Submission')(router.formio)
  });

  // Export the models and specs for each model.
  return {
    schemas: _.mapValues(models, function(model) {
      return model.schema;
    }),
    specs: _.mapValues(models, function(model) {
      return model.spec;
    })
  };
};
