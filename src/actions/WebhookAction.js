'use strict';

var rest = require('restler');
var _ = require('lodash');
var debug = require('debug')('formio:action:webhook');

module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = router.formio.hook;

  /**
   * WebhookAction class.
   *   This class is used to create webhook interface.
   *
   * @constructor
   */
  var WebhookAction = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  WebhookAction.prototype = Object.create(Action.prototype);
  WebhookAction.prototype.constructor = WebhookAction;
  WebhookAction.info = function(req, res, next) {
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
  };
  WebhookAction.settingsForm = function(req, res, next) {
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
  };

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
  WebhookAction.prototype.resolve = function(handler, method, req, res, next) {
    let settings = this.settings;

    /**
     * Util function to handle errors for a potentially blocking request.
     *
     * @param err
     * @returns {*}
     */
    let handleResponse = (err) => {
      if (!_.get(settings, 'blocking') || _.get(settings, 'blocking') === false) {
        return;
      }

      if (err) {
        return next(err.message || err);
      }

      return next();
    };

    try {
      if (!hook.alter('resolve', true, this, handler, method, req, res)) {
        return next();
      }

      // Continue if were not blocking
      if (!_.get(settings, 'blocking') || _.get(settings, 'blocking') === false) {
        next(); // eslint-disable-line callback-return
      }

      let options = {};
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
        return handleResponse('No url given in the settings');
      }

      var submission = _.get(res, 'resource.item');
      var payload = {
        request: _.get(req, 'body'),
        response: _.get(req, 'response'),
        submission: (submission && submission.toObject) ? submission.toObject() : {},
        params: _.get(req, 'params')
      };

      // Make the request.
      debug('Request: ' + req.method.toLowerCase());
      switch (req.method.toLowerCase()) {
        case 'post':
          rest.postJson(this.settings.url, payload, options).on('complete', handleResponse);
          break;
        case 'put':
          rest.putJson(this.settings.url, payload, options).on('complete', handleResponse);
          break;
        case 'delete':
          options.query = req.params;
          rest.del(this.settings.url, options).on('complete', handleResponse);
          break;
        default:
          return handleResponse('Could not match request method: ' + req.method.toLowerCase());
      }
    }
    catch (e) {
      handleResponse(e);
    }
  };

  // Return the WebhookAction.
  return WebhookAction;
};
