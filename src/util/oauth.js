'use strict';

var Q = require('q');
var _ = require('lodash');
var _prop = require('lodash.property');
var debug = require('debug')('formio:settings:oauth');

module.exports = function(formio) {
  var hook = require('./hook')(formio);
  return {
    // Gets available providers
    // Returns a promise, or you can provide the next callback arg
    // Resolves with array of {name, title}
    availableProviders: function(req, next) {
      return Q.ninvoke(hook, 'settings', req)
      .then(function(settings) {
        return _(settings.oauth)
        .pick(function(provider, name) {
          return formio.oauth.providers[name] && provider.clientId && provider.clientSecret;
        })
        .map(function(provider, name) {
          return _.pick(formio.oauth.providers[name], 'name', 'title');
        })
        .value();
      })
      .nodeify(next);
    },

    // Gets settings for given oauth provider name
    // Returns a promise, or you can provide the next callback arg
    settings: function(req, name, next) {
      return Q.ninvoke(hook, 'settings', req)
      .then(function(settings) {
        return _prop('oauth.' + name)(settings);
      })
      .nodeify(next);
    }
  };
};
