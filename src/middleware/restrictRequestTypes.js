'use strict';

module.exports = function(router) {
  /**
   * Middleware to restrict incoming requests by method.
   *
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  return function(req, res, next) {
    if (
      req.method === 'OPTIONS'
      || req.method === 'GET'
      || req.method === 'POST'
      || req.method === 'PUT'
      || req.method === 'DELETE'
    ) {
      return next();
    }

    return res.sendStatus(405);
  };
};

