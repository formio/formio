'use strict';

const util = require('../util/util');
const debug = require('debug')('formio:middleware:deleteRoleHandler');

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
  const prune = require('../util/delete')(router);
  return function deleteRoleHandler(req, res, next) {
    // Only stop delete requests!
    if (req.method !== 'DELETE') {
      return next();
    }

    // Split the request url into its corresponding parameters.
    const params = util.getUrlParams(req.url);

    // Get the roleId from the request url.
    const roleId = params.hasOwnProperty('role')
      ? params.role
      : null;

    if (!roleId) {
      return next();
    }

    // Load the role in question.
    router.formio.resources.role.model.findById(roleId).exec(function(err, role) {
      if (err || !role) {
        return res.status(404).send('Unknown Role.');
      }
      role = role.toObject();

      // Do not allow default roles to be deleted.
      if (role.default || role.admin) {
        return res.status(405).send('Not Allowed');
      }

      prune.role(role._id, req, function(err) {
        if (err) {
          debug(err);
          return next(err);
        }

        res.status(200).send('OK');
      });
    });
  };
};
