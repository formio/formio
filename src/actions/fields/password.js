'use strict';

var _ = require('lodash');

module.exports = function(formio) {
  return {
    beforeGet: function(component, path, validation, req, res, next) {
      req.modelQuery.select('-data.' + path);
      next();
    },

    encryptField: function(req, component, path, next) {
      formio.encrypt(_.get(req.body, 'data.' + path), function encryptResults(err, hash) {
        if (err) {
          return next(err);
        }

        _.set(req.body, 'data.' + path, hash);
        next();
      });
    },

    beforePut: function(component, path, validation, req, res, next) {
      // Only perform password encryption after validation has occurred.
      if (!validation) {
        return next();
      }

      // If there is not payload data.
      if (!req.body.data) {
        return next();
      }

      if (_.get(req.body, 'data.' + path)) {
        this.encryptField(req, component, path, next);
      }
      else {
        // If there is no password provided.
        // Load the current submission.
        formio.cache.loadCurrentSubmission(req, function cacheResults(err, submission) {
          if (err) {
            return next(err);
          }
          if (!submission) {
            return next(new Error('No submission found.'));
          }

          _.set(req.body, 'data.' + path, _.get(submission.data, path));
          next();
        });
      }
    },

    beforePost: function(component, path, validation, req, res, next) {
      // Only perform password encryption after validation has occurred.
      if (!validation) {
        return next();
      }
      if (!_.has(req.body, 'data.' + path)) {
        return next();
      }

      this.encryptField(req, component, path, next);
    }
  };
};
