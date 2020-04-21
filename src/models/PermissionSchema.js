'use strict';

module.exports = function(formio) {
  const hook = require('../util/hook')(formio);

  // Defines the permissions schema for form permissions.
  return new formio.mongoose.Schema(hook.alter('permissionSchema', {
    type: {
      type: String,
      enum: [
        'create_all',
        'read_all',
        'update_all',
        'delete_all',
        'create_own',
        'read_own',
        'update_own',
        'delete_own',
        'self'
      ],
      required: 'A permission type is required to associate an available permission with a given role.'
    },
    roles: {
      type: [formio.mongoose.Schema.Types.ObjectId],
      ref: 'role'
    }
  }), {_id: false});
};
