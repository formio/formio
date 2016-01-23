'use strict';

var Resource = require('resourcejs');
var mongoose = require('mongoose');

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  var handlers = router.formio.middleware.submissionHandler;
  var hiddenFields = ['deleted', '__v', 'machineName'];

  // Manually update the handlers, to add additional middleware.
  handlers.beforePost = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner(true),
    router.formio.middleware.bootstrapSubmissionAccess,
    handlers.beforePost
  ];
  handlers.afterPost = [
    handlers.afterPost,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields
  ];
  handlers.beforeGet = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeGet
  ];
  handlers.afterGet = [
    handlers.afterGet,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields
  ];
  handlers.beforePut = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner(false),
    router.formio.middleware.bootstrapSubmissionAccess,
    handlers.beforePut
  ];
  handlers.afterPut = [
    handlers.afterPut,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields
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
    router.formio.middleware.filterProtectedFields
  ];
  handlers.beforeDelete = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeDelete,
    router.formio.middleware.deleteSubmissionHandler
  ];
  handlers.afterDelete = [
    handlers.afterDelete,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields
  ];

  return Resource(
    router,
    '/form/:formId',
    'submission',
    mongoose.model('submission', router.formio.schemas.submission)
  ).rest(hook.alter('submissionRoutes', handlers));
};
