'use strict';

var async = require('async');
var mongoose = require('mongoose');
var debug = require('debug')('formio:action:resource');
var _ = require('lodash');
var Validator = require('../resources/Validator');
var util = require('../util/util');

module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = require('../util/hook')(router.formio);

  /**
   * ResourceAction class.
   *   This class is used to create the Authentication action.
   *
   * @constructor
   */
  var ResourceAction = function(data, req, res) {
    Action.call(this, data, req, res);

    // Disable the default action if the association is existing.
    req.disableDefaultAction = (data.settings.association === 'existing');
  };

  // Derive from Action.
  ResourceAction.prototype = Object.create(Action.prototype);
  ResourceAction.prototype.constructor = ResourceAction;
  ResourceAction.info = function(req, res, next) {
    next(null, {
      name: 'resource',
      title: 'Submit to another Resource',
      description: 'Allows storage into a Resource from this form submission.',
      priority: 10,
      defaults: {
        handler: ['before'],
        method: ['create', 'update']
      },
      access: {
        handler: false,
        method: true
      }
    });
  };

  /**
   * Settings form for auth action.
   *
   * @param req
   * @param res
   * @param next
   */
  ResourceAction.settingsForm = function(req, res, next) {
    var dataSrc = hook.alter('url', '/form', req);
    router.formio.resources.role.model.find(hook.alter('roleQuery', {deleted: {$eq: null}}, req))
      .sort({title: 1})
      .exec(function(err, roles) {
        if (err || !roles) {
          return res.status(400).send('Could not load the Roles.');
        }
        next(null, [
          {
            type: 'resourcefields',
            key: 'settings[resource]',
            basePath: dataSrc,
            form: req.params.formId
          },
          {
            type: 'fieldset',
            legend: 'Assigned Role (only required for authentication)',
            components: [
              {
                type: 'select',
                input: true,
                label: '',
                key: 'settings[role]',
                placeholder: 'Select the Role that will be added to new Resources',
                template: '<span>{{ item.title }}</span>',
                dataSrc: 'json',
                data: {json: roles},
                valueProperty: '_id',
                multiple: false
              }
            ]
          }
        ]);
      });
  };

  /**
   * Resolve the resource action.
   *
   * @param handler
   * @param method
   * @param req {Object}
   *   The Express request object.
   * @param res {Object}
   *   The Express response object.
   * @param next {Function}
   *   The callback function to execute upon completion.
   */
  ResourceAction.prototype.resolve = function(handler, method, req, res, next) {
    if (!this.settings.resource || req.skipResourceAction) {
      return next();
    }

    // Load the form that they selected within the resource action settings.
    router.formio.cache.loadForm(req, 'resource', this.settings.resource, function(error, resource) {
      if (error) {
        return next(error);
      }

      /**
       * Submit the resource.
       * @param submission
       */
      var submitResource = function(submission) {
        _.each(this.settings.fields, function(field, key) {
          submission.data[key] = req.body.data[field];
        });

        // Next we need to validate the input.
        var validator = new Validator(resource, router.formio.resources.submission.model);

        // Validate the request.
        validator.validate(submission.data, req.submission, function(err, value) {
          if (err) {
            debug(err);
            return res.status(400).json(err);
          }

          var childReq = util.createSubRequest(req);
          childReq.noResponse = true;
          childReq.body = submission;
          childReq.formId = childReq.params.formId = this.settings.resource;

          var url = '/form/:formId/submission';
          var method = req.method.toLowerCase();
          if (method === 'put') {
            if (submission._id) {
              childReq.subId = childReq.params.submissionId = submission._id;
              url += '/:submissionId';
            }
            else {
              return next('Unknown submission - ' + submission._id + '.');
            }
          }

          childReq.url = url;
          childReq.method = method.toUpperCase();
          if (router.resourcejs.hasOwnProperty(url) && router.resourcejs[url].hasOwnProperty(method)) {
            // Call the Resource.js
            router.resourcejs[url][method].call(this, childReq, res, function(err) {
              if (err) {
                return next(err);
              }
              if (method !== 'post') {
                return next();
              }

              // Set some properties on the new submission.
              async.waterfall([
                function setRoles(then) {
                  if (!this.settings.role) {
                    then(null, null);
                  }
                  var update = {};

                  // Assign the owner if they are also providing a role.
                  if (req.selfOwner) {
                    res.resource.item.owner = res.resource.item._id;
                    update.owner = res.resource.item._id;
                  }

                  var query = hook.alter('roleQuery', {_id: this.settings.role, deleted: {$eq: null}}, req);
                  debug('Role Query: ' + JSON.stringify(query));
                  router.formio.resources.role.model.findOne(query, function(err, role) {
                    if (err || !role) {
                      debug(err || 'Role not found: ' + JSON.stringify(query));
                      res.status(401);
                      return then('The given role was not found.');
                    }

                    // Add the role to the resource submission.
                    update.roles = [mongoose.Types.ObjectId(role.toObject()._id.toString())];
                    then(null, update);
                  });
                }.bind(this),
                function update(update, then) {
                  if (!update || !res.resource.item) {
                    return then(null, null);
                  }
                  var query = {_id: res.resource.item._id};
                  router.formio.resources.submission.model.update(query, {'$set': update}, then);
                },
                function setExternals(update, then) {
                  if (!res.resource.item) {
                    return then();
                  }

                  // Ensure we have external ids.
                  req.body.externalIds = req.body.externalIds || [];

                  // Assign the resource item back to the resourceData for saving.
                  req.body.externalIds.push({
                    type: 'resource',
                    id: res.resource.item._id.toString()
                  });

                  then();
                }
              ], next);
            }.bind(this));
          }
          else {
            return next('Unknown resource handler.');
          }
        }.bind(this));
      }.bind(this);

      if (req.params.submissionId) {
        /*eslint-disable */
        router.formio.cache.loadSubmission(
          req,
          req.params.formId,
          req.params.submissionId,
          function(err, currentSubmission) {
            /*eslint-enable */
            _.each(currentSubmission.externalIds, function(externalId) {
              if (externalId.type === 'resource') {
                /*eslint-disable */
                router.formio.cache.loadSubmission(
                  req,
                  this.settings.resource,
                  externalId.id,
                  function(err, resourceSubmission) {
                    /*eslint-enable */
                    submitResource({
                      _id: resourceSubmission._id.toString(),
                      data: resourceSubmission.data
                    });
                  }
                );
              }
            }.bind(this));
          }.bind(this)
        );
      }
      else {
        // Submit the resource.
        submitResource({data: {}, roles: []});
      }
    }.bind(this));
  };

  // Return the ResourceAction.
  return ResourceAction;
};
