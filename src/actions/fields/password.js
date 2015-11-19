'use strict';

module.exports = function(formio) {
  return {
    beforeGetAction: function(component, req, res, next) {
      req.modelQuery.select('-data.' + component.key);
      next();
    },

    beforePut: function(component, req, res, next) {
      // If there is not payload data.
      if (!req.body.data) {
        return next();
      }

      // If there is no password provided.
      if (!req.body.data[component.key]) {
        // Load the current submission.
        formio.cache.loadCurrentSubmission(req, function cacheResults(err, submission) {
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
        formio.encrypt(req.body.data[component.key], function encryptResults(err, hash) {
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

      formio.encrypt(req.body.data[component.key], function encryptResults(err, hash) {
        if (err) {
          return next(err);
        }

        req.body.data[component.key] = hash;
        next();
      });
    }
  };
};
