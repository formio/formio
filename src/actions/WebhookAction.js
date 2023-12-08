'use strict';

const fetch = require('@formio/node-fetch-http-proxy');
const _ = require('lodash');
const util = require('../util/util');

const LOG_EVENT = 'Webhook Action';

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = router.formio.hook;
  const debug = require('debug')('formio:action:webhook');
  const logOutput = router.formio.log || debug;
  const log = (...args) => logOutput(LOG_EVENT, ...args);

  /**
   * WebhookAction class.
   *   This class is used to create webhook interface.
   */
  class WebhookAction extends Action {
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
          hideLabel: false,
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
    resolve(handler, method, req, res, next, setActionItemMessage) {
      const settings = this.settings;
      const logerr = (...args) => log(req, ...args, '#resolve');

      /**
       * Util function to handle success for a potentially blocking request.
       *
       * @param data
       * @param response
       * @returns {*}
       */
      const handleSuccess = (data, response) => {
        setActionItemMessage('Webhook succeeded', response);
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
        setActionItemMessage('Webhook failed', response);
        const message = data ? (data.message || data) : response.statusMessage;
        logerr(message);

        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          return;
        }

        return next(message);
      };

      try {
        if (!hook.alter('resolve', true, this, handler, method, req, res)) {
          setActionItemMessage('Alter to resolve');
          return next();
        }

        // Continue if were not blocking
        if (!_.get(settings, 'block') || _.get(settings, 'block') === false) {
          next(); // eslint-disable-line callback-return
        }

        const options = {};

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
          url = util.FormioUtils.interpolate(url, res.resource.item.data);
        }

        // Fall back if interpolation failed
        if (!url) {
          url = this.settings.url;
        }

        // eslint-disable-next-line
        const onParseError = (err, response) => {
          if (response.status === 404) {
            return handleError(null, response);
          }
          throw err;
        };

      const makeRequest = (url, method, credentials, payload)=> {
        const options = {
          method,
          headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
          },
        };
        if (credentials.username) {
        // eslint-disable-next-line max-len
        options.headers.Authorization = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;
        }

        if (payload) {
          options.body = JSON.stringify(payload);
        }

        fetch(url, options)
        .then((response) => {
          if (!response.bodyUsed) {
            if (response.ok) {
              return handleSuccess({}, response);
            }
            else {
              return handleError({}, response);
            }
          }
          else {
            if (response.ok) {
              return response.json().then((body) => handleSuccess(body, response));
            }
            else {
              return response.json().then((body) => handleError(body, response));
            }
          }
        })
        .catch((err) => {
          handleError(err);
        });
    };

        // Make the request.
        setActionItemMessage('Making request', {
          method: req.method,
          url,
          options
        });
        url = req.method!=='DELETE' ? url: `${url}?${new URLSearchParams(req.params).toString()}`;
        makeRequest(url, req.method, options, payload);
      }
      catch (e) {
        setActionItemMessage('Error occurred', e, 'error');
        handleError(e);
      }
    }
  }

  // Return the WebhookAction.
  return WebhookAction;
};
