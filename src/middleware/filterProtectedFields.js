'use strict';

var debug = require('debug')('formio:middleware:filterProtectedFields');
var util = require('../util/util');

/**
 * Middleware function to filter protected fields from a submission response.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function(router) {
  return function(action) {
    return function(req, res, next) {
      if (!res || !res.resource || !res.resource.item) {
        return next();
      }

      router.formio.cache.loadCurrentForm(req, function(err, currentForm) {
        if (err) {
          return next(err);
        }

        util.removeProtectedFields(currentForm, action, res.resource.item);
        debug(res.resource.item);
        next();
      });
    };
  };
};
