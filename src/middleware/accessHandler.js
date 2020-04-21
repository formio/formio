'use strict';
/*eslint max-statements: 0*/

/**
 * The Access handler returns access information for forms and roles.
 *
 * Results are limited according to the requesting user's access level.
 *
 * @param router
 */
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  const promisify = require('util').promisify;
  const _ = require('lodash');

  return async function accessHandler(req, res, next) {
    // Load all the roles.
    const roles = {};

    try {
      const roleResult = await router.formio.resources.role.model
        .find(hook.alter('roleQuery', {deleted: {$eq: null}}, req))
        .select({title: 1, admin: 1, default: 1})
        .lean()
        .exec();

      if (!roleResult) {
        return res.status(400).send('Could not load the Roles.');
      }

      roleResult.forEach((role) => {
        if (role.title) {
          roles[role.title.replace(/\s/g, '').toLowerCase()] = role;
        }
      });
    }
    catch (err) {
      return res.status(400).send('Could not load the Roles.');
    }

    // Load all the forms.
    const forms = {};

    try {
      const formResult = await router.formio.resources.form.model
        .find(hook.alter('formQuery', {deleted: {$eq: null}}, req))
        .select({title: 1, name: 1, path: 1, access: 1, submissionAccess: 1})
        .lean()
        .exec();

      if (!formResult) {
        return res.status(400).send('Could not load the Forms.');
      }

      formResult.forEach(form => forms[form.name] = form);
    }
    catch (err) {
      return res.status(400).send('Could not load the Forms.');
    }

    try {
      // Fetch current user's access
      /* eslint-disable require-atomic-updates */
      req.userAccess = await promisify(router.formio.access.getAccess)(req, res);
      /* eslint-enable require-atomic-updates */

      // Allow other systems to add to the access information or disable filtering
      const accessInfo = await promisify(hook.alter)('accessInfo', {roles, forms, req, filterEnabled: true});

      // Perform access filtering if still enabled
      if (accessInfo.filterEnabled) {
        // Only include forms where the requester's roles have overlap with form definition read access roles
        accessInfo.forms = _.pickBy(accessInfo.forms, form => {
          const formDefinitionAccess = form.access.find(perm => perm.type === 'read_all') || {};
          const formDefinitionAccessRoles = (formDefinitionAccess.roles || []).map(id => id.toString());

          return _.intersection(req.userAccess.roles, formDefinitionAccessRoles).length > 0;
        });
      }

      res.status(200).json({roles: accessInfo.roles, forms: accessInfo.forms});
    }
    catch (err) {
      return res.status(400).send(err.toString());
    }
  };
};
