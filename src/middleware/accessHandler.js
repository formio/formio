'use strict';
/*eslint max-statements: 0*/

/**
 * The Access handler returns access information for the forms and roles within the project.
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
    // Fetch current user's access
    const userAccess = await promisify(router.formio.access.getAccess)(req, res);

    // Bail if the requester's roles don't have any overlap with general project-level read access
    if (!_.intersection(userAccess.project.read_all, userAccess.roles).length) {
      return res.status(200).json({roles: {}, forms: {}});
    }

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

      formResult.forEach(form => {
        // Only include the form if the requester's roles have overlap with form definition read access roles
        const formDefinitionAccess = form.access.find(perm => perm.type === 'read_all') || {};
        const formDefinitionAccessRoles = (formDefinitionAccess.roles || []).map(id => id.toString());

        if (_.intersection(userAccess.roles, formDefinitionAccessRoles).length) {
          forms[form.name] = form;
        }
      });
    }
    catch (err) {
      return res.status(400).send('Could not load the Forms.');
    }

    // Allow other systems to add to the access information.
    try {
      const accessInfo = await promisify(hook.alter)('accessInfo', {roles: roles, forms: forms});
      res.status(200).json(accessInfo);
    }
    catch (err) {
      return res.status(400).send(err.toString());
    }
  };
};
