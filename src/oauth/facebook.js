'use strict';

var Q = require('q');
var url = require('url');
var _ = require('lodash');

var util = require('../util/util');

// Export the Github oauth provider.
module.exports = function(formio) {
  var oauthUtil = require('../util/oauth')(formio);
  return {
    // Name of the oauth provider (used as property name in settings)
    name: 'facebook',

    // Display name of the oauth provider
    title: 'Facebook',

    // URL to redirect user browser to
    authURI: 'https://www.facebook.com/v2.3/dialog/oauth',

    scope: 'email',

    display: 'popup',

    // List of field data that can be autofilled from user info API request
    autofillFields: [
      {
        title: 'Email',
        name: 'email'
      },
      {
        title: 'Name',
        name: 'name'
      },
      {
        title: 'First Name',
        name: 'first_name'
      },
      {
        title: 'Middle Name',
        name: 'middle_name'
      },
      {
        title: 'Last Name',
        name: 'last_name'
      }
    ],

    // Exchanges authentication code for auth token
    // Returns a promise, or you can provide the next callback arg
    // Resolves with array of tokens defined like externalTokenSchema
    getTokens: function(req, code, state, redirectURI, next) {
      return oauthUtil.settings(req, this.name)
      .then(function(settings) {
        return util.request({
          method: 'POST',
          json: true,
          url: 'https://graph.facebook.com/v2.3/oauth/access_token',
          body: {
            client_id: settings.clientId,
            client_secret: settings.clientSecret,
            code: code,
            state: state,
            redirect_uri: url.parse(redirectURI).href // Facebook requires having a trailing slash
          }
        });
      })
      .spread(function(response, body) {
        if (!body) {
          throw 'No response from Facebook.';
        }
        if (body.error) {
          throw body.error.message;
        }
        return [
          {
            type: this.name,
            token: body.access_token,
            exp: new Date(new Date(response.headers.date).getTime() + body.expires_in * 1000)
          }
        ];
      }.bind(this))
      .nodeify(next);
    },

    // Gets user information from oauth access token
    // Returns a promise, or you can provide the next callback arg
    getUser: function(tokens, next) {
      var accessToken = _.find(tokens, {type: this.name});
      if(!accessToken) {
        return Q.reject('No access token found');
      }
      return util.request({
        method: 'GET',
        url: 'https://graph.facebook.com/v2.3/me',
        json: true,
        qs: {
          access_token: accessToken.token,
          fields: 'id,name,email,first_name,last_name,middle_name'
        }
      })
      .spread(function(response, body) {
        if (!body) {
          throw 'No response from Facebook.';
        }
        return body;
      })
      .nodeify(next);
    },

    // Gets user ID from provider user response from getUser()
    getUserId: function(user) {
      return user.id;
    },

    // If a facebook token expires, just tell the user to reauthenticate
    // Returns a promise, or you can provide the next callback arg
    refreshTokens: function(req, res, user, next) {
      return Q.reject('Token has expired, please reauthenticate with ' + this.title + '.')
      .nodeify(next);
    }
  };
};
