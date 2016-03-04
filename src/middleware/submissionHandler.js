'use strict';

var _ = require('lodash');
var async = require('async');
var deleteProp = require('delete-property');
var debug = {
  before: require('debug')('formio:middleware:submissionHandler#before'),
  after: require('debug')('formio:middleware:submissionHandler#after')
};
var util = require('../util/util');
var Validator = require('../resources/Validator');

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
     * @param handlerName
     * @param req
     * @param res
     * @param done
     */
    var executeFieldHandler = function(component, handlerName, req, res, done) {
      if (
        fieldActions.hasOwnProperty(component.type) &&
        fieldActions[component.type].hasOwnProperty(handlerName)
      ) {
        // Execute the field handler.
        fieldActions[component.type][handlerName](component, req, res, done);
      }
      else {
        done();
      }
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

        req.currentForm = form;
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
        req.body = _.pick(req.body, hook.alter('submissionParams', ['data', 'owner', 'access']));

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

        // Create a submission object.
        req.submission = _.clone(req.body, true);
      }

      done();
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
      if ((req.method === 'POST') || (req.method === 'PUT')) {
        // Next we need to validate the input.
        var validator = new Validator(req.currentForm, router.formio.resources.submission.model);

        // Validate the request.
        validator.validate(req.body, function(err, value) {
          if (err) {
            return res.status(400).json(err);
          }

          // Reset the value to what the validator returns.
          req.body.data = value;
          done();
        });
      }
      else {
        done();
      }
    };

    /**
     * Execute the application handlers.
     * @param req
     * @param done
     */
    var executeHandlers = function(req, res, done) {
      // Iterate through each component and allow them to alter the query.
      var flattenedComponents = util.flattenComponents(req.currentForm.components);
      async.eachSeries(flattenedComponents, function(component, done) {
        if (
          req.body &&
          component.hasOwnProperty('persistent') &&
          !component.persistent
        ) {
          debug.before('Removing non-persistent field:', component.key);
          // Delete the value from the body if it isn't supposed to be persistent.
          deleteProp('data.' + util.getSubmissionKey(component.key))(req.body);
        }

        // Execute the field handler.
        executeFieldHandler(component, (req.handlerName + 'Action'), req, res, done);
      }, function(err) {
        if (err) {
          return done(err);
        }

        router.formio.actions.execute('before', method.name, req, res, function(err) {
          if (err) {
            return done(err);
          }

          // Fix issues with /PUT adding data to the payload with undefined value.
          if (req.body && req.body.hasOwnProperty('data') && typeof req.body.data === 'undefined') {
            req.body = _.omit(req.body, 'data');
          }

          async.eachSeries(flattenedComponents, function(component, done) {
            executeFieldHandler(component, req.handlerName, req, res, done);
          }, done);
        });
      });
    };

    var before = 'before' + method.method;
    handlers[before] = function(req, res, next) {
      req.handlerName = before;
      async.series([
        async.apply(loadCurrentForm, req),
        async.apply(initializeSubmission, req),
        async.apply(validateSubmission, req, res),
        async.apply(executeHandlers, req, res)
      ], next);
    };

    var after = 'after' + method.method;
    handlers[after] = function(req, res, next) {
      req.handlerName = after;

      // Execute the router action.
      router.formio.actions.execute('after', method.name, req, res, function(err) {
        if (err) {
          debug.after(err);
          return next(err);
        }

        async.eachSeries(util.flattenComponents(req.currentForm.components), function(component, done) {
          executeFieldHandler(component, req.handlerName, req, res, done);
        }, function(err) {
          if (err) {
            return next(err);
          }

          // Make sure to send something if no actions sent anything...
          if (!res.resource && !res.headersSent) {
            res.status(200).json(true);
          }
          next();
        });
      });
    };
  });

  // Return the handlers.
  return handlers;
};
