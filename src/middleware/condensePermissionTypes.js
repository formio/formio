'use strict';

var _ = require('lodash');
var debug = require('debug')('formio:middleware:condensePermissionTypes');

/**
 * The Condense Permission Types middleware.
 *
 * This middleware will condense the access and submissionAccess portions of a POST/PUT payload to ensure the permission
 * types are unique per entity.
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function(router) {
  return function condensePermissionTypes(req, res, next) {
    // Only condense permission types on PUT/POST.
    if (!(req.method === 'POST' || req.method === 'PUT')) {
      return next();
    }

    debug('Before: ' + JSON.stringify(req.body));
    var final = null;
    var condensed = null;

    // Attempt to condense the access array if present and populated.
    if (
      req.body
      && req.body.hasOwnProperty('access')
      && req.body.access instanceof Array
      && req.body.access.length > 0
    ) {
      final = [];
      condensed = {};

      // Iterate each defined permission in the access payload, and squash them together.
      req.body.access.forEach(function(permission) {
        permission.roles = permission.roles || [];

        if (permission.type) {
          condensed[permission.type] = condensed[permission.type] || [];
          condensed[permission.type] = condensed[permission.type].concat(permission.roles);
          condensed[permission.type] = _.compact(_.uniq(condensed[permission.type]));
        }
      });

      Object.keys(condensed).forEach(function(key) {
        final.push({
          type: key,
          roles: condensed[key]
        });
      });

      // Modify the payload.
      req.body.access = final;
    }

    // Attempt to condense the submissionAccess array if present and populated.
    if (
      req.body
      && req.body.hasOwnProperty('submissionAccess')
      && req.body.submissionAccess instanceof Array
      && req.body.submissionAccess.length > 0
    ) {
      final = [];
      condensed = {};

      // Iterate each defined permission in the submissionAccess payload, and squash them together.
      req.body.submissionAccess.forEach(function(permission) {
        permission.roles = permission.roles || [];

        if (permission.type) {
          condensed[permission.type] = condensed[permission.type] || [];
          condensed[permission.type] = condensed[permission.type].concat(permission.roles);
          condensed[permission.type] = _.compact(_.uniq(condensed[permission.type]));
        }
      });

      Object.keys(condensed).forEach(function(key) {
        final.push({
          type: key,
          roles: condensed[key]
        });
      });

      // Modify the payload.
      req.body.submissionAccess = final;
    }

    debug('After: ' + JSON.stringify(req.body));
    next();
  };
};
