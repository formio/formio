'use strict';

const utils = require('../util/util');

// Export the submission model.
module.exports = function(formio) {
  // Defines what each external ID should be.
  const ExternalIdSchema = formio.mongoose.Schema({
    type: String,
    resource: String,
    id: String
  });

  // Add timestamps to the external ids.
  ExternalIdSchema.plugin(require('../plugins/timestamps'));

  const hook = require('../util/hook')(formio);

  const model = require('./BaseModel')({
    schema: new formio.mongoose.Schema(hook.alter('submissionSchema', {
      form: {
        type: formio.mongoose.Schema.Types.ObjectId,
        ref: 'form',
        index: true,
        required: true
      },
      owner: {
        type: formio.mongoose.Schema.Types.Mixed,
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
        type: [formio.mongoose.Schema.Types.ObjectId],
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
          type: formio.mongoose.Schema.Types.Mixed,
          description: 'Configurable metadata.'
      },

      // The data associated with this submission.
      data: {
        type: formio.mongoose.Schema.Types.Mixed,
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

  // Add a "recommmended" combined index.
  model.schema.index({
    form: 1,
    deleted: 1,
    created: -1
  });

  return model;
};
