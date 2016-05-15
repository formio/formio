'use strict';

var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var mandrillTransport = require('nodemailer-mandrill-transport');
var mailgunTransport = require('nodemailer-mailgun-transport');
var nunjucks = require('./nunjucks');
var debug = require('debug')('formio:settings:email');
var rest = require('restler');
var _ = require('lodash');

/**
 * The email sender for emails.
 * @param formio
 * @returns {{send: Function}}
 */
module.exports = function(formio) {
  var hook = require('./hook')(formio);
  return {
    availableTransports: function(req, next) {
      hook.settings(req, function(err, settings) {
        if (err) {
          return next(err);
        }

        var availableTransports = [
          {
            transport: 'default',
            title: 'Default (charges may apply)'
          }
        ];
          if (_.get(settings, 'email.custom.url')) {
          availableTransports.push(
            {
              transport: 'custom',
              title: 'Custom'
            }
          );
        }
        if (_.get(settings, 'email.gmail.auth.user')
          && _.get(settings, 'email.gmail.auth.pass')) {
          availableTransports.push(
            {
              transport: 'gmail',
              title: 'G-Mail'
            }
          );
        }
        if (_.get(settings, 'email.sendgrid.auth.api_user') && _.get(settings, 'email.sendgrid.auth.api_key')
          || (!_.get(settings, 'email.sendgrid.auth.api_user') && _.get(settings, 'email.sendgrid.auth.api_key'))
        ) {
          // Omit the username if user has configured sendgrid for api key access.
          if (_.get(settings, 'email.sendgrid.auth.api_user') === 'apikey') {
            settings.email.sendgrid.auth = _.omit(settings.email.sendgrid.auth, 'api_user');
          }
          availableTransports.push(
            {
              transport: 'sendgrid',
              title: 'SendGrid'
            }
          );
        }
        if (_.get(settings, 'email.mandrill.auth.apiKey')) {
          availableTransports.push(
            {
              transport: 'mandrill',
              title: 'Mandrill'
            }
          );
        }
        if (_.get(settings, 'email.mailgun.auth.api_key')) {
          availableTransports.push(
            {
              transport: 'mailgun',
              title: 'Mailgun'
            }
          );
        }

        availableTransports = hook.alter('emailTransports', availableTransports, settings);
        next(null, availableTransports);
      });
    },
    settings: function(transport, from, emails, subject, message) {
      return {
        transport: transport,
        from: from,
        emails: emails,
        subject: subject,
        message: message
      };
    },
    send: function(req, res, message, params, next) {
      // The transporter object.
      var transporter = {sendMail: null};

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

      var emailType = message.transport ? message.transport : 'default';

      // To send the mail.
      var sendMail = function(mail, sendEach) {
        if (sendEach) {
          var emails = _.uniq(_.map(mail.to.split(','), _.trim));
          (function sendNext() {
            sendMail(_.assign({}, mail, {
              to: emails.shift()
            }));
            if (emails.length > 0) {
              process.nextTick(sendNext);
            }
          })();
        }
        else if (transporter && (typeof transporter.sendMail === 'function')) {
          // Allow others to alter the email before it is sent.
          hook.alter('email', mail, req, res, params, function(err, mail) {
            if (err) {
              return;
            }

            // Compile the email with nunjucks.
            try {
              mail = nunjucks.renderObj(mail, params);
            }
            catch (e) {
              mail = null;
            }

            // Do not send an empty email.
            if (!mail) {
              return;
            }

            // Override the "to" email if provided on a test server.
            if (process.env.EMAIL_OVERRIDE) {
              mail.to = process.env.EMAIL_OVERRIDE;
            }

            // Send the email.
            transporter.sendMail(mail);
          });
        }
      };

      // Get the settings.
      hook.settings(req, function(err, settings) {
        if (err) {
          return;
        }

        var _config = (formio && formio.config && formio.config.email && formio.config.email.type);

        debug(formio.config);
        debug(emailType);
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
            debug(settings.email.sendgrid);
            if (settings.email.sendgrid) {
              // Check if the user has configured sendgrid for api key access.
              if (_.get(settings, 'email.sendgrid.auth.api_user')
                && _.get(settings, 'email.sendgrid.auth.api_user').toString() === 'apikey'
              ) {
                settings.email.sendgrid.auth = _.omit(settings.email.sendgrid.auth, 'api_user');
              }

              debug(settings.email.sendgrid);
              transporter = nodemailer.createTransport(sgTransport(settings.email.sendgrid));
            }
            break;
          case 'mandrill':
            if (settings.email.mandrill) {
              transporter = nodemailer.createTransport(mandrillTransport(settings.email.mandrill));
            }
            break;
          case 'mailgun':
            if (settings.email.mailgun) {
              transporter = nodemailer.createTransport(mailgunTransport(settings.email.mailgun));
            }
            break;
          case 'custom':
            if (settings.email.custom) {
              transporter.sendMail = function(mail) {
                var options = {};
                if (settings.email.custom.username) {
                  options.username = settings.email.custom.username;
                  options.password = settings.email.custom.password;
                }

                rest.postJson(settings.email.custom.url, mail, options);
              };
            }
            break;
          case 'gmail':
            if (settings.email.gmail) {
              var options = settings.email.gmail;
              options.service = 'Gmail';
              transporter = nodemailer.createTransport(options);
            }
            break;
          case 'test':
            transporter.sendMail = function(mail) {
              hook.invoke('email', emailType, mail);
            };
            break;
          default:
            transporter = hook.invoke('email', emailType, message, settings, req, res, params);
            break;
        }

        // Ensure we have a valid transporter to send the email.
        if (transporter && (typeof transporter.sendMail === 'function')) {
          sendMail({
            from: message.from ? message.from : 'no-reply@form.io',
            to: (typeof message.emails === 'string') ? message.emails : message.emails.join(', '),
            subject: message.subject,
            html: message.message
          }, message.sendEach);
        }
      }.bind(this));

      // Move onto the next action immediately.
      return next();
    }
  };
};
