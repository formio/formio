'use strict';

var Resource = require('resourcejs');
var mongoose = require('mongoose');
var _ = require('lodash');

module.exports = function(router) {
  // Include the hook system.
  var hook = require('../util/hook')(router.formio);
  let util = router.formio.util;

  // @TODO: Fix permission check to use the new roles and permissions system.
  var sanitizeValidations = function(req, res, next) {
    if (
      req.method === 'GET' &&
      res.resource &&
      res.resource.item
    ) {
      // Make sure we do not expose private validations.
      var checkPrivateValidation = function(form) {
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

  return Resource(router, '', 'form', mongoose.model('form', router.formio.schemas.form))
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
        before: function(req, res, item, next) {
          if (item.components) {
            item.markModified('components');
          }

          return next();
        }
      }
    }
  }));
};
