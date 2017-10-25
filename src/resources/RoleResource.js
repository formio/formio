'use strict';

var Resource = require('resourcejs');
var mongoose = require('mongoose');

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);
  var handlers = {};

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
