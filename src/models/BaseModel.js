'use strict';

module.exports = (model) => {
  const timestamps = require('../plugins/timestamps');

  // Add timestamps to the schema.
  model.schema.plugin(timestamps, {index: true});

  // Disable removal of empty objects
  model.schema.set('minimize', false);

  // Export the model.
  return model;
};
