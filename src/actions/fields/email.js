'use strict';

module.exports = function(formio) {
  var hook = require('../../util/hook')(formio);
  return {
    beforePut: function(component, path, validation, req, res, next) {
      if (!hook.invoke('validateEmail', component, req, res, next)) {
        return next();
      }
    },

    beforePost: function(component, path, validation, req, res, next) {
      if (!hook.invoke('validateEmail', component, req, res, next)) {
        return next();
      }
    }
  };
};
