'use strict';

/**
 *
 * @param router
 * @returns {{submission: Function, form: Function}}
 */
module.exports = (router) => {
  const hook = require('./hook')(router.formio);

  /**
   * Flag a submission as deleted. If given a subId, one submission will be flagged; if given a formId, then all the
   * submissions for that formId will be flagged.
   *
   * @param {String|ObjectId} subId
   *   The submission id to flag as deleted.
   * @param {Array} forms
   *   A list of form ids to flag all submissions as deleted.
   * @param {Object} req
   *   The express request object.
   *
   * @returns {Promise}
   *   Result of deleting the submission(s), resolved by deleted entity(ies).
   */
  function deleteSubmission(subId, forms, req) {
    const util = router.formio.util;
    if (!subId && !forms) {
      return Promise.resolve();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !Array.isArray(forms)) {
      forms = [forms];
    }

    // Build the query, using either the subId or forms array.
    const query = {deleted: {$eq: null}};
    if (subId) {
      query._id = util.idToBson(subId);
    }
    else {
      forms = forms.map(util.idToBson);
      query.form = {$in: forms};
    }

    const submissionModel = req.submissionModel || router.formio.resources.submission.model;
    return submissionModel.updateMany(
      hook.alter('submissionQuery', query, req),
      {
        deleted: Date.now()
      }
    );
  }

  /**
   * Flag an Action as deleted. If given a actionId, one action will be flagged; if given a formId, or array of formIds,
   * then all the Actions for that form, or forms, will be flagged.
   *
   * @param {String|ObjectId} actionId
   *   The Action id to flag as deleted.
   * @param {String|ObjectId|Array} forms
   *   A list of form ids to flag all Actions as deleted.
   * @param {Object} req
   *   The express request object.
   *
   * @returns {Promise}
   *   Result of deleting the action(s), resolved by deleted entity(ies).
   */
  function deleteAction(actionId, forms, req) {
    const util = router.formio.util;
    if (!actionId && !forms) {
      return Promise.resolve();
    }
    // Convert the forms to an array if only one was provided.
    if (forms && !Array.isArray(forms)) {
      forms = [forms];
    }

    const query = {deleted: {$eq: null}};
    if (actionId) {
      query._id = util.idToBson(actionId);
    }
    else {
      forms = forms.map(util.idToBson);
      query.form = {$in: forms};
    }

    return router.formio.actions.model.updateMany(
      query,
      {
        deleted: Date.now(),
      });
  }

  /**
   * Flag a form as deleted. If given a formId, one form will be flagged;
   *
   * @param {String|ObjectId} formId
   *   The form id to flag as deleted.
   * @param {Object} req
   *   The express request object.
   *
   * @returns {Promise}
   *   Result of deleting the form, resolved by deleted entity.
   */
  function deleteForm(formId, req) {
    const util = router.formio.util;
    if (!formId) {
      return Promise.resolve();
    }

    const query = {_id: util.idToBson(formId), deleted: {$eq: null}};
    return router.formio.resources.form.model.updateOne(
      query,
      {
        deleted: Date.now(),
      })
    .then(()=> Promise.all([
      deleteAction(null, formId, req),
      deleteSubmission(null, formId, req),
    ]));
  }

  /**
   * Delete all known references to access for the given role.
   *
   * @param {String|ObjectId} roleId
   *   The roleId to delete access for.
   * @param {Object} req
   *   The express request object.
   */
  function deleteRoleAccess(roleId, req) {
    const util = router.formio.util;
    if (!roleId) {
      return Promise.resolve();
    }

    // Convert the roldId to a string for comparison.
    roleId = util.idToString(roleId);

    /**
     * Remove the roleId from the forms' access types.
     *
     * @param {[ObjectId]} formIds
     *   Ids of forms for which role should be removed.
     */
    function removeFromForm(formIds) {
      // Build the or query on accessTypes.
      const accessTypes = ['access', 'submissionAccess'];
      const or = accessTypes.map((accessType) => ({
        [`${accessType}.roles`]: util.idToBson(roleId)
      }));

      // Build the search query, and allow anyone to hook it.
      const query = hook.alter('formQuery', {
        _id: {$in: formIds.map(util.idToBson)},
        $or: or,
      }, req);

      return router.formio.resources.form.model.find(query).exec()
      .then((forms) => {
        if (!forms || forms.length === 0) {
          return Promise.resolve();
        }

        // Iterate each form and remove the role.
        return Promise.all(forms.map((form) => {
          const update = {};
          // Iterate each access type to remove the role.
          for (const accessType of accessTypes) {
            const accesses = form.toObject()[accessType] || [];

            // Iterate the roles for each permission type, and remove the given roleId.
            for (const access of accesses) {
              access.roles = (access.roles || [])
                .map(util.idToString)
                .filter((role) => role !== roleId)
                .map(util.idToBson);
            }
            update[accessType]= accesses;
          }

         return router.formio.resources.form.model.updateOne({
            _id: form._id
          },
          {$set: update});
        }));
      });
    }

    /**
     * Remove the roleId from the submissions for the given formIds.
     *
     * @param {[ObjectId]} formIds
     *   Submissions form ids for which role should be removed.
     */
    function removeFromSubmissions(formIds) {
      // Find all submissions that contain the role in its roles.
      const query = {
        form: {$in: formIds.map(util.idToBson)},
        deleted: {$eq: null},
        roles: util.idToBson(roleId),
      };
      const submissionModel = req.submissionModel || router.formio.resources.submission.model;

      submissionModel.updateMany(
        hook.alter('submissionQuery', query, req),
        {
          $pull: {roles: roleId}
        }
      );
    }

    // Build the search query and allow anyone to hook it.
    const query = hook.alter('formQuery', {deleted: {$eq: null}}, req);

    return router.formio.resources.form.model.find(query).select('_id').lean().exec()
      .then((forms) => {
        if (!forms) {
          return Promise.resolve();
        }

        // update the list of formIds
        const formIds = forms
          .map((form) => form._id)
          .map(util.idToString);

        return Promise.all([
          removeFromForm(formIds),
          removeFromSubmissions(formIds),
        ]);
      });
  }

  /**
   * Flag a Role as deleted. If given a roleId, one Role will be flagged;
   *
   * @param {String|ObjectId} roleId
   *   The Role id to flag as deleted.
   * @param {Object} req
   *   The express request object.
   *
   * @returns {Promise}
   *   Result of deleting the role, resolved by deleted entity.
   */
  function deleteRole(roleId, req) {
    const util = router.formio.util;
    if (!roleId) {
      return Promise.resolve();
    }

    const query = {_id: util.idToBson(roleId), deleted: {$eq: null}};

    return router.formio.resources.role.model.updateMany(
      query,
      {
        deleted: Date.now()
      }
    )
    .then(() => deleteRoleAccess(roleId, req));
  }

  /**
   * Expose the internal functionality for hiding 'deleted' entities.
   */
  return {
    action: deleteAction,
    form: deleteForm,
    role: deleteRole,
    submission: deleteSubmission,
  };
};
