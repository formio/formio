'use strict';

var _ = require('lodash');
var async = require('async');
var deleteProp = require('delete-property');
var debug = {
  before: require('debug')('formio:middleware:submissionHandler#before'),
  after: require('debug')('formio:middleware:submissionHandler#after')
};
var util = require('../util/util');

module.exports = function (router, resourceName, resourceId) {
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

    var before = 'before' + method.method;
    handlers[before] = function(req, res, next) {
      req.handlerName = before;

      // Load the resource.
      router.formio.cache.loadCurrentForm(req, function(err, form) {
        if (err) {
          debug.before(err);
          return next(err);
        }
        if (!form) {
          debug.before('Form not found');
          return next('Form not found');
        }

        var formId = form._id.toString();
        var isGet = (req.method === 'GET');

        // If this is a get method, then filter the model query.
        if (isGet) {
          req.countQuery = req.countQuery || this.model;
          req.modelQuery = req.modelQuery || this.model;

          // Set the model query to filter based on the ID.
          req.countQuery = req.countQuery.find({form: form._id});
          req.modelQuery = req.modelQuery.find({form: form._id});
        }

        // If the request has a body.
        if (!isGet && req.body) {
          var _old = _.clone(req.body, true);
          debug.before('old: ' + JSON.stringify(_old));

          // Filter the data received, and only allow submission.data and specific fields specified.
          req.body = {
            form: formId // Assign the body form to the value of the ID parameter.
          };

          // Add the original data if present.
          if (_old.hasOwnProperty('data') && _old.data) {
            req.body.data = _old.data;
          }

          // Keep the owner in the payload for re-assignment (will be removed by bootstrapEntityOwner if invalid action)
          if (_old.hasOwnProperty('owner') && _old.owner && (typeof _old.owner === 'string')) {
            req.body.owner = _old.owner;
          }

          req.body = hook.alter('submissionRequest', req.body, _old);

          // Store the original request body in a submission object.
          debug.before('new: ' + JSON.stringify(req.body));
          req.submission = _.clone(req.body, true);

          // Ensure they cannot reset the submission id.
          if (req.params.submissionId) {
            req.submission._id = req.params.submissionId;
          }
        }

        // Iterate through each component and allow them to alter the query.
        var flattenedComponents = util.flattenComponents(form.components);
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
        }, function(error) {
          if (error) {
            return next(error);
          }

          router.formio.actions.execute('before', method.name, req, res, function(executeErr) {
            if (executeErr) {
              return next(executeErr);
            }

            // Fix issues with /PUT adding data to the payload with undefined value.
            if (req.body && req.body.hasOwnProperty('data') && typeof req.body.data === 'undefined') {
              req.body = _.omit(req.body, 'data');
            }

            async.eachSeries(flattenedComponents, function(component, done) {
              executeFieldHandler(component, req.handlerName, req, res, done);
            }, next);
          });
        });
      }.bind(this));
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

        // Load the current form.
        debug.after('Loading the form.');
        router.formio.cache.loadCurrentForm(req, function(err, currentForm) {
          async.eachSeries(util.flattenComponents(currentForm.components), function(component, done) {
            executeFieldHandler(component, req.handlerName, req, res, done);
          }, next);
        });
      });
    };
  });

  // Return the handlers.
  return handlers;
};
