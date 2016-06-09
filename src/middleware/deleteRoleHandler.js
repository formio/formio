'use strict';

var util = require('../util/util');
var debug = require('debug')('formio:middleware:deleteRoleHandler');

/**
 * The Delete Role Handler middleware.
 *
 * This middleware will determine if a role can be deleted or not.
 * role from being deleted.
 *
 * @param router
 * @returns {Function}
 */
module.exports = function(router) {
  var prune = require('../util/delete')(router);
  return function deleteRoleHandler(req, res, next) {
    // Only stop delete requests!
    if (req.method !== 'DELETE') {
      debug('Skipping');
      return next();
    }

    // Split the request url into its corresponding parameters.
    var params = util.getUrlParams(req.url);

    // Get the roleId from the request url.
    var roleId = params.hasOwnProperty('role')
      ? params.role
      : null;

    if (!roleId) {
      debug('No roleId given.');
      return next();
    }

    // Load the role in question.
    router.formio.resources.role.model.findById(roleId).exec(function(err, role) {
      if (err || !role) {
        debug(err || 'No Role found with roleId: ' + roleId);
        return res.status(404).send('Unknown Role.');
      }
      role = role.toObject();
      debug(role);

      // Do not allow default roles to be deleted.
      if (role.default || role.admin) {
        return res.sendStatus(405);
      }

      prune.role(role._id, req, function(err) {
        if (err) {
          debug(err);
          return next(err);
        }

        debug('Deleted role w/ _id: ' + role._id);
        res.sendStatus(200);
      });
    });
  };
};
