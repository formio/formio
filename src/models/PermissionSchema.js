'use strict';

var mongoose = require('mongoose');

// Define the available permissions for a form.
var available = [
  'create_all',
  'read_all',
  'update_all',
  'delete_all',
  'create_own',
  'read_own',
  'update_own',
  'delete_own'
];

// Defines the permissions schema for form permissions.
var permissionSchema = {
  _id: false,
  type: {
    type: String,
    enum: available,
    required: 'A permission type is required to associate an available permission with a given role.'
  },
  roles: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'role'
  }
};

module.exports = permissionSchema;
