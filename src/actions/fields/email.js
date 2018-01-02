'use strict';

module.exports = function(formio) {
  const hook = require('../../util/hook')(formio);
  return {
    beforePut(component, path, validation, req, res, next) {
      // Only perform before validation has occurred.
      if (validation) {
        return next();
      }
      if (!hook.invoke('validateEmail', component, path, req, res, next)) {
        return next();
      }
    },

    beforePost(component, path, validation, req, res, next) {
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
