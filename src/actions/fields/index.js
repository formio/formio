'use strict';

module.exports = function(router) {
  return {
    password: require('./password')(router.formio)
  };
};
