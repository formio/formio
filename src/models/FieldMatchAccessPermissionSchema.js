'use strict';

module.exports = function(formio) {
  const hook = require('../util/hook')(formio);
  const typeError = 'Value does not match a selected type';

  // Defines the permissions schema for field match access form's permissions.
  return new formio.mongoose.Schema(hook.alter('fieldMatchAccessPermissionSchema', {
    formFieldPath: {
      type: String,
      required: function() {
        return (typeof this.formFieldPath === 'string') ? false : true;
      }
    },
    value: {
      type: String,
      required: function() {
        return (typeof this.value === 'string') ? false : true;
      }
    },
    operator: {
      type: String,
      enum: ['$eq', '$lt', '$gt', '$lte', '$gte', '$in'],
      default: '$eq'
    },
    valueType: {
      type: String,
      enum: ['string', 'number', 'boolean', '[string]', '[number]'],
      required: function() {
        return (typeof this.valueType === 'string') ? false : true;
      },
      default: 'string',
      validate: [
        {
          validator: function(type) {
            switch (type) {
              case 'number':
                return isFinite(Number(this.value));
              case 'boolean':
                return (this.value === 'true' || this.value === 'false');
              case '[number]':
                return this.value.replace(/(^,)|(,$)/g, '')
                           .split(',')
                           .map(val => Number(val))
                           .every(val => isFinite(val));
            }
          },
          message: typeError
        }
      ]
    },
    roles: {
      type: [formio.mongoose.Schema.Types.ObjectId],
      ref: 'role',
    }
  }), {_id: false});
};
