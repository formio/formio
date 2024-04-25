'use strict';

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

      /* If the request is for a bundle and a formId is provided in the query parameters, 
       use the formId from the query. Otherwise, use the formId obtained from the getForm function. */

      const formId = req.isBundle && req.query.formId ? req.query.formId : getForm(req);

      router.formio.cache.loadForm(req, null,formId , function(err, form) {
        if (err) {
          return next(err);
        }

        if(req.isBundle){
          req.bundledForm= form
        }
        
        util.removeProtectedFields(form, action, res.resource.item, req.doNotMinify || req.query.full, req.token);
        next();
      });
    };
  };
};
