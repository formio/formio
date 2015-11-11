'use strict';

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var Validator = require('../resources/Validator');
var util = require('../util/util');
var debug = require('debug')('formio:action:default');

module.exports = function(router) {
  var Action = router.formio.Action;
  var DefaultAction = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  DefaultAction.prototype = Object.create(Action.prototype);
  DefaultAction.prototype.constructor = DefaultAction;
  DefaultAction.info = function(req, res, next) {
    next(null, {
      name: 'default',
      title: 'Default',
      description: 'Provides the default form submission capabilities.',
      priority: 10,
      defaults: {
        handler: ['before'],
        method: ['create', 'update']
      }
    });
  };

  DefaultAction.settingsForm = function(req, res, next) {
    next(null, []);
  };

  /**
   * Resolve the default action.
   *
   * @param handler
   * @param method
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  DefaultAction.prototype.resolve = function(handler, method, req, res, next) {
    // Return if this is not a PUT or POST.
    if (req.disableDefaultAction || !req.body || (req.method !== 'POST' && req.method !== 'PUT')) {
      return next();
    }

    var initiallyEmpty = (req.body.data && Object.keys(req.body.data).length === 0);

    // Establish our resource data array.
    var resourceData = _.assign({}, req.resourceData); // For actions that set resource data
    var submissionData = {};

    // Iterate through all of our data in the request.
    _.each(req.body.data, function(data, key) {
      // Look for the '.' in the key name.
      if (key.indexOf('.') !== -1) {
        // Assign the value of this item to the resourceData object.
        var parts = key.match(/([^.]+)\.(.*)$/);
        if (parts.length === 3) {
          var rName = parts[1];
          var fieldName = parts[2];
          if (!resourceData[rName]) {
            resourceData[rName] = {data: {}};
          }
          if (fieldName === '_id') {
            resourceData[rName]._id = data;
          }
          else {
            resourceData[rName].data[fieldName] = data;
          }

          // Remove this particular field from the data.
          delete req.body.data[key];
        }
        else {
          // Add this as normal data.
          req.body.data[key] = submissionData[key] = data;
        }
      }
      else {
        // Add the data to the submission data.
        req.body.data[key] = submissionData[key] = data;
      }
    });

    debug('submissionData: ' + JSON.stringify(submissionData));
    debug('resourceData: ' + JSON.stringify(resourceData));

    // Load the current form.
    router.formio.cache.loadCurrentForm(req, function(err, currentForm) {
      // Next we need to validate the input.
      var validator = new Validator(currentForm, router.formio.resources.submission.model);

      // Validate the request.
      validator.validate(submissionData, req.submission, function(err, value) {
        if (err) {
          debug(err);
          return res.status(400).json(err);
        }

        // Iterate through each item in resource data.
        async.eachSeries(_.keys(resourceData), function(name, done) {
          router.formio.cache.loadFormByName(req, name, function(error, childResource) {
            if (error) {
              return done(error);
            }
            if (!childResource) {
              return done(new Error('Child resource not found.'));
            }

            // Here we will clone the request, and then change the request body
            // and parameters to make it seem like a separate request to update
            // the child submissions.
            var childReq = util.createSubRequest(req);
            childReq.noResponse = true;
            childReq.body = resourceData[name];
            childReq.formId = childReq.params.formId = childResource._id.toString();

            var url = '/form/:formId/submission';
            var method = req.method.toLowerCase();
            if (method === 'put') {
              if (resourceData[name]._id) {
                childReq.subId = childReq.params.submissionId = resourceData[name]._id;
                url += '/:submissionId';
              }
              else {
                return done('Unknown resource - ' + name + '.'); // Return an error.
              }
            }

            childReq.url = url;
            childReq.method = method.toUpperCase();
            if (router.resourcejs.hasOwnProperty(url) && router.resourcejs[url].hasOwnProperty(method)) {
              // Call the Resource.js
              router.resourcejs[url][method].call(this, childReq, res, function() {

                // Assign the resource item back to the resourceData for saving.
                resourceData[name] = res.resource.item;

                // Move onto the next resource.
                done.apply(this, arguments);
              });
            }
            else {
              done('Unknown resource handler.');
            }
          });
        }, function(error) {
          if (error) {
            debug(error);
            return next(error);
          }

          // Update the request body to ignore keys that were removed during validation.
          req.body.data = value;
          req.body.data = _.assign(req.body.data, resourceData);

          // Strip out the data object if it is empty, to stop the submission from being cleared.
          if (typeof req.body.data === 'object' && Object.keys(req.body.data).length === 0 && !initiallyEmpty) {
            req.body = _.omit(req.body, 'data');
          }

          debug(req.body);
          next();
        });
      });
    });
  };

  // Return the DefaultAction.
  return DefaultAction;
};
