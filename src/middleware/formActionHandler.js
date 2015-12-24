'use strict';

/**
 * @TODO: Add description.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  return function(handler) {
    return function formActionHandler(req, res, next) {
      req.disableDefaultAction = true;
      router.formio.actions.execute(handler, 'form', req, res, next);
    };
  };
};
