'use strict';

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  return hook.alter('resources', {
    form: require('./FormResource')(router),
    submission: require('./SubmissionResource')(router),
    role: require('./RoleResource')(router)
  });
};
