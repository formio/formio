'use strict';

var mongoose = require('mongoose');

// Defines what each external ID should be.
var ExternalIdSchema = mongoose.Schema({
  type: String,
  id: String
});

// Add timestamps to the external ids.
ExternalIdSchema.plugin(require('../plugins/timestamps'));

// Export the submission model.
module.exports = function(formio) {
  return require('./BaseModel')({
    schema: new mongoose.Schema({
      form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'form',
        index: true,
        required: true
      },
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'submission',
        index: true,
        default: null
      },
      deleted: {
        type: Number,
        default: null
      },

      // The roles associated with this submission, if any.
      // Useful for complex custom resources.
      roles: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'role',
        index: true
      },

      // An array of external Id's.
      externalIds: [ExternalIdSchema],

      // The data associated with this submission.
      data: {
        type: mongoose.Schema.Types.Mixed
      }
    })
  });
};
