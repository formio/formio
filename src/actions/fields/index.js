'use strict';

module.exports = function(router) {
  return {
    signature: require('./signature')(router.formio),
    password: require('./password')(router.formio),
    form: require('./form')(router),
    email: require('./email')(router.formio),
    datetime: require('./datetime')(router.formio)
  };
};
