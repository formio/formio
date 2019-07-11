const jwt = require('jsonwebtoken');
const info = require('../package.json');
const {FormApi, log} = require('form-api');
const config = require('./config');
const actions = require('./actions');
const resources = require('./resources');

module.exports = class Formio extends FormApi {
  constructor(router, db) {
    super(router, db);
    this.config = Object.assign({}, this.config, config);
  }

  get resourceClasses() {
    return {
      ...super.resourceClasses,
      ...resources,
    };
  }

  get actions() {
    return {
      ...super.actions,
      ...actions
    }
  }

  getStatus(status = {}) {
    status.formioVersion = info.version;
    return super.getStatus(status);
  }

  generateToken(payload) {
    if (payload.iat) {
      delete payload.iat;
      delete payload.exp;
    }

    return jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.expireTime * 60
    })
  }

  tokenPayload(user, form) {
    return {
      user: {
        _id: user._id,
      },
      form: {
        _id: form._id,
      }
    };
  }

  authenticate(req, res, next) {
    // If someone else provided then skip.
    if (req.user && req.token && res.token) {
      return next();
    }

    const noToken = function () {
      // Try the request with no tokens.
      delete req.headers['x-jwt-token'];
      req.user = null;
      req.token = null;
      res.token = null;
      return next();
    };

    let token;
    if (typeof req.headers['authorization'] !== 'undefined') {
      if (!req.headers['authorization'].startsWith('Bearer: ')) {
        return res.send(401).send('Not using Bearer token');
      }
      token = req.headers['authorization'].replace(/^Bearer: /, '');
    }

    // Support legacy x-jwt-token location.
    if (!token && req.headers['x-jwt-token'] !== 'undefined') {
      token = req.headers['x-jwt-token'];
    }

    // Skip the token handling if no token was given.
    if (!token) {
      return noToken();
    }

    // Decode/refresh the token and store for later middleware.
    jwt.verify(token, config.jwt.secret, (err, payload) => {
      if (err || !payload) {
        // log('error', err || `Token could not be payload: ${token}`);

        // If the token has expired, send a 440 error (Login Timeout)
        if (err && (err.name === 'TokenExpiredError')) {
            return res.status(440).send('Login Timeout');
        }
        // Allowing admin key to pass as toekn means we don't want to fail here.
        // else if (err && (err.name === 'JsonWebTokenError')) {
        //   return res.status(400).send('Bad Token');
        // }
        else {
          return noToken();
        }
      }

      if (
        !payload.user || !payload.user._id ||
        !payload.form || !payload.form._id
      ) {
        return res.status(401).send('Invalid token. Missing form or user ids');
      }

      return this.handleToken(payload, req, res, next);
    });
  }

  handleToken(payload, req, res, next) {
    // If this is a temporary token, then decode it and set it in the request.
    if (payload.temp) {
      req.tempToken = payload;
      req.user = null;
      req.token = null;
      res.token = null;
      return next();
    }

    req.token = payload;

    // Allow external tokens.
    if (payload.external) {
      req.user = payload.user;
      return next();
    }

    this.models.Submission.read({
      _id: this.db.ID(payload.user._id),
      form: this.db.ID(payload.form._id),
    })
      .then(user => {
        req.user = user;
        res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token, Authorization');
        res.setHeader('x-jwt-token', this.generateToken(payload));
        res.setHeader('Authorization', `Bearer: ${res.getHeader('x-jwt-token')}`);
        next();
      })
      .catch(err => {
        res.status(400).send('Unable to find user');
      });
  }
};
