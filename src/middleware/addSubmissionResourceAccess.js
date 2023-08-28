'use strict';

const _ = require('lodash');
const util = require('../util/util');

/**
 * Go through each field and if Submission Resource Access is defined on it, add it to the submissionAccess array.
 */
module.exports = (router) => {
  const grabIds = (input, roles = []) => {
    if (!input) {
      return [];
    }

    if (!Array.isArray(input)) {
      input = [input];
    }

    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    roles = roles.filter(_.identity);

    return input.flatMap((element) => {
      if (!element || !element._id) {
        return [];
      }

      return roles.length
        ? roles.map((role) => (`${element._id}:${role}`))
        : element._id;
    });
  };

  return function addSubmissionResourceAccess(req, res, next) {
    // Only add on PUT/POST/PATCH.
    if (!(req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      return next();
    }

    req.body.access = [];
    router.formio.cache.loadForm(req, undefined, req.params.formId, function(err, form) {
      if (err || !form) {
        return next(`Cannot load form ${req.params.formId}`);
      }

      /* eslint-disable max-depth */
      util.FormioUtils.eachComponent(form.components, (component, path) => {
        if (component && component.key && (component.submissionAccess || component.defaultPermission)) {
          if (!component.submissionAccess) {
            component.submissionAccess = [
              {
                type: component.defaultPermission,
                roles: [],
              },
            ];
          }

          let value = _.get(req.body.data, path);
          if (!_.isEmpty(value)) {
            if (req.method === 'PATCH') {
              value._id = value._id.toString();
            }

            if (!Array.isArray(value)) {
              value = [value];
            }

            component.submissionAccess.map((access) => {
              const ids = grabIds(value, access.roles);
              if (ids.length) {
                const perm = _.find(req.body.access, {
                  type: access.type,
                });
                if (perm) {
                  if (!perm.resources) {
                    perm.resources = [];
                  }
                  perm.resources = perm.resources.concat(ids);
                }
                else {
                  req.body.access.push({
                    type: access.type,
                    resources: ids,
                  });
                }
              }
            });
          }
        }
      });
      /* eslint-enable max-depth */

      return next();
    });
  };
};
