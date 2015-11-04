'use strict';

var Q = require('q');
var _ = require('lodash');
var _prop = require('lodash.property');

module.exports = function(formio) {
  var hook = require('./hook')(formio);
  return {
    // Gets available providers
    // Returns a promise, or you can provide the next callback arg
    // Resolves with array of {name, title}
    availableProviders: function(req, next) {
      return Q.ninvoke(hook, 'settings', req)
      .then(function(settings) {
        return _(formio.oauth.providers)
        .pick(function(provider, name) {
          // Use custom isAvailable method if available
          return provider.isAvailable && provider.isAvailable(settings) ||
          // Else just check for default client id and secret
            settings.oauth && settings.oauth[name] &&
            settings.oauth[name].clientId && settings.oauth[name].clientSecret;
        })
        .map(_.partialRight(_.pick, 'name', 'title'))
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
