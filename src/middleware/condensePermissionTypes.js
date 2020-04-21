'use strict';

const _ = require('lodash');
const BSON = new RegExp('^[0-9a-fA-F]{24}$');

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

    let final = null;
    let condensed = null;

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
      req.body.access = _.filter(req.body.access, _.isObject);
      req.body.access.forEach(function(permission) {
        permission.roles = _.filter(permission.roles || [], function(item) {
          if (_.isString(item) && BSON.test(item)) {
            return true;
          }

          return false;
        });

        if (_.isString(permission.type)) {
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
      req.body.submissionAccess = _.filter(req.body.submissionAccess, _.isObject);
      req.body.submissionAccess.forEach(function(permission) {
        permission.roles = _.filter(permission.roles || [], function(item) {
          if (_.isString(item) && BSON.test(item)) {
            return true;
          }

          return false;
        });

        if (_.isString(permission.type)) {
          condensed[permission.type] = condensed[permission.type] || {roles: []};
          condensed[permission.type].roles = condensed[permission.type].roles.concat(permission.roles);
          condensed[permission.type].roles = _.compact(_.uniq(condensed[permission.type].roles));
          if (permission.permission) {
            condensed[permission.type].permission = permission.permission;
          }
        }
      });

      Object.keys(condensed).forEach(function(key) {
        const access = {
          type: key,
          roles: condensed[key].roles
        };
        if (condensed[key].permission) {
          access.permission = condensed[key].permission;
        }
        final.push(access);
      });

      // Modify the payload.
      req.body.submissionAccess = final;
    }

    next();
  };
};
