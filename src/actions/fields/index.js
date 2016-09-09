'use strict';

module.exports = function(router) {
  return {
    password: require('./password')(router.formio),
    email: require('./email')(router.formio),
    unique: require('./unique')(router.formio)
  };
};
