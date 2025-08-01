/* eslint-disable max-statements */
'use strict';

const nodemailer = require('nodemailer');
const debug = {
  email: require('debug')('formio:settings:email'),
  send: require('debug')('formio:settings:send'),
  error: require('debug')('formio:error'),
  nunjucksInjector: require('debug')('formio:email:nunjucksInjector')
};
const fetch = require('@formio/node-fetch-http-proxy');
const {IsolateVM} = require('@formio/vm');
const _ = require('lodash');
const {renderEmail} = require('./renderEmail');
const util = require('../util');
const {CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS} = require('../../vm');

const DEFAULT_TRANSPORT = process.env.DEFAULT_TRANSPORT;
const EMAIL_OVERRIDE = process.env.EMAIL_OVERRIDE;
const EMAIL_CHUNK_SIZE = process.env.EMAIL_CHUNK_SIZE || 100;

/**
 * The email sender for emails.
 * @param formio
 * @returns {{send: Function}}
 */
module.exports = (formio) => {
  const hook = require('../hook')(formio);
  const config = formio.config;
  const EmailRenderVM = new IsolateVM({timeoutMs: config.vmTimeout, env: CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS});

  /**
   * Get the list of available email transports.
   *
   * @param req
   */
  const availableTransports = async (req) => {
    try {
      const settings = await hook.settings(req);
      // Build the list of available transports, based on the present project settings.
      let availableTransports = [];
      if (_.get(settings, 'email.custom.url')) {
        availableTransports.push({
          transport: 'custom',
          title: 'Custom',
        });
      }
      if (_.get(settings, 'email.gmail.auth.user') && _.get(settings, 'email.gmail.auth.pass')) {
        availableTransports.push({
          transport: 'gmail',
          title: 'G-Mail',
        });
      }
      if (
        (_.get(settings, 'email.sendgrid.auth.api_user') && _.get(settings, 'email.sendgrid.auth.api_key'))
        || ((!_.get(settings, 'email.sendgrid.auth.api_user') && _.get(settings, 'email.sendgrid.auth.api_key')))
      ) {
        // Omit the username if user has configured sendgrid for api key access.
        if (_.get(settings, 'email.sendgrid.auth.api_user') === 'apikey') {
          settings.email.sendgrid.auth = _.omit(settings.email.sendgrid.auth, 'api_user');
        }
        availableTransports.push({
          transport: 'sendgrid',
          title: 'SendGrid',
        });
      }
      if (_.get(settings, 'email.mailgun.auth.api_key')) {
        availableTransports.push({
          transport: 'mailgun',
          title: 'Mailgun',
        });
      }
      if (_.get(settings, 'email.smtp.host')) {
        availableTransports.push({
          transport: 'smtp',
          title: 'SMTP',
        });
      }

      availableTransports = hook.alter('emailTransports', availableTransports, settings, req);
      // Make it reverse compatible. Should be asyncronous now.
      if (availableTransports) {
        return availableTransports;
      }
    }
    catch (err) {
      debug.email(err);
    }
  };

  /**
   * Get a simple email object.
   *
   * @param transport
   * @param from
   * @param emails
   * @param subject
   * @param message
   *
   * @returns {{transport: *, from: *, emails: *, subject: *, message: *}}
   */
  const settings = (transport, from, emails, subject, message) => ({
    transport,
    from,
    emails,
    subject,
    message,
  });

  /**
   * Get the available substitution parameters for the current email context.
   *
   * @param res
   * @param form
   * @param submission
   *
   * @returns {Promise}
   *   The available substitution values.
   */
  const getParams = (req, res, form, submission) => new Promise((resolve, reject) => {
    let params = submission;
    if (res && res.resource && res.resource.item) {
      if (typeof res.resource.item.toObject === 'function') {
        params = _.assign(params, res.resource.item.toObject());
      }
      else {
        params = _.assign(params, res.resource.item);
      }
      params.id = params._id.toString();
    }
    params = JSON.parse(JSON.stringify(params));
    // The form components.
    params.components = {};
    params.componentsWithPath = {};
    params.scope = params.scope || {};

    const replacements = [];

    // Flatten the resource data.
    util.eachComponent(form.components, (component, path) => {
      params.components[component.key] = component;
      params.componentsWithPath[path] = component;
      params.componentsWithPath[path].compPath = path;
      if (component.type === 'resource' && params.data[component.key]) { // need that
        params.data[`${component.key}Obj`] = params.data[component.key]; // need that
      }
    });

    Promise.all(replacements).then(() => {
      // Get the parameters for the email.
      params.form = form;
      // Allow hooks to alter params.
      Promise.resolve(hook.alter('actionContext', params, req)).then(params => resolve(params), reject);
    })
    .catch(reject);
  });

  const getEnvSettings = (variable) => {
    let settings = null;
    try {
      settings = JSON.parse(variable);
    }
    catch (err) {
      console.log(`Cannot read ${variable}: ${err.message}`);
      settings = null;
    }
    return settings;
  };

  /**
   * Util function to run the email through nunjucks.
   *
   * @param mail
   * @param options
   *
   * @return {Promise}
   */
  const nunjucksInjector = (mail, options) => new Promise((resolve, reject) => {
    if (!mail || !mail.to) {
      return reject(`No mail was given to send.`);
    }

    const params = options.params;

    // Replace all newline chars with empty strings, to fix newline support in html emails.
    if (mail.html && (typeof mail.html === 'string')) {
      mail.html = mail.html.replace(/\n/g, '');
    }
    debug.nunjucksInjector(mail);

    // Allow the nunjucks templates to be reflective.
    params.mail = mail;

    // Compile the email with nunjucks in a separate thread.
    return renderEmail({
      render: mail,
      context: params,
      vm: EmailRenderVM,
      timeout: formio.config.vmTimeout,
    })
    .then((injectedEmail) => {
      debug.nunjucksInjector(injectedEmail);
      if (!injectedEmail) {
        return reject(`An error occurred while processing the Email.`);
      }

      return resolve(injectedEmail);
    })
    .catch((err) => {
      return reject(err);
    });
  });

  /**
   * Send an email using the current context data.
   *
   * @param req
   * @param res
   * @param message
   * @param params
   * @returns {*}
   */
  const send = async (req, res, message, params, setActionItemMessage = () => {}) => {
    const setParams = (params, req, res, message) => {
        // Add the request params.
        params.req = _.pick(req, [
          'user',
          'token',
          'params',
          'query',
          'body',
        ]);

        // Add the response parameters.
        params.res = _.pick(res, [
          'token',
        ]);

        // Add the settings to the parameters.
        params.settings = message;
    };

    const setTransporter = (transporter, emailType, settings, _config) => {
      switch (emailType) {
        case 'default':
          if (_config && formio.config.email.type === 'sendgrid') {
            transporter = nodemailer.createTransport({
              host: 'smtp.sendgrid.net',
              port: 587,
              secure: false,
              auth: {
                user: 'apikey',
                pass: settings.email.sendgrid.auth.api_key
              }
            });
          }
          break;
        case 'sendgrid':
          if (_.has(settings, 'email.sendgrid')) {
            debug.email(settings.email.sendgrid);
            transporter = nodemailer.createTransport({
              host: 'smtp.sendgrid.net',
              port: 587,
              secure: false,
              auth: {
                user: 'apikey',
                pass: settings.email.sendgrid.auth.api_key
              }
            });
          }
          break;
        case 'mailgun':
          if (_.has(settings, 'email.mailgun')) {
            transporter = nodemailer.createTransport({
              host: 'smtp.mailgun.org',
              port: 587,
              secure: false,
              auth: {
                user: settings.email.mailgun.auth.domain,
                pass: settings.email.mailgun.auth.api_key
              }
            });
          }
          break;
        case 'smtp':
          if (_.has(settings, 'email.smtp')) {
            const _settings = {
              debug: true,
            };

            if (_.has(settings, 'email.smtp.port')) {
              _settings['port'] = parseInt(_.get(settings, 'email.smtp.port'));
            }
            if (_.has(settings, 'email.smtp.secure')) {
              const boolean = {
                'true': true,
                'false': false,
              };

              _settings['secure'] = _.get(boolean, _.get(settings, 'email.smtp.secure')) || false;
            }
            if (_.has(settings, 'email.smtp.ignoreTLS')) {
              const boolean = {
                'true': true,
                'false': false,
              };

              _settings['ignoreTLS'] = _.get(boolean, _.get(settings, 'email.smtp.ignoreTLS')) || false;
            }
            if (_.has(settings, 'email.smtp.host')) {
              _settings['host'] = _.get(settings, 'email.smtp.host');
            }
            if (
              _.has(settings, 'email.smtp.auth') &&
              _.get(settings, 'email.smtp.auth.user', false)
            ) {
              _settings['auth'] = {
                user: _.get(settings, 'email.smtp.auth.user'),
                pass: _.get(settings, 'email.smtp.auth.pass'),
              };
            }
            if (
              _.get(settings, 'email.smtp.allowUnauthorizedCerts', false)
            ) {
              _settings['tls'] = {
                rejectUnauthorized: false,
              };
            }
            transporter = nodemailer.createTransport(_settings);
          }
          break;
        case 'custom':
          if (_.has(settings, 'email.custom')) {
            transporter.sendMail = async (mail, cb) => {
              const authHeader = {};
              if (settings.email.custom.username) {
                const payload = `${settings.email.custom.username}:${settings.email.custom.password}`;
                authHeader.Authorization = `Basic ${Buffer.from(payload).toString('base64')}`;
              }

              const response = await fetch(settings.email.custom.url, {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                    'accept': 'application/json',
                    ...authHeader
                  },
                  body: JSON.stringify(mail),
              });

              if (response.ok) {
                const result = await response.json();
                return cb(null, result);
              }
              else {
                return cb(new Error(`${response.status  }: ${  response.statusText}`));
              }
            };
          }
          break;
        case 'gmail':
          if (_.has(settings, 'email.gmail')) {
            const options = settings.email.gmail;
            options.service = 'Gmail';
            transporter = nodemailer.createTransport(options);
          }
          break;
        case 'test':
        default:
          transporter.sendMail = (mail, cb) => {
            return cb(null, mail);
          };
          break;
      }
      return transporter;
    };

    const prepareMail = (message) => {
      const formatNodemailerEmailAddress = (addresses) => _.isString(addresses) ? addresses : addresses.join(', ');

      const {
        from,
        emails,
        cc: rawCc,
        bcc: rawBcc,
        subject,
        message: html,
        transport,
        replyTo,
        renderingMethod,
      } = message;

      const mail = {
        from: from || formio.config.defaultEmailSource,
        to: formatNodemailerEmailAddress(emails),
        subject,
        html,
        msgTransport: transport,
        transport: message.transport || 'default',
        renderingMethod,
      };

      if (replyTo) {
        mail.replyTo = replyTo || from;
      }

      const cc = (rawCc || []).map(_.trim).filter(Boolean);
      const bcc = (rawBcc || []).map(_.trim).filter(Boolean);

      if (cc.length) {
        mail.cc = formatNodemailerEmailAddress(cc);
      }

      if (bcc.length) {
        mail.bcc = formatNodemailerEmailAddress(bcc);
      }

      return mail;
    };

    const send = async (transporter, message, options) => {
      const  mail = prepareMail(message);

      const sendEmail = (email) => {
        // Replace all newline chars with empty strings, to fix newline support in html emails.
        if (email.html && (typeof email.html === 'string')) {
          email.html = email.html.replace(/\n/g, '');
        }

        return new Promise((resolve, reject) => {
          // Allow anyone to hook the final email before sending.
          return hook.alter('email', email, req, res, params, setActionItemMessage, (err, email) => {
            if (err) {
              return reject(err);
            }

            // Allow anyone to hook the final destination settings before sending.
            hook.alter('emailSend', true, email, (err, send) => {
              if (err) {
                return reject(err);
              }
              if (!send) {
                return resolve(email);
              }

              try {
                return transporter.sendMail(email, (err, info) => {
                  if (err) {
                    debug.error(err);
                    return reject(err);
                  }

                  return resolve(info);
                });
              }
              catch (err) {
                console.log(err);
                reject(err);
              }
            });
          });
        });
      };

      const sendEmails = () => nunjucksInjector(mail, options)
        .then((email) => hook.alter('checkEmailPermission', email, params.form))
        .then((email) => {
          let emails = [];

          debug.send(`message.sendEach: ${message.sendEach}`);
          // debug.send(`email: ${JSON.stringify(email)}`);
          if (message.sendEach === true) {
            const addresses = _.uniq(email.to.split(',').map(_.trim)).filter(address=>address.length&&address.length>0);
            // debug.send(`addresses: ${JSON.stringify(addresses)}`);
            // Make a copy of the email for each recipient.
            emails = addresses.map((address) => Object.assign({}, email, {to: address}));
          }
          else {
            emails = [email];
          }

          // debug.send(`emails: ${JSON.stringify(emails)}`);

          const chunks = _.chunk(emails, EMAIL_CHUNK_SIZE);
          return chunks.reduce((result, chunk) => {
            // Send each mail using the transporter.
            return result.then(() => new Promise((resolve, reject) => {
              setImmediate(
                () => Promise.all(chunk.map((email) => sendEmail(email)))
                  .then(resolve)
                  .catch(reject),
              );
            }));
          }, Promise.resolve());
      });

      const response = await sendEmails();
      return response;
    };

    const isTransportValid = (transporter) => !transporter || typeof transporter.sendMail !== 'function';

    try {
      setParams(params, req, res, message);

      // Get the transport for this context.
      let emailType = message.transport
        ? message.transport
        : 'default';

      const _config = (formio && formio.config && formio.config.email && formio.config.email.type);
      debug.send(message);
      debug.send(emailType);
      // Get the settings.
      const settings = await hook.settings(req); // eslint-disable-line max-statements
      // Force the email type to custom for EMAIL_OVERRIDE which will allow
      // us to use ngrok to test emails out of test platform.
      if (EMAIL_OVERRIDE) {
        const override = getEnvSettings(EMAIL_OVERRIDE);
        if (override && override.hasOwnProperty('transport')) {
          emailType = override.transport;
          settings.email = {};
          settings.email[emailType] = override.settings;
        }
        else {
          emailType = 'custom';
        }
      }

      if (emailType === 'default' && DEFAULT_TRANSPORT) {
        const defaultTransport = getEnvSettings(DEFAULT_TRANSPORT);
        if (defaultTransport && defaultTransport.hasOwnProperty('transport')) {
          emailType = defaultTransport.transport;
          settings.email = {};
          settings.email[emailType] = defaultTransport.settings;
          settings.email[emailType].defaultTransport = true;
        }
      }

      const transporter = setTransporter({sendMail: null}, emailType, settings, _config);

      // If we don't have a valid transport, don't waste time with nunjucks.
      if (isTransportValid(transporter)) {
        debug.error(`Could not determine which email transport to use for ${emailType}`);
        return;
      }

      const options = {
        params,
      };

      return await send(transporter, message, options);
    }
    catch (err) {
      debug.send(err);
      throw new Error(err);
    }
  };

  return {
    availableTransports,
    settings,
    getParams,
    send,
  };
};
