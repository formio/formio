"use strict";

/**
 * Middleware function to check the current form is bundle or not.
 *
 * @param router
 *
 * @returns {Function}
 */
module.exports = function (router) {
  return function (req, res, next) {
    router.formio.cache.loadForm(
      req,
      null,
      router.formio.cache.getCurrentFormId(req),
      function (err, form) {
        if (err) {
          return next(err);
        }
        req.isBundle = form.isBundle;
        next();
      }
    );
  };
};
