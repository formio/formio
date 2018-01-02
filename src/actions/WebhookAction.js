'use strict';

const rest = require('restler');
const _ = require('lodash');
const debug = require('debug')('formio:action:webhook');
const FormioUtils = require('formiojs/utils');

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = router.formio.hook;

  /**
   * WebhookAction class.
   *   This class is used to create webhook interface.
   */
  class WebhookAction extends Action {
    constructor(data, req, res) {
      super(data, req, res);
    }

    static info(req, res, next) {
      next(null, hook.alter('actionInfo', {
        name: 'webhook',
        title: 'Webhook',
        description: 'Allows you to trigger an external interface.',
        priority: 0,
        defaults: {
          handler: ['after'],
          method: ['create', 'update', 'delete']
        }
      }));
    }
    static settingsForm(req, res, next) {
      next(null, [
        {
          label: 'Webhook URL',
          key: 'url',
          inputType: 'text',
          defaultValue: '',
          input: true,
          placeholder: 'Call the following URL.',
          prefix: '',
          suffix: '',
          type: 'textfield',
          multiple: false,
          validate: {
            required: true
          }
        },
        {
          conditional: {
            eq: '',
            when: null,
            show: ''
          },
          type: 'checkbox',
          validate: {
            required: false
          },
          persistent: true,
          protected: false,
          defaultValue: false,
          key: 'block',
          label: 'Block request for Webhook feedback',
          hideLabel: true,
          tableView: true,
          inputType: 'checkbox',
          input: true
        },
        {
          label: 'Authorize User',
          key: 'username',
          inputType: 'text',
          defaultValue: '',
          input: true,
          placeholder: 'User for Basic Authentication',
          type: 'textfield',
          multiple: false
        },
        {
          label: 'Authorize Password',
          key: 'password',
          inputType: 'password',
          defaultValue: '',
          input: true,
          placeholder: 'Password for Basic Authentication',
          type: 'textfield',
          multiple: false
        }
      ]);
    }

    /**
     * Trigger the webhooks.
     *
     * @param handler
     * @param method
     * @param req
     *   The Express request object.
     * @param res
     *   The Express response object.
     * @param next
     *   The callback function to execute upon completion.
     */
    resolve(handler, method, req, res, next) {
      const settings = this.settings;

      /**
       * Util function to handle success for a potentially blocking request.
       *
       * @param data
       * @param response
       * @returns {*}
       */
      const handleSuccess = (data, response) => {
        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          return;
        }

        // Return response in metadata
        if (res && res.resource && res.resource.item) {
          res.resource.item.metadata = res.resource.item.metadata || {};
          res.resource.item.metadata[this.title] = data;
        }

        return next();
      };

      /**
       * Util function to handle errors for a potentially blocking request.
       *
       * @param data
       * @param response
       * @returns {*}
       */
      const handleError = (data, response) => {
        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          return;
        }

        return next(data.message || data || response.statusMessage);
      };

      try {
        if (!hook.alter('resolve', true, this, handler, method, req, res)) {
          return next();
        }

        // Continue if were not blocking
        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          next(); // eslint-disable-line callback-return
        }

        const options = {};
        debug(settings);

        // Get the settings
        if (_.has(settings, 'username')) {
          options.username = _.get(settings, 'username');
        }
        if (_.has(settings, 'password')) {
          options.password = _.get(settings, 'password');
        }

        // Cant send a webhook if the url isn't set.
        if (!_.has(settings, 'url')) {
          return handleError('No url given in the settings');
        }

        let url = this.settings.url;
        const submission = _.get(res, 'resource.item');
        const payload = {
          request: _.get(req, 'body'),
          response: _.get(req, 'response'),
          submission: (submission && submission.toObject) ? submission.toObject() : {},
          params: _.get(req, 'params')
        };

        // Interpolate URL if possible
        if (res && res.resource && res.resource.item && res.resource.item.data) {
          url = FormioUtils.interpolate(url, res.resource.item.data);
        }

        // Fall back if interpolation failed
        if (!url) {
          url = this.settings.url;
        }

        // Make the request.
        debug(`Request: ${req.method.toLowerCase()}`);
        switch (req.method.toLowerCase()) {
          case 'get':
            rest.get(url, options).on('success', handleSuccess).on('fail', handleError);
            break;
          case 'post':
            rest.postJson(url, payload, options).on('success', handleSuccess).on('fail', handleError);
            break;
          case 'put':
            rest.putJson(url, payload, options).on('success', handleSuccess).on('fail', handleError);
            break;
          case 'delete':
            options.query = req.params;
            rest.del(url, options).on('success', handleSuccess).on('fail', handleError);
            break;
          default:
            return handleError(`Could not match request method: ${req.method.toLowerCase()}`);
        }
      }
      catch (e) {
        handleError(e);
      }
    }
  }

  // Return the WebhookAction.
  return WebhookAction;
};
