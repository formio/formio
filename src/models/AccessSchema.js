'use strict';

module.exports = function(formio) {
  // Define the available permissions for a submission.
  const available = [
    'read',
    'create',
    'update',
    'delete',
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
      type: [formio.mongoose.Schema.Types.Mixed],
      ref: 'form',
      set(resources) {
        // Attempt to convert to objectId.
        return resources.map(formio.util.ObjectId);
      },
      get(resources) {
        return Array.isArray(resources)
          ? resources.map((resource) => resource.toString())
          : resources;
      }
    }
  }, {_id: false});
};
