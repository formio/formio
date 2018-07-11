'use strict';
/*eslint max-statements: 0*/

const _ = require('lodash');

/**
 * The Access handler returns all the access information for the forms and roles within the project.
 *
 * @param router
 */
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);
  return function accessHandler(req, res, next) {
    // Load all the roles.
    router.formio.resources.role.model.find(hook.alter('roleQuery', {deleted: {$eq: null}}, req))
      .select({
        title: 1,
        admin: 1,
        default: 1
      })
      .exec(function(err, roleResult) {
        if (err || !roleResult) {
          return res.status(400).send('Could not load the Roles.');
        }

        const roles = {};
        _.each(roleResult, function(role) {
          if (role.title) {
            roles[role.title.replace(/\s/g, '').toLowerCase()] = role.toObject();
          }
        });

        // Load all the forms.
        router.formio.resources.form.model.find(hook.alter('formQuery', {deleted: {$eq: null}}, req))
          .select({
            title: 1,
            name: 1,
            path: 1,
            access: 1,
            submissionAccess: 1
          })
          .exec(function(err, formResult) {
            if (err || !formResult) {
              return res.status(400).send('Could not load the Forms.');
            }

            const forms = {};
            _.each(formResult, function(form) {
              forms[form.name] = form.toObject();
            });

            // Allow other systems to add to the access information.
            hook.alter('accessInfo', {
              roles: roles,
              forms: forms
            }, function(err, accessInfo) {
              if (err) {
                return res.status(400).send(err.toString());
              }

              res.status(200).json(accessInfo);
            });
          });
      });
  };
};
