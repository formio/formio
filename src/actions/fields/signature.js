'use strict';

var _ = require('lodash');

module.exports = function(formio) {
  return {
    beforePut: function(component, path, validation, req, res, next) {
      if (!req.body.data) {
        return next();
      }

      // Ensure that signatures are not ever wiped out with a PUT request
      // of data that came from the index request (where the signature is not populated).
      var value = _.get(req.body, 'data.' + path);
      if (value.toLowerCase() === 'yes') {
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
      else if (value.toLowerCase() === 'no') {
        _.set(req.body, 'data.' + path, '');
        next();
      }
      else {
        next();
      }
    }
  };
};
