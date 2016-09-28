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
    // Only perform before validation.
    if (validation) {
      return next();
    }
    if (!_.has(req.body, 'data.' + path)) {
      return next();
    }
    var item = _.get(req.body, 'data.' + path);

    // Coerce all unique string fields to be lowercase.
    if (typeof item === 'string') {
      _.set(req.body, 'data.' + path, (_.get(req.body, 'data.' + path)).toString().toLowerCase());
    }

    // Coerce all unique string fields in an array to be lowercase.
    if (item instanceof Array && (item.length > 0) && (typeof item[0] === 'string')) {
      _.map(item, function(element) {
        return element.toString().toLowerCase();
      });

      // Coerce all unique string fields to be lowercase.
      _.set(req.body, 'data.' + path, item);
    }

    return next();
  };

  return {
    beforePut: pathToLower,
    beforePost: pathToLower
  };
};
