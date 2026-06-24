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
        type: [formio.mongoose.Schema.Types.Mixed],
        ref: 'role',
        index: true,
        set(roles) {
          // Attempt to convert to objectId.
          return roles.map(formio.util.ObjectId);
        },
        get(roles) {
          return Array.isArray(roles)
            ? roles.map((role) => role.toString())
            : roles;
        }
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

  model.schema.index(hook.alter('schemaIndex', {deleted: 1}));
  model.schema.index(hook.alter('schemaIndex', {form: 1, deleted: 1}));
  model.schema.index(hook.alter('schemaIndex', {form: 1, deleted: 1, created: -1}));

  // Ensure that all _id's within the data are ObjectId's
  model.schema.pre('save', function(next) {
    utils.ensureIds(this.data);
    next();
  });

  model.schema.index({
    deleted: 1
  });

  // Add a "recommmended" combined index.
  model.schema.index({
    form: 1,
    deleted: 1,
    created: -1
  });

  return model;
};
