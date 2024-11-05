'use strict';

const Utils = require('../util/util');

/**
 * Middleware function to coerce filter queries for a submission Index
 * into the right type for that field. Converts queries for Number
 * components into Numbers, and Checkbox into booleans.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function(router) {
    return async function(req, res, next) {
      // Skip if not an Index request
      if (req.method !== 'GET' || req.submissionId) {
        return next();
      }
      try {
        const currentForm = await router.formio.cache.loadCurrentForm(req);
        Utils.coerceQueryTypes(req.query, currentForm, 'data.');
        return next();
      }
      catch (err) {
        return next(err);
      }
    };
};
