'use strict';

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
                req.body.groupPermissions.forEach((permission) => {
                    permission.roles.forEach((role) => {
                        if (req.user.roles.includes(role) && (['admin', 'write', 'create'].includes(permission))) {
                            req.permissionsChecked = true;
                        }
                    });
                });
            }

            return next();
        });
    };
};
