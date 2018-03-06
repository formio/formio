'use strict';

const mongoose = require('mongoose');
const utils = require('../util/util');

// Defines what each external ID should be.
const ExternalIdSchema = mongoose.Schema({
  type: String,
  resource: String,
  id: String
});

// Add timestamps to the external ids.
ExternalIdSchema.plugin(require('../plugins/timestamps'));

// Export the submission model.
module.exports = function(formio) {
  const hook = require('../util/hook')(formio);

  const model = require('./BaseModel')({
    schema: new mongoose.Schema(hook.alter('submissionSchema', {
      form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'form',
        index: true,
        required: true
      },
      owner: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'submission',
        index: true,
        default: null,
        set: owner => {
          // Attempt to convert to objectId.
          return formio.util.ObjectId(owner);
        },
        get: owner => {
          return owner ? owner.toString() : owner;
        }
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

      // The access associated with this submission.
      // Useful for complex custom permissions.
      access: {
        type: [formio.schemas.AccessSchema],
        index: true
      },

      // An array of external Id's.
      externalIds: [ExternalIdSchema],

      // Configurable meta data associated with a submission.
      metadata: {
          type: mongoose.Schema.Types.Mixed,
          description: 'Configurable metadata.'
      },

      // The data associated with this submission.
      data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      }
    }))
  });

  // Ensure that all _id's within the data are ObjectId's
  model.schema.pre('save', function(next) {
    utils.ensureIds(this.data);
    next();
  });

  // Add a partial index for deleted submissions.
  model.schema.index({
    deleted: 1
  }, {
    partialFilterExpression: {deleted: {$eq: null}}
  });

  return model;
};
