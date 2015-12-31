'use strict';

var rest = require('restler');

module.exports = function(router) {
  var Action = router.formio.Action;
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
    next(null, {
      name: 'webhook',
      title: 'Webhook',
      description: 'Allows you to trigger an external interface.',
      priority: 0,
      defaults: {
        handler: ['after'],
        method: ['create', 'update', 'delete']
      }
    });
  };
  WebhookAction.settingsForm = function(req, res, next) {
    next(null, [
      {
        label: 'Webhook URL',
        key: 'settings[url]',
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
        label: 'Authorize User',
        key: 'settings[username]',
        inputType: 'text',
        defaultValue: '',
        input: true,
        placeholder: 'User for Basic Authentication',
        type: 'textfield',
        multiple: false
      },
      {
        label: 'Authorize Password',
        key: 'settings[password]',
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
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param cb
   *   The callback function to execute upon completion.
   */
  WebhookAction.prototype.resolve = function(handler, method, req, res, next) {
    var options = {};
    if (this.settings.username) {
      options.username = this.settings.username;
      options.password = this.settings.password;
    }
    if (req.method.toLowerCase() === 'delete') {
      options.query = req.params;
      rest.del(this.settings.url, options);
    }
    else {
      // Setup the post data.
      var postData = {
        request: req.body,
        response: res.resource,
        params: req.params
      };

      // Make the request.
      switch (req.method.toLowerCase()) {
        case 'post':
          rest.postJson(this.settings.url, postData, options);
          break;
        case 'put':
          rest.putJson(this.settings.url, postData, options);
          break;
      }
    }

    next();
  };

  // Return the WebhookAction.
  return WebhookAction;
};
