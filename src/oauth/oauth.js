'use strict';

var Q = require('q');
var _ = require('lodash');
var debug = require('debug')('formio:oauth');

module.exports = function(router) {

  // Export the oauth providers.
  return {
    providers: {
      github: require('./github')(router.formio),
      facebook: require('./facebook')(router.formio),
      office365: require('./office365')(router.formio)
    },

    // Gets user token for a provider, and attempts to refresh it
    // if it is expired
    // Returns a promise, or you can provide the next callback arg
    getUserToken: function(req, res, providerName, userId, next) {
      var provider = this.providers[providerName];
      if (!provider) {
        return Q.reject('Invalid provider name');
      }

      return router.formio.resources.submission.model.findOne({_id: userId})
      .then(function(user) {
        if (!user) {
          throw 'Could not find user';
        }
        var accessToken = _.find(user.externalTokens, {type: provider.name});
        if (!accessToken) {
          throw 'No access token available. Make sure you have authenticated with ' + provider.title + '.';
        }
        if (new Date() < accessToken.exp) {
          return accessToken.token;
        }

        debug('Access Token is expired, refreshing...');

        return provider.refreshTokens(req, res, user)
        .then(function(tokens) {
          user.set('externalTokens',
            _(tokens).concat(user.externalTokens).uniq('type').value()
          );

          return Q(user.save()).thenResolve(_.find(tokens, {type: provider.name}).token);
        });
      })
      .nodeify(next);
    }
  };
};
