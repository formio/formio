'use strict';

let async = require('async');

/**
 * Update 2.0.0
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  let applications = db.collection('applications');
  let forms = db.collection('forms');
  let roles = db.collection('roles');

  /**
   * Update the applications collection.
   *
   * Steps:
   *   1. Rename the application collection to projects.
   */
  let updateApplications = function(cb) {
    applications.rename('projects', function(err) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  /**
   * Update the forms collection.
   *
   * Steps:
   *   1. Drop the index for app
   *   2. Rename the app property for every document.
   *   3. Add an index for project
   */
  let updateForms = function(cb) {
    // Forms update step 1.
    let dropIndex = function(next) {
      forms.dropIndex('app_1', function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    // Forms update step 2.
    let rename = function(next) {
      forms.updateMany({}, {$rename: {'app': 'project'}}, function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    // Forms update step 3.
    let createIndex = function(next) {
      forms.createIndex({project: 1}, function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    async.series([
      dropIndex,
      rename,
      createIndex
    ], function(err) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  /**
   * Update the roles collection.
   *
   * Steps:
   *   1. Drop the index for app
   *   2. Rename the app property for every document.
   *   3. Add an index for project
   */
  let updateRoles = function(cb) {
    // Roles update step 1.
    let dropIndex = function(next) {
      roles.dropIndex('app_1', function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    // Roles update step 2.
    let rename = function(next) {
      roles.updateMany({}, {$rename: {'app': 'project'}}, function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    // Roles update step 3.
    let createIndex = function(next) {
      roles.createIndex({project: 1}, function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    async.series([
      dropIndex,
      rename,
      createIndex
    ], function(err) {
      if (err) {
        return cb(err);
      }

      cb();
    });
  };

  async.series([
    updateApplications,
    updateForms,
    updateRoles
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
