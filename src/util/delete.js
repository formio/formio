'use strict';

const _ = require('lodash');
const async = require('async');

/**
 *
 * @param router
 * @returns {{submission: Function, form: Function}}
 */
module.exports = function(router) {
  const hook = require('./hook')(router.formio);

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
  const deleteSubmission = function(subId, forms, req, next) {
    const util = router.formio.util;
    if (!subId && !forms) {
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    // Build the query, using either the subId or forms array.
    const query = {deleted: {$eq: null}};
    if (subId) {
      query._id = util.idToBson(subId);
    }
    else {
      forms = _(forms)
        .map(util.idToBson)
        .value();

      query.form = {$in: forms};
    }

    const submissionModel = req.submissionModel || router.formio.resources.submission.model;
    submissionModel.find(query, function(err, submissions) {
      if (err) {
        return next(err);
      }
      if (!submissions || submissions.length === 0) {
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
  const deleteAction = function(actionId, forms, req, next) {
    const util = router.formio.util;
    if (!actionId && !forms) {
      return next();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !(forms instanceof Array)) {
      forms = [forms];
    }

    const query = {deleted: {$eq: null}};
    if (actionId) {
      query._id = util.idToBson(actionId);
    }
    else {
      forms = _(forms)
        .map(util.idToBson)
        .value();

      query.form = {$in: forms};
    }

    router.formio.actions.model.find(query, function(err, actions) {
      if (err) {
        return next(err);
      }
      if (!actions || actions.length === 0) {
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
  const deleteForm = function(formId, req, next) {
    const util = router.formio.util;
    if (!formId) {
      return next();
    }

    const query = {_id: util.idToBson(formId), deleted: {$eq: null}};
    router.formio.resources.form.model.findOne(query, function(err, form) {
      if (err) {
        return next(err);
      }
      if (!form) {
        return next();
      }

      form.deleted = Date.now();
      form.markModified('deleted');
      form.save(function(err) {
        if (err) {
          return next(err);
        }

        deleteAction(null, formId, req, function(err) {
          if (err) {
            return next(err);
          }

          deleteSubmission(null, formId, req, next);
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
  const deleteRoleAccess = function(roleId, req, next) {
    const util = router.formio.util;
    if (!roleId) {
      return next();
    }

    // Convert the roldId to a string for comparison.
    roleId = util.idToString(roleId);

    // The access types to check.
    const accessType = ['access', 'submissionAccess'];

    // The formIds to check.
    let formIds = null;

    /**
     * Remove the roleId from the forms' access types.
     *
     * @param {Function} cb
     *   The callback function to invoke after the role has been removed.
     */
    const removeFromForm = function(cb) {
      // Build the or query on accessTypes.
      const or = [];
      accessType.forEach(function(access) {
        const temp = {};
        const key = `${access}.roles`;
        temp[key] = util.idToBson(roleId);
        or.push(temp);
      });

      // Build the search query, and allow anyone to hook it.
      let query = {_id: {$in: _.map(formIds, util.idToBson)}, $or: or};
      query = hook.alter('formQuery', query, req);

      router.formio.resources.form.model.find(query).snapshot(true).exec(function(err, forms) {
        if (err) {
          return cb(err);
        }
        if (!forms || forms.length === 0) {
          return cb();
        }

        // Iterate each form and remove the role.
        async.eachSeries(forms, function(form, done) {
          // Iterate each access type to remove the role.
          accessType.forEach(function(access) {
            const temp = form.toObject()[access] || [];

            // Iterate the roles for each permission type, and remove the given roleId.
            for (let b = 0; b < temp.length; b++) {
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
    const removeFromSubmissions = function(cb) {
      // Find all submissions that contain the role in its roles.
      const query = {form: {$in: _.map(formIds, util.idToBson)}, deleted: {$eq: null}, roles: util.idToBson(roleId)};
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;
      submissionModel.find(query).snapshot(true).exec(function(err, submissions) {
        if (err) {
          return cb(err);
        }
        if (!submissions || submissions.length === 0) {
          return cb();
        }

        // Iterate each submission to filter the roles.
        async.eachSeries(submissions, function(submission, done) {
          let temp = _.map((submission.toObject().roles || []), util.idToString);

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
    let query = {deleted: {$eq: null}};
    query = hook.alter('formQuery', query, req);

    router.formio.resources.form.model.find(query).select('_id').snapshot(true).exec(function(err, ids) {
      if (err) {
        return next(err);
      }
      if (!ids) {
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
  const deleteRole = function(roleId, req, next) {
    const util = router.formio.util;
    if (!roleId) {
      return next();
    }

    const query = {_id: util.idToBson(roleId), deleted: {$eq: null}};
    router.formio.resources.role.model.findOne(query, function(err, role) {
      if (err) {
        return next(err);
      }
      if (!role) {
        return next();
      }

      role.deleted = Date.now();
      role.markModified('deleted');
      role.save(function(err) {
        if (err) {
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
