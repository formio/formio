'use strict';

var debug = require('debug')('formio:middleware:bootstrapEntityOwner');

/**
 * The Bootstrap Entity Owner middleware.
 *
 * This middleware will set the user of the current request as the owner of the entity being created.
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function(router) {
  return function bootstrapEntityOwner(req, res, next) {
    var isPut = (req.method === 'PUT');
    var isPost = (req.method === 'POST');

    // Allow users to attach owners on POST/PUT requests.
    debug(isPut || isPost);
    if (isPut || isPost) {
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

        // Can only assign youself as the owner if not granted permissions by the permissionHandler.
        return res.sendStatus(401);
      }
      // If req.body.owner was not set, but a token is present.
      else if (isPost && req.hasOwnProperty('token') && req.token !== null) {
        debug('owner: ' + req.token.user._id);
        req.body.owner = req.token.user._id;
        debug(req.body.owner);
        return next();
      }
      else if (isPut && !req.body.hasOwnProperty('owner')) {
        debug('owner: ' + null);
        return next();
        debug(req.body.owner);
      }
    }

    // Unknown entity owner.
    req.body.owner = null;
    debug(req.body.owner);
    next();
  };
};
