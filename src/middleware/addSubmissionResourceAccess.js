'use strict';

const _ = require('lodash');
const util = require('formiojs/utils').default;

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

    const final = [];
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

    req.body.access = [];
    router.formio.cache.loadForm(req, undefined, req.params.formId, function(err, form) {
      if (err || !form) {
        return next(`Cannot load form ${req.params.formId}`);
      }

      /* eslint-disable max-depth */
      util.eachComponent(form.components, (component, path) => {
        if (component && component.key && component.defaultPermission) {
          let value = _.get(req.body.data, path);
          if (value) {
            if (!(value instanceof Array)) {
              value = [value];
            }
            const ids = grabIds(value);
            if (ids.length) {
              const perm = _.find(req.body.access, {
                type: component.defaultPermission
              });
              if (perm) {
                if (!perm.resources) {
                  perm.resources = [];
                }
                perm.resources = perm.resources.concat(ids);
              }
              else {
                req.body.access.push({
                  type: component.defaultPermission,
                  resources: ids
                });
              }
            }
          }
        }
      });
      /* eslint-enable max-depth */

      return next();
    });
  };
};
