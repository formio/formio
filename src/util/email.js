'use strict';

let nodemailer = require('nodemailer');
let sgTransport = require('nodemailer-sendgrid-transport');
let mandrillTransport = require('nodemailer-mandrill-transport');
let mailgunTransport = require('nodemailer-mailgun-transport');
let debug = {
  email: require('debug')('formio:settings:email'),
  send: require('debug')('formio:settings:send'),
  error: require('debug')('formio:error'),
  nunjucksInjector: require('debug')('formio:email:nunjucksInjector')
};
let rest = require('restler');
let util = require('./util');
let _ = require('lodash');
let EMAIL_OVERRIDE = process.env.EMAIL_OVERRIDE;
let Thread = require('../worker/Thread');

/**
 * The email sender for emails.
 * @param formio
 * @returns {{send: Function}}
 */
module.exports = (formio) => {
  let hook = require('./hook')(formio);

  /**
   * Get the list of available email transports.
   *
   * @param req
   * @param next
   */
  let availableTransports = (req, next) => {
    hook.settings(req, (err, settings) => {
      if (err) {
        debug.email(err);
        return next(err);
      }

      // Build the list of available transports, based on the present project settings.
      let availableTransports = [{
        transport: 'default',
        title: 'Default (charges may apply)'
      }];
      if (_.get(settings, 'email.custom.url')) {
        availableTransports.push({
          transport: 'custom',
          title: 'Custom'
        });
      }
      if (_.get(settings, 'email.gmail.auth.user') && _.get(settings, 'email.gmail.auth.pass')) {
        availableTransports.push({
          transport: 'gmail',
          title: 'G-Mail'
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
          title: 'SendGrid'
        });
      }
      if (_.get(settings, 'email.mandrill.auth.apiKey')) {
        availableTransports.push({
          transport: 'mandrill',
          title: 'Mandrill'
        });
      }
      if (_.get(settings, 'email.mailgun.auth.api_key')) {
        availableTransports.push({
          transport: 'mailgun',
          title: 'Mailgun'
        });
      }
      if (_.get(settings, 'email.smtp.host')
        && _.get(settings, 'email.smtp.auth.user')
        && _.get(settings, 'email.smtp.auth.pass')
      ) {
        availableTransports.push({
          transport: 'smtp',
          title: 'SMTP'
        });
      }

      availableTransports = hook.alter('emailTransports', availableTransports, settings);
      next(null, availableTransports);
    });
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
  let settings = (transport, from, emails, subject, message) => {
    return {
      transport,
      from,
      emails,
      subject,
      message
    };
  };

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
  let getParams = (res, form, submission) => new Promise((resolve, reject) => {
    let params = _.cloneDeep(submission);
    if (res && res.resource && res.resource.item) {
      if (typeof res.resource.item.toObject === 'function') {
        params = _.assign(params, res.resource.item.toObject());
      }
      else {
        params = _.assign(params, res.resource.item);
      }
      params.id = params._id.toString();
    }

    // The form components.
    params.components = {};

    let replacements = [];

    // Flatten the resource data.
    util.eachComponent(form.components, (component) => {
      params.components[component.key] = component;
      if (component.type === 'resource' && params.data[component.key]) {
        params.data[component.key + 'Obj'] = params.data[component.key];

        let thread = new Thread(Thread.Tasks.nunjucks).start({
          template: component.template,
          context: {
            item: params.data[component.key]
          }
        })
        .then(response => {
          params.data[component.key] = response.output;
          return response;
        });

        replacements.push(thread);
      }
    });

    Promise.all(replacements).then(results => {
      // Get the parameters for the email.
      params.form = form;
      return resolve(params);
    })
    .catch(reject);
  });

  /**
   * Util function to run the email through nunjucks.
   *
   * @param mail
   * @param options
   *
   * @return {Promise}
   */
  let nunjucksInjector = (mail, options) => new Promise((resolve, reject) => {
    if (!mail || !mail.to) {
      return reject(`No mail was given to send.`);
    }

    let params = options.params;

    // Replace all newline chars with empty strings, to fix newline support in html emails.
    if (mail.html && (typeof mail.html === 'string')) {
      mail.html = mail.html.replace(/\n/g, '');
    }
    debug.nunjucksInjector(mail);

    // Allow the nunjucks templates to be reflective.
    params.mail = mail;

    // Compile the email with nunjucks in a separate thread.
    return new Thread(Thread.Tasks.nunjucks)
    .start({
      render: mail,
      context: params
    })
    .then(injectedEmail => {
      debug.nunjucksInjector(injectedEmail);
      if (!injectedEmail) {
        return reject(`An error occurred while processing the Email.`);
      }

      return resolve(injectedEmail);
    });
  });

  /**
   * Send an email using the current context data.
   *
   * @param req
   * @param res
   * @param message
   * @param params
   * @param next
   * @returns {*}
   */
  let send = (req, res, message, params, next) => {
    // The transporter object.
    let transporter = {sendMail: null};

    // Add the request params.
    params.req = {
      user: req.user,
      token: req.token,
      params: req.params,
      query: req.query
    };

    // Add the response parameters.
    params.res = {
      token: res.token
    };

    // Get the transport for this context.
    let emailType = message.transport
      ? message.transport
      : 'default';

    let _config = (formio && formio.config && formio.config.email && formio.config.email.type);
    debug.send(message);
    debug.send(emailType);

    // Get the settings.
    hook.settings(req, (err, settings) => { // eslint-disable-line max-statements
      if (err) {
        debug.send(err);
        return next(err);
      }

      // Force the email type to custom for EMAIL_OVERRIDE which will allow
      // us to use ngrok to test emails out of test platform.
      if (EMAIL_OVERRIDE) {
        try {
          let override = JSON.parse(EMAIL_OVERRIDE);
          if (override && override.hasOwnProperty('transport')) {
            emailType = override.transport;
            settings.email = {};
            settings.email[emailType] = override.settings;
          }
          else {
            emailType = 'custom';
          }
        }
        catch (err) {
          emailType = 'custom';
        }
      }

      switch (emailType) {
        case 'default':
          if (_config && formio.config.email.type === 'sendgrid') {
            /* eslint-disable camelcase */
            // Check if the user has configured sendgrid for api key access.
            if (!formio.config.email.username && formio.config.email.password) {
              transporter = nodemailer.createTransport(sgTransport({
                auth: {
                  api_key: formio.config.email.password
                }
              }));
            }
            else {
              transporter = nodemailer.createTransport(sgTransport({
                auth: {
                  api_user: formio.config.email.username,
                  api_key: formio.config.email.password
                }
              }));
            }
            /* eslint-enable camelcase */
          }
          else if (_config && formio.config.email.type === 'mandrill') {
            transporter = nodemailer.createTransport(mandrillTransport({
              auth: {
                apiKey: formio.config.email.apiKey
              }
            }));
          }
          break;
        case 'sendgrid':
          if (_.has(settings, 'email.sendgrid')) {
            debug.email(settings.email.sendgrid);
            // Check if the user has configured sendgrid for api key access.
            if (_.get(settings, 'email.sendgrid.auth.api_user')
              && _.get(settings, 'email.sendgrid.auth.api_user').toString() === 'apikey'
            ) {
              settings.email.sendgrid.auth = _.omit(settings.email.sendgrid.auth, 'api_user');
            }

            debug.email(settings.email.sendgrid);
            transporter = nodemailer.createTransport(sgTransport(settings.email.sendgrid));
          }
          break;
        case 'mandrill':
          if (_.has(settings, 'email.mandrill')) {
            transporter = nodemailer.createTransport(mandrillTransport(settings.email.mandrill));
          }
          break;
        case 'mailgun':
          if (_.has(settings, 'email.mailgun')) {
            transporter = nodemailer.createTransport(mailgunTransport(settings.email.mailgun));
          }
          break;
        case 'smtp':
          if (_.has(settings, 'email.smtp')) {
            let _settings = {
              debug: true
            };

            if (_.has(settings, 'email.smtp.port')) {
              _settings['port'] = parseInt(_.get(settings, 'email.smtp.port'));
            }
            if (_.has(settings, 'email.smtp.secure')) {
              let boolean = {
                'true': true,
                'false': false
              };

              _settings['secure'] = _.get(boolean, _.get(settings, 'email.smtp.secure')) || false;
            }
            if (_.has(settings, 'email.smtp.host')) {
              _settings['host'] = _.get(settings, 'email.smtp.host');
            }
            if (_.has(settings, 'email.smtp.auth')) {
              _settings['auth'] = {
                user: _.get(settings, 'email.smtp.auth.user'),
                pass: _.get(settings, 'email.smtp.auth.pass')
              };
            }

            transporter = nodemailer.createTransport(_settings);
          }
          break;
        case 'custom':
          if (_.has(settings, 'email.custom')) {
            transporter.sendMail = (mail, cb) => {
              let options = {};
              if (settings.email.custom.username) {
                options.username = settings.email.custom.username;
                options.password = settings.email.custom.password;
              }

              rest.postJson(settings.email.custom.url, mail, options)
              .on('complete', (result, response) => {
                if (result instanceof Error) {
                  return cb(result);
                }

                return cb(null, result);
              });
            };
          }
          break;
        case 'gmail':
          if (_.has(settings, 'email.gmail')) {
            let options = settings.email.gmail;
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

      // If we don't have a valid transport, don't waste time with nunjucks.
      if (!transporter || typeof transporter.sendMail !== 'function') {
        debug.error(`Could not determine which email transport to use for ${emailType}`);
        return next();
      }

      let mail = {
        from: message.from ? message.from : 'no-reply@form.io',
        to: (typeof message.emails === 'string') ? message.emails : message.emails.join(', '),
        subject: message.subject,
        html: message.message
      };
      let options = {
        params
      };

      nunjucksInjector(mail, options)
      .then(email => {
        let queue = [];
        let emails = [];

        debug.send(`message.sendEach: ${message.sendEach}`);
        debug.send(`email: ${JSON.stringify(email)}`);
        if (message.sendEach === true) {
          let addresses = _.uniq(_.map(email.to.split(','), _.trim));
          debug.send(`addresses: ${JSON.stringify(addresses)}`);
          addresses.forEach(address => {
            // Make a copy of the email for each recipient.
            emails.push(_.assign({}, email, {to: address}));
          });
        }
        else {
          emails.push(email);
        }

        debug.send(`emails: ${JSON.stringify(emails)}`);
        // Send each mail using the transporter.
        emails.forEach(email => {
          // Replace all newline chars with empty strings, to fix newline support in html emails.
          if (email.html && (typeof email.html === 'string')) {
            email.html = email.html.replace(/\n/g, '');
          }

          let pending = new Promise((resolve, reject) => {
            // Allow anyone to hook the final email before sending.
            return hook.alter('email', email, req, res, params, (err, email) => {
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

                return transporter.sendMail(email, (err, info) => {
                  if (err) {
                    return reject(err);
                  }

                  return resolve(info);
                });
              });
            });
          });

          queue.push(pending);
        });

        return Promise.all(queue);
      })
      .then(response => next(null, response))
      .catch(err => {
        debug.error(err);
        return next(err);
      });
    });
  };

  return {
    availableTransports,
    settings,
    getParams,
    send
  };
};
