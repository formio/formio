'use strict';

const Resource = require('resourcejs');
const _ = require('lodash');

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  const handlers = router.formio.middleware.submissionHandler;
  const hiddenFields = ['deleted', '__v', 'machineName'];

  // Manually update the handlers, to add additional middleware.
  handlers.beforePost = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner,
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.addSubmissionResourceAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    handlers.beforePost
  ];
  handlers.afterPost = [
    handlers.afterPost,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('create', (req) => {
      return router.formio.cache.getCurrentFormId(req);
    })
  ];
  handlers.beforeGet = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeGet
  ];
  handlers.afterGet = [
    handlers.afterGet,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('get', (req) => {
      return router.formio.cache.getCurrentFormId(req);
    })
  ];
  handlers.beforePut = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner,
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.addSubmissionResourceAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    handlers.beforePut
  ];
  handlers.afterPut = [
    handlers.afterPut,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('update', (req) => {
      return router.formio.cache.getCurrentFormId(req);
    })
  ];
  handlers.beforeIndex = [
    (req, res, next) => {
      // If we leave list in query it will interfere with the find query.
      if (req.query.list) {
        req.filterIndex = true;
        delete req.query.list;
      }
      next();
    },
    router.formio.middleware.permissionHandler,
    router.formio.middleware.setFilterQueryTypes,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.ownerFilter,
    router.formio.middleware.submissionResourceAccessFilter,
    handlers.beforeIndex
  ];
  handlers.afterIndex = [
    handlers.afterIndex,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('index', (req) => {
      return router.formio.cache.getCurrentFormId(req);
    }),
    router.formio.middleware.filterIndex(['data'])
  ];
  handlers.beforeDelete = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeDelete,
    router.formio.middleware.deleteSubmissionHandler
  ];
  handlers.afterDelete = [
    handlers.afterDelete,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('delete', (req) => {
      return router.formio.cache.getCurrentFormId(req);
    })
  ];

  // Register an exists endpoint to see if a submission exists.
  router.get('/form/:formId/exists', function(req, res, next) {
    // First load the form.
    router.formio.cache.loadCurrentForm(req, function(err, form) {
      if (err) {
        return next(err);
      }

      // Get the find query for this item.
      const query = router.formio.resources.submission.getFindQuery(req);
      if (_.isEmpty(query)) {
        return res.status(400).send('Invalid query');
      }

      query.form = form._id;
      query.deleted = {$eq: null};
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;

      // Query the submissions for this submission.
      submissionModel.findOne(query, function(err, submission) {
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

  /* eslint-disable new-cap */
  // If the last argument is a function, hook.alter assumes it is a callback function.
  const SubmissionResource = hook.alter('SubmissionResource', Resource, null);

  const submissionResource = SubmissionResource(
    router,
    '/form/:formId',
    'submission',
    router.formio.mongoose.model('submission'),
    {
      convertIds: /(^|\.)(_id|form|owner)$/
    }
  ).rest(hook.alter('submissionRoutes', handlers));
  _.each(handlers, (handler) => {
    _.each(handler, (fn, index) => {
      handler[index] = fn.bind(submissionResource);
    });
  });
  submissionResource.handlers = handlers;
  return submissionResource;
};
