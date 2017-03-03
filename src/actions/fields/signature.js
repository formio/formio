'use strict';

var _ = require('lodash');

module.exports = function(formio) {
  return {
    beforePost: function(component, path, validation, req, res, next) {
      if (!req.body.data) {
        return next();
      }
      var value = _.get(req.body, 'data.' + path);

      // Coerse the value into an empty string.
      if (!value && value !== '') {
        _.set(req.body, 'data.' + path, '');
      }
      return next();
    },
    beforePut: function(component, path, validation, req, res, next) {
      if (!req.body.data) {
        return next();
      }

      // Ensure that signatures are not ever wiped out with a PUT request
      // of data that came from the index request (where the signature is not populated).
      var value = _.get(req.body, 'data.' + path);

      // Coerse the value into an empty string.
      if (!value && (value !== '')) {
        value = '';
        _.set(req.body, 'data.' + path, '');
      }

      if (
        (typeof value !== 'string') ||
        ((value !== '') && (value.substr(0, 5) !== 'data:'))
      ) {
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
      else {
        return next();
      }
    }
  };
};
