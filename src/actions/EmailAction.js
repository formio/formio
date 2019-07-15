'use strict';
const request = require('request');

const LOG_EVENT = 'Email Action';

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = require('../util/hook')(router.formio);
  const emailer = require('../util/email')(router.formio);
  const debug = require('debug')('formio:action:email');
  const ecode = router.formio.util.errorCodes;
  const logOutput = router.formio.log || debug;
  const log = (...args) => logOutput(LOG_EVENT, ...args);

  /**
   * EmailAction class.
   *   This class is used to create the Email action.
   */
  class EmailAction extends Action {
    constructor(data, req, res) {
      super(data, req, res);
    }

    static info(req, res, next) {
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
    }

    /**
     * Settings form for email action.
     *
     * @param req
     * @param res
     * @param next
     */
    static settingsForm(req, res, next) {
      // Get the available transports.
      emailer.availableTransports(req, function(err, availableTransports) {
        if (err) {
          log(req, ecode.emailer.ENOTRANSP, err);
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
            defaultValue: 'https://pro.formview.io/assets/email.html',
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
    }

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
    resolve(handler, method, req, res, next, setActionItemMessage) {
      if (!this.settings.emails || this.settings.emails.length === 0) {
        setActionItemMessage('No email addresses configured', this.settings, 'error');
        return next();
      }

      // Load the form for this request.
      router.formio.cache.loadCurrentForm(req, (err, form) => {
        if (err) {
          setActionItemMessage('Error loading form', err, 'error');
          log(req, ecode.cache.EFORMLOAD, err);
          return next(err);
        }
        if (!form) {
          const err = new Error(ecode.form.ENOFORM);
          setActionItemMessage('Error no form', err, 'error');
          log(req, ecode.cache.EFORMLOAD, err);
          return next(err);
        }

        // Dont block on sending emails.
        next(); // eslint-disable-line callback-return

        // Get the email parameters.
        emailer.getParams(req, res, form, req.body)
        .then(params => {
          const query = {
            _id: params.owner,
            deleted: {$eq: null}
          };

          const submissionModel = req.submissionModel || router.formio.resources.submission.model;
          return submissionModel.findOne(hook.alter('submissionQuery', query, req))
          .then(owner => {
            return owner.toObject();
          })
          .catch(() => {
            // If there is no owner, just proceed as normal.
            return {_id: params.owner};
          })
          .then(owner => {
            if (owner) {
              params.owner = owner;
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
            this.settings.message = template;
            setActionItemMessage('Sending message', this.message);
            emailer.send(req, res, this.settings, params, (err) => {
              if (err) {
                setActionItemMessage('Error sending message', err, 'error');
                log(req, ecode.emailer.ESENDMAIL, JSON.stringify(err));
              }
              else {
                setActionItemMessage('Message Sent');
              }
            });
          });
        })
        .catch(err => {
          setActionItemMessage('Emailer error2', err, 'error');
          log(req, ecode.emailer.ESUBPARAMS, err);
        });
      });
    }
  }

  // Return the EmailAction.
  return EmailAction;
};
