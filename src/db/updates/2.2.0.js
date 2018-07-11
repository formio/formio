'use strict';

let _ = require('lodash');
let async = require('async');
let chain = require('event-chain')();

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
module.exports = function(db, config, tools, done) {
  let projects = db.collection('projects');
  let forms = db.collection('forms');
  let roles = db.collection('roles');
  let actions = db.collection('actions');
  let submissions = db.collection('submissions');

  /**
   * Async operation to fix Projects.
   *
   * Drops the unique name index, and readds an index on the name field, and adds the deleted property.
   *
   * @param callback
   */
  let updateProjects = function(callback) {
    let projectChain = chain.on(['dropIndex', 'addIndex', 'addDeleted'], callback);

    projects.dropIndex('name_1', function(err, result) {
      if (err) {
        return callback(err);
      }

      projectChain.emit('dropIndex');
    });

    projects.createIndex('name_1', function(err, result) {
      if (err) {
        return callback(err);
      }

      projectChain.emit('addIndex');
    });

    projects.updateMany({}, {$set: {deleted: null}}, function(err, results) {
      if (err) {
        return callback(err);
      }

      projectChain.emit('addDeleted');
    });
  };

  /**
   * Async operation to fix Forms.
   *
   * Adds the deleted property.
   *
   * @param callback
   */
  let updateForms = function(callback) {
    forms.updateMany({}, {$set: {deleted: null}}, function(err, results) {
      if (err) {
        return callback(err);
      }

      callback();
    });
  };

  /**
   * Async operation to fix Roles.
   *
   * Adds the deleted property.
   *
   * @param callback
   */
  let updateRoles = function(callback) {
    roles.updateMany({}, {$set: {deleted: null}}, function(err, results) {
      if (err) {
        return callback(err);
      }

      callback();
    });
  };

  /**
   * Async operation to fix Actions.
   *
   * Adds the deleted property.
   *
   * @param callback
   */
  let updateActions = function(callback) {
    actions.updateMany({}, {$set: {deleted: null}}, function(err, results) {
      if (err) {
        return callback(err);
      }

      callback();
    });
  };

  /**
   * Async operation to fix Submissions.
   *
   * Adds the deleted property.
   *
   * @param callback
   */
  let updateSubmissions = function(callback) {
    submissions.updateMany({}, {$set: {deleted: null}}, function(err, results) {
      if (err) {
        return callback(err);
      }

      callback();
    });
  };

  /**
   * The update process for the 2.2.0 access hotfix.
   */
  async.series([
    updateProjects,
    updateForms,
    updateRoles,
    updateActions,
    updateSubmissions
  ],
  function(err, results) {
    if (err) {
      return done(err);
    }

    done();
  });
};
