'use strict';

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const _ = require('lodash');

/**
 * Middleware to bootstrap the access of forms.
 *
 * When a new form is made, iterate all the roles to add to the form.
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports = function(router) {
  const hook = require('../util/hook')(router.formio);

  return async function bootstrapFormAccess(req, res, next) {
    // Only bootstrap access on Form creation.
    if (req.method !== 'POST' || !res || !res.hasOwnProperty('resource') || !res.resource.item) {
      return next();
    }

    // If they specify access manually, skip defaults.
    if (req.body.access && req.body.access.length) {
      return next();
    }

    // Query the roles collection, to build the updated form access list.
    try {
      let roles = await router.formio.resources.role.model
        .find(hook.alter('roleQuery', {deleted: {$eq: null}}, req)).lean().exec();
        if (!roles || roles.length === 0) {
          return next();
        }

        // Convert the roles to ObjectIds before saving.
        roles = _.map(roles, function(role) {
          return new ObjectId(role._id);
        });

        // Update the form.
        await router.formio.resources.form.model.updateOne(
          {_id: res.resource.item._id, deleted: {$eq: null}},
          {$set: {access: [{type: 'read_all', roles: roles}]}}
        ).exec();
        const form = await router.formio.resources.form.model.findOne(
            {_id: res.resource.item._id, deleted: {$eq: null}}
          ).lean().exec();
        if (!form) {
          return next();
        }
        // Update the response to reflect the access changes.
        // Filter the response to have no __v and deleted key.
        res.resource.item = _.omit(_.omit(form, 'deleted'), '__v');
        return next();
    }
    catch (err) {
      req.log.error({module: 'formio:middleware:bootstrapFormAccess', err});
      return next(err);
    }
  };
};
