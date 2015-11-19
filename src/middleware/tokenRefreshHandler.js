'use strict';

var jwt = require('jsonwebtoken');
var util = require('../util/util');
var debug = require('debug')('formio:middleware:tokenRefreshHandler');

module.exports = function(router) {
  return function(req, res, next) {
    var token = util.getRequestValue(req, 'x-jwt-token');
    var hook = require('../util/hook')(router.formio);

    // Skip this middleware for various reasons.
    if(!req._refreshToken) {
      debug('Skipping');
      return next();
    }
    if(!token) {
      debug('Skipping - No token');
      return next();
    }
    if(res.headersSent) {
      debug('Skipping - Headers already sent');
      return next();
    }

    // Force reload the users submission.
    router.formio.resources.submission.model.findOne({_id: req.user._id, deleted: {$eq: null}}, function(err, user) {
      if(err) {
        debug(err);
        return next();
      }

      // Create a new token with the users latest information.
      router.formio.auth.createToken(user, req.token.form, function(err, user, token) {
        // Sign the token
        var newToken = router.formio.auth.getToken(token);
        res.token = newToken
          ? newToken
          : token;

        // Update the token header and continue.
        res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
        res.setHeader('x-jwt-token', res.token);
        next();
      });
    });
  };
};
