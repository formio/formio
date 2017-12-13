'use strict';

/**
 * Middleware to load a full form if needed.
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports = function(router) {
  return function formLoader(req, res, next) {
    // Only process on GET request, and if they provide full query.
    if (
      req.method !== 'GET' ||
      !req.query.full ||
      !res.resource ||
      !res.resource.item
    ) {
      return next();
    }

    // Load all subforms recursively.
    router.formio.cache.loadSubForms(res.resource.item, req, next);
  };
};
