'use strict';

var Q = require('q');
var _ = require('lodash');
var uuid = require('node-uuid');
var AuthenticationContext = require('adal-node').AuthenticationContext;

var util = require('../util/util');

var checkMissing = function(settings) {
  var o365Settings = settings.office365;

  // Check if any required settings are missing
  if (!o365Settings) {
    return 'Office 365 settings';
  }
  if (!o365Settings.tenant) {
    return 'Office 365 Tenant';
  }
  if (!o365Settings.clientId) {
    return 'Office 365 Client Id';
  }
  if (!o365Settings.clientSecret) {
    return 'Office 365 Client Secret';
  }
};

// Export the Github oauth provider.
module.exports = function(formio) {
  var hook = require('../util/hook')(formio);
  return {
    // Name of the oauth provider (used as property name in settings)
    name: 'office365',

    // Display name of the oauth provider
    title: 'Office 365',

    getAuthURI: function(tenant) {
      return 'https://login.microsoftonline.com/' + tenant + '/oauth2/authorize';
    },

    configureOAuthButton: function(component, settings, state) {
      var missing = checkMissing(settings);

      if (missing) {
        component.oauth = {
          provider: this.name,
          error: this.title + ' OAuth provider is missing ' + missing
        };
      }
      else {
        var o365Settings = settings.office365;
        component.oauth = {
          provider: this.name,
          clientId: o365Settings.clientId,
          authURI: this.getAuthURI(o365Settings.tenant),
          state: state
        };
      }
    },

    isAvailable: function(settings) {
      return !checkMissing(settings);
    },

    // List of field data that can be autofilled from user info API request
    autofillFields: [
      {
        title: 'Email',
        name: 'Id'
      },
      {
        title: 'Display Name',
        name: 'DisplayName'
      }
    ],

    // Exchanges authentication code for auth token
    // Returns a promise, or you can provide the next callback arg
    // Resolves with array of tokens defined like externalTokenSchema
    getTokens: function(req, code, state, redirectURI, next) {
      return Q.ninvoke(hook, 'settings', req)
      .then(function(settings) {
        var missing = checkMissing(settings);
        if (missing) {
          throw {
            status: 400,
            message: this.title + ' OAuth provider is missing ' + missing
          };
        }
        var o365Settings = settings.office365;
        var authContext = new AuthenticationContext('https://login.windows.net/' + o365Settings.tenant);
        return Q.ninvoke(authContext, 'acquireTokenWithAuthorizationCode',
          code,
          redirectURI,
          'https://outlook.office365.com/',
          o365Settings.clientId,
          o365Settings.clientSecret
        );
      }.bind(this))
      .then(function(result) {
        if (!result) {
          throw 'No response from Microsoft.';
        }
        if (result.error) {
          throw result.error;
        }
        return [
          {
            type: this.name,
            token: result.accessToken,
            exp: new Date(result.expiresOn)
          },
          {
            type: this.name + '_refresh',
            token: result.refreshToken,
            exp: null // Expiration of refresh token is unknown
          }
        ];
      }.bind(this))
      .nodeify(next);
    },

    // Gets user information from oauth access token
    // Returns a promise, or you can provide the next callback arg
    getUser: function(tokens, next) {
      var accessToken = _.find(tokens, {type: this.name});
      if (!accessToken) {
        return Q.reject('No access token found');
      }
      return util.request({
        method: 'GET',
        url: 'https://outlook.office.com/api/v1.0/me',
        json: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken.token,
          'User-Agent': 'form.io/1.0',
          'client-request-id': uuid.v4(),
          'return-client-request-id': true,
          'Date': (new Date()).toUTCString()
        }
      })
      .spread(function(response, userInfo) {
        if (!userInfo) {
          var status = response.statusCode;
          throw {
            status: status,
            message: status + ' response from Microsoft: ' + response.statusMessage
          };
        }
        return userInfo;
      })
      .nodeify(next);
    },

    // Gets user ID from provider user response from getUser()
    getUserId: function(user) {
      return user.Id;
    },

    // Sends a request to refresh tokens and resolves with new tokens
    // Returns a promise, or you can provide the next callback arg
    refreshTokens: function(req, res, user, next) {
      return Q.ninvoke(hook, 'settings', req)
      .then(function(settings) {
        if (
          !settings.office365 ||
          !settings.office365.tenant ||
          !settings.office365.clientId ||
          !settings.office365.clientSecret
        ) {
          throw 'Office 365 OAuth settings not configured.';
        }
        var refreshToken = _.find(user.externalTokens, {type: 'office365_refresh'});
        if (!refreshToken) {
          throw 'No refresh token available. Please reauthenticate with Office 365';
        }

        var context = new AuthenticationContext('https://login.windows.net/' + settings.office365.tenant);
        return Q.ninvoke(context, 'acquireTokenWithRefreshToken',
          refreshToken.token,
          settings.office365.clientId,
          settings.office365.clientSecret,
          null
        );
      })
      .then(function(result) {
        return [
          {
            type: 'office365',
            token: result.accessToken,
            exp: new Date(result.expiresOn)
          },
          {
            type: 'office365_refresh',
            token: result.refreshToken,
            exp: null // Expiration of refresh token is unknown
          }
        ];
      })
      .catch(function() {
        throw 'Token has expired. Please reauthenticate with Office 365';
      })
      .nodeify(next);
    }
  };
};
