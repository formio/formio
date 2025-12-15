'use strict';
const _ = require('lodash');

/**
 * Middleware to load a full form if needed.
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports = function (router) {
  const hook = require('../util/hook')(router.formio);
  return async function formLoader(req, res, next) {
    // Only process GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const rMethod = _.get(req, '__rMethod', 'get');
    const isArray = Array.isArray(res.resource.item);
    
    if (!req.full && (isArray || rMethod !== 'get')) {
      return next();
    }

    // Process array of forms when full=true
    if (req.full && isArray) {
      for (let i = 0; i < res.resource.item.length; i++) {
        await hook.alter('formResponse', res.resource.item[i], req);
        await router.formio.cache.loadSubForms(res.resource.item[i], req);
      }
      return next();
    }

    // Process single form
    if (!res.resource || !res.resource.item) {
      return next();
    }

    // Allow modules to hook into the form loader middleware
    await hook.alter('formResponse', res.resource.item, req);
    
    // Load all subforms recursively if full=true
    if (req.full) {
      await router.formio.cache.loadSubForms(res.resource.item, req);
    }
    
    return next();
  };
};
