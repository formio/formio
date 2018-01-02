'use strict';
const request = require('request');

module.exports = function(router) {
  const Action = router.formio.Action;
  const emailer = require('../util/email')(router.formio);
  const debug = require('debug')('formio:action:email');
  const macros = require('./macros/macros');

  /**
   * EmailAction class.
   *   This class is used to create the Email action.
   *
   * @constructor
   */
  const EmailAction = function(data, req, res) {
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
      const settingsForm = [
        {
          type: 'select',
          input: true,
          label: 'Transport',
          key: 'transport',
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
          key: 'from',
          inputType: 'text',
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
          key: 'emails',
          inputType: 'text',
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
          label: 'Send a separate email to each recipient',
          key: 'sendEach',
          type: 'checkbox',
          input: true
        },
        {
          label: 'Subject',
          key: 'subject',
          inputType: 'text',
          defaultValue: 'New submission for {{ form.title }}.',
          input: true,
          placeholder: 'Email subject',
          type: 'textfield',
          multiple: false
        },
        {
          label: 'Email Template URL',
          key: 'template',
          inputType: 'text',
          type: 'textfield',
          multiple: false,
          placeholder: 'Enter a URL for your external email template.'
        },
        {
          label: 'Message',
          key: 'message',
          type: 'textarea',
          defaultValue: '{{ submission(data, form.components) }}',
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

    // Load the form for this request.
    router.formio.cache.loadCurrentForm(req, (err, form) => {
      if (err) {
        return next(err);
      }
      if (!form) {
        return next(new Error('Form not found.'));
      }

      // Dont block on sending emails.
      next(); // eslint-disable-line callback-return

      // Get the email parameters.
      emailer.getParams(res, form, req.body)
      .then(params => {
        const query = {
          _id: params.owner,
          deleted: {$eq: null}
        };

        const submissionModel = req.submissionModel || router.formio.resources.submission.model;
        return submissionModel.findOne(query)
        .then(owner => {
          if (owner) {
            params.owner = owner.toObject();
          }

          return new Promise((resolve, reject) => {
            if (!this.settings.template) {
              return resolve(this.settings.message);
            }

            return request(this.settings.template, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                // Save the content before overwriting the message.
                params.content = this.settings.message;
                return resolve(body);
              }

              return resolve(this.settings.message);
            });
          });
        })
        .then(template => {
          // Prepend the macros to the message so that they can use them.
          this.settings.message = macros + template;

          // Send the email.
          emailer.send(req, res, this.settings, params, (err, response) => {
            debug(`[error]: ${JSON.stringify(err)}`);
            debug(`[response]: ${JSON.stringify(response)}`);
          });
        });
      })
      .catch(err => {
        debug(err);
      });
    });
  };

  // Return the EmailAction.
  return EmailAction;
};
