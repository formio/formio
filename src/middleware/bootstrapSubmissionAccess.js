'use strict';

const _ = require('lodash');

module.exports = function(router) {
  return function bootstrapSubmissionAccess(req, res, next) {
    /**
     * Utility function to sanitize the current request if access was not granted and continue with processing.
     */
    const removeAccessAndContinue = function() {
      // If the payload has access defined, but we could not determine who the owner should be, strip the owner data.
      if (_.has(req, 'body.access')) {
        req.body = _.omit(req.body, 'access');
      }

      // Submission access could not be modified.
      return next();
    };

    // Only modify put/post requests.
    const isPut = (req.method === 'PUT');
    const isPost = (req.method === 'POST');
    if (!isPut && !isPost) {
      return removeAccessAndContinue();
    }

    // Skip this middleware if the submission access was not even supplied.
    if (!_.has(req, 'body.access')) {
      return next();
    }

    // Allow new submissions to define its access.
    if (isPost) {
      return next();
    }

    // If req.assignSubmissionAccess was set by the permissionHandler, allow the request to modify the access.
    if (_.has(req, 'assignSubmissionAccess') && req.assignSubmissionAccess) {
      return next();
    }
    // Allow an admin to manually set the access.
    if (_.has(req, 'isAdmin') && req.isAdmin) {
      return next();
    }

    removeAccessAndContinue();
  };
};
