'use strict';

module.exports = function(router) {

  // Export the oauth providers.
  return {
    providers: {
      github: require('./github')(router.formio),
      facebook: require('./facebook')(router.formio)
    }
  };
};
