'use strict';

const _ = require('lodash');

module.exports = (formio) => {
  const encryptField =(component, data, next) => {
    formio.encrypt(_.get(data, component.key), function encryptResults(err, hash) {
      if (err) {
        return next(err);
      }

      _.set(data, component.key, hash);
      next();
    });
  };

  return async (component, data, handler, action, {validation, path, req}) => {
    switch (handler) {
      case 'beforeGet':
        req.modelQuery.select(`-data.${path}${component.key}`);
        break;
      case 'beforePut':
        // Only perform password encryption after validation has occurred.
        if (validation) {
          return new Promise((resolve, reject) => {
            if (_.has(data, component.key)) {
              encryptField(component, data, (err) => {
                if (err) {
                  return reject(err);
                }
                return resolve();
              });
              // Since the password was changed, invalidate all user tokens.
              req.body.metadata = req.body.metadata || {};
              req.body.metadata.jwtIssuedAfter = req.tokenIssued || (Date.now() / 1000);
            }
            else {
              // If there is no password provided.
              // Load the current submission.
              formio.cache.loadCurrentSubmission(req, function cacheResults(err, submission) {
                if (err) {
                  return reject(err);
                }
                if (!submission) {
                  return reject(new Error('No submission found.'));
                }

                _.set(data, component.key, _.get(submission.data, path));
                return resolve();
              });
            }
          });
        }
        break;
      case 'beforePost':
        if (validation && _.has(data, component.key)) {
          return new Promise((resolve, reject) => {
            encryptField(component, data, (err) => {
              if (err) {
                return reject(err);
              }
              return resolve();
            });
          });
        }
        break;
    }
  };
};
