'use strict';

const _ = require('lodash');
const async = require('async');
const util = require('../util/util');
const Validator = require('../resources/Validator');
const Q = require('q');

module.exports = function(router, resourceName, resourceId) {
  const hook = require('../util/hook')(router.formio);
  const fieldActions = require('../actions/fields/index')(router);
  const handlers = {};

  // Iterate through the possible handlers.
  _.each([
    {
      name: 'read',
      method: 'Get'
    },
    {
      name: 'update',
      method: 'Put'
    },
    {
      name: 'create',
      method: 'Post'
    },
    {
      name: 'delete',
      method: 'Delete'
    },
    {
      name: 'index',
      method: 'Index'
    }
  ], function(method) {
    /**
     * Execute the field handler.
     *
     * @param component
     *   The form component.
     * @param path
     *   The path to the data in the request body.
     * @param validation
     *   Whether or not validation is required before executing.
     * @param handlerName
     * @param req
     * @param res
     * @param done
     */
    const executeFieldHandler = function(component, path, validation, handlerName, req, res, done) {
      Q()
        .then(function() {
          // If this is a component reference.
          /* eslint-disable max-depth */
          const hiddenFields = ['deleted', '__v', 'machineName'];
          if (component.reference) {
            if (
              (handlerName === 'afterGet') &&
              res.resource &&
              res.resource.item
            ) {
              const formId = component.form || component.resource || component.data.resource;
              const compValue = _.get(res.resource.item.data, path);
              if (compValue && compValue._id) {
                const submissionModel = req.submissionModel || router.formio.resources.submission.model;

                return Q.ninvoke(hook, 'alter', 'submissionQuery', {
                  _id: util.idToBson(compValue._id.toString()),
                  deleted: {$eq: null}
                }, null, req)
                  .then((query) => Q.ninvoke(submissionModel, 'findOne', query))
                  .then((submission) => new Promise((resolve, reject) => {
                    // Manually filter the protected fields.
                    router.formio.middleware.filterProtectedFields('create', (req) => {
                      return formId;
                    })(req, {resource: {item: submission}}, function(err) {
                      if (err) {
                        return reject(err);
                      }
                      resolve(submission);
                    });
                  }))
                  .then((submission) => {
                    if (submission && submission._id) {
                      _.set(res.resource.item.data, path, _.omit(submission.toObject(), hiddenFields));
                    }
                  });
              }
            }
            else if ((handlerName === 'afterIndex') && res.resource && res.resource.item) {
              const formId = component.form || component.resource;
              const resources = [];
              _.each(res.resource.item, (resource) => {
                const compValue = _.get(resource.data, path);
                if (compValue && compValue._id) {
                  resources.push(util.idToBson(compValue._id.toString()));
                }
              });

              const submissionModel = req.submissionModel || router.formio.resources.submission.model;

              return Q.ninvoke(hook, 'alter', 'submissionQuery', {
                _id: {'$in': resources},
                deleted: {$eq: null}
              }, null, req)
                .then((query) => Q.ninvoke(submissionModel, 'find', query))
                .then((submissions) => new Promise((resolve, reject) => {
                  // Manually filter the protected fields.
                  router.formio.middleware.filterProtectedFields('index', (req) => {
                    return formId;
                  })(req, {resource: {item: submissions}}, function(err) {
                    if (err) {
                      return reject(err);
                    }
                    resolve(submissions);
                  });
                }))
                .then((submissions) => {
                  _.each(res.resource.item, (resource) => {
                    const compValue = _.get(resource.data, path);
                    if (compValue && compValue._id) {
                      const submission = _.find(submissions, (sub) => {
                        return sub._id.toString() === compValue._id.toString();
                      });
                      if (submission) {
                        _.set(resource.data, path, _.omit(submission.toObject(), hiddenFields));
                      }
                    }
                  });
                });
            }
            else if (
              ((handlerName === 'afterPost') || (handlerName === 'afterPut')) &&
              res.resource &&
              res.resource.item &&
              req.resources
            ) {
              // Make sure to reset the value on the return result.
              const compValue = _.get(res.resource.item.data, path);
              if (compValue && req.resources.hasOwnProperty(compValue._id)) {
                _.set(res.resource.item.data, path, req.resources[compValue._id]);
              }
            }
            else if (
              ((handlerName === 'beforePost') || (handlerName === 'beforePut')) &&
              req.body
            ) {
              const compValue = _.get(req.body.data, path);
              if (compValue && compValue._id && compValue.hasOwnProperty('data')) {
                if (!req.resources) {
                  req.resources = {};
                }

                // Save for later.
                req.resources[compValue._id.toString()] = _.omit(compValue, hiddenFields);

                // Ensure we only set the _id of the resource.
                _.set(req.body.data, path, {
                  _id: compValue._id
                });
              }
            }
          }
          /* eslint-enable max-depth */

          return Q();
        })
        .then(function() {
          // Call the unique field action if applicable.
          if (
            fieldActions.hasOwnProperty('unique')
            && fieldActions.unique.hasOwnProperty(handlerName)
            && _.get(component, 'unique') === true
          ) {
            return Q.ninvoke(fieldActions.unique, handlerName, component, path, validation, req, res);
          }

          return Q();
        })
        .then(function() {
          // Check for the field action if available.
          if (
            fieldActions.hasOwnProperty(component.type) &&
            fieldActions[component.type].hasOwnProperty(handlerName)
          ) {
            // Execute the field handler.
            return Q.ninvoke(fieldActions[component.type], handlerName, component, path, validation, req, res);
          }

          return Q();
        })
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    };

    /**
     * Load the current form into the request.
     *
     * @param req
     * @param done
     */
    const loadCurrentForm = function(req, done) {
      router.formio.cache.loadCurrentForm(req, function(err, form) {
        if (err) {
          return done(err);
        }
        if (!form) {
          return done('Form not found.');
        }

        req.currentForm = hook.alter('currentForm', form, req.body);

        // Load all subforms as well.
        router.formio.cache.loadSubForms(req.currentForm, req, function() {
          req.flattenedComponents = util.flattenComponents(form.components);
          return done();
        });
      }, true);
    };

    /**
     * Initialize the submission object which includes filtering.
     *
     * @param req
     * @param done
     */
    const initializeSubmission = function(req, done) {
      const isGet = (req.method === 'GET');

      // If this is a get method, then filter the model query.
      if (isGet) {
        req.countQuery = req.countQuery || req.model || this.model;
        req.modelQuery = req.modelQuery || req.model || this.model;
        if (req.handlerName !== 'beforeGet') {
          // Set the model query to filter based on the ID.
          req.countQuery = req.countQuery.find({form: req.currentForm._id});
          req.modelQuery = req.modelQuery.find({form: req.currentForm._id});
        }
      }

      // If the request has a body.
      if (!isGet && req.body) {
        // By default skip the resource unless they add the save submission action.
        req.skipResource = true;

        // Only allow the data to go through.
        const properties = hook.alter('submissionParams', ['data', 'owner', 'access', 'metadata']);
        req.body = _.pick(req.body, properties);

        // Ensure there is always data provided on POST.
        if (req.method === 'POST' && !req.body.data) {
          req.body.data = {};
        }

        // Ensure they cannot reset the submission id.
        if (req.params.submissionId) {
          req.body._id = req.params.submissionId;
        }

        // Set the form to the current form.
        req.body.form = req.currentForm._id.toString();

        // Allow them to alter the body.
        req.body = hook.alter('submissionRequest', req.body);
      }

      done();
    };

    /**
     * Initialize the actions.
     *
     * @param req
     * @param res
     * @param done
     */
    const initializeActions = function(req, res, done) {
      // If they wish to disable actions, then just skip.
      if (req.query.hasOwnProperty('dryrun') && req.query.dryrun) {
        return done();
      }

      router.formio.actions.initialize(method.name, req, res, done);
    };

    /**
     * Validate a submission.
     *
     * @param req
     * @param form
     * @param done
     */
    const validateSubmission = function(req, res, done) {
      // No need to validate on GET requests.
      if (!((req.method === 'POST' || req.method === 'PUT') && req.body && !req.noValidate)) {
        return done();
      }

      // Assign submission data to the request body.
      req.submission = req.submission || {data: {}};
      if (!_.isEmpty(req.submission.data)) {
        req.body.data = _.assign(req.body.data, req.submission.data);
      }

      // Clone the submission to the real value of the request body.
      req.submission = _.cloneDeep(req.body);

      hook.alter('validateSubmissionForm', req.currentForm, req.body, function(form) {
        // Get the submission model.
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;

        // Next we need to validate the input.
        const token = util.getRequestValue(req, 'x-jwt-token');
        const validator = new Validator(req.currentForm, submissionModel, token);

        // Validate the request.
        validator.validate(req.body, function(err, submission) {
          if (err) {
            return res.status(400).json(err);
          }

          res.submission = {data: submission};

          done();
        });
      });
    };

    /**
     * Execute the actions.
     *
     * @param req
     * @param res
     * @param done
     */
    const executeActions = function(handler) {
      return function(req, res, done) {
        // If they wish to disable actions, then just skip.
        if (req.query.hasOwnProperty('dryrun') && req.query.dryrun) {
          return done();
        }

        // If the body is undefined, then omit the body.
        if (
          (handler === 'before') &&
          (req.body && req.body.hasOwnProperty('data') && typeof req.body.data === 'undefined')
        ) {
          req.body = _.omit(req.body, 'data');
        }

        router.formio.actions.execute(handler, method.name, req, res, done);
      };
    };

    /**
     * Execute the field handlers.
     *
     * @param {boolean} validation
     *   Whether or not validation is require before running the field actions.
     * @param req
     * @param res
     * @param done
     */
    const executeFieldHandlers = function(validation, req, res, done) {
      // If they wish to disable actions, then just skip.
      if (req.query.hasOwnProperty('dryrun') && req.query.dryrun) {
        return done();
      }

      async.eachOfSeries(req.flattenedComponents, function(component, path, cb) {
        if (
          req.body &&
          component.hasOwnProperty('persistent') &&
          !component.persistent
        ) {
          util.deleteProp(`data.${path}`)(req.body);
        }

        executeFieldHandler(component, path, validation, req.handlerName, req, res, cb);
      }, done);
    };

    /**
     * Ensure that a response is always sent.
     *
     * @param req
     * @param res
     * @param done
     */
    const ensureResponse = function(req, res, done) {
      if (!res.resource && !res.headersSent) {
        res.status(200).json(res.submission || true);
      }
      done();
    };

    const alterSubmission = function(req, res, done) {
      hook.alter('submission', req, res, done);
    };

    // Add before handlers.
    const before = `before${method.method}`;
    handlers[before] = function(req, res, next) {
      req.handlerName = before;
      async.series([
        async.apply(loadCurrentForm, req),
        async.apply(initializeSubmission, req),
        async.apply(initializeActions, req, res),
        async.apply(executeFieldHandlers, false, req, res),
        async.apply(validateSubmission, req, res),
        async.apply(executeFieldHandlers, true, req, res),
        async.apply(alterSubmission, req, res),
        async.apply(executeActions('before'), req, res)
      ], next);
    };

    // Add after handlers.
    const after = `after${method.method}`;
    handlers[after] = function(req, res, next) {
      req.handlerName = after;
      async.series([
        async.apply(executeActions('after'), req, res),
        async.apply(executeFieldHandlers, true, req, res),
        async.apply(alterSubmission, req, res),
        async.apply(ensureResponse, req, res)
      ], next);
    };
  });

  // Return the handlers.
  return handlers;
};
