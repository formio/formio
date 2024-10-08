'use strict';

const _ = require('lodash');

module.exports = (formio) => {
  const hook = require('../../util/hook')(formio);

  const encryptField = (component, data, next) => {
    formio.encrypt(_.get(data, component.key), (err, hash) => {
      if (err) {
        return next(err);
      }

      _.set(data, component.key, hash);
      next();
    });
  };

  const getCurrentSubmission = async req => {
    const submission = await formio.cache.loadCurrentSubmission(req);
    if (!submission) {
      throw new Error('No submission found.');
    }
    return submission;
  };

  return async (component, data, handler, action, {validation, path, req, res}) => {
    switch (handler) {
      case 'beforeGet':
        req.modelQuery.select(`-data.${path}${component.key}`);
        break;
      case 'beforePut':
        // Only perform password encryption after validation has occurred.
        if (validation) {
            if (_.has(data, component.key)) {
              return new Promise((resolve, reject) => {
                encryptField(component, data, (err) => {
                  if (err) {
                    return reject(err);
                  }
                  // Since the password was changed, invalidate all user tokens.
                  hook.alter('invalidateTokens', req, res, (err) => {
                    if (err) {
                      return reject(err);
                    }

                    if (!req.skipTokensInvalidation) {
                      _.set(req.body, 'metadata.jwtIssuedAfter', req.tokenIssued || Math.trunc(Date.now() / 1000));
                    }
                    resolve();
                  });
                });
              });
            }
            else {
              // If there is no password provided.
              // Load the current submission.

              const submission = await getCurrentSubmission(req);
              _.set(data, component.key, _.get(submission.data, path));
              return;
            }
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
