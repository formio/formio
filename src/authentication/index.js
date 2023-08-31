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
  authenticate: require('debug')('formio:authentication:authenticate'),
};

module.exports = (router) => {
  const audit = router.formio.audit || (() => {});
  const hook = require('../util/hook')(router.formio);
  const {
    jwt: jwtConfig,
  } = router.formio.config;

  /**
   * Generate our JWT with the given payload, and pass it to the given callback function.
   *
   * @param payload {Object}
   *   The decoded JWT.
   * @param customSecret {String}
   *   Optional secret.
   *
   * @return {String|Boolean}
   *   The JWT from the given payload, or false if the jwt payload is still valid.
   */
  const getToken = (tokenInfo, customSecret) => {
    // Clone to make sure we don't change original.
    const payload = Object.assign({}, tokenInfo);
    delete payload.iat;
    delete payload.exp;

    const {
      expireTime,
      secret,
    } = jwtConfig;

    return jwt.sign(payload, customSecret || secret, {
      expiresIn: expireTime * 60,
    });
  };

  /**
   * Checks to see if a decoded token is allowed to access this path.
   * @param req
   * @param decoded
   * @return {boolean}
   */
  const isTokenAllowed = (req, decoded) => {
    if (!decoded.allow) {
      return true;
    }

    const allowed = decoded.allow.split(',');

    // If no project is provided, then provide it from the token.
    if (decoded.isAdmin && !decoded.project && allowed.length) {
      /* eslint-disable no-useless-escape */
      const ids = allowed[0].match(/\/project\/([^/]+)/);
      /* eslint-enable no-useless-escape */
      if (ids && ids[1]) {
        decoded.project = {_id: ids[1]};
      }
    }

    const [urlPath] = req.url.split('?');
    return allowed.some((allow) => {
      const [allowedMethod, allowedPath] = allow.split(':');
      if (!allowedMethod || !allowedPath) {
        return false;
      }

      // Make sure the methods match.
      if (req.method.toUpperCase() !== allowedMethod.toUpperCase()) {
        return false;
      }

      try {
        const regex = new RegExp(allowedPath);
        if (regex.test(`${req.baseUrl}${urlPath}`)) {
          return true;
        }
      }
      catch (err) {
        debug.authenticate('Bad token allow string.');
      }

      return false;
    });
  };

  /**
   * Generate a temporary token for a specific path and expiration.
   *
   * @param token
   * @param allow
   * @param expire
   * @param cb
   */
  const getTempToken = (req, res, allow, expire, admin, cb) => {
    const tempToken = {};
    if (!admin) {
      if (!req.token) {
        return cb('No authentication token provided.');
      }

      _.merge(tempToken, req.token);

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
    const now = Math.trunc((new Date()) / 1000);
    expire = parseInt(expire || 3600, 10);
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
    jwt.sign(tempToken, jwtConfig.secret, {
      expiresIn: expire,
    }, (err, token) => {
      if (err) {
        return cb(err);
      }

      const tokenResponse = {
        token,
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

  const tempToken = (req, res) => {
    if (!req.headers) {
      return res.status(400).send('No headers provided.');
    }

    let adminKey = false;
    if (process.env.ADMIN_KEY && process.env.ADMIN_KEY === req.headers['x-admin-key'] || req.isAdmin) {
      adminKey = true;
    }
    else if (!req.token) {
      return res.status(400).send('No authentication token provided.');
    }

    const allow = req.headers['x-allow'];
    const expire = parseInt(req.headers['x-expire'] || 3600, 10);

    getTempToken(req, res, allow, expire, adminKey, (err, tempToken) => {
      if (err) {
        return res.status(400).send(err);
      }
      return res.json(tempToken);
    });
  };

  /**
   * Evaluate a user after querying the database.
   *
   * @param req {Object}
   *   The express request object
   * @param user {Object}
   *   The user submission field that contains the username.
   * @param password {String}
   *   The user submission password
   * @param passField {String}
   *   The user submission field that contains the password.
   * @param username {String}
   *   The user submission username to login with.
   * @param next {Function}
   *   The callback function to call after authentication.
   */
  const evaluateUser = (req, user, password, passField, username, next) => {
    if (!user) {
      return next('User or password was incorrect');
    }

    const hash = _.get(user.data, passField);
    if (!hash) {
      audit('EAUTH_BLANKPW', {
        ...req,
        userId: user._id,
      }, username);
      return next('Your account does not have a password. You must reset your password to login.');
    }

    // Compare the provided password.
    bcrypt.compare(password, hash, (err, value) => {
      if (err) {
        audit('EAUTH_BCRYPT', {
          ...req,
          userId: user._id
        }, username, err);
        return next(err);
      }

      if (!value) {
        audit('EAUTH_PASSWORD', req, user._id, username);
        return next('User or password was incorrect', {user});
      }

      // Load the form associated with this user record.
      router.formio.resources.form.model.findOne({
        _id: user.form,
        deleted: {$eq: null},
      }).lean().exec((err, form) => {
        if (err) {
          audit('EAUTH_USERFORM', {
            ...req,
            userId: user._id,
          }, user.form, err);
          return next(err);
        }

        if (!form) {
          audit('EAUTH_USERFORM', {
            ...req,
            userId: user._id,
          }, user.form, {message: 'User form not found'});
          return next('User form not found.');
        }

        // Allow anyone to hook and modify the user.
        hook.alter('user', user, (err, _user) => {
          if (err) {
            // Attempt to fail safely and not update the user reference.
            debug.authenticate(err);
          }
          else {
            // Update the user with the hook results.
            debug.authenticate(user);
            user = _user;
          }

          hook.alter('login', user, req, (err) => {
            if (err) {
              return next(err);
            }

            // Allow anyone to hook and modify the token.
            const token = hook.alter('token', {
              user: {
                _id: user._id,
              },
              form: {
                _id: form._id,
              },
            }, form, req);

            hook.alter('tokenDecode', token, req, (err, decoded) => {
              // Continue with the token data.
              next(err, {
                user,
                token: {
                  token: getToken(token),
                  decoded,
                },
              });
            });
          });
        });
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
  const authenticate = async (req, forms, userField, passField, username, password, next) => {
    // Make sure they have provided a username and password.
    if (!username) {
      audit('EAUTH_EMPTYUN', req);
      return next('Missing username');
    }
    if (!password) {
      audit('EAUTH_EMPTYPW', req, username);
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
    // eslint-disable-next-line max-len
    query[`data.${userField}`] = router.formio.mongoFeatures.collation ? username : {$regex: new RegExp(`^${util.escapeRegExp(username)}$`, 'i')};

    // Find the user object.
    const submissionModel = req.submissionModel || router.formio.resources.submission.model;
    let subQuery = submissionModel.findOne(hook.alter('submissionQuery', query, req));
    subQuery = router.formio.mongoFeatures.collation ? subQuery.collation({locale: 'en', strength: 2}) : subQuery;
    subQuery.lean().exec((err, user) => {
      if (err) {
        return next(err);
      }
      return evaluateUser(req, user, password, passField, username, next);
    });
  };

  /**
   * Send the current user.
   *
   * @param req
   * @param res
   * @param next
   */
  const currentUser = (req, res, next) => {
    if (!res.token || !req.token) {
      return res.sendStatus(401);
    }

    // Set the headers if they haven't been sent yet.
    if (!res.headersSent) {
      const headers = router.formio.hook.alter('accessControlExposeHeaders', 'x-jwt-token');
      res.setHeader('Access-Control-Expose-Headers', headers);
      res.setHeader('x-jwt-token', res.token);
    }

    // Duplicate the current request get the users information.
    const childReq = util.createSubRequest(req);
    if (!childReq) {
      return res.status(400).send('Too many recursive requests.');
    }
    childReq.permissionsChecked = true;
    childReq.method = 'GET';
    childReq.skipResource = false;

    // If this request is not directly accessing /current, allow the response to be sent.
    if (req.url.split('?')[0] !== '/current') {
      childReq.noResponse = true;
    }

    // Update the parameters to use from the decoded token.
    childReq.params = hook.alter('submissionRequestTokenQuery', {
      formId: req.token.form._id,
      submissionId: req.token.user._id,
    }, req.token);

    // Execute the resourcejs methods associated with the user submissions.
    const url = '/form/:formId/submission/:submissionId';
    router.resourcejs[url].get.call(this, childReq, res, next);
  };

  /**
   * Return the public methods.
   */
  return {
    getToken,
    isTokenAllowed,
    getTempToken,
    authenticate,
    currentUser,
    tempToken,
    logout(req, res) {
      res.setHeader('x-jwt-token', '');
      res.sendStatus(200);
    },
  };
};
