'use strict';
const _ = require('lodash');

module.exports = formio => {
  const before = function(component, path, validation, req, res, next) {
    // Only perform before validation has occurred.
    if (validation) {
      if (!req.body.data) {
        return next();
      }
      const value = _.get(req.body, `data.${path}`);

      // Coerse the value into a new Date.
      if (value) {
        _.set(req.body, `data.${path}`, new Date(value));
      }
      return next();
    }
    next();
  };

  return {
    beforePut: before,
    beforePost: before
  };
};
