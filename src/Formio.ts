// We can't use import for package.json or it will mess up the lib folder.
/* tslint:disable */
const {version} = require('../package.json');
/* tslint:enable */
import { Api } from '@formio/api/lib';
import * as jwt from 'jsonwebtoken';
import {cron} from './cron';
import cronTasks from './cronTasks';
import {actions} from './entities/Submission/actions';
import {log} from './log';
import {routes as routeClasses} from './routes';

export class Formio extends Api {
  protected cronjob;

  constructor(router, db, config) {
    super(router, db, config);

    // Ensure that required environment variables are set.
    if (this.requiredEnvVars.reduce((prev, variable) => {
      const missing = !process.env[variable];
      if (missing) {
        log('error', 'Missing Environment Variable', variable);
      }
      return prev || missing;
    }, false)) {
      process.exit(1);
    }

    // Initiate cron tasks.
    this.cronjob = cron(this, this.cronTasks);
  }

  get requiredEnvVars() {
    return [
      'JWT_SECRET',
    ];
  }

  get actions() {
    const defaultActions = super.actions;
    return {
      ...super.actions,
      ...actions,
    };
  }

  get cronTasks() {
    return cronTasks;
  }

  get routeClasses() {
    return {
      ...super.routeClasses,
      ...routeClasses,
    };
  }

  public getStatus(status: any = {}) {
    status.ce = version;
    return super.getStatus(status);
  }

  public generateToken(payload) {
    if (payload.iat) {
      delete payload.iat;
      delete payload.exp;
    }

    return jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.expireTime * 60,
    });
  }

  public tokenPayload(user, form) {
    return {
      user: {
        _id: user._id,
      },
      form: {
        _id: form._id,
      },
    };
  }

  public authenticate(req, res, next) {
    // If someone else provided then skip.
    if (req.user && req.token && res.token) {
      return next();
    }

    const noToken = () => {
      // Try the request with no tokens.
      delete req.headers['x-jwt-token'];
      req.user = null;
      req.token = null;
      res.token = null;
      return next();
    };

    let token;
    if (typeof req.headers.authorization !== 'undefined') {
      if (req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.replace(/^Bearer /, '');
      }
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
    jwt.verify(token, this.config.jwt.secret, (err, payload) => {
      if (err || !payload) {
        // log('error', err || `Token could not be payload: ${token}`);

        // If the token has expired, send a 440 error (Login Timeout)
        if (err && (err.name === 'TokenExpiredError')) {
            return res.status(440).send('Login Timeout');
        }
        // Allowing admin key to pass as token means we don't want to fail here.
        else if (err && (err.name === 'JsonWebTokenError')) {
          return res.status(400).send('Bad Token');
        }
        else {
          return noToken();
        }
      }

      if (!payload.external &&
          (
            !payload.user || !payload.user._id ||
            !payload.form || !payload.form._id
          )
      ) {
        return res.status(401).send('Invalid token. Missing form or user ids');
      }

      return this.handleToken(payload, req, res, next);
    });
  }

  public userQuery(payload) {
    return {
      _id: this.db.toID(payload.user._id),
      form: this.db.toID(payload.form._id),
    };
  }

  public handleToken(payload, req, res, next) {
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
      req.user.external = true;
      return next();
    }

    this.models.Submission.read(this.userQuery(payload))
      .then((user) => {
        req.user = user;
        res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token, Authorization');
        res.setHeader('x-jwt-token', this.generateToken(payload));
        res.setHeader('Authorization', `Bearer ${res.getHeader('x-jwt-token')}`);
        next();
      })
      .catch((err) => {
        res.status(400).send('Unable to find user');
      });
  }
}
