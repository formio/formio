'use strict';

var Resource = require('resourcejs');
var mongoose = require('mongoose');
var _ = require('lodash');

module.exports = function(router) {

  // Include the hook system.
  var hook = require('../util/hook')(router.formio);

  // @TODO: Fix permission check to use the new roles and permissions system.
  var sanitizeValidations = function(req, res, next) {
    if (
      req.method === 'GET' &&
      res.resource &&
      res.resource.item
    ) {
      // Make sure we do not expose private validations.
      var checkPrivateValidation = function(form) {
        var hasAccess = false;
        if (req.user) {
          _.each(form.access, function(access) {
            if (access && access.hasOwnProperty('id') && (access.id.toString() === req.user._id.toString())) {
              hasAccess = true;
              return;
            }
          });
        }
        if (hasAccess) {
          return;
        }

        _.each(form.components, function(component, index) {
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

  return Resource(router, '', 'form', mongoose.model('form', router.formio.schemas.form)).rest(hook.alter('formRoutes', {
    before: [
      router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
      router.formio.middleware.bootstrapEntityOwner(false),
      router.formio.middleware.formHandler,
      router.formio.middleware.formActionHandler('before'),
      router.formio.middleware.condensePermissionTypes,
      router.formio.middleware.deleteFormHandler
    ],
    after: [
      sanitizeValidations,
      router.formio.middleware.bootstrapFormAccess,
      router.formio.middleware.formActionHandler('after'),
      router.formio.middleware.filterResourcejsResponse(['deleted', '__v'])
    ]
  }));
};
