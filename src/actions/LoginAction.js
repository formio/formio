'use strict';
module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = require('../util/hook')(router.formio);

  /**
   * AuthAction class.
   *   This class is used to create the Authentication action.
   *
   * @constructor
   */
  var LoginAction = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  LoginAction.prototype = Object.create(Action.prototype);
  LoginAction.prototype.constructor = LoginAction;
  LoginAction.info = function(req, res, next) {
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
  };

  /**
   * Settings form for auth action.
   *
   * @param req
   * @param res
   * @param next
   */
  LoginAction.settingsForm = function(req, res, next) {
    var basePath = hook.alter('path', '/form', req);
    var dataSrc = basePath + '/' + req.params.formId + '/components';
    next(null, [
      {
        type: 'select',
        input: true,
        label: 'Resources',
        key: 'resources',
        placeholder: 'Select the resources we should login against.',
        dataSrc: 'url',
        data: {url: basePath + '?type=resource'},
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
      }
    ]);
  };

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
  LoginAction.prototype.resolve = function(handler, method, req, res, next) {
    // Some higher priority action has decided to skip authentication
    if (req.skipAuth) {
      return next();
    }

    if (!req.submission || !req.submission.hasOwnProperty('data')) {
      return next('Submission data is required to Authenticate.');
    }

    // They must provide a username.
    if (!req.submission.data.hasOwnProperty(this.settings.username)) {
      return next('Username not provided.');
    }

    // They must provide a password.
    if (!req.submission.data.hasOwnProperty(this.settings.password)) {
      return next('Password not provided.');
    }

    // Perform an authentication.
    router.formio.auth.authenticate(
      this.settings.resources,
      this.settings.username,
      this.settings.password,
      req.submission.data[this.settings.username],
      req.submission.data[this.settings.password],
      function(err, response) {
        if (err) {
          return res.status(401).send(err.message);
        }

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
      }
    );
  };

  // Return the LoginAction.
  return LoginAction;
};
