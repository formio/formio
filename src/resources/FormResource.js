'use strict';

const Resource = require('resourcejs');
const mongoose = require('mongoose');
const _ = require('lodash');

module.exports = function(router) {
  // Include the hook system.
  const hook = require('../util/hook')(router.formio);
  const util = router.formio.util;

  // @TODO: Fix permission check to use the new roles and permissions system.
  const sanitizeValidations = function(req, res, next) {
    if (
      req.method === 'GET' &&
      res.resource &&
      res.resource.item
    ) {
      // Make sure we do not expose private validations.
      const checkPrivateValidation = function(form) {
        if (req.isAdmin) {
          return;
        }

        util.eachComponent(form.components, function(component) {
          if (component.validate && component.validate.customPrivate) {
            delete component.validate.custom;
          }
        });
      };

      // Check both array of forms and objects.
      if (_.isArray(res.resource.item)) {
        _.each(res.resource.item, function(item) {
          checkPrivateValidation(item);
        });
      }
      else {
        checkPrivateValidation(res.resource.item);
      }
    }

    // Move onto the next item.
    next();
  };

  /* eslint-disable new-cap */
  // If the last argument is a function, hook.alter assumes it is a callback function.
  const FormResource = hook.alter('FormResource', Resource, null);

  return FormResource(router, '', 'form', mongoose.model('form'))
    .rest(hook.alter('formRoutes', {
      before: [
        router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
        router.formio.middleware.bootstrapEntityOwner(false),
        router.formio.middleware.formHandler,
        router.formio.middleware.formActionHandler('before'),
        router.formio.middleware.condensePermissionTypes,
        router.formio.middleware.deleteFormHandler,
        router.formio.middleware.mergeFormHandler
      ],
      after: [
        sanitizeValidations,
        router.formio.middleware.bootstrapFormAccess,
        router.formio.middleware.formLoader,
        router.formio.middleware.formActionHandler('after'),
        router.formio.middleware.filterResourcejsResponse(['deleted', '__v'])
      ],
      hooks: {
        put: {
          before(req, res, item, next) {
            if (item.components) {
              item.markModified('components');
            }

            return next();
          }
        }
      }
    }));
};
