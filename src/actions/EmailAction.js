'use strict';
const fetch = require('@formio/node-fetch-http-proxy');

const LOG_EVENT = 'Email Action';

module.exports = (router) => {
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
    static info(req, res, next) {
      next(null, {
        name: 'email',
        title: 'Email',
        description: 'Allows you to email people on submission.',
        priority: 0,
        defaults: {
          handler: ['after'],
          method: ['create'],
        },
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
      emailer.availableTransports(req, (err, availableTransports) => {
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
              json: JSON.stringify(availableTransports),
            },
            valueProperty: 'transport',
            multiple: false,
            validate: {
              required: true,
            },
          },
          {
            label: 'From:',
            key: 'from',
            inputType: 'text',
            defaultValue: 'no-reply@form.io',
            input: true,
            placeholder: 'Send the email from the following address',
            type: 'textfield',
            multiple: false,
          },
          {
            label: 'To: Email Address',
            key: 'emails',
            inputType: 'text',
            defaultValue: '',
            input: true,
            placeholder: 'Send to the following email',
            type: 'textfield',
            multiple: true,
            validate: {
              required: true,
            },
          },
          {
            label: 'Send a separate email to each recipient',
            key: 'sendEach',
            type: 'checkbox',
            input: true,
          },
          {
            label: 'Cc: Email Address',
            key: 'cc',
            inputType: 'text',
            defaultValue: '',
            input: true,
            placeholder: 'Send copy of the email to the following email',
            type: 'textfield',
            multiple: true,
          },
          {
            label: 'Bcc: Email Address',
            key: 'bcc',
            inputType: 'text',
            defaultValue: '',
            input: true,
            placeholder: 'Send blink copy of the email to the following email (other recipients will not see this)',
            type: 'textfield',
            multiple: true,
          },
          {
            label: 'Subject',
            key: 'subject',
            inputType: 'text',
            defaultValue: 'New submission for {{ form.title }}.',
            input: true,
            placeholder: 'Email subject',
            type: 'textfield',
            multiple: false,
          },
          {
            label: 'Email Template URL',
            key: 'template',
            inputType: 'text',
            defaultValue: 'https://pro.formview.io/assets/email.html',
            placeholder: 'Enter a URL for your external email template.',
            type: 'textfield',
            multiple: false,
          },
          {
            label: 'Message',
            key: 'message',
            type: 'textarea',
            defaultValue: '{{ submission(data, form.components) }}',
            multiple: false,
            rows: 3,
            placeholder: 'Enter the message you would like to send.',
            input: true,
          },
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

        // Save off the req.params since they get deleted after the response and we need them later.
        const reqParams = req.params;

        // Dont block on sending emails.
        next(); // eslint-disable-line callback-return

        // Get the email parameters.
        emailer.getParams(req, res, form, req.body)
          .then((params) => {
            req.params = reqParams;
            const query = {
              _id: params.owner,
              deleted: {$eq: null},
            };

            const submissionModel = req.submissionModel || router.formio.resources.submission.model;
            return submissionModel.findOne(hook.alter('submissionQuery', query, req))
              .lean()
              // If there is no owner, just proceed as normal.
              .catch(() => ({_id: params.owner}))
              .then((owner) => {
                if (owner) {
                  params.owner = owner;
                }

                if (!this.settings.template) {
                  return this.settings.message;
                }

                return fetch(this.settings.template)
                    .then((response) => response.ok ? response.text() : null)
                    .then((body) => {
                      if (body) {
                        // Save the content before overwriting the message.
                        params.content = this.settings.message;
                      }
                      return body || this.settings.message;
                    })
                    .catch(() => this.settings.message);
              })
              .then((template) => {
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
          .catch((err) => {
            setActionItemMessage('Emailer error', err, 'error');
            log(req, ecode.emailer.ESUBPARAMS, err);
          });
      });
    }
  }

  // Return the EmailAction.
  return EmailAction;
};
