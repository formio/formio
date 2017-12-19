'use strict';

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var _ = require('lodash');
var debug = require('debug')('formio:middleware:bootstrapFormAccess');

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
  var hook = require('../util/hook')(router.formio);

  return function bootstrapFormAccess(req, res, next) {
    // Only bootstrap access on Form creation.
    if (req.method !== 'POST' || !res || !res.hasOwnProperty('resource') || !res.resource.item) {
      debug('Skipping');
      return next();
    }

    // If they specify access manually, skip defaults.
    if (req.body.access) {
      return next();
    }

    // Query the roles collection, to build the updated form access list.
    router.formio.resources.role.model
      .find(hook.alter('roleQuery', {deleted: {$eq: null}}, req))
      .exec(function(err, roles) {
        if (err) {
          debug(err);
          return next(err);
        }
        if (!roles || roles.length === 0) {
          debug('No roles found');
          return next();
        }

        // Convert the roles to ObjectIds before saving.
        debug(roles);
        roles = _.map(roles, function(role) {
          return ObjectId(role.toObject()._id);
        });

        var update = [{type: 'read_all', roles: roles}];
        debug(update);
        router.formio.resources.form.model.findOne({_id: res.resource.item._id, deleted: {$eq: null}})
          .exec(function(err, form) {
            if (err) {
              debug(err);
              return next(err);
            }
            if (!form) {
              debug('No form found with _id: ' + res.resource.item._id);
              return next();
            }

            // Update the actual form in mongo to reflect the access changes.
            form.access = update;
            form.save(function(err, form) {
              if (err) {
                debug(err);
                return next(err);
              }

              // Update the response to reflect the access changes.
              // Filter the response to have no __v and deleted key.
              var ret = _.omit(_.omit(form.toObject(), 'deleted'), '__v');
              res.resource.item = ret;
              next();
            });
          });
      });
  };
};
