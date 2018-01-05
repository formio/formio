'use strict';

const debug = require('debug')('formio:middleware:filterProtectedFields');
const util = require('../util/util');

/**
 * Middleware function to filter protected fields from a submission response.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function(router) {
  return function(action, getForm) {
    return function(req, res, next) {
      if (!res || !res.resource || !res.resource.item) {
        return next();
      }

      router.formio.cache.loadForm(req, null, getForm(req), function(err, form) {
        if (err) {
          return next(err);
        }

        util.removeProtectedFields(form, action, res.resource.item);
        debug(res.resource.item);
        next();
      });
    };
  };
};
