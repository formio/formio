'use strict';

/**
 * All the user authentication in one place.
 *
 * This module allows for users to log(in|out), and get the status of their session.
 * authentication methods.
 *
 * @type {exports}
 */
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var util = require('../util/util');
var debug = {
  authenticate: require('debug')('formio:authentication:authenticate'),
  createToken: require('debug')('formio:authentication:createToken')
};

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);

  /**
   * Generate our JWT with the given payload, and pass it to the given callback function.
   *
   * @param payload
   *   The decoded JWT.
   *
   * @return
   *   The JWT from the given payload.
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
   * Authenticate a user.
   *
   * @param form
   * @param userField
   * @param passField
   * @param username
   * @param password
   * @param next
   * @returns {*}
   */
  var authenticate = function(form, userField, passField, username, password, next) {
    // Make sure they have provided a username and password.
    if (!username) {
      return next(new Error('Missing username'));
    }
    if (!password) {
      return next(new Error('Missing password'));
    }

    // Get the query to perform on the resource.
    var query = {form: mongoose.Types.ObjectId(form._id)};
    query['data.' + userField] = username;
    query['deleted'] = {$eq: null};

    // Find the user object.
    router.formio.resources.submission.model.findOne(query, function(err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next(new Error('Invalid user'));
      }

      // Compare the provided password.
      user = user.toObject();
      bcrypt.compare(password, user.data[passField], function(error, value) {
        if (error) {
          return next(error);
        }
        if (!value) {
          return next(new Error('Incorrect password'));
        }

        createToken(user, form, function(err, user, token) {
          if(err) {
            debug.authenticate(err);
          }

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

    // Set the headers if they havent been sent yet.
    if (!res.headersSent) {
      res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
      res.setHeader('x-jwt-token', res.token);
    }

    // Duplicate the current request get the users information.
    var url = '/form/:formId/submission/:submissionId';
    var childReq = util.createSubRequest(req);
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
   * A utility function to create a jwt token payload with for a formio user.
   *
   * @param user {Object}
   *   The formio users submission.
   * @param form {Object}
   *   The formio form the given user is authenticated against.
   * @param next {Function}
   *   The callback function to call after the token is created.
   */
  var createToken = function(user, form, next) {
    if(!user || !form) {
      debug.createToken('user: ' + JSON.stringify(user));
      debug.createToken('form: ' + JSON.stringify(form));
      return next('No user or form given.');
    }

    // Allow anyone to hook and modify the user.
    hook.alter('user', user, function hookUserCallback(err, user) {
      debug.createToken('err: ' + JSON.stringify(err));
      debug.createToken('user: ' + JSON.stringify(user));

      // Allow anyone to hook and modify the token.
      var token = hook.alter('token', {
        user: {
          _id: user._id,
          roles: user.roles
        },
        form: {
          _id: form._id
        }
      }, form);

      return next(null, user, token);
    });
  };

  /**
   * Return the public methods.
   */
  return {
    getToken: getToken,
    createToken: createToken,
    authenticate: authenticate,
    currentUser: currentUser,
    logout: function(req, res) {
      res.setHeader('x-jwt-token', '');
      res.sendStatus(200);
    }
  };
};
