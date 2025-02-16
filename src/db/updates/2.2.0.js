'use strict';

let _ = require('lodash');

/**
 * Update 2.2.0
 *
 * Adds deleted fields to all formio entities, updates the unique index on projects.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = async function(db, config, tools, done) {
  let projects = db.collection('projects');
  let forms = db.collection('forms');
  let roles = db.collection('roles');
  let actions = db.collection('actions');
  let submissions = db.collection('submissions');

  /**
   * Async operation to fix Projects.
   *
   * Drops the unique name index, and readds an index on the name field, and adds the deleted property.
   */
  const updateProjects = async function() {
    try {
      await projects.dropIndex('name_1');
      await projects.createIndex('name_1');
      await projects.updateMany({}, { $set: { deleted: null } });
    } catch (err) {
      throw err;
    }
  };

  /**
   * Async operation to fix Forms.
   *
   * Adds the deleted property.
   */
  const updateForms = async function() {
    try {
      await forms.updateMany({}, { $set: { deleted: null } });
    } catch (err) {
      throw err;
    }
  };

  /**
   * Async operation to fix Roles.
   *
   * Adds the deleted property.
   */
  const updateRoles = async function() {
    try {
      await roles.updateMany({}, { $set: { deleted: null } });
    } catch (err) {
      throw err;
    }
  };

  /**
   * Async operation to fix Actions.
   *
   * Adds the deleted property.
   */
  const updateActions = async function() {
    try {
      await actions.updateMany({}, { $set: { deleted: null } });
    } catch (err) {
      throw err;
    }
  };

  /**
   * Async operation to fix Submissions.
   *
   * Adds the deleted property.
   */
  const updateSubmissions = async function() {
    try {
      await submissions.updateMany({}, { $set: { deleted: null } });
    } catch (err) {
      throw err;
    }
  };

  /**
   * The update process for the 2.2.0 access hotfix.
   */
  try {
    await updateProjects();
    await updateForms();
    await updateRoles();
    await updateActions();
    await updateSubmissions();
    done();
  } catch (err) {
    done(err);
  }
};
