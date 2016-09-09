'use strict';

var _ = require('lodash');

module.exports = function(formio) {
  /**
   * Lowercase all contents at the given path for unique fields.
   *
   * @param component
   * @param path
   * @param validation
   * @param req
   * @param res
   * @param next
   *
   * @returns {*}
   */
  var pathToLower = function(component, path, validation, req, res, next) {
    if (!_.has(req.body, 'data.' + path)) {
      return next();
    }

    // Coerce all unique fields to be lowercase.
    _.set(req.body, 'data.' + path, (_.get(req.body, 'data.' + path)).toString().toLowerCase());
    return next();
  };

  return {
    beforePut: pathToLower,
    beforePost: pathToLower
  };
};
