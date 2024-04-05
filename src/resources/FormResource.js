'use strict';

const Resource = require('resourcejs');
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

  return FormResource(router, '', 'form', router.formio.mongoose.model('form'))
    .rest(hook.alter('formRoutes', {
      before: [
        (req, res, next) => {
          // Disable Patch for forms for now.
          if (req.method === 'PATCH') {
            return res.sendStatus(405);
          }
          return next();
        },
        (req, res, next) => {
          // If we leave list in query it will interfere with the find query.
          if (req.query.list) {
            req.filterIndex = true;
            delete req.query.list;
          }
          next();
        },
        router.formio.middleware.filterIdCreate,
        router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
        router.formio.middleware.bootstrapEntityOwner,
        router.formio.middleware.formHandler,
        router.formio.middleware.formActionHandler('before'),
        router.formio.middleware.condensePermissionTypes,
        router.formio.middleware.deleteFormHandler,
      ],
      after: [
        sanitizeValidations,
        router.formio.middleware.bootstrapFormAccess,
        router.formio.middleware.formRevisionLoader,
        router.formio.middleware.formLoader,
        router.formio.middleware.formActionHandler('after'),
        router.formio.middleware.filterResourcejsResponse(['deleted', '__v']),
        router.formio.middleware.filterIndex(['components', 'properties'])
      ],
      hooks: {
        put: {
          before(req, res, item, next) {
            util.markModifiedParameters(item, ['components', 'properties']);
            return next();
          }
        }
      }
    }));
};
