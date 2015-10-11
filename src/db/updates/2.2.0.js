'use strict';

var _ = require('lodash');
var async = require('async');
var chain = require('event-chain')();

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
  var projects = db.collection('projects');
  var forms = db.collection('forms');
  var roles = db.collection('roles');
  var actions = db.collection('actions');
  var submissions = db.collection('submissions');

  /**
   * Async operation to fix Projects.
   *
   * Drops the unique name index, and readds an index on the name field, and adds the deleted property.
   *
   * @param callback
   */
  var updateProjects = function(callback) {
    var projectChain = chain.on(['dropIndex', 'addIndex', 'addDeleted'], callback);

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
  var updateForms = function(callback) {
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
  var updateRoles = function(callback) {
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
  var updateActions = function(callback) {
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
  var updateSubmissions = function(callback) {
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
