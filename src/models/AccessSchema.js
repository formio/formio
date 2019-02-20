'use strict';

module.exports = function(formio) {
  // Define the available permissions for a submission.
  const available = [
    'read',
    'write',
    'admin'
  ];

  // Defines the permissions schema for submission permissions.
  return new formio.mongoose.Schema({
    type: {
      type: String,
      enum: available,
      required: 'A permission type is required to associate an available permission with a Resource.'
    },
    resources: {
      type: [formio.mongoose.Schema.Types.ObjectId],
      ref: 'form'
    }
  }, {_id: false});
};
