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
module.exports = (router) => {
  const prune = require('../util/delete')(router);

  return (req, res, next) => {
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

    if (roleId === '000000000000000000000000') {
      return res.sendStatus(405);
    }

    // Load the role in question.
    router.formio.resources.role.model.findById(roleId).lean().exec(function(err, role) {
      if (err || !role) {
        return res.status(404).send('Unknown Role.');
      }

      // Do not allow default roles to be deleted.
      if (role.default || role.admin) {
        return res.sendStatus(405);
      }

      prune.role(role._id, req)
        .then(() => res.sendStatus(200))
        .catch((err) => {
          debug(err);
          return next(err);
        });
    });
  };
};
