'use strict';

var bcrypt = require('bcrypt');

/**
 * Encrypt a password.
 *
 * @param password
 * @param next
 */
var encryptPassword = function(password, next) {
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      return next(err);
    }

    bcrypt.hash(password, salt, function(error, hash) {
      if (error) {
        return next(error);
      }

      next(null, hash);
    });
  });
};

module.exports = function(formio) {
  return {
    encryptPassword: encryptPassword,
    beforeGetAction: function(component, req, res, next) {
      req.modelQuery.select('-data.' + component.key);
      next();
    },

    beforePut: function(component, req, res, next) {
      // If there is no password provided.
      if (!req.body.data[component.key]) {
        // Load the current submission.
        formio.cache.loadCurrentSubmission(req, function(err, submission) {
          if (err) {
            return next(err);
          }
          if (!submission) {
            return next(new Error('No submission found.'));
          }

          req.body.data[component.key] = submission.data[component.key];
          next();
        });
      }
      else {
        // Create a new password from what they provided.
        encryptPassword(req.body.data[component.key], function(err, hash) {
          if (err) {
            return next(err);
          }

          req.body.data[component.key] = hash;
          next();
        });
      }
    },

    beforePost: function(component, req, res, next) {
      if (!req.body.data.hasOwnProperty(component.key)) {
        return next();
      }

      encryptPassword(req.body.data[component.key], function(err, hash) {
        if (err) {
          return next(err);
        }

        req.body.data[component.key] = hash;
        next();
      });
    }
  };
};
