'use strict';
const _ = require('lodash');

module.exports = function(formio) {
  // Include the hook system.
  const hook = require('../util/hook')(formio);

  /**
   * The Schema for Roles.
   *
   * @type {exports.Schema}
   */
  const RoleSchema = hook.alter('roleSchema', new formio.mongoose.Schema({
    title: {
      type: String,
      required: true,
      index: true,
      validate: [
        {
          message: 'Role title must be unique.',
          async validator(value) {
            const search = hook.alter('roleSearch', {
              title: value,
              deleted: {$eq: null}
            }, this, value);

            // Ignore the id of the role, if this is an update.
            if (this._id) {
              search._id = {
                $ne: this._id
              };
            }

            // Search for roles that exist, with the given parameters.
            try {
              const result = await formio.mongoose.model('role').findOne(search).lean().exec();
              return !result;
            }
            catch (err) {
              return false;
            }
          }
        }
      ]
    },
    description: {
      type: String,
      default: ''
    },
    deleted: {
      type: Number,
      default: null
    },
    default: {
      type: Boolean,
      default: false
    },
    admin: {
      type: Boolean,
      default: false
    }
  }));

  const model = require('./BaseModel')({
    schema: RoleSchema
  });

  // Add machineName to the schema.
  model.schema.plugin(require('../plugins/machineName')('role', formio));

  // Set the default machine name.
  model.schema.machineName = function(document, done) {
    return hook.alter('roleMachineName', _.camelCase(document.title), document, done);
  };

  // Return the defined roles and permissions functions.
  return model;
};
