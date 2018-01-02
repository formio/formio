'use strict';

const _ = require('lodash');
const async = require('async');
const util = require('../util/util');

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = require('../util/hook')(router.formio);

  const SaveSubmission = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  SaveSubmission.prototype = Object.create(Action.prototype);
  SaveSubmission.prototype.constructor = SaveSubmission;

  // Execute a pre-save method for the SaveSubmission action.
  Action.schema.pre('save', function(next) {
    if (this.name === 'save') {
      // Ensure that save actions with resource associations are always executed
      // before the ones without resource association.
      this.priority = (this.settings && this.settings.resource) ? 11 : 10;
    }
    next();
  });

  SaveSubmission.info = function(req, res, next) {
    next(null, {
      name: 'save',
      title: 'Save Submission',
      description: 'Saves the submission into the database.',
      priority: 10,
      defaults: {
        handler: ['before'],
        method: ['create', 'update']
      },
      access: {
        handler: false,
        method: false
      }
    });
  };

  SaveSubmission.settingsForm = function(req, res, next) {
    next(null, [
      {
        type: 'resourcefields',
        key: 'resource',
        title: 'Save submission to',
        placeholder: 'This form',
        basePath: hook.alter('path', '/form', req),
        form: req.params.formId,
        required: false
      }
    ]);
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
  SaveSubmission.prototype.resolve = function(handler, method, req, res, next) {
    // Return if this is not a PUT or POST.
    if (req.skipSave || !req.body || (req.method !== 'POST' && req.method !== 'PUT')) {
      return next();
    }

    // Make sure we do not skip the resource.
    req.skipResource = false;

    // If there are not any settings, then move along.
    if (!this.settings || !this.settings.resource) {
      return next();
    }

    // Keep track of the cache for this request.
    const cache = {};

    // Save data to a separate resource.
    const saveToResource = function(resource, body, done) {
      if (!body) {
        return done();
      }

      // Here we will clone the request, and then change the request body
      // and parameters to make it seem like a separate request to update
      // the child submissions.
      const childReq = util.createSubRequest(req);
      if (!childReq) {
        return done('Too many recursive requests.');
      }
      childReq.noResponse = true;
      childReq.body = body;
      childReq.formId = childReq.params.formId = resource._id.toString();

      let url = '/form/:formId/submission';
      const method = req.method.toLowerCase();
      if (method === 'put') {
        if (body._id) {
          childReq.subId = childReq.params.submissionId = body._id;
          url += '/:submissionId';
        }
        else {
          return done('Unknown resource'); // Return an error.
        }
      }

      childReq.url = url;
      childReq.method = method.toUpperCase();
      if (router.resourcejs.hasOwnProperty(url) && router.resourcejs[url].hasOwnProperty(method)) {
        router.resourcejs[url][method].call(this, childReq, res, done);
      }
      else {
        done('Unknown resource handler.');
      }
    }.bind(this);

    /**
     * Load a resource.
     * @type {function(this:SaveSubmission)}
     */
    const loadResource = function(cache, then) {
      router.formio.cache.loadForm(req, 'resource', this.settings.resource, function(err, resource) {
        if (err) {
          return then(err);
        }

        cache.resource = resource;
        then();
      });
    }.bind(this);

    /**
     * Update the owner of a resource.
     */
    const updateOwner = function(then) {
      // Assign the owner if they are also providing a role.
      if (req.selfOwner && res.resource && res.resource.item) {
        res.resource.item.owner = res.resource.item._id;
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;
        submissionModel.update({
          _id: res.resource.item._id
        }, {'$set': {owner: res.resource.item._id}}, then);
      }
      else {
        then();
      }
    }.bind(this);

    /**
     * Assign a resource to the request object for the next submission.
     *
     * @param then
     */
    const assignResource = function(then) {
      // Get the resource.
      const resource = (res.resource && res.resource.item) ? res.resource.item : cache.submission;

      // Assign the resource to this submission.
      if (this.settings.property) {
        req.body.data[this.settings.property] = resource;
      }

      // Save the reference in the external ids.
      if ((req.method === 'POST') && res.resource && res.resource.item) {
        // Save the external resource in the external ids.
        req.body.externalIds = req.body.externalIds || [];
        req.body.externalIds.push({
          type: 'resource',
          resource: this.settings.resource,
          id: res.resource.item._id.toString()
        });
      }

      then();
    }.bind(this);

    /**
     * Update a submission object with the latest data.
     *
     * @param submission
     * @param req
     * @returns {*}
     */
    const updateSubmission = function(submission) {
      submission = submission || {};
      submission.data = submission.data || {};

      // Iterate over all the available fields.
      _.each(this.settings.fields, function(field, key) {
        if (req.body.data.hasOwnProperty(field)) {
          submission.data[key] = req.body.data[field];
        }
      });
      return submission;
    }.bind(this);

    /**
     * Load a submission.
     *
     * @param form
     * @param then
     */
    const loadSubmission = function(cache, then) {
      const submission = {data: {}, roles: []};

      // For new submissions, just populate the empty submission.
      if (req.method !== 'PUT') {
        cache.submission = updateSubmission(submission);
        return then();
      }

      // Move on if there is no id or form.
      if (!req.body._id || !req.body.form) {
        return then();
      }

      // Load this submission.
      router.formio.cache.loadSubmission(
        req,
        req.body.form,
        req.body._id,
        function(err, currentSubmission) {
          if (err) {
            return then(err);
          }

          // Find the external submission.
          const external = _.find(currentSubmission.externalIds, {type: 'resource', resource: this.settings.resource});
          if (!external) {
            return then();
          }

          // Load the external submission.
          router.formio.cache.loadSubmission(
            req,
            this.settings.resource,
            external.id,
            function(err, submission) {
              if (err) {
                return then();
              }

              cache.submission = updateSubmission(submission);
              then();
            }
          );
        }.bind(this));
    }.bind(this);

    // Skip this resource.
    req.skipResource = true;
    async.series([
      async.apply(loadResource, cache),
      async.apply(loadSubmission, cache)
    ], function(err) {
      if (err) {
        return next(err);
      }

      if (!cache.submission) {
        return next();
      }

      async.series([
        async.apply(saveToResource, cache.resource, cache.submission),
        updateOwner,
        assignResource
      ], next);
    }.bind(this));
  };

  // Return the SaveSubmission.
  return SaveSubmission;
};
