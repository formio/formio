'use strict';

const _ = require('lodash');

module.exports = function(router) {
    return function storageAccessHandler(req, res, next) {
        if (!req.originalUrl.split('/').includes('storage')) {
            return next();
        }

        router.formio.cache.loadForm(req, null, req.formId, function(err, item) {
            if (err) {
                return next(err);
            }
            if (!item) {
                return next(`No Form found with formId: ${req.formId}`);
            }

            if (req.body.groupId && req.user.roles.includes(req.body.groupId)) {
                req.permissionsChecked = true;
            }

            if (req.body.groupPermissions) {
                const createRoles = _.chain(req.body.groupPermissions)
                    .filter(permission => permission.type && ['admin', 'write', 'create'].includes(permission.type))
                    .map(permission => permission.roles)
                    .flattenDeep()
                    .value();

                req.user.roles.forEach(function(roleEntity) {
                    const [groupId, role] = roleEntity.split(':');

                    if (role && groupId &&
                        createRoles.includes(role) && req.body.groupId === groupId) {
                        req.permissionsChecked = true;
                    }
                });
            }

            return next();
        });
    };
};
