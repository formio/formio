'use strict';

var _ = require('lodash');
var util = require('formiojs/utils');

/**
 * Go through each field and if Submission Resource Access is defined on it, add it to the submissionAccess array.
 */
module.exports = function(router) {
  const grabIds = function(input) {
    if (!input) {
      return [];
    }

    if (!(input instanceof Array)) {
      input = [input];
    }

    var final = [];
    input.forEach(function(element) {
      if (element && element._id) {
        final.push(element._id);
      }
    });

    return final;
  };

  return function addSubmissionResourceAccess(req, res, next) {
    // Only add on PUT/POST.
    if (!(req.method === 'POST' || req.method === 'PUT')) {
      return next();
    }

    let defaultPermissions = {};
    req.body.access = [];
    router.formio.cache.loadForm(req, undefined, req.params.formId, function(err, form) {
      util.eachComponent(form.components, function(component) {
        if (component.key && component.defaultPermission) {
          defaultPermissions[component.key] = component.defaultPermission;
        }
      }, true);

      // Only proceed if a field has a resource permission.
      const defaultPermissionsKeys = Object.keys(defaultPermissions);
      if (req.body.data && defaultPermissionsKeys.length) {
        _.each(defaultPermissionsKeys, key => {
          // Setup the submission access.
          const perm = defaultPermissions[key];
          let value = req.body.data[key];

          // Coerce value into an array for plucking.
          if (!(value instanceof Array)) {
            value = [value];
          }

          let ids = grabIds(value);
          if (ids.length) {
            // Try to find and update an existing permission.
            let found = false;
            req.body.access.forEach(function(permission) {
              if (permission.type === perm) {
                found = true;
                permission.resources = permission.resources || [];
                permission.resources.concat(ids);
              }
            });

            // Add a permission, because one was not found.
            if (!found) {
              req.body.access.push({
                type: perm,
                resources: ids
              });
            }
          }
        });
        return next();
      }
      else {
        return next();
      }
    });
  };
};
