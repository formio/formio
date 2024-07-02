'use strict';

const util = require('../util/util');
const _ = require('lodash');

/**
 * Middleware function to filter protected fields from a submission response.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function(router) {
  return function(action, getForm) {
    return async function(req, res, next) {
      if (
        !_.get(res, 'resource.item') ||
        router.formio.hook.alter('rawDataAccess', req, next, util.skipHookIfNotExists)
      ) {
        return next();
      }
    try {
        const form = await router.formio.cache.loadForm(req, null, getForm(req));
        util.removeProtectedFields(form, action, res.resource.item, req.doNotMinify || req.full);
        return next();
    }
    catch (err) {
      return next(err);
    }
    };
  };
};
