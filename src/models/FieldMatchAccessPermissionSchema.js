'use strict';

module.exports = function(formio) {
  const hook = require('../util/hook')(formio);

  // Defines the permissions schema for field match access form's permissions.
  return new formio.mongoose.Schema(hook.alter('fieldMatchAccessPermissionSchema', {
    formFieldPath: {
      type: String,
      required: true
    },
    valueOrPath: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      enum: ['$eq', '$lt', '$gt', '$lte', '$gte', '$in'],
      default: '$eq'
    },
    valueType: {
      type: String,
      enum: ['value', 'userFieldPath'],
      required: true
    },
    roles: {
      type: [formio.mongoose.Schema.Types.ObjectId],
      ref: 'role'
    }
  }), {_id: false});
};
