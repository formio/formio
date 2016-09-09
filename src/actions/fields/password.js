'use strict';

module.exports = function(formio) {
  return {
    beforeGet: function(component, req, res, next) {
      req.modelQuery.select('-data.' + component.key);
      next();
    },

    encryptField: function(req, component, next) {
      formio.encrypt(req.body.data[component.key], function encryptResults(err, hash) {
        if (err) {
          return next(err);
        }

        req.body.data[component.key] = hash;
        next();
      });
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
        this.encryptField(req, component, next);
      }
    },

    beforePost: function(component, req, res, next) {
      if (!req.body || !req.body.data || !req.body.data[component.key]) {
        return next();
      }

      this.encryptField(req, component, next);
    }
  };
};
