'use strict';

module.exports = (schema, options = {index: {created: true, modified: true}}) => {
  const created = {
    type: Date,
    index: true,
    description: 'The date this resource was created.',
    default: Date.now,
    __readonly: true,
  };

  // Add the created and modified params.
  schema.add({
    created,
    modified: {
      type: Date,
      index: options?.index?.modified === undefined ? true : !!options?.index?.modified,
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
