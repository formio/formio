'use strict';

var request = require('request');
var Q = require('q');

var qRequest = Q.denodeify(request);

// Export the Github oauth provider.
module.exports = function(formio) {
  var oauthUtil = require('../util/oauth')(formio);
  return {
    // Name of the oauth provider (used as property name in settings)
    name: 'github',

    // Display name of the oauth provider
    title: 'GitHub',

    // URL to redirect user browser to
    authURI: 'https://github.com/login/oauth/authorize',

    scope: 'user:email',

    // List of field data that can be autofilled from user info API request
    autofillFields: [
      {
        title: 'Email',
        name: 'email'
      },
      {
        title: 'Username',
        name: 'login'
      },
      {
        title: 'Name',
        name: 'name'
      },
      {
        title: 'Company',
        name: 'company'
      },
      {
        title: 'Website',
        name: 'blog'
      },
      {
        title: 'Location',
        name: 'location'
      },
      {
        title: 'Bio',
        name: 'bio'
      },
    ],

    // TODO: have scope option to limit what permissions are asked for

    // Exchanges authentication code for auth token
    // Returns a promise, or you can provide the next callback arg
    getToken: function(req, code, state, redirectURI, next) {
      return oauthUtil.settings(req, this.name)
      .then(function(settings) {
        return qRequest({
          method: 'POST',
          json: true,
          url: 'https://github.com/login/oauth/access_token',
          body: {
            client_id: settings.clientId,
            client_secret: settings.clientSecret,
            code: code,
            state: state
          }
        });
      })
      .then(function(result) {
        var body = result[1]; // body is 2nd param of request
        if (!body) {
          throw 'No response from GitHub.';
        }
        if (body.error) {
          throw body.error;
        }
        return body.access_token;
      })
      .nodeify(next);
    },

    // Gets user information from oauth access token
    // Returns a promise, or you can provide the next callback arg
    getUser: function(accessToken, next) {
      return qRequest({
        method: 'GET',
        url: 'https://api.github.com/user',
        json: true,
        headers: {
          Authorization: 'token ' + accessToken,
          'User-Agent': 'formio'
        }
      })
      .then(function(result) {
        var body = result[1]; // body is 2nd param of request
        if (!body) {
          throw 'No response from GitHub.';
        }
        return body;
      })
      .nodeify(next);
    },

    // Gets user ID from provider user response from getUser()
    getUserId: function(user) {
      return user.id;
    }
  };
};
