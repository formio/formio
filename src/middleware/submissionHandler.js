'use strict';

var _ = require('lodash');
var async = require('async');
var util = require('../util/util');
var Validator = require('../resources/Validator');
var Q = require('q');

module.exports = function(router, resourceName, resourceId) {
  var hook = require('../util/hook')(router.formio);
  var fieldActions = require('../actions/fields/index')(router);
  var handlers = {};

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
    var executeFieldHandler = function(component, path, validation, handlerName, req, res, done) {
      Q()
        .then(function() {
          // If this is a component reference.
          /* eslint-disable max-depth */
          var hiddenFields = ['deleted', '__v', 'machineName'];
          if (component.reference) {
            if (
              (handlerName === 'afterGet') &&
              res.resource &&
              res.resource.item
            ) {
              let formId = component.form || component.resource;
              let compValue = _.get(res.resource.item.data, path);
              if (compValue && compValue._id) {
                return Q.ninvoke(hook, 'alter', 'submissionQuery', {
                  _id: util.idToBson(compValue._id.toString()),
                  deleted: {$eq: null}
                }, null, req)
                  .then((query) => Q.ninvoke(router.formio.resources.submission.model, 'findOne', query))
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
              let formId = component.form || component.resource;
              let resources = [];
              _.each(res.resource.item, (resource) => {
                let compValue = _.get(resource.data, path);
                if (compValue && compValue._id) {
                  resources.push(util.idToBson(compValue._id.toString()));
                }
              });
              return Q.ninvoke(hook, 'alter', 'submissionQuery', {
                _id: {'$in': resources},
                deleted: {$eq: null}
              }, null, req)
                .then((query) => Q.ninvoke(router.formio.resources.submission.model, 'find', query))
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
                    let compValue = _.get(resource.data, path);
                    if (compValue && compValue._id) {
                      let submission = _.find(submissions, (sub) => {
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
              let compValue = _.get(res.resource.item.data, path);
              if (compValue && req.resources.hasOwnProperty(compValue._id)) {
                _.set(res.resource.item.data, path, req.resources[compValue._id]);
              }
            }
            else if (
              ((handlerName === 'beforePost') || (handlerName === 'beforePut')) &&
              req.body
            ) {
              let compValue = _.get(req.body.data, path);
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
    var loadCurrentForm = function(req, done) {
      router.formio.cache.loadCurrentForm(req, function(err, form) {
        if (err) {
          return done(err);
        }
        if (!form) {
          return done('Form not found.');
        }

        req.currentForm = hook.alter('currentForm', form, req.body);
        req.flattenedComponents = util.flattenComponents(form.components);
        done();
      });
    };

    /**
     * Initialize the submission object which includes filtering.
     *
     * @param req
     * @param done
     */
    var initializeSubmission = function(req, done) {
      var isGet = (req.method === 'GET');

      // If this is a get method, then filter the model query.
      if (isGet) {
        req.countQuery = req.countQuery || this.model;
        req.modelQuery = req.modelQuery || this.model;

        // Set the model query to filter based on the ID.
        req.countQuery = req.countQuery.find({form: req.currentForm._id});
        req.modelQuery = req.modelQuery.find({form: req.currentForm._id});
      }

      // If the request has a body.
      if (!isGet && req.body) {
        // By default skip the resource unless they add the save submission action.
        req.skipResource = true;

        // Only allow the data to go through.
        var properties = hook.alter('submissionParams', ['data', 'owner', 'access']);
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
     * Perform hierarchial submissions of sub-forms.
     */
    var submitSubForms = function(req, res, done) {
      if (!req.body || !req.body.data) {
        return done();
      }
      var subsubmissions = [];
      util.eachComponent(req.currentForm.components, (component) => {
        // Find subform components, whose data has not been submitted.
        if (
          (component.type === 'form') &&
          (req.body.data[component.key] && !req.body.data[component.key]._id)
        ) {
          subsubmissions.push((subDone) => {
            var url = '/form/:formId/submission';
            var childRes = {
              send: () => _.noop,
              status: (status) => {
                return {json: (err) => {
                  if (status > 299) {
                    // Add the parent path to the details path.
                    if (err.details && err.details.length) {
                      _.each(err.details, (details) => {
                        if (details.path) {
                          details.path = component.key + '.data.' + details.path;
                        }
                      });
                    }

                    return res.status(status).json(err);
                  }
                }};
              }
            };
            var childReq = util.createSubRequest(req);
            if (!childReq) {
              return res.status(400).send('Too many recursive requests.');
            }
            childReq.body = req.body.data[component.key];
            childReq.params.formId = component.form;
            router.resourcejs[url].post(childReq, childRes, function(err) {
              if (err) {
                return subDone(err);
              }

              if (childRes.resource && childRes.resource.item) {
                req.body.data[component.key] = childRes.resource.item;
              }
              subDone();
            });
          });
        }
      });

      async.series(subsubmissions, done);
    };

    /**
     * Initialize the actions.
     *
     * @param req
     * @param res
     * @param done
     */
    var initializeActions = function(req, res, done) {
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
    var validateSubmission = function(req, res, done) {
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
        // Next we need to validate the input.
        var validator = new Validator(req.currentForm, router.formio.resources.submission.model);

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
    var executeActions = function(handler) {
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
    var executeFieldHandlers = function(validation, req, res, done) {
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
          util.deleteProp('data.' + path)(req.body);
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
    var ensureResponse = function(req, res, done) {
      if (!res.resource && !res.headersSent) {
        res.status(200).json(res.submission || true);
      }
      done();
    };

    var alterSubmission = function(req, res, done) {
      hook.alter('submission', req, res, done);
    };

    // Add before handlers.
    var before = 'before' + method.method;
    handlers[before] = function(req, res, next) {
      req.handlerName = before;
      async.series([
        async.apply(loadCurrentForm, req),
        async.apply(initializeSubmission, req),
        async.apply(submitSubForms, req, res),
        async.apply(initializeActions, req, res),
        async.apply(executeFieldHandlers, false, req, res),
        async.apply(validateSubmission, req, res),
        async.apply(executeFieldHandlers, true, req, res),
        async.apply(alterSubmission, req, res),
        async.apply(executeActions('before'), req, res)
      ], next);
    };

    // Add after handlers.
    var after = 'after' + method.method;
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
