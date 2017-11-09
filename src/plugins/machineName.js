'use strict';

var mongoose = require('mongoose');
let util = require('../util/util');

module.exports = (modelName) => {
  return (schema, options) => {
    // Add the machineName param.
    schema.add({
      machineName: {
        type: String,
        description: 'A unique, exportable name.',
        __readonly: true
      }
    });

    schema.pre('save', function(next) {
      let model = mongoose.model(modelName);
      if (typeof schema.machineName !== 'function') {
        // Do not alter an already established machine name.
        if (this._id && this.machineName) {
          return next();
        }

        return util.uniqueMachineName(this, model, next);
      }
      schema.machineName(this, (err, machineName) => {
        if (err) {
          return next(err);
        }

        // Do not alter an already established machine name.
        if (this._id && this.machineName) {
          return next();
        }

        this.machineName = machineName;
        util.uniqueMachineName(this, model, next);
      });
    });
  };
};
