'use strict';
const fetch = require('@formio/node-fetch-http-proxy');
const _ = require('lodash');

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
     if (!hook.alter('hasEmailAccess', req)) {
       return next(null);
     }
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
    static async settingsForm(req, res, next) {
      try {
        // Get the available transports.
        const availableTransports =  await emailer.availableTransports(req);

        const settingsForm = [
          {
            type: 'select',
            input: true,
            label: 'Transport',
            key: 'transport',
            placeholder: 'Select the email transport.',
            template: '<span>{{ item.title }}</span>',
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
            defaultValue: router.formio.config.defaultEmailSource,
            input: true,
            placeholder: 'Send the email from the following address',
            type: 'textfield',
            multiple: false,
          },
          {
            label: 'Reply-To: Email Address',
            key: 'replyTo',
            inputType: 'text',
            input: true,
            placeholder: 'Reply to an alternative email address',
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
            placeholder: 'Send blind copy of the email to the following email (other recipients will not see this)',
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
          {
            label: 'Rendering Method',
            key: 'renderingMethod',
            type: 'radio',
            defaultValue: 'dynamic',
            values: [
              {
                label: 'Dynamic',
                value: 'dynamic',
              },
              {
                label: 'Static',
                value: 'static',
              }
            ],
            inline: true,
            optionsLabelPosition: 'right',
            // eslint-disable-next-line max-len
            tooltip: 'Dynamic rendering uses formio.js to render email. While static relies on outdated set of mappers.',
            input: true,
          },
        ];

        return next(null, settingsForm);
      }
      catch (err) {
        log(req, ecode.emailer.ENOTRANSP, err);
        return next(err);
      }
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
    async resolve(handler, method, req, res, next, setActionItemMessage) {
      const loadForm = async function(req, setActionItemMessage, next) {
        try {
          const form = await router.formio.cache.loadCurrentForm(req);
          if (!form) {
            const err = new Error(ecode.form.ENOFORM);
            setActionItemMessage('Error no form', err, 'error');
            log(req, ecode.cache.EFORMLOAD, err);
            next(err);
            return null;
          }
          return form;
        }
 catch (err) {
          setActionItemMessage('Error loading form', err, 'error');
          log(req, ecode.cache.EFORMLOAD, err);
          next(err);
          return null;
        }
      };

      const fetchTemplate = async function(settings, params, setActionItemMessage) {
        try {
          const response = await fetch(settings.template);
          const body = response.ok ? await response.text() : null;
          if (body) {
            params.content = settings.message;
          }
          return body || settings.message;
        }
 catch (err) {
          return settings.message;
        }
      };

      const sendEmail = async function(req, res, settings, params, setActionItemMessage) {
        try {
          await emailer.send(req, res, settings, params, setActionItemMessage);
          setActionItemMessage('Message Sent');
        }
        catch (err) {
          setActionItemMessage('Error sending message', {
            message: err.message || err
          }, 'error');
          log(req, ecode.emailer.ESENDMAIL, JSON.stringify(err));
        }
      };

      if (!this.settings.emails || this.settings.emails.length === 0) {
        setActionItemMessage('No email addresses configured', this.settings, 'error');
        return next();
      }

      const form = await loadForm(req, setActionItemMessage, next);
      if (!form) {
        return;
      }

      const reqParams = req.params;
      res.on('finish', () => {
        req.params = reqParams;
      });

      next(); // eslint-disable-line callback-return

      try {
        const params = await emailer.getParams(req, res, form, req.body);

        const query = {
          _id: params.owner,
          deleted: {$eq: null},
        };

        const submissionModel = req.submissionModel || router.formio.resources.submission.model;

        let owner = await submissionModel.findOne(hook.alter('submissionQuery', query, req)).lean();
        if (!owner) {
          owner = {_id: params.owner};
        }
        if (owner) {
          params.owner = owner;
        }

        let template;
        if (!this.settings.template) {
          template = this.settings.message;
        }
 else {
          template = await fetchTemplate(this.settings, params, setActionItemMessage);
        }

        this.settings.message = template;
        setActionItemMessage('Sending message', this.message);

        req.params = reqParams;

        await sendEmail(req, res, this.settings, params, setActionItemMessage);
      }
 catch (err) {
        setActionItemMessage('Emailer error', err, 'error');
        log(req, ecode.emailer.ESUBPARAMS, err);
      }
    }
  }

  // Return the EmailAction.
  return EmailAction;
};
