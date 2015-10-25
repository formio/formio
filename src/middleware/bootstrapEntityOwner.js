'use strict';

var debug = require('debug')('formio:middleware:bootstrapEntityOwner');

/**
 * The Bootstrap Entity Owner middleware.
 *
 * This middleware will set the user of the current request as the owner of the entity being created.
 *
 * @param router
 */
module.exports = function(router) {
  return function bootstrapEntityOwner(selfOwner) {
    return function bootstrapEntityOwner(req, res, next) {
      // Set the flag for self ownership if present.
      req.selfOwner = selfOwner || false;
      debug('selfOwner: ' + req.selfOwner);

      // Modify put/post requests.
      var isPut = (req.method === 'PUT');
      var isPost = (req.method === 'POST');
      if (!isPut && !isPost) {
        debug('Skipping');
        return next();
      }

      // If req.assignOwner was set by the permissionHandler middleware, allow the request to contain the owner.
      if (req.hasOwnProperty('assignOwner') && req.assignOwner) {
        debug('assignOwner: ' + req.assignOwner + ', owner: ' + req.body.owner);
        return next();
      }
      // The owner property is set.
      else if (req.body.hasOwnProperty('owner')) {
        // Check the user token.
        if (req.hasOwnProperty('token') && req.token !== null) {
          // Check if they can set the owner property.
          if (req.isAdmin || (req.body.owner === req.token.user._id)) {
            debug('owner: ' + req.token.user._id);
            return next();
          }
        }

        // Can only assign yourself as the owner if not granted permissions by the permissionHandler.
        return res.sendStatus(401);
      }
      // If req.body.owner was not set, but a token is present.
      else if (isPost && req.hasOwnProperty('token') && req.token !== null) {
        req.body.owner = req.token.user._id;
        debug('owner: ' + req.body.owner);
        return next();
      }
      else if (isPut && !req.body.hasOwnProperty('owner')) {
        debug('owner: ' + req.body.owner);
        return next();
      }

      // Unknown entity owner.
      debug('Unknown entity owner.');
      req.body.owner = null;
      next();
    };
  };
};
