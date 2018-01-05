'use strict';

let _ = require('lodash');
let async = require('async');

/**
 * Update 2.0.1
 *
 * Fixes mangled access properties (Projects and Forms). Cannot revert to original form settings, but fixes each form to
 * allow all known roles to read the form itself, and removes duplicated permissions.
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

  /**
   * Async operation to fix Projects.
   *
   * @param callback
   */
  let fixProjects = function(callback) {
    projects.find({}).snapshot({$snapshot: true}).forEach(function(project) {
      // Reset the access permissions if duplicate types exist (mangled by bug).
      let included = [];

      /**
       * Async function for getting the roles associated with the current project.
       *
       * @param next
       */
      let getRoles = function(next) {
        roles.find({query: {project: project._id}, $snapshot: true}).toArray(function(err, docs) {
          if (err) {
            return next(err);
          }

          included = _.uniq(_.pluck(docs, '_id'));
          next();
        });
      };

      /**
       * Async function for building the current project access property.
       *
       * @param next
       */
      let calculateAccess = function(next) {
        if (!project.access) {
          console.log('No project.access found for: ' + project._id);
          return next();
        }

        // Check for mangled access
        let type = _.pluck(project.access, 'type');
        let foundReadAll = false;
        if (type.length === _.uniq(type).length) {
          // Remove the _id of each subdocument, added by mongoose.
          let filteredAccess = [];
          project.access.forEach(function(permission) {
            let temp = _.omit(permission, '_id');

            // Overwrite the read_all roles to contain all roles defined within a project.
            if (temp.type === 'read_all') {
              foundReadAll = true;

              // Update the roles without being destructive.
              temp.roles = temp.roles.concat(included);
              temp.roles = temp.roles.map(function(e) {
                return e.toString();
              });
              temp.roles = _.uniq(temp.roles);
            }

            // Remove any malformed permissions.
            if (temp.type) {
              filteredAccess.push(temp);
            }
          });

          // Include the read_all permissions, if not found in the pre-exising permissions.
          if (!foundReadAll) {
            filteredAccess.push({
              type: 'read_all',
              roles: included
            });
          }

          project.access = filteredAccess;
          return next();
        }

        // Update the project access to include all the known project roles as read_all access.
        project.access = [{
          type: 'read_all',
          roles: included
        }];
        next();
      };

      /**
       * Async function for saving the current project.
       *
       * @param next
       */
      let saveProject = function(next) {
        projects.updateOne({_id: project._id}, {$set: {access: project.access}}, next);
      };

      /**
       * Run the following sequence of async functions for each project, in order.
       */
      async.series([
          getRoles,
          calculateAccess,
          saveProject
        ],
        function(err, results) {
          if (err) {
            return callback(err);
          }
        });
    }, function(err) {
      if (err) {
        return callback(err);
      }

      callback();
    });
  };

  /**
   * Async operation to fix Forms.
   *
   * @param callback
   */
  let fixForms = function(callback) {
    forms.find({}).snapshot({$snapshot: true}).forEach(function(form) {
      // Reset the access permissions if duplicate types exist (mangled by bug).
      let included = [];

      /**
       * Async function for getting the roles associated with the current form.
       *
       * @param next
       */
      let getRoles = function(next) {
        roles.find({query: {project: form.project}, $snapshot: true}).toArray(function(err, docs) {
          if (err) {
            return next(err);
          }

          included = _.pluck(docs, '_id');
          next();
        });
      };

      /**
       * Async function for building the current form access property.
       *
       * @param next
       * @returns {*}
       */
      let calculateAccess = function(next) {
        form.access = form.access || [];

        let type = _.pluck(form.access, 'type');
        let foundReadAll = false;
        if (type.length === _.uniq(type).length) {
          // Remove the _id of each subdocument, added by mongoose.
          let filteredAccess = [];
          form.access.forEach(function(permission) {
            let temp = _.omit(permission, '_id');

            // Overwrite the read_all roles to contain all roles defined within a project.
            if (temp.type === 'read_all') {
              foundReadAll = true;
              temp.roles = included;
            }

            // Remove any malformed permissions.
            if (temp.type) {
              filteredAccess.push(temp);
            }
          });

          // Include the read_all permissions, if not found in the pre-exising permissions.
          if (!foundReadAll) {
            filteredAccess.push({
              type: 'read_all',
              roles: included
            });
          }

          form.access = filteredAccess;
          return next();
        }

        // Update the form access to include all the known project roles as read_all access.
        form.access = [{
          type: 'read_all',
          roles: included
        }];
        next();
      };

      /**
       * Async function for building the current form submissionAccess property.
       *
       * @param next
       * @returns {*}
       */
      let calculateSubmissionAccess = function(next) {
        form.submissionAccess = form.submissionAccess || [];

        // Reset the submission Access permissions if duplicate types exist (mangled by bug).
        let type = _.pluck(form.submissionAccess, 'type');
        if (type.length > _.uniq(type).length) {
          form.submissionAccess = [];
          return next();
        }

        // Remove the _id of each subdocument, added by mongoose.
        let filteredSubmissionAccess = [];
        form.submissionAccess.forEach(function(permission) {
          let temp = _.omit(permission, '_id');

          // Remove any malformed permissions.
          if (temp.type) {
            filteredSubmissionAccess.push(temp);
          }
        });

        // Signal to update the form submissionAccess.
        form.submissionAccess = filteredSubmissionAccess;
        next();
      };

      /**
       * Async function for saving the current form.
       *
       * @param next
       */
      let saveForm = function(next) {
        forms.updateOne({_id: form._id}, {$set: {access: form.access, submissionAccess: form.submissionAccess}}, next);
      };

      /**
       * Run the following sequence of async functions for each form, in order.
       */
      async.series([
          getRoles,
          calculateAccess,
          calculateSubmissionAccess,
          saveForm
        ],
        function(err, results) {
          if (err) {
            return callback(err);
          }
        });
    }, function(err) {
      if (err) {
        return callback(err);
      }

      callback();
    });
  };

  /**
   * The update process for the 2.0.1 access hotfix.
   */
  async.series([
    fixProjects,
    fixForms
  ],
  function(err, results) {
    if (err) {
      return done(err);
    }

    done();
  });
};
