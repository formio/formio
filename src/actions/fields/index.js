'use strict';

module.exports = function(router) {
  return {
    password: require('./password')(router.formio),
    email: require('./email')(router.formio)
  };
};
