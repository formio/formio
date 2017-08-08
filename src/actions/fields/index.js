'use strict';

module.exports = function(router) {
  return {
    signature: require('./signature')(router.formio),
    password: require('./password')(router.formio),
    form: require('./form')(router.formio),
    email: require('./email')(router.formio)
  };
};
