'use strict';

var Action = require('./Action');
var util = require('../util/util');
var debug = require('debug')('formio:action:oauth');
var _ = require('lodash');
var crypto = require('crypto');
var mongoose = require('mongoose');
var request = require('request');
var Q = require('q');

var qRequest = Q.denodeify(request);

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
    var buttonsSrc = hook.alter('url', '/form/' + req.params.formId + '/components?type=button&action=oauth', req);
    var resourceSrc = hook.alter('url', '/form?type=resource', req);
    router.formio.roles.resource.model.find(hook.alter('roleQuery', {}, req))
      .sort({title: 1})
      .exec(function(err, roles) {
        if (err || !roles) {
          return res.status(400).send('Could not load the Roles.');
        }
        oauthUtil.availableProviders(req)
        .then(function(availableProviders) {
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
              label: 'Resource',
              key: 'settings[resource]',
              placeholder: 'Select the Resource to authenticate against',
              template: '<span>{{ item.title }}</span>',
              dataSrc: 'url',
              data: {url: resourceSrc},
              valueProperty: '_id',
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
              dataSrc: 'url',
              data: {url: buttonsSrc},
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

    if (!this.settings.resource) {
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
              scope: provider.scope
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

      var userInfo = null, userId = null, resource = null;

      provider.getToken(req, oauthResponse.code, oauthResponse.state, oauthResponse.redirectURI)
      .then(function(accessToken) {
        debug('Access Token:', accessToken);
        return Q.all([
          provider.getUser(accessToken),
          Q.denodeify(router.formio.cache.loadForm.bind(router.formio.cache))(req, 'resource', self.settings.resource)
        ]);
      })
      .then(function(results) {
        userInfo = results[0];
        userId = provider.getUserId(userInfo);
        resource = results[1];

        return router.formio.auth.authenticateOAuth(resource, provider.name, userId);
      })
      .then(function(result) {
        if (result) { // Authenticated existing resource
          req.user = result.user;
          req.token = result.token.decoded;
          res.token = result.token.token;
          req['x-jwt-token'] = result.token.token;

          // Manually invoke router.formio.auth.currentUser to trigger resourcejs middleware.
          return Q.nfcall(router.formio.auth.currentUser, req, res)
          .then(function() {
            next();
          });
        }
        else { // Need to create and auth new resource
          // If we were looking for an existing resource, return an error
          if (self.settings.association === 'existing') {
            throw provider.title + ' account has not yet been linked.';
          }
          // Add some default resourceData so DefaultAction creates the resource
          // even with empty submission data
          req.resourceData = req.resourceData || {};
          req.resourceData[resource.name] = {
            data: {},
            externalIds: [{
              type: provider.name,
              id: userId
            }]
          };

          // Find and fill in all the autofill fields
          var regex = new RegExp('autofill-' + provider.name + '-(.+)');
          _.each(self.settings, function(value, key) {
            var match = key.match(regex);
            if (match && userInfo[match[1]]) {
              req.resourceData[resource.name].data[value] = userInfo[match[1]];
            }
          });

          debug('resourceData:', req.resourceData);

          // Add id so the after handler knows to auth
          req.oauthDeferredAuthId = userId;

          next();

        }
      }).catch(next);

    }
    else if (
      handler === 'after' &&
      method === 'create' &&
      req.oauthDeferredAuthId
    ) {
      // New resource was created and we need to authenticate it
      Q.denodeify(router.formio.cache.loadForm.bind(router.formio.cache))(req, 'resource', self.settings.resource)
      .then(function(resourceForm) {
        return router.formio.auth.authenticateOAuth(resourceForm, provider.name, req.oauthDeferredAuthId);
      })
      .then(function(result) {
        req.user = result.user;
        req.token = result.token.decoded;
        res.token = result.token.token;
        req['x-jwt-token'] = result.token.token;

        // Manually invoke router.formio.auth.currentUser to trigger resourcejs middleware.
        return Q.nfcall(router.formio.auth.currentUser, req, res);
      })
      .then(function() {
        // Add role to new resource
        // Confirm that the given/configured role is actually accessible.
        var query = hook.alter('roleQuery', {_id: self.settings.role, deleted: {$eq: null}}, req);
        debug('Role Query: ' + JSON.stringify(query));
        return Q.all([
          router.formio.roles.resource.model.findOne(query),
          router.formio.resources.submission.model.findById(req.user._id)
        ]);
      })
      .then(function(results) {
        var role = results[0];
        var submission = results[1];

        if (!role) {
          throw 'The given role was not found.';
        }
        if (!submission) {
          throw 'No submission found with _id: ' + req.user._id;
        }

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
        return submission.save();

      })
      .then(function() {
        next();
      })
      .catch(next);

    }
    else {
      next();
    }

  };

  // Return the OAuthAction.
  return OAuthAction;
};
