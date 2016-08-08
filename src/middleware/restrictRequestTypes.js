'use strict';

var debug = require('debug')('formio:middleware:restrictRequestTypes');

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

    debug('Blocking request: ' + (req.method || '').toUpperCase() + ' ' + req.url);
    return res.sendStatus(405);
  };
};

