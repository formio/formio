'use strict';

var Action = require('./Action');
var async = require('async');
var util = require('../util/util');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var _ = require('lodash');
module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  var emailer = require('../util/email')(router.formio);

  /**
   * ResetPasswordAction class.
   *   This class is used to implement Forgot Password.
   *
   * @constructor
   */
  var ResetPasswordAction = function(data, req, res) {
    Action.call(this, data, req, res);
    req.disableDefaultAction = true;
  };

  // Derive from Action.
  ResetPasswordAction.prototype = Object.create(Action.prototype);
  ResetPasswordAction.prototype.constructor = ResetPasswordAction;
  ResetPasswordAction.info = function(req, res, next) {
    next(null, {
      name: 'resetpass',
      title: 'Reset Password',
      description: 'Provides a way to reset a password field.',
      defaults: {
        handler: ['after', 'before'],
        method: ['form', 'create']
      },
      skipDefault: true,
      access: {
        handler: false,
        method: false
      }
    });
  };
  ResetPasswordAction.access = {
    handler: false,
    method: false
  };

  ResetPasswordAction.settingsForm = function(req, res, next) {
    var dataSrc = hook.alter('url', '/form/' + req.params.formId + '/components', req);

    // Get the available email transports.
    emailer.availableTransports(req, function(err, availableTransports) {
      if (err) {
        return next(err);
      }

      // Return the reset password information.
      next(null, [
        {
          type: 'select',
          input: true,
          label: 'Username Field',
          key: 'settings[username]',
          placeholder: 'Select the username field to reset password against.',
          template: '<span>{{ item.label }}</span>',
          dataSrc: 'url',
          data: {url: dataSrc},
          valueProperty: 'key',
          multiple: false,
          validate: {
            required: true
          }
        },
        {
          type: 'select',
          input: true,
          label: 'Password Field',
          key: 'settings[password]',
          placeholder: 'Select the password field for resetting the password.',
          template: '<span>{{ item.label }}</span>',
          dataSrc: 'url',
          data: {url: dataSrc},
          valueProperty: 'key',
          multiple: false,
          validate: {
            required: true
          }
        },
        {
          label: 'Reset Link URL',
          key: 'settings[url]',
          inputType: 'text',
          defaultValue: '',
          input: true,
          placeholder: 'Enter the URL they should go to reset their password.',
          type: 'textfield',
          multiple: false,
          validate: {
            required: true
          }
        },
        {
          label: 'Reset Password Button Label',
          key: 'settings[label]',
          inputType: 'text',
          defaultValue: 'Email Reset Password Link',
          input: true,
          placeholder: '',
          type: 'textfield',
          multiple: false
        },
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
          label: 'Subject',
          key: 'settings[subject]',
          inputType: 'text',
          defaultValue: 'You requested a password reset',
          input: true,
          placeholder: '',
          type: 'textfield',
          multiple: false
        },
        {
          label: 'Message',
          key: 'settings[message]',
          type: 'textarea',
          defaultValue: '<p>Forgot your password? No problem.</p><p><a href="{{ resetlink }}">Click here to reset your password</a></p> ',
          multiple: false,
          rows: 3,
          suffix: '',
          prefix: '',
          placeholder: '',
          input: true
        }
      ]);
    });
  };

  /**
   * Return the resource name.
   *
   * @param type
   *   The type of settings to pull from.
   */
  ResetPasswordAction.prototype.getResourceName = function(type) {
    var resource = '';
    if (this.settings[type].indexOf('.') !== -1) {

      // Split the username.
      var parts = this.settings[type].split('.');

      // Ensure that there is only two levels of nesting.
      if (parts.length > 2) {
        return '';
      }

      // The resource name should be the first item.
      resource = parts.shift();
    }
    return resource;
  };

  /**
   * Returns the field name.
   * @param type
   * @returns {*}
   */
  ResetPasswordAction.prototype.getFieldName = function(type) {
    var fieldName = this.settings[type];
    if (fieldName.indexOf('.') !== -1) {
      var parts = this.settings[type].split('.');

      // Ensure we don't have deeply nested resources.
      if (parts.length > 2) {
        return '';
      }

      // The field name is the last item.
      fieldName = parts.pop();
    }
    return fieldName;
  };

  /**
   * Get the submission query to find a submission.
   * @returns {{}}
   */
  ResetPasswordAction.prototype.submissionQuery = function(token) {

    // Get the field name and the username key.
    var usernameField = this.getFieldName('username');
    if (!usernameField) {
      return next.call(this, 'Invalid username field.');
    }

    // Set the name of the key for the mongo query.
    var usernamekey = 'data.' + usernameField;

    // Create the query.
    var query = {};
    query[usernamekey] = token.username;
    query.form = mongoose.Types.ObjectId(token.form);
    return query;
  };

  /**
   * Return a submission based on the token.
   *
   * @param token
   * @param next
   */
  ResetPasswordAction.prototype.getSubmission = function(req, token, next) {
    // If the resource is provided, get the submission from that form.
    if (token.resource) {

      // Load the resource defined by the token.
      router.formio.cache.loadFormByName(req, token.resource, function(err, resource) {
        if (err) { return next.call(this, 'Unknown resource.'); }
        token.resource = '';
        token.form = resource._id.toString();
        this.getSubmission(req, token, next);
      }.bind(this));
      return;
    }


    // Perform a mongo query to find the submission.
    router.formio.resources.submission.model.findOne(
      this.submissionQuery(token),
      function(err, submission) {
        if (err || !submission) {
          return next.call(this, 'Submission not found.');
        }

        // Submission found.
        next.call(this, null, submission);
      }.bind(this)
    );
  };

  /**
   * Update a submission for the password.
   *
   * @param token
   * @param password
   * @param next
   */
  ResetPasswordAction.prototype.updatePassword = function(req, token, password, next) {

    // Get the submission.
    this.getSubmission(req, token, function(err, submission) {

      // Make sure we found the user.
      if (err || !submission) {
        return next.call(this, 'User not found.');
      }

      // Get the name of the password field.
      var passwordField = this.getFieldName('password');
      if (!passwordField) {
        return next.call(this, 'Invalid password field');
      }

      // Manually encrypt and update the password.
      router.formio.encrypt(password, function(err, hash) {

        var setValue = {};
        setValue['data.' + passwordField] = hash;

        // Update the password.
        router.formio.resources.submission.model.update(
          this.submissionQuery(token),
          setValue,
          function(err, newSub) {
            if (err) {
              return next.call(this, 'Unable to reset password.');
            }

            // The submission was saved!
            next.call(this, null, newSub);
          }.bind(this)
        );
      }.bind(this));
    })
  };

  /**
   * Perform a forgot password implementation.
   *
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param cb
   *   The callback function to execute upon completion.
   */
  ResetPasswordAction.prototype.resolve = function(handler, method, req, res, next) {

    // See if we have a reset password token.
    var hasResetToken = !!(req.tempToken && (req.tempToken.type === 'resetpass'));

    // Only show the reset password username field on form get.
    if (
      (handler === 'after') &&
      (method === 'form') &&
      req.query.hasOwnProperty('live') && (parseInt(req.query.live, 10) === 1) &&
      res.hasOwnProperty('resource') &&
      res.resource.hasOwnProperty('item') &&
      res.resource.item._id
    ) {

      // Modify the form based on if there is a reset token or not.
      util.eachComponent(res.resource.item.components, function (component) {
        if (
          !hasResetToken &&
          (component.type === 'button') &&
          (component.action === 'submit')
        ) {
          component.label = this.settings.label;
        }
        else if (
          (!hasResetToken && (component.key !== this.settings.username)) ||
          (hasResetToken && (component.key === this.settings.username))
        ) {
          component.type = 'hidden';
          if (component.validate) {
            component.validate.required = false;
          }
        }
      }.bind(this));
      next();
    }

    // Handle the request for resetting their password.
    else if (
      !hasResetToken &&
      (handler === 'before') &&
      (method === 'create')
    ) {

      // Figure out the username data.
      var username = req.body ? _.property(this.settings.username)(req.body.data) : '';

      // Make sure they have a username.
      if (!username) {
        return res.status(400).send('You must provide a username to reset your password.');
      }

      // Get the resource name.
      var resource = this.getResourceName('username');

      // Create a token.
      var token = {
        username: username,
        form: req.formId,
        resource: resource,
        temp: true,
        type: 'resetpass'
      };

      // Look up the user.
      this.getSubmission(req, token, function(err, submission) {
        if (err || !submission) {
          return res.status(400).send('User not found.');
        }

        // Generate a temporary token for resetting their password.
        var resetToken = jwt.sign(token, router.formio.config.jwt.secret, {
          expiresInMinutes: 5
        });

        // Create the reset link and add it to the email parameters.
        var params = {
          resetlink: this.settings.url + '?x-jwt-token=' + resetToken
        };

        // Now send them an email.
        emailer.send(req, res, {
          transport: this.settings.transport,
          from: this.settings.from,
          emails: username,
          subject: this.settings.subject,
          message: this.settings.message
        }, _.assign(params, req.body), function() {

          // Let them know an email is on its way.
          res.status(200).json({
            message: 'Password reset email was sent.'
          });
        });
      });
    }

    // Handle the request after they have come back.
    else if (
      hasResetToken &&
      (handler === 'before') &&
      (method === 'create')
    ) {
      if (
        !req.tempToken.username ||
        !req.tempToken.form
      ) {
        return res.status(400).send('Invalid reset password token');
      }

      // Get the password
      var password = _.property(this.settings.password)(req.body.data);
      if (!password) {
        return next.call(this, 'No password provided.');
      }

      // Update the password.
      this.updatePassword(req, req.tempToken, password, function(err) {
        if (err) {
          return res.status(400).send('Unable to update the password. Please try again.');
        }
        res.status(200).send({
          message: 'Password was successfully updated.'
        });
      });
    }
    else {
      next();
    }
  };

  // Return the ResetPasswordAction.
  return ResetPasswordAction;
};
