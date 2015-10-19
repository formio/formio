'use strict';

var request = require('request');
var Q = require('q');
var url = require('url');

var qRequest = Q.denodeify(request);

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

    // TODO: have scope option to limit what permissions are asked for

    // Exchanges authentication code for auth token
    // Returns a promise, or you can provide the next callback arg
    getToken: function(req, code, state, redirectURI, next) {
      return oauthUtil.settings(req, this.name)
      .then(function(settings) {
        return qRequest({
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
      .then(function(result) {
        var body = result[1]; // body is 2nd param of request
        if (!body) {
          throw 'No response from Facebook.';
        }
        if (body.error) {
          throw body.error.message;
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
        url: 'https://graph.facebook.com/v2.3/me',
        json: true,
        qs: {
          access_token: accessToken,
          fields: 'id,name,email,first_name,last_name,middle_name'
        }
      })
      .then(function(result) {
        var body = result[1]; // body is 2nd param of request
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
    }
  };
};
