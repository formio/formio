'use strict';

var Resource = require('resourcejs');
var mongoose = require('mongoose');
var utils = require('formio-utils');
var _ = require('lodash');

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  var handlers = router.formio.middleware.submissionHandler;
  var hiddenFields = ['deleted', '__v', 'machineName'];

  // Manually update the handlers, to add additional middleware.
  handlers.beforePost = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner(true),
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    handlers.beforePost
  ];
  handlers.afterPost = [
    handlers.afterPost,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('create')
  ];
  handlers.beforeGet = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeGet
  ];
  handlers.afterGet = [
    handlers.afterGet,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('get')
  ];
  handlers.beforePut = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner(false),
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    handlers.beforePut
  ];
  handlers.afterPut = [
    handlers.afterPut,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('update')
  ];
  handlers.beforeIndex = [
    router.formio.middleware.setFilterQueryTypes,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.ownerFilter,
    router.formio.middleware.submissionResourceAccessFilter,
    handlers.beforeIndex
  ];
  handlers.afterIndex = [
    handlers.afterIndex,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('index')
  ];
  handlers.beforeDelete = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeDelete,
    router.formio.middleware.deleteSubmissionHandler
  ];
  handlers.afterDelete = [
    handlers.afterDelete,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('delete')
  ];

  // Register an exists endpoint to see if a submission exists.
  router.get('/form/:formId/exists', function(req, res, next) {
    // First load the form.
    router.formio.cache.loadCurrentForm(req, function(err, form) {
      if (err) {
        return next(err);
      }

      // Start the query.
      var query = {
        form: form._id,
        deleted: {$eq: null}
      };

      // Default the query to not be valid.
      var queryValid = false;

      // Allow them to provide the owner flag.
      if (req.query.owner) {
        query.owner = req.query.owner;
        queryValid = true;
      }

      var queryComponents = {};
      _.each(req.query, function(value, key) {
        var parts = key.split('.');
        if (parts[0] === 'data' && parts.length > 1) {
          queryComponents[parts[1]] = {
            value: value,
            key: key
          };
        }
      });

      // Build the data query.
      utils.eachComponent(form.components, function(component) {
        // Only add components that are not protected and are persistent.
        if (
          queryComponents.hasOwnProperty(component.key) &&
          !component.protected &&
          (!component.hasOwnProperty('persistent') || component.persistent)
        ) {
          queryValid = true;

          // Get the query component.
          var queryComponent = queryComponents[component.key];

          // Add this to the query data.
          query[queryComponent.key] = queryComponent.value;
        }
      });

      // Ensure they provide query components.
      if (!queryValid) {
        return res.status(400).send('Invalid Query.');
      }

      // Query the submissions for this submission.
      router.formio.resources.submission.model.findOne(query, function(err, submission) {
        if (err) {
          return next(err);
        }

        // Return not found.
        if (!submission || !submission._id) {
          return res.status(404).send('Not found');
        }

        // Send only the id as a response if the submission exists.
        return res.status(200).json({
          _id: submission._id.toString()
        });
      });
    });
  });

  return Resource(
    router,
    '/form/:formId',
    'submission',
    mongoose.model('submission', router.formio.schemas.submission)
  ).rest(hook.alter('submissionRoutes', handlers));
};
