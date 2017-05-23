'use strict';

module.exports = function(schema, options) {
  // Add the created and modified params.
  schema.add({
    created: {
      type: Date,
      description: 'The date this resource was created.',
      'default': Date.now,
      __readonly: true
    },
    modified: {
      type: Date,
      description: 'The date this resource was modified.',
      __readonly: true
    }
  });

  // If we wish to make these an index.
  if (options && options.index) {
    schema.path('created').index(options.index);
    schema.path('modified').index(options.index);
  }

  // On pre-save, we will update the modified date.
  schema.pre('save', function(next) {
    this.modified = new Date();
    next();
  });
};
