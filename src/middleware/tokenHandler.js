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
    // If someone else provided then skip.
    if (req.user && req.token && res.token) {
      return next();
    }

    var token = util.getRequestValue(req, 'x-jwt-token');

    // Skip the token handling if no token was given.
    if (!token) {
      debug('No token');
      req.user = null;
      req.token = null;
      res.token = null;

      return next();
    }

    // Decode/refresh the token and store for later middleware.
    jwt.verify(token, router.formio.config.jwt.secret, function(err, decoded) {
      if (err || !decoded) {
        debug(err || 'Token could not decoded: ' + token);

        // If the token has expired, send a 440 error (Login Timeout)
        if (err && (err.name === 'JsonWebTokenError')) {
          return res.status(400).send('Bad Token');
        }
        else if (err && (err.name === 'TokenExpiredError')) {
          return res.status(440).send('Login Timeout');
        }
        else {
          return res.sendStatus(401);
        }
      }

      // If this is a temporary token, then decode it and set it in the request.
      if (decoded.temp) {
        debug('Temp token');
        req.tempToken = decoded;
        req.user = null;
        req.token = null;
        res.token = null;
        return next();
      }
      if (!decoded.form || !decoded.form._id) {
        return res.sendStatus(401);
      }
      if (!decoded.user || !decoded.user._id) {
        return res.sendStatus(401);
      }

      // Load the formio hooks.
      var hook = require('../util/hook')(router.formio);

      // Load the user submission.
      var cache = router.formio.cache || require('../cache/cache')(router);
      cache.loadSubmission(req, decoded.form._id, decoded.user._id, function(err, user) {
        if (err) {
          // Couldn't load the use, try to fail safely.
          user = decoded.user;
        }
        else if (!user) {
          req.user = null;
          req.token = null;
          res.token = null;
          return next();
        }
        else {
          try {
            // Ensure that the user is a js object and not a mongoose document.
            user = user.toObject();
          }
          /* eslint-disable no-empty */
          catch (e) {
          }
          /* eslint-enable no-empty */
        }

        // Allow anyone to alter the user.
        debug(user);
        hook.alter('user', user, function(err, user) {
          if (err) {
            return next();
          }

          // Store the user for future use.
          req.user = user;

          // Store the jwt token sent by the user.
          req.token = decoded;

          // Refresh the token that is sent back to the user when appropriate.
          var newToken = router.formio.auth.getToken(decoded);
          res.token = newToken
            ? newToken
            : token;

          // Set the headers if they haven't been sent yet.
          if (!res.headersSent) {
            res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
            res.setHeader('x-jwt-token', res.token);
          }

          next();
        });
      });
    });
  };
};
