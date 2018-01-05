'use strict';

const mongoose = require('mongoose');

module.exports = function(formio) {
  // Define the available permissions for a submission.
  const available = [
    'read',
    'write',
    'admin'
  ];

  // Defines the permissions schema for submission permissions.
  return {
    _id: false,
    type: {
      type: String,
      enum: available,
      required: 'A permission type is required to associate an available permission with a Resource.'
    },
    resources: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'form'
    }
  };
};
