'use strict';

var mongoose = require('mongoose');

module.exports = function(model) {

  // Add timestamps to the schema.
  model.schema.plugin(require('../plugins/timestamps'));

  // Disable removal of empty objects
  model.schema.set('minimize', false);

  // Export the model.
  return model;
};
