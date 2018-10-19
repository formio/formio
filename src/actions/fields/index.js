'use strict';

module.exports = (router) => ({
  signature: require('./signature')(router.formio),
  password: require('./password')(router.formio),
  form: require('./form')(router),
  email: require('./email')(router.formio),
  datetime: require('./datetime')(router.formio),
});
