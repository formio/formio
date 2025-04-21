'use strict';

const async = require('async');
const _ = require('lodash');

/**
 * Middleware to bootstrap forms when a new role is created.
 *
 * Update the associated resources with the new role to allow access, then iterate all the existing
 * forms, and add the new role to read_all access.
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports = function(router) {
  return async function bootstrapNewRoleAccess(req, res, next) {
    const httpLogger = req.log.child({module: 'formio:middleware:bootstrapNewRoleAccess'});
    const hook = require('../util/hook')(router.formio);

    // Only bootstrap existing form access on Role creation.
    if (req.method !== 'POST' || !res || !res.hasOwnProperty('resource') || !res.resource.item) {
      return next();
    }

    const roleId = res.resource.item._id.toString();

    /**
     * Async function to add the new role to the read_all access of each form.
     *
     * @param done
     */
    const updateForms = async function(_role, done) {
      const query = hook.alter('roleQuery', {deleted: {$eq: null}}, req);

      // Query the forms collection, to build the updated form access list.
      try {
        const forms = await router.formio.resources.form.model.find(query).exec();
        if (!forms || forms.length === 0) {
          return done();
        }

        async.eachSeries(forms, async function(form) {
          // Add the new roleId to the access list for read_all (form).
          form.access = form.access || [];
          let found = false;
          for (let a = 0; a < form.access.length; a++) {
            if (form.access[a].type === 'read_all') {
              form.access[a].roles = form.access[a].roles || [];
              form.access[a].roles.push(_role);
              form.access[a].roles = _.uniq(form.access[a].roles);
              found = true;
            }
          }

          // The read_all permission type was not previously added.
          if (!found) {
            form.access.push({
              type: 'read_all',
              roles: [_role]
            });
          }

          // Save the updated permissions.
          await router.formio.resources.form.model.updateOne({
            _id: form._id},
            {$set: {access: form.access}});
        }, done);
      }
      catch (err) {
        httpLogger.error(err);
        return done(err);
      }
    };

    const bound = [];
    const fns = await hook.alter('newRoleAccess', [updateForms], req);
    fns.forEach(function(f) {
      bound.push(async.apply(f, roleId));
    });

    async.series(bound, function(err, result) {
      if (err) {
        httpLogger.error(err);
        return next(err);
      }

      return next();
    });
  };
};
