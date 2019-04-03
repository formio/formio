'use strict';

/**
 * All the user authentication in one place.
 *
 * This module allows for users to log(in|out), and get the status of their session.
 * authentication methods.
 *
 * @type {exports}
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const util = require('../util/util');
const _ = require('lodash');
const debug = {
  authenticate: require('debug')('formio:authentication:authenticate')
};

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);

  /**
   * Generate our JWT with the given payload, and pass it to the given callback function.
   *
   * @param payload {Object}
   *   The decoded JWT.
   *
   * @return {String|Boolean}
   *   The JWT from the given payload, or false if the jwt payload is still valid.
   */
  const getToken = function(tokenInfo) {
    // Clone to make sure we don't change original.
    const payload = Object.assign({}, tokenInfo);
    delete payload.iat;
    delete payload.exp;

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
  const isTokenAllowed = function(req, decoded) {
    if (!decoded.allow) {
      return true;
    }

    let isAllowed = false;
    const allowed = decoded.allow.split(',');
    const urlParts = req.url.split('?');
    _.each(allowed, function(allow) {
      const parts = allow.split(':');
      if (parts.length < 2) {
        return;
      }

      // Make sure the methods match.
      if (req.method.toUpperCase() !== parts[0].toUpperCase()) {
        return;
      }

      try {
        const regex = new RegExp(parts[1]);
        if (regex.test(req.baseUrl + urlParts[0])) {
          isAllowed = true;
          return false;
        }
      }
      catch (err) {
        debug.authenticate('Bad token allow string.');
      }
    });

    // If no project is provided, then provide it from the token.
    if (decoded.isAdmin && allowed.length) {
      /* eslint-disable no-useless-escape */
      const ids = allowed[0].match(/\/project\/([^\/]+)/);
      /* eslint-enable no-useless-escape */
      if (ids && !decoded.project && ids[1]) {
        decoded.project = {_id: ids[1]};
      }
    }

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
  const getTempToken = function(req, res, allow, expire, admin, cb) {
    let tempToken = {};
    if (!admin) {
      if (!req.token) {
        return cb('No authentication token provided.');
      }

      tempToken = _.cloneDeep(req.token);

      // Check to see if this path is allowed.
      if (!isTokenAllowed(req, tempToken)) {
        return res.status(401).send('Token path not allowed.');
      }

      // Do not allow regeneration of temp tokens from other temp tokens.
      if (tempToken.tempToken) {
        return cb('Cannot issue a temporary token using another temporary token.');
      }
    }

    // Check the expiration.
    const now = Math.round((new Date()).getTime() / 1000);
    expire = expire || 3600;
    expire = parseInt(expire, 10);
    const timeLeft = (parseInt(tempToken.exp, 10) - now);

    // Ensure they are not trying to create an extended expiration.
    if ((expire > 3600) && (timeLeft < expire)) {
      return cb('Cannot generate extended expiring temp token.');
    }

    // Add the allowed to the token.
    if (allow) {
      tempToken.allow = allow;
    }

    tempToken.tempToken = true;
    tempToken.isAdmin = admin;

    // Delete the previous expiration so we can generate a new one.
    delete tempToken.exp;

    // Sign the token.
    jwt.sign(tempToken, router.formio.config.jwt.secret, {
      expiresIn: expire
    }, (err, token) => {
      if (err) {
        return cb(err);
      }
      const tokenResponse = {
        token
      };

      // Allow other libraries to hook into the response.
      hook.alter('tempToken', req, res, allow, expire, tokenResponse, (err) => {
        if (err) {
          return cb(err);
        }
        return cb(null, tokenResponse);
      });
    });
  };

  const tempToken = function(req, res, next) {
    if (!req.headers) {
      return res.status(400).send('No headers provided.');
    }

    let adminKey = false;
    if (process.env.ADMIN_KEY && process.env.ADMIN_KEY === req.headers['x-admin-key']) {
      adminKey = true;
    }
    else if (!req.token) {
      return res.status(400).send('No authentication token provided.');
    }

    const allow = req.headers['x-allow'];
    let expire = req.headers['x-expire'];
    expire = expire || 3600;
    expire = parseInt(expire, 10);

    // get a temporary token.
    getTempToken(req, res, allow, expire, adminKey, function(err, tempToken) {
      if (err) {
        return res.status(400).send(err);
      }
      return res.json(tempToken);
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
  const authenticate = function(req, forms, userField, passField, username, password, next) {
    // Make sure they have provided a username and password.
    if (!username) {
      return next('Missing username');
    }
    if (!password) {
      return next('Missing password');
    }

    const query = {deleted: {$eq: null}};

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
    query[`data.${userField}`] = {$regex: new RegExp(`^${util.escapeRegExp(username)}$`), $options: 'i'};

    // Find the user object.
    const submissionModel = req.submissionModel || router.formio.resources.submission.model;
    submissionModel.findOne(hook.alter('submissionQuery', query, req)).lean().exec((err, user) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next('User or password was incorrect');
      }

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
        }).lean().exec((err, form) => {
          if (err) {
            return next(err);
          }
          if (!form) {
            return next('User form not found.');
          }

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
            const token = hook.alter('token', {
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
  const currentUser = function(req, res, next) {
    if (!res.token || !req.token) {
      return res.sendStatus(401);
    }

    // Set the headers if they haven't been sent yet.
    if (!res.headersSent) {
      res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
      res.setHeader('x-jwt-token', res.token);
    }

    // Duplicate the current request get the users information.
    const url = '/form/:formId/submission/:submissionId';
    const childReq = util.createSubRequest(req);
    childReq.permissionsChecked = true;
    if (!childReq) {
      return res.status(400).send('Too many recursive requests.');
    }
    childReq.method = 'GET';
    childReq.skipResource = false;

    // If this request is not directly accessing /current, allow the response to be sent.
    if (req.url.split('?').shift() !== '/current') {
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
    logout(req, res) {
      res.setHeader('x-jwt-token', '');
      res.sendStatus(200);
    }
  };
};
