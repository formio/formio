'use strict';

const _ = require('lodash');
const debug = require('debug')('formio:middleware:storageAccessHandler');
const isStorageRequest = require('../util/isStorageRequest');

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

module.exports = function(router) {
    return async function storageAccessHandler(req, res, next) {
        if (!isStorageRequest(req)) {
            return next();
        }

        try {
            const item = await new Promise((resolve, reject) => {
                router.formio.cache.loadForm(req, null, req.formId, (err, form) => (
                    err ? reject(err) : resolve(form)
                ));
            });
            if (!item) {
                return next(`No Form found with formId: ${req.formId}`);
            }

            const requestedGroupId = req.body.groupId;
            if (requestedGroupId && req.user.roles.includes(requestedGroupId)) {
                // A user's roles include their group memberships, but also their plain role ids. Only
                // treat the groupId as a group when it is a live submission id, so a role id the user
                // happens to hold cannot stand in for a group and skip the permission check (FIO-12784).
                const isGroupId =
                    OBJECT_ID_PATTERN.test(requestedGroupId) &&
                    Boolean(
                        await router.formio.resources.submission.model.exists({
                            _id: requestedGroupId,
                            deleted: {$eq: null},
                        })
                    );
                if (isGroupId) {
                    debug('Allowing a storage request for a group member');
                    req.permissionsChecked = true;
                }
                else {
                    debug('Ignoring a storage groupId that is not a group');
                }
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
        }
        catch (err) {
            return next(err);
        }
    };
};
