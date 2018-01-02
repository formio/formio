'use strict';

const util = require('../util/util');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const _ = require('lodash');

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = require('../util/hook')(router.formio);
  const emailer = require('../util/email')(router.formio);

  /**
   * ResetPasswordAction class.
   *   This class is used to implement Forgot Password.
   *
   * @constructor
   */
  const ResetPasswordAction = function(data, req, res) {
    Action.call(this, data, req, res);
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
    // Get the available email transports.
    emailer.availableTransports(req, function(err, availableTransports) {
      if (err) {
        return next(err);
      }

      const basePath = hook.alter('path', '/form', req);
      const dataSrc = `${basePath}/${req.params.formId}/components`;

      // Return the reset password information.
      next(null, [
        {
          type: 'select',
          input: true,
          label: 'Resources',
          key: 'resources',
          placeholder: 'Select the resources we should reset password against.',
          dataSrc: 'url',
          data: {url: `${basePath}?type=resource`},
          valueProperty: '_id',
          template: '<span>{{ item.title }}</span>',
          multiple: true,
          validate: {
            required: true
          }
        },
        {
          type: 'select',
          input: true,
          label: 'Username Field',
          key: 'username',
          placeholder: 'Select the username field',
          template: '<span>{{ item.label || item.key }}</span>',
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
          key: 'password',
          placeholder: 'Select the password field',
          template: '<span>{{ item.label || item.key }}</span>',
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
          key: 'url',
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
          key: 'label',
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
          key: 'subject',
          inputType: 'text',
          defaultValue: 'You requested a password reset',
          input: true,
          placeholder: '',
          type: 'textfield',
          multiple: false
        },
        {
          label: 'Message',
          key: 'message',
          type: 'textarea',
          defaultValue: '<p>Forgot your password? No problem.</p><p><a href="{{ resetlink }}">'
                        + 'Click here to reset your password</a></p> ',
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
   * Return a submission based on the token.
   *
   * @param req
   * @param token
   * @param next
   */
  ResetPasswordAction.prototype.getSubmission = function(req, token, next) {
    // Only continue if the resources are provided.
    if (!token.resources || !token.resources.length) {
      return;
    }

    // Set the name of the key for the mongo query.
    const usernamekey = `data.${this.settings.username}`;

    // Create the query.
    const query = {
      deleted: {$eq: null}
    };

    query[usernamekey] = {$regex: new RegExp(`^${util.escapeRegExp(token.username)}$`), $options: 'i'};
    query.form = {$in: _.map(token.resources, mongoose.Types.ObjectId)};

    // Perform a mongo query to find the submission.
    const submissionModel = req.submissionModel || router.formio.resources.submission.model;
    submissionModel.findOne(query, function(err, submission) {
      if (err || !submission) {
        return next.call(this, 'Submission not found.');
      }

      // Submission found.
      next.call(this, null, submission);
    }.bind(this));
  };

  /**
   * Update a submission for the password.
   *
   * @param req
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
      if (!this.settings.password) {
        return next.call(this, 'Invalid password field');
      }

      // Manually encrypt and update the password.
      router.formio.encrypt(password, function(err, hash) {
        if (err) {
          return next.call(this, 'Unable to change password.');
        }

        const setValue = {};
        setValue[`data.${this.settings.password}`] = hash;

        // Update the password.
        const submissionModel = req.submissionModel || router.formio.resources.submission.model;
        submissionModel.update(
          {_id: submission._id},
          {$set: setValue},
          function(err, newSub) {
            if (err) {
              return next.call(this, 'Unable to reset password.');
            }

            // The submission was saved!
            next.call(this, null, submission);
          }.bind(this)
        );
      }.bind(this));
    });
  };

  /**
   * Initialize the action.
   */
  ResetPasswordAction.prototype.initialize = function(method, req, res, next) {
    // See if we have a reset password token.
    const hasResetToken = !!(req.tempToken && (req.tempToken.type === 'resetpass'));
    if (!hasResetToken && (method === 'create')) {
      // Figure out the username data.
      const username = _.get(req.body.data, this.settings.username);

      // Make sure they have a username.
      if (!username) {
        return res.status(400).send('You must provide a username to reset your password.');
      }

      // Create a token.
      const token = {
        username: username,
        form: req.formId,
        resources: this.settings.resources,
        temp: true,
        type: 'resetpass'
      };

      // Look up the user.
      this.getSubmission(req, token, function(err, submission) {
        if (err || !submission) {
          return res.status(400).send('User not found.');
        }

        // Generate a temporary token for resetting their password.
        const resetToken = jwt.sign(token, router.formio.config.jwt.secret, {
          expiresIn: 5 * 60
        });

        // Create the reset link and add it to the email parameters.
        const params = {
          resetlink: `${this.settings.url}?x-jwt-token=${resetToken}`
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
    else {
      // Set the username for validation purposes.
      if (req.tempToken && req.tempToken.type === 'resetpass') {
        _.set(req.body.data, this.settings.username, req.tempToken.username);
      }

      return next();
    }
  };

  /**
   * Perform a forgot password implementation.
   *
   * @param handler
   * @param method
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param next
   *   The callback function to execute upon completion.
   *
   * @returns {*}
   */
  ResetPasswordAction.prototype.resolve = function(handler, method, req, res, next) {
    // See if we have a reset password token.
    const hasResetToken = !!(req.tempToken && (req.tempToken.type === 'resetpass'));

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
      util.eachComponent(res.resource.item.components, function(component) {
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

      return next();
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
      const password = _.get(req.submission.data, this.settings.password);
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
      return next();
    }
  };

  // Return the ResetPasswordAction.
  return ResetPasswordAction;
};
