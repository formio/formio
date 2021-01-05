'use strict';

module.exports = (schema, options = {}) => {
  const created = {
    type: Date,
    index: true,
    description: 'The date this resource was created.',
    default: Date.now,
    __readonly: true,
  };

  if (options.expires) {
    created.expires = options.expires;
  }

  // Add the created and modified params.
  schema.add({
    created,
    modified: {
      type: Date,
      index: true,
      description: 'The date this resource was modified.',
      __readonly: true,
    },
  });

  // On pre-save, we will update the modified date.
  schema.pre('save', function(next) {
    this.modified = new Date();
    next();
  });
};
