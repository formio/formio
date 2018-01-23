'use strict';
/*eslint max-statements: 0*/

const _ = require('lodash');

/**
 * The Bootstrap Entity Owner middleware.
 *
 * This middleware will set the user of the current request as the owner of the entity being created.
 *
 * @param router
 */
module.exports = function(router) {
  return function bootstrapEntityOwner(selfOwner) {
    return function bootstrapEntityOwnerMiddleware(req, res, next) {
      // Set the flag for self ownership if present.
      req.selfOwner = selfOwner || false;

      // Util to determine if we have a token to default access.
      const tokenPresent = (_.has(req, 'token') && req.token !== null && _.has(req, 'token.user._id'));

      // See if this request has provided an owner.
      const hasOwner = _.has(req, 'body.owner');

      // Confirm we are only modifying PUT/POST requests.
      const isPut = (req.method === 'PUT');
      const isPost = (req.method === 'POST');
      if (!isPut && !isPost) {
        return next();
      }

      // If req.assignOwner was set by the permissionHandler middleware, allow the request to contain the owner.
      if (_.has(req, 'assignOwner') && req.assignOwner) {
        return next();
      }
      else if (isPost) {
        // Allow an admin to manually override the owner property.
        if (hasOwner && _.has(req, 'isAdmin') && req.isAdmin) {
          return next();
        }

        else if (hasOwner && req.ownerAssign) {
          return next();
        }

        // If the token is present, and the user is not being modified by an admin, default to the token user.
        else if (tokenPresent) {
          _.set(req, 'body.owner', _.get(req, 'token.user._id'));
          return next();
        }
      }
      else if (isPut) {
        // Allow an admin to manually override the owner property.
        if (hasOwner && _.has(req, 'isAdmin') && req.isAdmin) {
          return next();
        }

        // Do not let a non-admin user modify the owner property.
        if (hasOwner) {
          req.body = _.omit(req.body, 'owner');
          return next();
        }
      }

      // If the payload has a owner, but we could not determine who the owner should be, strip the owner data.
      if (hasOwner) {
        req.body = _.omit(req.body, 'owner');
      }

      // Unknown entity owner.
      next();
    };
  };
};
