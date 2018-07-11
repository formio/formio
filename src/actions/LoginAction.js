'use strict';

const _ = require('lodash');

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = require('../util/hook')(router.formio);

  /**
   * AuthAction class.
   *   This class is used to create the Authentication action.
   */
  class LoginAction extends Action {
    constructor(data, req, res) {
      super(data, req, res);
    }

    static info(req, res, next) {
      next(null, {
        name: 'login',
        title: 'Login',
        description: 'Provides a way to login to the application.',
        priority: 2,
        defaults: {
          handler: ['before'],
          method: ['create']
        },
        access: {
          handler: false,
          method: false
        }
      });
    }

    /**
     * Settings form for auth action.
     *
     * @param req
     * @param res
     * @param next
     */
    static settingsForm(req, res, next) {
      const basePath = hook.alter('path', '/form', req);
      const dataSrc = `${basePath}/${req.params.formId}/components`;
      next(null, [
        {
          type: 'select',
          input: true,
          label: 'Resources',
          key: 'resources',
          placeholder: 'Select the resources we should login against.',
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
          type: 'textfield',
          key: 'allowedAttempts',
          input: true,
          label: 'Maximum Login Attempts',
          description: 'Use 0 for unlimited attempts',
          defaultValue: '5'
        },
        {
          type: 'textfield',
          key: 'attemptWindow',
          input: true,
          label: 'Login Attempt Time Window',
          description: 'This is the window of time to count the login attempts.',
          defaultValue: '30',
          suffix: 'seconds'
        },
        {
          type: 'textfield',
          key: 'lockWait',
          input: true,
          label: 'Locked Account Wait Time',
          description: 'The amount of time a person needs to wait before they can try to login again.',
          defaultValue: '1800',
          suffix: 'seconds'
        }
      ]);
    }

    /**
     * Format a string to show how long one must wait.
     *
     * @param time - In seconds.
     * @returns {string}
     */
    waitText(time) {
      return (time > 60) ? `${parseInt(time / 60, 10)} minutes` : `${parseInt(time, 10)} seconds`;
    }

    /**
     * Checks the login attempts for a certain login.
     *
     * @param user
     * @param next
     * @returns {*}
     */
    /* eslint-disable max-statements */
    checkAttempts(error, req, user, next) {
      if (!user || !user._id) {
        return next.call(this, error);
      }

      if (!this.settings.allowedAttempts) {
        return next.call(this, error);
      }

      const allowedAttempts = parseInt(this.settings.allowedAttempts, 10);
      if (!allowedAttempts) {
        return next.call(this, error);
      }

      // Initialize the login metadata.
      if (!user.metadata) {
          user.metadata = {login: {}};
      }
      if (!user.metadata.login) {
          user.metadata.login = {};
      }

      const now = (new Date()).getTime();
      const lastAttempt = parseInt(user.metadata.login.last, 10) || 0;

      // See if the login is locked.
      if (user.metadata.login.locked) {
        // Get how long they must wait to be locked out.
        let lockWait = parseInt(this.settings.lockWait, 10) || 1800;

        // Normalize to milliseconds.
        lockWait *= 1000;

        // See if the time has expired.
        if ((lastAttempt + lockWait) < now) {
          // Reset the locked state and attempts totals.
          user.metadata.login.attempts = 0;
          user.metadata.login.locked = false;
          user.metadata.login.last = now;
        }
        else {
          const howLong = (lastAttempt + lockWait) - now;
          return next.call(this, `You must wait ${this.waitText(howLong / 1000)} before you can login.`);
        }
      }
      else if (error) {
        let attemptWindow = parseInt(this.settings.attemptWindow, 10) || 30;

        // Normalize to milliseconds.
        attemptWindow *= 1000;

        // Determine the login attempts within a certain window.
        const withinWindow = lastAttempt ? ((lastAttempt + attemptWindow) > now) : false;

        if (!withinWindow) {
          user.metadata.login.attempts = 0;
          user.metadata.login.last = now;
        }
        else {
          let attempts = parseInt(user.metadata.login.attempts, 10) || 0;
          attempts++;

          // If they exceeded the login attempts.
          if (attempts >= allowedAttempts) {
            const lockWait = parseInt(this.settings.lockWait, 10) || 1800;
            error = `Maximum Login attempts. Please wait ${this.waitText(lockWait)} before trying again.`;
            user.metadata.login.locked = true;
          }

          // Set the login attempts.
          user.metadata.login.attempts = attempts;
        }
      }
      else {
        // If there was no error, then reset the attempts to zero.
        user.metadata.login.attempts = 0;
        user.metadata.login.last = now;
      }

      // Update the user record
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;
      submissionModel.update(
        {_id: user._id},
        {$set: {metadata: user.metadata}},
        function(err) {
          if (err) {
            return next.call(this, 'Unable to update login count.');
          }
          next.call(this, error);
        }.bind(this)
      );
    }
    /* eslint-enable max-statements */

    /**
     * Authenticate with Form.io using the JWT Authentication Scheme.
     *
     * Note: Requires req.body to contain the username and password.
     *
     * @param handler
     * @param method
     * @param req {Object}
     *   The Express request object.
     * @param res {Object}
     *   The Express response object.
     * @param next {Function}
     *   The callback function to execute upon completion.
     */
    resolve(handler, method, req, res, next) {
      // Some higher priority action has decided to skip authentication
      if (req.skipAuth) {
        return next();
      }

      if (!req.submission || !req.submission.hasOwnProperty('data')) {
        return res.status(401).send('User or password was incorrect.');
      }

      // They must provide a username.
      if (!_.has(req.submission.data, this.settings.username)) {
        return res.status(401).send('User or password was incorrect.');
      }

      // They must provide a password.
      if (!_.has(req.submission.data, this.settings.password)) {
        return res.status(401).send('User or password was incorrect.');
      }

      // Perform an authentication.
      router.formio.auth.authenticate(
        req,
        this.settings.resources,
        this.settings.username,
        this.settings.password,
        _.get(req.submission.data, this.settings.username),
        _.get(req.submission.data, this.settings.password),
        function(err, response) {
          if (err && !response) {
            return res.status(401).send(err);
          }

          // Check the amount of attempts made by this user.
          this.checkAttempts(err, req, response.user, function(error) {
            if (error) {
              return res.status(401).send(error);
            }

            // Set the user and generate a token.
            req.user = response.user;
            req.token = response.token.decoded;
            res.token = response.token.token;
            req['x-jwt-token'] = response.token.token;
            router.formio.auth.currentUser(req, res, function(err) {
              if (err) {
                return res.status(401).send(err.message);
              }

              next();
            });
          }.bind(this));
        }.bind(this)
      );
    }
  }

  // Return the LoginAction.
  return LoginAction;
};
