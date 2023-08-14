'use strict';

const jwt = require('jsonwebtoken');
const _ = require('lodash');
const util = require('../util/util');
const debug = {
  error: require('debug')('formio:error'),
  handler: require('debug')('formio:middleware:tokenHandler'),
};

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
module.exports = (router) => {
  // Load the form.io hooks.
  const hook = require('../util/hook')(router.formio);
  const formioCache = require('../cache/cache')(router);
  const {
    jwt: jwtConfig,
  } = router.formio.config;

  /**
   * Util function to update the jwt in the response.
   *
   * @param inputToken
   * @param payload
   * @param res
   */
  const generateToken = (inputToken, payload, res) => {
    // Refresh the token that is sent back to the user when appropriate.
    const newToken = router.formio.auth.getToken(payload);
    res.token = newToken
      ? newToken
      : inputToken;

    // Set the headers if they haven't been sent yet.
    if (!res.headersSent) {
      const headers = router.formio.hook.alter('accessControlExposeHeaders', 'x-jwt-token');
      res.setHeader('Access-Control-Expose-Headers', headers);
      res.setHeader('x-jwt-token', res.token);
    }
  };

  /**
   * Handle the user.
   *
   * @param req
   * @param res
   * @param decoded
   * @param user
   * @param next
   */
  const userHandler = (req, res, decoded, token, user, next) => {
    hook.alter('user', user, (err, user) => {
      if (err) {
        return next();
      }

      // Store the user for future use.
      req.user = user;

      // Store the jwt token sent by the user.
      if (decoded.user._id === 'external') {
        decoded.user._id = util.toMongoId(
          decoded.user.data.id ||
          decoded.user.data._id ||
          decoded.user.data.email ||
          JSON.stringify(decoded.user.data)
        );
      }
      req.token = decoded;

      // Refresh the token that is sent back to the user when appropriate.
      req.tokenIssued = Math.trunc(Date.now() / 1000);
      generateToken(token, decoded, res, req);
      router.formio.log('Token', req, 'Using normal token');
      if (req.user) {
        router.formio.log('User', req, req.user._id);
      }
      next();
    });
  };

  return (req, res, next) => {
    /* eslint-disable max-statements */
    // If someone else provided then skip.
    if (req.user && req.token && res.token) {
      return next();
    }

    const token = util.getRequestValue(req, 'x-jwt-token');
    const noToken = () => {
      router.formio.log('Token', req, 'No token found');
      // Try the request with no tokens.
      delete req.headers['x-jwt-token'];
      req.user = null;
      req.token = null;
      res.token = null;
      router.formio.audit('AUTH_ANONYMOUS', req);
      return next();
    };

    const apiKey = req.headers['x-token'];
    if (apiKey) {
      const apiKeys = process.env.API_KEYS
        ? process.env.API_KEYS.split(',').map((key) => key.trim()).filter(Boolean)
        : [];

      if (apiKeys.includes(apiKey)) {
        router.formio.audit('AUTH_APIKEY', req);
        req.isAdmin = true;
        req.permissionsChecked = true;
        req.user = null;
        req.token = null;
        return next();
      }
    }

    // Skip the token handling if no token was given.
    if (!token) {
      return noToken();
    }

    // Decode/refresh the token and store for later middleware.
    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err || !decoded) {
        debug.handler(err || `Token could not decoded: ${token}`);
        router.formio.audit('EAUTH_TOKENBAD', req, err);
        router.formio.log('Token', req, 'Token could not be decoded');

        // If the token has expired, send a 440 error (Login Timeout)
        if (err && (err.name === 'JsonWebTokenError')) {
          router.formio.log('Token', req, 'Bad Token');
          return res.status(400).send('Bad Token');
        }
        else if (err && (err.name === 'TokenExpiredError')) {
          router.formio.audit('EAUTH_TOKENEXPIRED', req, err);
          router.formio.log('Token', req, 'Token Expired');
          return res.status(440).send('Token Expired');
        }
        else {
          return noToken();
        }
      }

      hook.alter('tokenDecode', decoded, req, (err, decoded) => {
        // Check to see if this token is allowed to access this path.
        if (!router.formio.auth.isTokenAllowed(req, decoded)) {
          return noToken();
        }

        // If this is a temporary token, then decode it and set it in the request.
        if (decoded.temp) {
          router.formio.log('Token', req, 'Using temp token');
          debug.handler('Temp token');
          req.tempToken = decoded;
          req.user = null;
          req.token = null;
          res.token = null;
          return next();
        }

        // Allow external tokens.
        if (!hook.alter('external', decoded, req)) {
          decoded.user.project = decoded.project._id;
          return userHandler(req, res, decoded, token, decoded.user, next);
        }

        // See if this is a remote token.
        if (decoded.project && decoded.permission) {
          req.userProject = decoded.project;
          req.remotePermission = decoded.permission;
          return userHandler(req, res, decoded, token, decoded.user, next);
        }

        if (decoded.isAdmin) {
          router.formio.log('Token', req, 'User is admin');
          if (req.user) {
            router.formio.log('User', req, req.user._id);
          }
          req.permissionsChecked = true;
          req.isAdmin = true;
          req.token = decoded;
          return next();
        }

        const formId = _.get(decoded, 'form._id');
        const userId = _.get(decoded, 'user._id');

        if (!formId || !userId) {
          return noToken();
        }

        // Load the user submission.
        const cache = router.formio.cache || formioCache;
        cache.loadSubmission(req, formId, userId, (err, user) => {
          if (err) {
            // Couldn't load the user, try to fail safely.
            user = decoded.user;
          }
          else if (!user) {
            req.user = null;
            req.token = null;
            res.token = null;
            return next();
          }

          hook.alter('validateToken', req, decoded, user, (err) => {
            if (err) {
              return res.status(440).send(err);
            }

            // Check if the user has reset the password since the token was issued.
            if (
              !req.skipTokensValidation
              && user.metadata
              && user.metadata.jwtIssuedAfter
              && decoded.iat < user.metadata.jwtIssuedAfter
            ) {
              router.formio.log('Token', req, 'Token No Longer Valid');
              return res.status(440).send('Token No Longer Valid');
            }

            // Call the user handler.
            userHandler(req, res, decoded, token, user, next);
          });
        });
      });
    });
  };
};
