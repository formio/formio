'use strict';

const Resource = require('resourcejs');
const mongoose = require('mongoose');

module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  const handlers = {};

  handlers.before = [
    router.formio.middleware.filterMongooseExists({field: 'deleted', isNull: true}),
    router.formio.middleware.deleteRoleHandler,
    router.formio.middleware.sortMongooseQuery({title: 1})
  ];
  handlers.after = [
    router.formio.middleware.bootstrapNewRoleAccess,
    router.formio.middleware.filterResourcejsResponse(['deleted', '__v'])
  ];

  return Resource(
    router,
    '',
    'role',
    mongoose.model('role')
  ).rest(hook.alter('roleRoutes', handlers));
};
