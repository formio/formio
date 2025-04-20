'use strict';

module.exports = (schema) => {
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
      index: true,
      description: 'The date this resource was modified.',
      __readonly: true,
    },
  });

  // On pre-save, we will update the modified date if does not have allowTimestampOverride.
  schema.pre('save', function(next, options) {
    const override = options?.allowTimestampOverride;
    this.modified = override && options.modified ? new Date(options.modified) : new Date();
    this.created = override && options.created ? new Date(options.created) : this.created;

    next();
  });
};
