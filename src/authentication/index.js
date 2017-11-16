'use strict';

/**
 * All the user authentication in one place.
 *
 * This module allows for users to log(in|out), and get the status of their session.
 * authentication methods.
 *
 * @type {exports}
 */
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var util = require('../util/util');
var _ = require('lodash');
var debug = {
  authenticate: require('debug')('formio:authentication:authenticate')
};

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);

  /**
   * Generate our JWT with the given payload, and pass it to the given callback function.
   *
   * @param payload {Object}
   *   The decoded JWT.
   *
   * @return {String|Boolean}
   *   The JWT from the given payload, or false if the jwt payload is still valid.
   */
  var getToken = function(payload) {
    // Ensure that we do not do multiple re-issues consecutively.
    // Re-issue at the maximum rate of 1/min.
    if (payload.iat) {
      var now = Math.floor(Date.now() / 1000);
      if ((now - payload.iat) < 60) {
        return false;
      }

      delete payload.iat;
      delete payload.exp;
    }

    return jwt.sign(payload, router.formio.config.jwt.secret, {
      expiresIn: router.formio.config.jwt.expireTime * 60
    });
  };

  /**
   * Checks to see if a decoded token is allowed to access this path.
   * @param req
   * @param decoded
   * @return {boolean}
   */
  var isTokenAllowed = function(req, decoded) {
    if (!decoded.allow) {
      return true;
    }

    var isAllowed = false;
    var allowed = decoded.allow.split(',');
    _.each(allowed, function(allow) {
      var parts = allow.split(':');
      if (parts.length < 2) {
        return;
      }

      // Make sure the methods match.
      if (req.method.toUpperCase() !== parts[0].toUpperCase()) {
        return;
      }

      try {
        var regex = new RegExp(parts[1]);
        if (regex.test(req.baseUrl + req.url)) {
          isAllowed = true;
          return false;
        }
      }
      catch (err) {
        debug.authenticate('Bad token allow string.');
      }
    });
    return isAllowed;
  };

  /**
   * Generate a temporary token for a specific path and expiration.
   *
   * @param token
   * @param allow
   * @param expire
   * @param cb
   */
  var getTempToken = function(req, res, token, allow, expire, cb) {
    // Decode/refresh the token and store for later middleware.
    jwt.verify(token, router.formio.config.jwt.secret, function(err, decoded) {
      if (err || !decoded) {
        if (err && (err.name === 'JsonWebTokenError')) {
          return cb('Bad Token');
        }
        else if (err && (err.name === 'TokenExpiredError')) {
          return cb('Login Timeout');
        }
        else {
          return cb('Unauthorized');
        }
      }

      if (!res.headersSent) {
        res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
        res.setHeader('x-jwt-token', token);
      }

      // Check to see if this path is allowed.
      if (!isTokenAllowed(req, decoded)) {
        return res.status(401).send('Token path not allowed.');
      }

      // Do not allow regeneration of temp tokens from other temp tokens.
      if (decoded.tempToken) {
        return cb('Cannot issue a temporary token using another temporary token.');
      }

      var now = Math.round((new Date()).getTime() / 1000);
      expire = expire || 3600;
      expire = parseInt(expire, 10);
      var timeLeft = (parseInt(decoded.exp, 10) - now);

      // Ensure they are not trying to create an extended expiration.
      if ((expire > 3600) && (timeLeft < expire)) {
        return cb('Cannot generate extended expiring temp token.');
      }

      // Add the allowed to the token.
      if (allow) {
        decoded.allow = allow;
      }

      decoded.tempToken = true;

      // Delete the previous expiration so we can generate a new one.
      delete decoded.exp;

      // Sign the token.
      jwt.sign(decoded, router.formio.config.jwt.secret, {
        expiresIn: expire
      }, (err, token) => cb(err, token));
    });
  };

  var tempToken = function(req, res, next) {
    if (!req.headers) {
      return res.status(400).send('No headers provided.');
    }

    var token = req.headers['x-jwt-token'];
    var allow = req.headers['x-allow'];
    var expire = req.headers['x-expire'];
    expire = expire || 3600;
    expire = parseInt(expire, 10);
    if (!token) {
      return res.status(400).send('You must provide an existing token in the x-jwt-token header.');
    }

    // get a temporary token.
    getTempToken(req, res, token, allow, expire, function(err, tempToken) {
      if (err) {
        return res.status(400).send(err);
      }

      var tokenResponse = {
        token: tempToken
      };

      // Allow other libraries to hook into the response.
      hook.alter('tempToken', req, res, token, allow, expire, tokenResponse, (err) => {
        return res.json(tokenResponse);
      });
    });
  };

  /**
   * Authenticate a user.
   *
   * @param forms {Mixed}
   *   A single form or an array of forms to authenticate against.
   * @param userField {String}
   *   The user submission field that contains the username.
   * @param passField {String}
   *   The user submission field that contains the password.
   * @param username {String}
   *   The user submission username to login with.
   * @param password {String}
   *   The user submission password to login with.
   * @param next {Function}
   *   The callback function to call after authentication.
   */
  var authenticate = function(forms, userField, passField, username, password, next) {
    // Make sure they have provided a username and password.
    if (!username) {
      return next('Missing username');
    }
    if (!password) {
      return next('Missing password');
    }

    var query = {deleted: {$eq: null}};

    // Determine the form id for querying.
    if (_.isArray(forms)) {
      query.form = {'$in': _.map(forms, util.idToBson)};
    }
    else if (_.isObject(forms)) {
      query.form = util.idToBson(forms._id);
    }
    else if (_.isString(forms)) {
      query.form = util.idToBson(forms);
    }

    // Look for the user.
    query['data.' + userField] = {$regex: new RegExp('^' + util.escapeRegExp(username) + '$'), $options: 'i'};

    // Find the user object.
    router.formio.resources.submission.model.findOne(query, function(err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next('User or password was incorrect');
      }

      user = user.toObject();
      if (!_.get(user.data, passField)) {
        return next('Your account does not have a password. You must reset your password to login.');
      }

      // Compare the provided password.
      bcrypt.compare(password, _.get(user.data, passField), function(err, value) {
        if (err) {
          return next(err);
        }
        if (!value) {
          return next('User or password was incorrect', {user: user});
        }

        // Load the form associated with this user record.
        router.formio.resources.form.model.findOne({
          _id: user.form,
          deleted: {$eq: null}
        }, function(err, form) {
          if (err) {
            return next(err);
          }
          if (!form) {
            return next('User form not found.');
          }

          form = form.toObject();

          // Allow anyone to hook and modify the user.
          hook.alter('user', user, function hookUserCallback(err, _user) {
            if (err) {
              // Attempt to fail safely and not update the user reference.
              debug.authenticate(err);
            }
            else {
              // Update the user with the hook results.
              debug.authenticate(user);
              user = _user;
            }

            // Allow anyone to hook and modify the token.
            var token = hook.alter('token', {
              user: {
                _id: user._id
              },
              form: {
                _id: form._id
              }
            }, form);

            // Continue with the token data.
            next(null, {
              user: user,
              token: {
                token: getToken(token),
                decoded: token
              }
            });
          });
        });
      });
    });
  };

  /**
   * Send the current user.
   *
   * @param req
   * @param res
   * @param next
   */
  var currentUser = function(req, res, next) {
    if (!res.token || !req.token) {
      return res.sendStatus(401);
    }

    // Set the headers if they haven't been sent yet.
    if (!res.headersSent) {
      res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
      res.setHeader('x-jwt-token', res.token);
    }

    // Duplicate the current request get the users information.
    var url = '/form/:formId/submission/:submissionId';
    var childReq = util.createSubRequest(req);
    if (!childReq) {
      return res.status(400).send('Too many recursive requests.');
    }
    childReq.method = 'GET';
    childReq.skipResource = false;

    // If this request is not directly accessing /current, allow the response to be sent.
    if (req.url !== '/current') {
      childReq.noResponse = true;
    }

    // Update the parameters to use from the decoded token.
    childReq.params = hook.alter('submissionRequestTokenQuery', {
      formId: req.token.form._id,
      submissionId: req.token.user._id
    }, req.token);

    // Execute the resourcejs methods associated with the user submissions.
    router.resourcejs[url].get.call(this, childReq, res, next);
  };

  /**
   * Return the public methods.
   */
  return {
    getToken: getToken,
    isTokenAllowed: isTokenAllowed,
    getTempToken: getTempToken,
    authenticate: authenticate,
    currentUser: currentUser,
    tempToken: tempToken,
    logout: function(req, res) {
      res.setHeader('x-jwt-token', '');
      res.sendStatus(200);
    }
  };
};
