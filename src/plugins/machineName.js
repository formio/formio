'use strict';

var mongoose = require('mongoose');

module.exports = (modelName) => {
  return (schema, options) => {
    // Add the machineName param.
    schema.add({
      machineName: {
        type: String,
        description: 'A unique, exportable name.',
        unique: true,
        __readonly: true
      }
    });

    var getNextMachineName = function(machineName, records) {
      if (!records || !records.length) {
        return machineName;
      }
      var i = 0;
      records.forEach((record) => {
        var parts = record.machineName.split(/(\d+)/).filter(Boolean);
        var number = parts[1] || 0;
        if (number > i) {
          i = number;
        }
      });
      i++;
      return machineName + i;
    };

    var ensureUnique = function(doc, machineName, next) {
      if (doc._id && doc.machineName) {
        return next();
      }
      // Ensure this name is unique.
      mongoose.model(modelName).find({
        machineName: {"$regex": machineName}
      }, (err, records) => {
        doc.machineName = getNextMachineName(machineName, records);
        next();
      });
    };

    schema.pre('save', function(next) {
      if (typeof schema.machineName !== 'function') {
        return ensureUnique(this, this.machineName, next);
      }
      schema.machineName(this, (err, machineName) => {
        if (err) {
          return next(err);
        }

        ensureUnique(this, machineName, next);
      });
    });
  };
};
