'use strict';

module.exports = function(formio) {
  var hook = require('../../util/hook')(formio);
  return {
    beforePut: function(component, path, validation, req, res, next) {
      // Only perform before validation has occurred.
      if (validation) {
        return next();
      }
      if (!hook.invoke('validateEmail', component, path, req, res, next)) {
        return next();
      }
    },

    beforePost: function(component, path, validation, req, res, next) {
      // Only perform before validation has occurred.
      if (validation) {
        return next();
      }
      if (!hook.invoke('validateEmail', component, path, req, res, next)) {
        return next();
      }
    }
  };
};
