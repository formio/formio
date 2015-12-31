'use strict';

var async = require('async');
var mongoose = require('mongoose');
var debug = require('debug')('formio:action:auth');
var _ = require('lodash');

module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = require('../util/hook')(router.formio);

  /**
   * AuthAction class.
   *   This class is used to create the Authentication action.
   *
   * @constructor
   */
  var AuthAction = function(data, req, res) {
    Action.call(this, data, req, res);

    // Disable the default action if the association is existing.
    req.disableDefaultAction = (data.settings.association === 'existing');
  };

  // Derive from Action.
  AuthAction.prototype = Object.create(Action.prototype);
  AuthAction.prototype.constructor = AuthAction;
  AuthAction.info = function(req, res, next) {
    next(null, {
      name: 'auth',
      title: 'Authentication',
      description: 'Provides authentication behavior to this form.',
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
  AuthAction.settingsForm = function(req, res, next) {
    var dataSrc = hook.alter('url', '/form/' + req.params.formId + '/components', req);

    router.formio.resources.role.model.find(hook.alter('roleQuery', {}, req))
      .sort({title: 1})
      .exec(function(err, roles) {
        if (err || !roles) {
          return res.status(400).send('Could not load the Roles.');
        }

        next(null, [
          {
            type: 'select',
            input: true,
            label: 'Resource Association',
            key: 'settings[association]',
            placeholder: 'Select the type of resource to authenticate.',
            template: '<span>{{ item.title }}</span>',
            dataSrc: 'json',
            data: {
              json: JSON.stringify([
                {
                  association: 'existing',
                  title: 'Existing Resource'
                },
                {
                  association: 'new',
                  title: 'New Resource'
                }
              ])
            },
            valueProperty: 'association',
            multiple: false,
            validate: {
              required: true
            }
          },
          {
            type: 'select',
            input: true,
            label: 'Role',
            key: 'settings[role]',
            placeholder: 'Select the Role that will be added to new Resources',
            template: '<span>{{ item.title }}</span>',
            dataSrc: 'json',
            data: {json: roles},
            valueProperty: '_id',
            multiple: false
          },
          {
            type: 'select',
            input: true,
            label: 'Username Field',
            key: 'settings[username]',
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
            key: 'settings[password]',
            placeholder: 'Select the password field',
            template: '<span>{{ item.label || item.key }}</span>',
            dataSrc: 'url',
            data: {url: dataSrc},
            valueProperty: 'key',
            multiple: false,
            validate: {
              required: true
            }
          }]
        );
      });
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
  AuthAction.prototype.resolve = function(handler, method, req, res, next) {
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

    // Get the form name from the settings.
    if (this.settings.username.indexOf('.') === -1) {
      return next('Invalid Authentication Username');
    }

    if (this.settings.password.indexOf('.') === -1) {
      return next('Invalid Authentication password');
    }

    if (this.settings.association === 'new' && (!this.settings.hasOwnProperty('role') || !this.settings.role)) {
      return next('The Authentication Action requires a Role to be selected for new resources.');
    }

    if (this.settings.association === 'existing' && this.settings.hasOwnProperty('role') && this.settings.role) {
      this.settings = _.omit(this.settings, 'role');
    }

    var userparts = this.settings.username.split('.');
    var passparts = this.settings.password.split('.');
    if (userparts[0] !== passparts[0]) {
      return next('The username and password should use the same form.');
    }
    if (userparts.length !== 2 || passparts.length !== 2) {
      return next('Authentication does not support nested form fields.');
    }

    // Get the authentication resource.
    var authResource = userparts[0];

    /**
     * Authenticate the user in the current request with the given submission data.
     *
     * @param callback
     */
    var authenticateUser = function(callback) {
      async.waterfall([
        function loadForm(callback) {
          // Load the form by name.
          router.formio.cache.loadFormByName(req, authResource, function(err, form) {
            if (err) {
              return callback(err);
            }
            if (!form) {
              return callback(new Error('Form not found.'));
            }

            // Do not execute the form CRUD methods.
            req.skipResource = true;
            callback(null, form);
          });
        },
        function authentication(form, callback) {
          // Perform an authentication.
          router.formio.auth.authenticate(
            form,
            userparts[1],
            passparts[1],
            req.submission.data[this.settings.username],
            req.submission.data[this.settings.password],
            function(err, response) {
              if (err) {
                return callback(err);
              }

              req.user = response.user;
              req.token = response.token.decoded;
              res.token = response.token.token;
              req['x-jwt-token'] = response.token.token;
              callback();
            }
          );
        }.bind(this)
      ], function(err) {
        if (err) {
          return callback(err);
        }

        callback();
      });
    };

    async.waterfall([
      authenticateUser.bind(this),
      function addRole(callback) {
        // Only apply the role if this is a new resource.
        debug('this.settings.association: ' + this.settings.association);
        if (this.settings.association !== 'new') {
          debug('Skipping role addition');
          return callback();
        }

        // Confirm that the given/configured role is actually accessible.
        var query = hook.alter('roleQuery', {_id: this.settings.role, deleted: {$eq: null}}, req);
        debug('Role Query: ' + JSON.stringify(query));
        router.formio.resources.role.model.findOne(query, function(err, _role) {
          if (err || !_role) {
            debug(err || 'Role not found: ' + JSON.stringify(query));
            return res.status(400).send('The given role was not found.');
          }

          // Convert to just the roleId.
          debug(_role);
          _role = _role.toObject()._id.toString();

          router.formio.resources.submission.model.findById(req.user._id, function(err, submission) {
            if (err) {
              debug(err);
              return callback(err);
            }
            if (!submission) {
              debug('No submission found with _id: ' + req.user._id);
              return callback('No submission found with _id: ' + req.user._id);
            }

            // Update the submissions owner, if set.
            if (_.has(req, 'selfOwner')&& req.selfOwner) {
              submission.owner = submission._id;
            }

            // Add and store unique roles only.
            var temp = submission.toObject().roles || [];
            debug('Submission Roles: ' + JSON.stringify(temp));
            temp = _.map(temp, function(role) {
              return role.toString();
            });
            debug('Adding: ' + _role);
            temp.push(_role);
            temp = _.uniq(temp);
            debug('Final Roles: ' + JSON.stringify(temp));
            temp = _.map(temp, function(role) {
              return mongoose.Types.ObjectId(role);
            });

            // Update and save the submissions roles.
            submission.set('roles', temp);
            submission.save(function(err) {
              if (err) {
                debug(err);
                return callback(err);
              }

              debug(submission);
              authenticateUser.call(this, callback);
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }.bind(this),
      function getCurrentUser(callback) {
        // Manually invoke router.formio.auth.currentUser to trigger resourcejs middleware.
        router.formio.auth.currentUser(req, res, function(err) {
          if (err) {
            return callback(err);
          }

          callback();
        });
      }
    ], function(error) {
      if (error) {
        debug(error);
        return res.status(401).send(error.message);
      }

      next();
    });
  };

  // Return the AuthAction.
  return AuthAction;
};
