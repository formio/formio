'use strict';

const _ = require('lodash');
const util = require('../util/util');
const {evaluate} = require('@formio/vm');
const LOG_EVENT = 'Save Submission Action';

module.exports = function(router) {
  const Action = router.formio.Action;
  const debug = require('debug')('formio:action:saveSubmission');
  const hook = require('../util/hook')(router.formio);
  const ecode = router.formio.util.errorCodes;
  const logOutput = router.formio.log || debug;
  const log = (...args) => logOutput(LOG_EVENT, ...args);

  class SaveSubmission extends Action {
    static info(req, res) {
      return {
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
      };
    }

    static settingsForm(req, res) {
      return [
        {
          type: 'resourcefields',
          key: 'resource',
          title: 'Save submission to',
          placeholder: 'This form',
          basePath: hook.alter('path', '/form', req),
          form: req.params.formId,
          required: false
        }
      ];
    }

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
    async resolve(handler, method, req, res) {
      // Return if this is not a PUT or POST.
      if (req.skipSave || !req.body || (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH')) {
        return;
      }

      // Make sure we do not skip the resource.
      req.skipResource = false;

      // If there are not any settings, then move along.
      if (!this.settings || !this.settings.resource) {
        return;
      }

      // Keep track of the cache for this request.
      const cache = {};

      // Save data to a separate resource.
      const saveToResource = async function(resource, body) {
        if (!body) {
          return;
        }

        // Here we will clone the request, and then change the request body
        // and parameters to make it seem like a separate request to update
        // the child submissions.
        const childReq = util.createSubRequest(req);
        if (!childReq) {
          log(
            req,
            ecode.request.EREQRECUR,
            new Error(ecode.request.EREQRECUR),
            '#resolve'
          );
          throw (ecode.request.EREQRECUR);
        }

        // Don't recheck permissions against the new resource.
        childReq.permissionsChecked = true;
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
            log(
              req,
              ecode.resource.ENOIDP,
              new Error(ecode.resource.ENOIDP),
              '#resolve'
            );
            throw (ecode.resource.ENOIDP); // Return an error.
          }
        }

        childReq.url = url;
        childReq.method = method.toUpperCase();
        if (router.resourcejs.hasOwnProperty(url) && router.resourcejs[url].hasOwnProperty(method)) {
          return await new Promise((resolve, reject) => {
            router.resourcejs[url][method].call(this, childReq, res, (err) => {
              if (err) {
                reject(err);
              }
              resolve();
            });
          });
        }
        else {
          log(
            req,
            ecode.resource.ENOHANDLER,
            new Error(ecode.resource.ENOHANDLER),
            '#resolve',
            url,
            method
          );

          throw (ecode.resource.ENOHANDLER);
        }
      }.bind(this);

      /**
       * Load a resource.
       * @type {function(this:SaveSubmission)}
       */
      const loadResource = async function(cache) {
        try {
          const resource = await router.formio.cache.loadForm(req, 'resource', this.settings.resource);
          cache.resource = resource;
          return;
        }
        catch (err) {
          log(req, ecode.cache.EFORMLOAD, err, '#resolve');
          throw err;
        }
      }.bind(this);

      /**
       * Assign a resource to the request object for the next submission.
       *
       */
      const assignResource = function() {
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
      }.bind(this);

      /**
       * Update a submission object with the latest data.
       *
       * @param submission
       * @param req
       * @returns {*}
       */
      const updateSubmission =  async function(submission) {
        submission = submission || {};
        submission.data = submission.data || {};

        // Iterate over all the available fields.
        _.each(this.settings.fields, function(field, key) {
          if (field === 'data') {
            _.set(submission.data, key, req.body.data);
          }
          else if (_.has(req.body.data, field)) {
            _.set(submission.data, key, _.get(req.body.data, field));
          }
        });

        if (this.settings.transform) {
          try {
            const newData = await evaluate({
              deps: [],
              code: `data=submission.data\n${this.settings.transform}\nsubmission`,
              data: {
                submission: (res.resource && res.resource.item) ? res.resource.item : req.body,
                data: submission.data,
              },
            });
            submission = {...submission, ...newData};
            req.isTransformedData = true;
          }
          catch (err) {
            debug(`Error in submission transform: ${err.message || err}`);
          }
        }

        return submission;
      }.bind(this);

      /**
       * Load a submission.
       *
       * @param form
       */
      const loadSubmission = async function(cache) {
        const submission = {data: {}, roles: []};

        // For new submissions, just populate the empty submission.
        if (req.method !== 'PUT') {
          cache.submission = await updateSubmission(submission);
          return;
        }

        // Move on if there is no id or form.
        if (!req.body._id || !req.body.form) {
          return;
        }

        // Load this submission.
        try {
          const currentSubmission = await router.formio.cache.loadSubmission(
            req,
            req.body.form,
            req.body._id);

            // Find the external submission.
            const external = _.find(currentSubmission.externalIds, {
              type: 'resource',
              resource: this.settings.resource
            });
            if (!external) {
              return;
            }

            // Load the external submission.
            const submission = await router.formio.cache.loadSubmission(
              req,
              this.settings.resource,
              external.id);
            cache.submission = await updateSubmission(submission);
            return;
        }
        catch (err) {
          log(req, ecode.submission.ESUBLOAD, err, '#resolve');
          throw err;
        }
      }.bind(this);

      // Skip this resource.
      req.skipResource = true;

      try {
        await loadResource(cache);
        await loadSubmission(cache);

        if (!cache.submission) {
          return;
        }

        await saveToResource(cache.resource, cache.submission);
        assignResource();
        return;
      }
      catch (err) {
        log(req, err);
        throw err;
      }
    }
  }

  // Return the SaveSubmission.
  return SaveSubmission;
};
