'use strict';

var _ = require('lodash');
var async = require('async');

/**
 *
 * @param router
 * @returns {{submission: Function, form: Function}}
 */
module.exports = function(router) {
  var hook = require('./hook')(router.formio);

  /**
   * Flag a submission as deleted. If given a subId, one submission will be flagged; if given a formId, then all the
   * submissions for that formId will be flagged.
   *
   * @param {String|ObjectId} subId
   *   The submission id to flag as deleted.
   * @param {Array} forms
   *   A list of form ids to flag all submissions as deleted.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteSubmission = function(subId, forms, next) {
    var debug = require('debug')('formio:delete:submission');
    var util = router.formio.util;
    if (!subId && !forms) {
      debug('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    // Build the query, using either the subId or forms array.
    var query = {deleted: {$eq: null}};
    if (subId) {
      query._id = util.idToBson(subId);
    }
    else {
      forms = _(forms)
        .map(util.idToBson)
        .value();

      query.form = {$in: forms};
    }

    debug('Deleting ' + (subId ? 'single submission' : 'multiple submissions'));
    router.formio.resources.submission.model.find(query, function(err, submissions) {
      if (err) {
        debug(err);
        return next(err);
      }
      if (!submissions || submissions.length === 0) {
        debug('No submissions found.');
        return next();
      }

      async.eachSeries(submissions, function(submission, cb) {
        submission.deleted = Date.now();
        submission.markModified('deleted');
        submission.save(cb);
      }, next);
    });
  };

  /**
   * Flag an Action as deleted. If given a actionId, one action will be flagged; if given a formId, or array of formIds,
   * then all the Actions for that form, or forms, will be flagged.
   *
   * @param {String|ObjectId} actionId
   *   The Action id to flag as deleted.
   * @param {String|ObjectId|Array} forms
   *   A list of form ids to flag all Actions as deleted.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteAction = function(actionId, forms, next) {
    var debug = require('debug')('formio:delete:action');
    var util = router.formio.util;
    if (!actionId && !forms) {
      debug('Skipping');
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    var query = {deleted: {$eq: null}};
    if (actionId) {
      query._id = util.idToBson(actionId);
    }
    else {
      forms = _(forms)
        .map(util.idToBson)
        .value();

      query.form = {$in: forms};
    }

    debug('Deleting ' + (actionId ? 'single action' : 'multiple actions'));
    debug(query);
    router.formio.actions.model.find(query, function(err, actions) {
      if (err) {
        debug(err);
        return next(err);
      }
      if (!actions || actions.length === 0) {
        debug('No actions found.');
        return next();
      }

      async.eachSeries(actions, function(action, cb) {
        action.settings = action.settings || {};
        action.deleted = Date.now();
        action.markModified('deleted');
        action.save(cb);
      }, next);
    });
  };

  /**
   * Flag a form as deleted. If given a formId, one form will be flagged;
   *
   * @param {String|ObjectId} formId
   *   The form id to flag as deleted.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteForm = function(formId, next) {
    var debug = require('debug')('formio:delete:form');
    var util = router.formio.util;
    if (!formId) {
      debug('Skipping');
      return next();
    }

    var query = {_id: util.idToBson(formId), deleted: {$eq: null}};
    debug(query);
    router.formio.resources.form.model.findOne(query, function(err, form) {
      if (err) {
        debug(err);
        return next(err);
      }
      if (!form) {
        debug('No form found with the _id: ' + formId);
        return next();
      }

      form.deleted = Date.now();
      form.markModified('deleted');
      form.save(function(err) {
        if (err) {
          debug(err);
          return next(err);
        }

        deleteAction(null, formId, function(err) {
          if (err) {
            debug(err);
            return next(err);
          }

          deleteSubmission(null, formId, next);
        });
      });
    });
  };

  /**
   * Delete all known references to access for the given role.
   *
   * @param {String|ObjectId} roleId
   *   The roleId to delete access for.
   * @param {Object} req
   *   The express callback function.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteRoleAccess = function(roleId, req, next) {
    var debug = require('debug')('formio:delete:roleaccess');
    var util = router.formio.util;
    if (!roleId) {
      debug('Skipping');
      return next();
    }

    // Convert the roldId to a string for comparison.
    roleId = util.idToString(roleId);

    // The access types to check.
    var accessType = ['access', 'submissionAccess'];

    // The formIds to check.
    var formIds = null;

    /**
     * Remove the roleId from the forms' access types.
     *
     * @param {Function} cb
     *   The callback function to invoke after the role has been removed.
     */
    var removeFromForm = function(cb) {
      // Build the or query on accessTypes.
      var or = [];
      accessType.forEach(function(access) {
        var temp = {};
        var key = access + '.roles';
        temp[key] = util.idToBson(roleId);
        or.push(temp);
      });

      // Build the search query, and allow anyone to hook it.
      var query = {_id: {$in: _.map(formIds, util.idToBson)}, $or: or};
      query = hook.alter('formQuery', query, req);

      debug(query);
      router.formio.resources.form.model.find(query).snapshot(true).exec(function(err, forms) {
        if (err) {
          debug(err);
          return cb(err);
        }
        if (!forms || forms.length === 0) {
          return cb();
        }

        // Iterate each form and remove the role.
        debug('Found ' + forms.length + ' forms to modify.');
        async.eachSeries(forms, function(form, done) {
          // Iterate each access type to remove the role.
          accessType.forEach(function(access) {
            var temp = form.toObject()[access] || [];

            // Iterate the roles for each permission type, and remove the given roleId.
            for (var b = 0; b < temp.length; b++) {
              // Convert the ObjectIds to strings for comparison.
              temp[b].roles = _.map((temp[b].roles || []), util.idToString);

              // Remove the given roleId if it was defined in the access.
              if (temp[b].roles.indexOf(roleId) !== -1) {
                _.pull(temp[b].roles, roleId);
              }

              // Convert the role ids back to bson strings for storage.
              temp[b].roles = _.map((temp[b].roles || []), util.idToBson);
            }

            form.set(access, temp);
            form.markModified(access);
          });

          form.save(done);
        }, cb);
      });
    };

    /**
     * Remove the roleId from the submissions for the given formIds.
     *
     * @param {Function} cb
     *   The callback function to invoke after the roles have been removed.
     */
    var removeFromSubmissions = function(cb) {
      // Find all submissions that contain the role in its roles.
      var query = {form: {$in: _.map(formIds, util.idToBson)}, deleted: {$eq: null}, roles: util.idToBson(roleId)};
      debug(query);
      router.formio.resources.submission.model.find(query).snapshot(true).exec(function(err, submissions) {
        if (err) {
          debug(err);
          return cb(err);
        }
        if (!submissions || submissions.length === 0) {
          return cb();
        }

        // Iterate each submission to filter the roles.
        async.eachSeries(submissions, function(submission, done) {
          var temp = _.map((submission.toObject().roles || []), util.idToString);

          // Omit the given role from all submissions.
          if (temp.indexOf(roleId) !== -1) {
            _.pull(temp, roleId);
          }

          // Convert all the roles back to bson strings for storage.
          temp = _.map(temp, util.idToBson);

          submission.set('roles', temp);
          submission.markModified('roles');
          submission.save(done);
        }, cb);
      });
    };

    // Build the search query and allow anyone to hook it.
    var query = {deleted: {$eq: null}};
    query = hook.alter('formQuery', query, req);

    router.formio.resources.form.model.find(query).select('_id').snapshot(true).exec(function(err, ids) {
      if (err) {
        debug(err);
        return next(err);
      }
      if (!ids) {
        debug('No form ids found.');
        return next();
      }

      // update the list of formIds
      formIds = _(ids)
        .map('_id')
        .map(util.idToString)
        .value();

      async.series([
        removeFromForm,
        removeFromSubmissions
      ], next);
    });
  };

  /**
   * Flag a Role as deleted. If given a roleId, one Role will be flagged;
   *
   * @param {String|ObjectId} roleId
   *   The Role id to flag as deleted.
   * @param {Object} req
   *   The express request object.
   * @param {Function} next
   *   The callback function to return the results.
   */
  var deleteRole = function(roleId, req, next) {
    var debug = require('debug')('formio:delete:role');
    var util = router.formio.util;
    if (!roleId) {
      debug('Skipping');
      return next();
    }

    var query = {_id: util.idToBson(roleId), deleted: {$eq: null}};
    debug(query);
    router.formio.resources.role.model.findOne(query, function(err, role) {
      if (err) {
        debug(err);
        return next(err);
      }
      if (!role) {
        debug('No role found with _id: ' + roleId);
        return next();
      }

      role.deleted = Date.now();
      role.markModified('deleted');
      role.save(function(err) {
        if (err) {
          debug(err);
          return next(err);
        }

        deleteRoleAccess(roleId, req, next);
      });
    });
  };

  /**
   * Expose the internal functionality for hiding 'deleted' entities.
   */
  return {
    submission: deleteSubmission,
    form: deleteForm,
    action: deleteAction,
    role: deleteRole
  };
};
