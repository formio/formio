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
   * @param model
   * @param query
   * @param username
   * @param password
   * @param getPassword
   * @param next
   *
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

        // Respond with a token.
        var token = hook.alter('token', {
          user: {
            _id: user._id,
            roles: user.roles
          },
          form: {
            _id: form._id
          }
        }, user, form);

        var response = {
          user: user,
          token: {
            token: getToken(token),
            decoded: token
          }
        };

        next(null, response);
      });
    });
  };

  /**
   * Authenticate a user via OAuth. Resolves with null if no user found
   *
   * @param form
   * @param providerName
   * @param oauthId
   * @param next
   *
   * @returns {Promise}
   */
  var authenticateOAuth = function(form, providerName, oauthId, next) {
    if (!providerName) {
      return next(new Error('Missing provider'));
    }
    if (!oauthId) {
      return next(new Error('Missing OAuth ID'));
    }

    return router.formio.resources.submission.model.findOne(
      {
        form: form._id,
        externalIds: {
          $elemMatch: {
            type: providerName,
            id: oauthId
          }
        },
        deleted: {$eq: null}
      }
    )
    .then(function(user) {
      if (!user) {
        return null;
      }

      // Respond with a token.
      var token = hook.alter('token', {
        user: {
          _id: user._id,
          roles: user.roles
        },
        form: {
          _id: form._id
        }
      }, user, form);

      return {
        user: user,
        token: {
          token: getToken(token),
          decoded: token
        }
      };
    })
    .nodeify(next);
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
   * Return the public methods.
   */
  return {
    getToken: getToken,
    authenticate: authenticate,
    authenticateOAuth: authenticateOAuth,
    currentUser: currentUser,
    logout: function(req, res) {
      res.setHeader('x-jwt-token', '');
      res.sendStatus(204);
    }
  };
};
