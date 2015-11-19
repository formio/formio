'use strict';

var jwt = require('jsonwebtoken');
var util = require('../util/util');
var debug = require('debug')('formio:middleware:tokenHandler');

/**
 * The Token Handler middleware.
 *
 * This middleware will decode the access token if present and establish known req/res properties for later middleware.
 *
 * @param router {Object}
 *   The formio router.
 *
 * @returns {Function}
 *   The middleware for an Express endpoint.
 */
module.exports = function(router) {
  return function tokenHandler(req, res, next) {
    var token = util.getRequestValue(req, 'x-jwt-token');

    // Skip the token handling if no token was given.
    if(!token) {
      req.user = null;
      req.token = null;
      res.token = null;

      return next();
    }

    // Decode/refresh the token and store for later middleware.
    jwt.verify(token, router.formio.config.jwt.secret, function(err, decoded) {
      if(err || !decoded) {
        // If the token has expired, send a 440 error (Login Timeout)
        if(
          err &&
          (err.name === 'TokenExpiredError') ||
          (err.name === 'JsonWebTokenError')
        ) {
          return res.status(440).send('Login Timeout');
        }
        else {
          return res.sendStatus(401);
        }
      }

      // If this is a temporary token, then decode it and set it in the request.
      if(decoded.temp) {
        req.tempToken = decoded;
        req.user = null;
        req.token = null;
        res.token = null;
        return next();
      }
      if(!decoded.form || !decoded.form._id) {
        return res.sendStatus(401);
      }
      if(!decoded.user || !decoded.user._id) {
        return res.sendStatus(401);
      }

      // Set the user and token on the request to pass along to other middleware.
      req.user = decoded.user;
      req.token = decoded;

      // Refresh the token when appropriate.
      var newToken = router.formio.auth.getToken(decoded);
      res.token = newToken
        ? newToken
        : token;

      // Set the headers if they haven't been sent yet.
      if(!res.headersSent) {
        res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
        res.setHeader('x-jwt-token', res.token);
      }

      next();
    });
  };
};
