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
  return function bootstrapEntityOwner(req, res, next) {
    // Util to determine if we have a token to default access.
    const tokenPresent = (_.has(req, 'token') && req.token !== null && _.has(req, 'token.user._id'));

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

    // Allow an admin to manually override the owner property.
    if (_.has(req, 'isAdmin') && req.isAdmin) {
      return next();
    }

    // If the token is present, and the user is not being modified by an admin, default to the token user.
    else if (isPost && tokenPresent) {
      _.set(req, 'body.owner', _.get(req, 'token.user._id'));
      return next();
    }

    // Omit the owner from the body.
    req.body = _.omit(req.body, 'owner');
    next();
  };
};
