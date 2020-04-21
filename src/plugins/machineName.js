'use strict';

const util = require('../util/util');

module.exports = (modelName, formio) => {
  return (schema, options) => {
    // Add the machineName param.
    schema.add({
      machineName: {
        type: String,
        description: 'A unique, exportable name.',
        __readonly: true
      }
    });

    // Add a compound index for both machine name and the deleted flag.
    schema.index({machineName: 1}, {unique: true, partialFilterExpression: {deleted: {$eq: null}}});

    // Set the machine name for a record.
    schema.pre('save', function(next) {
      // Do not alter an already established machine name.
      if (this._id && this.machineName) {
        return next();
      }
      const model = formio.mongoose.model(modelName);
      if (typeof schema.machineName !== 'function') {
        return util.uniqueMachineName(this, model, next);
      }
      schema.machineName(this, (err, machineName) => {
        if (err) {
          return next(err);
        }

        this.machineName = machineName;
        util.uniqueMachineName(this, model, next);
      });
    });
  };
};
