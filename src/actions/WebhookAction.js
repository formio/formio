'use strict';

var rest = require('restler');
var _ = require('lodash');
var debug = require('debug')('formio:action:webhook');

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
    var options = {};
    debug(_.get(this, 'settings'));

    // Get the settings
    if (_.has(this, 'settings.username')) {
      options.username = _.get(this, 'settings.username');
    }
    if (_.has(this, 'settings.password')) {
      options.password = _.get(this, 'settings.password');
    }

    // Cant send a webhook if the url isnt set.
    if (!_.has(this, 'settings.url')) {
      debug('No url given in the settings');
      return next();
    }

    var submission = _.get(res, 'resource.item');
    var payload = {
      request: _.get(req, 'body'),
      response: _.get(req, 'response'),
      submission: (submission && submission.toObject) ? submission.toObject() : {},
      params: _.get(req, 'params')
    };

    // Dont block on the request.
    next(); // eslint-disable-line callback-return

    // Make the request.
    debug('Request: ' + req.method.toLowerCase());
    switch (req.method.toLowerCase()) {
      case 'post':
        rest.postJson(this.settings.url, payload, options)
          .on('complete', function(err, event) {
            if (err) {
              debug(err);
              return;
            }

            debug(event.res);
          });
        break;
      case 'put':
        rest.putJson(this.settings.url, payload, options)
          .on('complete', function(err, event) {
            if (err) {
              debug(err);
              return;
            }

            debug(event.res);
          });
        break;
      case 'delete':
        options.query = req.params;
        rest.del(this.settings.url, options)
          .on('complete', function(err, event) {
            if (err) {
              debug(err);
              return;
            }

            debug(event);
          });
        break;
      default:
        debug('Could not match request method: ' + req.method.toLowerCase());
        break;
    }
  };

  // Return the WebhookAction.
  return WebhookAction;
};
