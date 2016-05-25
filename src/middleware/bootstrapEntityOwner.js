'use strict';

var debug = require('debug')('formio:middleware:bootstrapEntityOwner');
var _ = require('lodash');

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
      debug('selfOwner: ' + req.selfOwner);

      // Util to determine if we have a token to default access.
      var tokenPresent = (_.has(req, 'token') && req.token !== null && _.has(req, 'token.user._id'));

      // See if this request has provided an owner.
      var hasOwner = _.has(req, 'body.owner');

      // Confirm we are only modifying PUT/POST requests.
      var isPut = (req.method === 'PUT');
      var isPost = (req.method === 'POST');
      if (!isPut && !isPost) {
        debug('Skipping');
        return next();
      }

      // If req.assignOwner was set by the permissionHandler middleware, allow the request to contain the owner.
      if (_.has(req, 'assignOwner') && req.assignOwner) {
        debug('assignOwner: ' + req.assignOwner + ', owner: ' + _.get(req, 'body.owner'));
        return next();
      }
      else if (isPost) {
        // Allow an admin to manually override the owner property.
        if (hasOwner && _.has(req, 'isAdmin') && req.isAdmin) {
          debug('Owner override by Admin, owner: ' + _.get(req, 'body.owner'));
          return next();
        }

        else if (hasOwner && !tokenPresent && req.ownerAssign) {
          debug('Owner override by Anonymous permission with create_all access, owner: ' + _.get(req, 'body.owner'));
          return next();
        }

        // If the token is present, and the user is not being modified by an admin, default to the token user.
        else if (tokenPresent) {
          _.set(req, 'body.owner', _.get(req, 'token.user._id'));
          debug('No owner set, default owner: ' + _.get(req, 'body.owner'));
          return next();
        }
      }
      else if (isPut) {
        // Allow an admin to manually override the owner property.
        if (hasOwner && _.has(req, 'isAdmin') && req.isAdmin) {
          debug('Owner override by Admin, owner: ' + _.get(req, 'body.owner'));
          return next();
        }

        // Do not let a non-admin user modify the owner property.
        if (hasOwner) {
          req.body = _.omit(req.body, 'owner');
          debug('Non-admin user cant edit the owner, omitting.');
          return next();
        }
      }

      // If the payload has a owner, but we could not determine who the owner should be, strip the owner data.
      if (hasOwner) {
        req.body = _.omit(req.body, 'owner');
      }

      // Unknown entity owner.
      debug('Unknown entity owner.');
      next();
    };
  };
};
