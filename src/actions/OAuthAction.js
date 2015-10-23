'use strict';

var Action = require('./Action');
var util = require('../util/util');
var debug = require('debug')('formio:action:oauth');
var _ = require('lodash');
var crypto = require('crypto');
var mongoose = require('mongoose');
var Q = require('q');
var chance = require('chance').Chance();


module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  var oauthUtil = require('../util/oauth')(router.formio);

  /**
   * OAuthAction class.
   *   This class is used to create the OAuth action.
   *
   * @constructor
   */
  var OAuthAction = function(data, req, res) {
    Action.call(this, data, req, res);

    // Disable the default action if the association is existing.
    req.disableDefaultAction = (data.settings.association === 'existing');
  };

  // Derive from Action.
  OAuthAction.prototype = Object.create(Action.prototype);
  OAuthAction.prototype.constructor = OAuthAction;
  OAuthAction.info = function(req, res, next) {
    next(null, {
      name: 'oauth',
      title: 'OAuth',
      description: 'Provides OAuth authentication behavior to this form.',
      priority: 20,
      defaults: {
        handler: ['after', 'before'],
        method: ['form', 'create']
      }
    });
  };
  // Disable editing handler and method settings
  OAuthAction.access = {
    handler: false,
    method: false
  };

  /**
   * Settings form for auth action.
   *
   * @param req
   * @param res
   * @param next
   */
  OAuthAction.settingsForm = function(req, res, next) {
    var fieldsSrc = hook.alter('url', '/form/' + req.params.formId + '/components', req);
    var resourceSrc = hook.alter('url', '/form?type=resource', req);
    router.formio.roles.resource.model.find(hook.alter('roleQuery', {}, req))
      .sort({title: 1})
      .exec(function(err, roles) {
        if (err || !roles) {
          return res.status(400).send('Could not load the Roles.');
        }
        Q.all([
          oauthUtil.availableProviders(req),
          Q.ninvoke(router.formio.cache, 'loadCurrentForm', req)
        ])
        .then(function(results) {
          var availableProviders = results[0];
          var form = results[1];
          next(null, [
            {
              type: 'select',
              input: true,
              label: 'OAuth Provider',
              key: 'settings[provider]',
              placeholder: 'Select the OAuth Provider',
              template: '<span>{{ item.title }}</span>',
              dataSrc: 'json',
              data: {
                json: JSON.stringify(availableProviders)
              },
              valueProperty: 'name',
              multiple: false,
              validate: {
                required: true
              }
            },
            {
              type: 'select',
              input: true,
              label: 'Action',
              key: 'settings[association]',
              placeholder: 'Select the action to perform',
              template: '<span>{{ item.title }}</span>',
              dataSrc: 'json',
              data: {
                json: JSON.stringify([
                  {
                    association: 'existing',
                    title: 'Login Existing Resource'
                  },
                  {
                    association: 'new',
                    title: 'Register New Resource'
                  },
                  {
                    association: 'link',
                    title: 'Link Current User'
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
              label: 'Resource',
              key: 'settings[resource]',
              placeholder: 'Select the Resource to authenticate against',
              template: '<span>{{ item.title }}</span>',
              dataSrc: 'url',
              data: {url: resourceSrc},
              valueProperty: 'name',
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
              label: 'Sign-in with OAuth Button',
              key: 'settings[button]',
              placeholder: 'Select the button that triggers OAuth sign-in',
              template: '<span>{{ item.label || item.key }}</span>',
              dataSrc: 'json',
              data: {
                json: JSON.stringify(_.filter(form.components, {type: 'button', action: 'oauth'}))
              },
              valueProperty: 'key',
              multiple: false,
              validate: {
                required: true
              }
            }
          ]
          .concat(
            _(router.formio.oauth.providers)
            .map(function(provider) {
              return _.map(provider.autofillFields, function(field) {
                return {
                  type: 'select',
                  input: true,
                  label: 'Autofill ' + field.title + ' Field',
                  key: 'settings[autofill-' + provider.name + '-' + field.name + ']',
                  placeholder: 'Select which field to autofill with ' + provider.title + ' account ' + field.title,
                  template: '<span>{{ item.label || item.key }}</span>',
                  dataSrc: 'url',
                  data: {url: fieldsSrc},
                  valueProperty: 'key',
                  multiple: false
                };
              });
            })
            .flatten()
            .value()
          ));
        })
        .catch(next);
      });
  };

  OAuthAction.prototype.authenticate = function(req, res, provider, accessToken) {
    debug('Authenticating with Access Token:', accessToken);

    var userInfo = null, userId = null, resource = null;
    var self = this;

    return Q.all([
      provider.getUser(accessToken),
      Q.denodeify(router.formio.cache.loadFormByName.bind(router.formio.cache))(req, self.settings.resource)
    ])
    .then(function(results) {
      userInfo = results[0];
      userId = provider.getUserId(userInfo);
      resource = results[1];

      debug('userInfo:', userInfo);
      debug('userId:', userId);

      return router.formio.auth.authenticateOAuth(resource, provider.name, userId);
    })
    .then(function(result) {
      if (result) { // Authenticated existing resource
        req.user = result.user;
        req.token = result.token.decoded;
        res.token = result.token.token;
        req['x-jwt-token'] = result.token.token;

        // Manually invoke router.formio.auth.currentUser to trigger resourcejs middleware.
        return Q.nfcall(router.formio.auth.currentUser, req, res);
      }
      else { // Need to create and auth new resource
        // If we were looking for an existing resource, return an error
        if (self.settings.association === 'existing') {
          throw {
            status: '404',
            message: provider.title + ' account has not yet been linked.'
          };
        }
        // Add some default resourceData so DefaultAction creates the resource
        // even with empty submission data
        req.resourceData = req.resourceData || {};
        req.resourceData[resource.name] = {data: {}};

        // Find and fill in all the autofill fields
        var regex = new RegExp('autofill-' + provider.name + '-(.+)');
        _.each(self.settings, function(value, key) {
          var match = key.match(regex);
          if (match && value && userInfo[match[1]]) {
            req.body.data[value] = userInfo[match[1]];
          }
        });

        debug('resourceData:', req.resourceData);

        // Add info so the after handler knows to auth
        req.oauthDeferredAuth = {
          id: userId,
          provider: provider.name
        };

        return Q.ninvoke(router.formio.cache, 'loadCurrentForm', req)
        .then(function(currentForm) {
          debug('Filling in dummy passwords');
          util.eachComponent(currentForm.components, function(component) {
            // Fill in password fields with dummy data to pass validation
            if(component.type === 'password' && component.persistent !== false) {
              req.body.data[component.key] = 'temp_' + chance.string({length: 16})
              debug(component.key, 'is now', req.body.data[component.key]);
            }
          });
        });
      }
    });
  };

  OAuthAction.prototype.reauthenticateNewResource = function(req, res, provider) {
    var self = this;
    // New resource was created and we need to authenticate it again and assign it an externalId
    // Also confirm role is actually accessible
    var roleQuery = hook.alter('roleQuery', {_id: self.settings.role, deleted: {$eq: null}}, req);
    return Q.all([
      // Load submission
      router.formio.resources.submission.model.findOne({_id: res.resource.item._id}),
      // Load resource
      Q.denodeify(router.formio.cache.loadFormByName.bind(router.formio.cache))(req, self.settings.resource),
      // Load role
      router.formio.roles.resource.model.findOne(roleQuery)
    ])
    .then(function(results) {
      var submission = results[0];
      var resource = results[1];
      var role = results[2];

      if (!submission) {
        throw {
          status: 404,
          message: 'No submission found with _id: ' + res.resource.item._id
        };
      }
      if (!resource) {
        throw {
          status: 404,
          message: 'No resource found with name: ' + self.settings.resource
        };
      }
      if (!role) {
        throw {
          status: 404,
          message: 'The given role was not found.'
        };
      }

      // Add role
      // Convert to just the roleId
      debug(role);
      role = role.toObject()._id.toString();

      // Add and store unique roles only.
      var temp = submission.toObject().roles || [];
      debug('Submission Roles: ' + JSON.stringify(temp));
      temp = _.map(temp, function(r) {
        return r.toString();
      });
      debug('Adding: ' + role);
      temp.push(role);
      temp = _.uniq(temp);
      debug('Final Roles: ' + JSON.stringify(temp));
      temp = _.map(temp, function(r) {
        return mongoose.Types.ObjectId(r);
      });

      submission.set('roles', temp);

      // Add external id
      submission.externalIds.push({
        type: provider.name,
        id: req.oauthDeferredAuth.id
      });

      return submission.save()
      .then(function() {
        return router.formio.auth.authenticateOAuth(resource, provider.name, req.oauthDeferredAuth.id);
      });
    })
    .then(function(result) {
      req.user = result.user;
      req.token = result.token.decoded;
      res.token = result.token.token;
      req['x-jwt-token'] = result.token.token;
      // Manually invoke router.formio.auth.currentUser to trigger resourcejs middleware.
      return Q.nfcall(router.formio.auth.currentUser, req, res);
    });
  };

  /**
   * Authenticate with Form.io using OAuth
   *
   * Note: Requires req.body to contain an OAuth authorization code.
   *
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param next
   *   The callback function to execute upon completion.
   */
  OAuthAction.prototype.resolve = function(handler, method, req, res, next) {
    if (this.settings.association === 'new' && (!this.settings.hasOwnProperty('role') || !this.settings.role)) {
      return next('The OAuth Action requires a Role to be selected for new resources.');
    }

    if (this.settings.association === 'existing' && this.settings.hasOwnProperty('role') && this.settings.role) {
      this.settings = _.omit(this.settings, 'role');
    }

    if (!this.settings.provider) {
      return next('OAuth Action is missing Provider setting.');
    }

    // Non-link association requires a resource setting
    if (this.settings.association !== 'link' && !this.settings.resource) {
      return next('OAuth Action is missing Resource setting.');
    }

    if (!this.settings.button) {
      return next('OAuth Action is missing Button setting.');
    }

    var self = this;
    var provider = router.formio.oauth.providers[this.settings.provider];

    // Modify the button to be an OAuth button
    if (
      handler === 'after' &&
      method === 'form' &&
      req.query.hasOwnProperty('live') && (parseInt(req.query.live, 10) === 1) &&
      res.hasOwnProperty('resource') &&
      res.resource.hasOwnProperty('item') &&
      res.resource.item._id
    ) {
      debug('Modifying Oauth Button');
      oauthUtil.settings(req, provider.name)
      .then(function(oauthSettings) {
        if (!oauthSettings.clientId || !oauthSettings.clientSecret) {
          next(provider.title + ' OAuth provider is missing client ID or client secret');
        }
        util.eachComponent(res.resource.item.components, function (component) {
          if (component.key === self.settings.button) {
            component.oauth = {
              provider: provider.name,
              clientId: oauthSettings.clientId,
              authURI: provider.authURI,
              state: crypto.randomBytes(64).toString('hex'),
              scope: provider.scope,
              display: provider.display
            };
          }
        });
        next();
      });

    }
    else if (
      handler === 'before' &&
      method === 'create' &&
      req.body.oauth &&
      req.body.oauth[provider.name]
    ) {
      var oauthResponse = req.body.oauth[provider.name];

      if (!oauthResponse.code || !oauthResponse.state || !oauthResponse.redirectURI) {
        return next('No authorization code provided.');
      }

      // Do not execute the form CRUD methods.
      req.skipResource = true;

      var tokenPromise = provider.getToken(req, oauthResponse.code, oauthResponse.state, oauthResponse.redirectURI)
      if (self.settings.association === 'new' || self.settings.association === 'existing') {
        return tokenPromise.then(function(accessToken) {
          return self.authenticate(req, res, provider, accessToken);
        })
        .then(function(){
          next();
        }).catch(this.onError(req, res, next));
      }
      else if (self.settings.association === 'link') {
        var userId, currentUser;
        return tokenPromise.then(function(accessToken){
          return Q.all([
            provider.getUser(accessToken),
            Q.ninvoke(router.formio.auth, 'currentUser', req, res)
          ]);
        })
        .then(function(results) {
          userId = provider.getUserId(results[0]);
          currentUser = res.resource.item;
          debug('userId:', userId);
          debug('currentUser:', currentUser);

          if (!currentUser) {
            throw {
              status: 401,
              message: 'Must be logged in to link ' + provider.title + ' account.'
            };
          }

          // Check if this account has already been linked
          return router.formio.resources.submission.model.findOne(
            {
              form: currentUser.form,
              externalIds: {
                $elemMatch: {
                  type: provider.name,
                  id: userId
                }
              },
              deleted: {$eq: null}
            }
          );
        }).then(function(linkedSubmission){
          if (linkedSubmission) {
            throw {
              status: 400,
              message: 'This ' + provider.title + ' account has already been linked.'
            };
          }

          // Add the external ids
          return router.formio.resources.submission.model.update({
            _id: currentUser._id
          }, {
            $push: {
              externalIds: {
                type: provider.name,
                id: userId
              }
            }
          });
        })
        .then(function(submission) {
          // Update current user response
          return Q.ninvoke(router.formio.auth, 'currentUser', req, res);
        })
        .then(function(){
          next();
        }).catch(this.onError(req, res, next));
      }


    }
    else if (
      handler === 'after' &&
      method === 'create' &&
      req.oauthDeferredAuth &&
      req.oauthDeferredAuth.provider === provider.name
    ) {
      return self.reauthenticateNewResource(req, res, provider)
      .then(function() {
        next();
      })
      .catch(this.onError(req, res, next));
    }
    else {
      next();
    }

  };

  OAuthAction.prototype.onError = function(req, res, next) {
    return function(err) {
      if(err.status) {
        debug('Error', err);
        return res.status(err.status).send(err.message);
      }
      next(err);
    }
  }

  // Return the OAuthAction.
  return OAuthAction;
};
