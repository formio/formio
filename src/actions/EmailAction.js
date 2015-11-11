'use strict';

module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = require('../util/hook')(router.formio);
  var emailer = require('../util/email')(router.formio);

  /**
   * EmailAction class.
   *   This class is used to create the Email action.
   *
   * @constructor
   */
  var EmailAction = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  EmailAction.prototype = Object.create(Action.prototype);
  EmailAction.prototype.constructor = EmailAction;
  EmailAction.info = function(req, res, next) {
    next(null, {
      name: 'email',
      title: 'Email',
      description: 'Allows you to email people on submission.',
      priority: 0,
      defaults: {
        handler: ['after'],
        method: ['create']
      }
    });
  };

  /**
   * Settings form for email action.
   *
   * @param req
   * @param res
   * @param next
   */
  EmailAction.settingsForm = function(req, res, next) {
    // Get the available transports.
    emailer.availableTransports(req, function(err, availableTransports) {
      if (err) {
        return next(err);
      }
      var settingsForm = [
        {
          type: 'select',
          input: true,
          label: 'Transport',
          key: 'settings[transport]',
          placeholder: 'Select the email transport.',
          template: '<span>{{ item.title }}</span>',
          defaultValue: 'default',
          dataSrc: 'json',
          data: {
            json: JSON.stringify(availableTransports)
          },
          valueProperty: 'transport',
          multiple: false,
          validate: {
            required: true
          }
        },
        {
          label: 'From:',
          key: 'settings[from]',
          inputType: 'email',
          defaultValue: 'no-reply@form.io',
          input: true,
          placeholder: 'Send the email from the following address',
          prefix: '',
          suffix: '',
          type: 'textfield',
          multiple: false
        },
        {
          label: 'To: Email Address',
          key: 'settings[emails]',
          inputType: 'email',
          defaultValue: '',
          input: true,
          placeholder: 'Send to the following email',
          prefix: '',
          suffix: '',
          type: 'textfield',
          multiple: true,
          validate: {
            required: true
          }
        },
        {
          label: 'Subject',
          key: 'settings[subject]',
          inputType: 'text',
          defaultValue: '',
          input: true,
          placeholder: 'Email subject',
          type: 'textfield',
          multiple: false
        },
        {
          label: 'Message',
          key: 'settings[message]',
          type: 'textarea',
          defaultValue: '',
          multiple: false,
          rows: 3,
          suffix: '',
          prefix: '',
          placeholder: 'Enter the message you would like to send.',
          input: true
        }
      ];

      next(null, settingsForm);
    });
  };

  /**
   * Send emails to people.
   *
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param cb
   *   The callback function to execute upon completion.
   */
  EmailAction.prototype.resolve = function(handler, method, req, res, next) {
    if (!this.settings.emails || this.settings.emails.length === 0) {
      return next();
    }

    // Send the email.
    emailer.send(req, res, this.settings, req.body, next);
  };

  // Return the EmailAction.
  return EmailAction;
};
