'use strict';

const _ = require('lodash');

/**
 * The Condense Submission Permission Types middleware.
 *
 * This middleware will condense the submission access portions of a POST/PUT payload to ensure the permission
 * types are unique per entity.
 */
module.exports = function(router) {
  return function condenseSubmissionPermissionTypes(req, res, next) {
    // Only condense permission types on PUT/POST.
    if (!(req.method === 'POST' || req.method === 'PUT')) {
      return next();
    }

    // Skip the condense if no access was provided.
    if (!_.has(req, 'body.access')) {
      return next();
    }

    const final = [];
    const condensed = {};

    // Create permissions map for permissions with a type and resources.
    _.each(req.body.access, function(permission) {
      if (
        _.has(permission, 'type')
        && _.includes(['read', 'create', 'update', 'delete', 'write', 'admin'], permission.type)
        && _.has(permission, 'resources')
        && (_.get(permission, 'resources') instanceof Array)
      ) {
        // Ensure the permission type is defined.
        condensed[permission.type] = condensed[permission.type] || [];

        // Add the roles to the specific type.
        _.each(permission.resources, function(id) {
          condensed[permission.type].push(router.formio.util.idToString(id));
        });
      }
    });

    // Translate permissions map to permissions object.
    _.each(Object.keys(condensed), function(key) {
      final.push({
        type: key,
        resources: _(condensed[key])
          .uniq()
          .value()
      });
    });

    // Modify the payload.
    req.body.access = final;
    next();
  };
};
