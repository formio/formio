var mongoose = require('mongoose');

module.exports = exports = function(schema, options) {
  // Add the machineName param.
  schema.add({
    machineName: {
      type: String,
      description: 'A unique, exportable name.',
      unique: true,
      __readonly: true
    }
  });

  var incrementAndSave = function(document, options, cb) {
    var parts = document.machineName.split(/(\d+)/).filter(Boolean);
    var name = parts[0];
    var number = parts[1] || 0;
    number++;
    document.machineName = name + number;
    document.markModified('machineName');
    return document.save(cb);
  };

  schema.pre('save', function(next) {
    if (this.machineName || typeof schema.machineName !== 'function') {
      return next();
    }
    schema.machineName(this, function(err, machineName) {
      if (err) {
        return next(err);
      }

      this.machineName = machineName;
      next();
    }.bind(this));
  });

  schema.methods.save = function(options, fn) {
    if ('function' == typeof options) {
      fn = options;
      options = undefined;
    }

    if (!options) {
      options = {
        __noPromise: true
      };
    }
    var self = this;
    mongoose.Model.prototype.save.call(self, options, function(e, model, num) {
      if (e && (e.code === 11000  || e.code === 11001) && !!~e.errmsg.indexOf(self['machineName'])) {
        incrementAndSave(self, options, fn);
      }
      else {
        fn(e,model,num);
      }
    });
  };
};
