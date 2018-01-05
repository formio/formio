'use strict';

const debug = require('debug')('formio:middleware:bootstrapNewRoleAccess');
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
  return function bootstrapNewRoleAccess(req, res, next) {
    const hook = require('../util/hook')(router.formio);

    // Only bootstrap existing form access on Role creation.
    if (req.method !== 'POST' || !res || !res.hasOwnProperty('resource') || !res.resource.item) {
      debug('Skipping');
      return next();
    }

    const roleId = res.resource.item._id.toString();

    /**
     * Async function to add the new role to the read_all access of each form.
     *
     * @param done
     */
    const updateForms = function(_role, done) {
      const query = hook.alter('roleQuery', {deleted: {$eq: null}}, req);
      debug(query);

      // Query the forms collection, to build the updated form access list.
      router.formio.resources.form.model.find(query).snapshot().exec(function(err, forms) {
        if (err) {
          debug(err);
          return done(err);
        }
        if (!forms || forms.length === 0) {
          debug('No Forms found');
          return done();
        }

        async.eachSeries(forms, function(form, formDone) {
          debug('Loaded Form');

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
          form.save(function(err, form) {
            if (err) {
              debug(err);
              return formDone(err);
            }

            formDone(null, form);
          });
        }, done);
      });
    };

    const bound = [];
    const fns = hook.alter('newRoleAccess', [updateForms], req);
    fns.forEach(function(f) {
      bound.push(async.apply(f, roleId));
    });

    async.series(bound, function(err, result) {
      if (err) {
        debug(err);
        return next(err);
      }
      debug(result);

      return next();
    });
  };
};
