'use strict';

/**
 * Middleware to filter the request by owner.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  return function ownerFilter(req, res, next) {
    // Skip this owner filter, if the user is the admin or owner.
    if (req.skipOwnerFilter || req.isAdmin) {
      return next();
    }

    if (!req.token || !req.token.user) {
      return res.sendStatus(401);
    }

    req.modelQuery = req.modelQuery || this.model;
    req.modelQuery = req.modelQuery.find({owner: req.token.user._id});
    next();
  };
};
