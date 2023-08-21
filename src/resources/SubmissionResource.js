'use strict';

const ResourceFactory = require('resourcejs');
const Resource = ResourceFactory.Resource;
const _ = require('lodash');

module.exports = (router) => {
  const hook = require('../util/hook')(router.formio);
  const handlers = router.formio.middleware.submissionHandler;
  const hiddenFields = ['deleted', '__v', 'machineName'];

  // Manually update the handlers, to add additional middleware.
  handlers.beforePost = [
    router.formio.middleware.filterIdCreate,
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner,
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.addSubmissionResourceAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    handlers.beforePost,
  ];
  handlers.afterPost = [
    handlers.afterPost,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('create', (req) => router.formio.cache.getCurrentFormId(req)),
  ];
  handlers.beforeGet = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeGet,
  ];
  handlers.afterGet = [
    handlers.afterGet,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('get', (req) => router.formio.cache.getCurrentFormId(req)),
    (req, res, next) => {
      router.formio.cache.loadCurrentForm(req, (err, currentForm) => {
        return hook.alter('getSubmissionRevisionModel', router.formio, req, currentForm, false, next);
      });
    },
    router.formio.middleware.submissionRevisionLoader
  ];
  handlers.beforePut = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.submissionApplyPatch,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.bootstrapEntityOwner,
    router.formio.middleware.bootstrapSubmissionAccess,
    router.formio.middleware.addSubmissionResourceAccess,
    router.formio.middleware.condenseSubmissionPermissionTypes,
    router.formio.middleware.loadPreviousSubmission,
    handlers.beforePut,
  ];
  handlers.afterPut = [
    handlers.afterPut,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('update', (req) => router.formio.cache.getCurrentFormId(req)),
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
    router.formio.middleware.filterMongooseExists({
      field: 'deleted',
      isNull: true,
      resource: 'submission',
    }),
    router.formio.middleware.ownerFilter,
    router.formio.middleware.submissionResourceAccessFilter,
    router.formio.middleware.submissionFieldMatchAccessFilter,
    handlers.beforeIndex,
  ];
  handlers.afterIndex = [
    handlers.afterIndex,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('index', (req) => router.formio.cache.getCurrentFormId(req)),
    router.formio.middleware.filterIndex(['data']),
  ];
  handlers.beforeDelete = [
    router.formio.middleware.permissionHandler,
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    handlers.beforeDelete,
    router.formio.middleware.loadPreviousSubmission,
    router.formio.middleware.deleteSubmissionHandler,
  ];
  handlers.afterDelete = [
    handlers.afterDelete,
    router.formio.middleware.filterResourcejsResponse(hiddenFields),
    router.formio.middleware.filterProtectedFields('delete', (req) => router.formio.cache.getCurrentFormId(req)),
  ];

  // Register an exists endpoint to see if a submission exists.
  router.get('/form/:formId/exists', (req, res, next) => {
    const {ignoreCase = false} = req.query;
    // We need to strip the ignoreCase query out so resourcejs does not use it as a filter
    if (ignoreCase) {
      delete req.query['ignoreCase'];
    }
    // First load the form.
    router.formio.cache.loadCurrentForm(req, (err, form) => {
      if (err) {
        return next(err);
      }

      hook.alter('getSubmissionModel', router.formio, req, form, false, (err, reqModel) => {
        // Get the find query for this item.
        const query = router.formio.resources.submission.getFindQuery(req);
        if (_.isEmpty(query)) {
          return res.status(400).send('Invalid query');
        }

        query.form = form._id;
        query.deleted = {$eq: null};
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;

        // Query the submissions for this submission.
        submissionModel.findOne(
          hook.alter('submissionQuery', query, req),
          null,
          (ignoreCase && router.formio.mongoFeatures.collation) ? {collation: {locale: 'en', strength: 2}} : {},
          (err, submission) => {
            if (err) {
              return next(err);
            }

            // Return not found.
            if (!submission || !submission._id) {
              return res.status(404).send('Not found');
            }
            // By default check permissions to access the endpoint.
            const withoutPermissions = _.get(form, 'settings.allowExistsEndpoint', false);

            if (withoutPermissions) {
              // Send only the id as a response if the submission exists.
              return res.status(200).json({
                _id: submission._id.toString(),
              });
            }
            else {
              req.subId = submission._id.toString();
              req.permissionsChecked = false;
              return next();
            }
          }
        );
      });
    });
  }, router.formio.middleware.permissionHandler, (req, res, next) => {
    return res.status(200).json({
      _id: req.subId,
    });
  });

  router.delete('/form/:formId/submission',
    ...handlers.beforeDelete.filter((_, idx) => idx !== 1),
    ...handlers.afterDelete,
    (req, res) => {
      return res.resource
        ? res.status(res.resource.status).json(res.resource.item)
        : res.sendStatus(400);
    }
  );

  class SubmissionResource extends Resource {
    patch(options) {
      options = Resource.getMethodOptions('put', options);
      this.methods.push('patch');
      this._register('patch', `${this.route}/:${this.name}Id`, (req, res, next) => {
        // Store the internal method for response manipulation.
        req.__rMethod = 'patch';

        if (req.skipResource) {
          return next();
        }

        // Remove __v field
        const update = _.omit(req.body, '__v');
        const query = req.modelQuery || req.model || this.model;

        query.findOne({_id: req.params[`${this.name}Id`]}, (err, item) => {
          if (err) {
            return Resource.setResponse(res, {status: 400, error: err}, next);
          }

          if (!item) {
            return Resource.setResponse(res, {status: 404}, next);
          }

          item.set(update);
          options.hooks.put.before.call(
            this,
            req,
            res,
            item,
            () => {
              const writeOptions = req.writeOptions || {};
              item.save(writeOptions, (err, item) => {
                if (err) {
                  return Resource.setResponse(res, {status: 400, error: err}, next);
                }

                return options.hooks.put.after.call(
                  this,
                  req,
                  res,
                  item,
                  Resource.setResponse.bind(Resource, res, {status: 200, item}, next),
                );
              });
            },
          );
        });
      }, Resource.respond, options);
      return this;
    }
  }

  // Since we are handling patching before we get to resourcejs, make it work like put.

  const MySubmissionResource = hook.alter('SubmissionResource', SubmissionResource, null);

  const submissionResource = new MySubmissionResource(
    router,
    '/form/:formId',
    'submission',
    router.formio.mongoose.model('submission'),
    {
      convertIds: /(^|\.)(_id|form|owner)$/,
    },
  ).rest(hook.alter('submissionRoutes', {
    ...handlers,
    hooks: {
      put: {
        before(req, res, item, next) {
          if (item.data) {
            item.markModified('data');
          }

          return next();
        },
      },
    },
  }));

  _.each(handlers, (handler) => {
    _.each(handler, (fn, index) => {
      handler[index] = fn.bind(submissionResource);
    });
  });
  submissionResource.handlers = handlers;
  return submissionResource;
};
