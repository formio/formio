'use strict';

let _ = require('lodash');

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
module.exports = async function(db, config, tools, done) {
  let projects = db.collection('projects');
  let forms = db.collection('forms');
  let roles = db.collection('roles');

  /**
   * Async operation to fix Projects.
   */
  let fixProjects = async function() {
    try {
      let projectList = await projects.find({}).toArray();
      for (let project of projectList) {
        let included = [];

        // Get roles associated with the current project
        try {
          let docs = await roles.find({ query: { project: project._id } }).toArray();
          included = _.uniq(_.map(docs, '_id'));
        } catch (err) {
          throw err;
        }

        if (!project.access) {
          console.log('No project.access found for: ' + project._id);
          continue;
        }

        // Check for mangled access
        let type = _.map(project.access, 'type');
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

          // Include the read_all permissions, if not found in the pre-existing permissions.
          if (!foundReadAll) {
            filteredAccess.push({
              type: 'read_all',
              roles: included
            });
          }

          project.access = filteredAccess;
        }
        else {
          // Update the project access to include all the known project roles as read_all access.
          project.access = [{
            type: 'read_all',
            roles: included
          }];
        }

        // Save the current project
        try {
          await projects.updateOne({ _id: project._id }, { $set: { access: project.access } });
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      throw err;
    }
  };

  /**
   * Async operation to fix Forms.
   */
  const fixForms = async function() {
    try {
      let formList = await forms.find({}).toArray();
      for (let form of formList) {
        let included = [];

        // Get roles associated with the current form
        try {
          let docs = await roles.find({ query: { project: form.project } }).toArray();
          included = _.map(docs, '_id');
        } catch (err) {
          throw err;
        }

        form.access = form.access || [];

        let type = _.map(form.access, 'type');
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

          // Include the read_all permissions, if not found in the pre-existing permissions.
          if (!foundReadAll) {
            filteredAccess.push({
              type: 'read_all',
              roles: included
            });
          }

          form.access = filteredAccess;
        } else {
          // Update the form access to include all the known project roles as read_all access.
          form.access = [{
            type: 'read_all',
            roles: included
          }];
        }

        // Reset the submission Access permissions if duplicate types exist (mangled by bug).
        form.submissionAccess = form.submissionAccess || [];
        let submissionType = _.map(form.submissionAccess, 'type');
        if (submissionType.length > _.uniq(submissionType).length) {
          form.submissionAccess = [];
        } else {
          // Remove the _id of each subdocument, added by mongoose.
          let filteredSubmissionAccess = [];
          form.submissionAccess.forEach(function(permission) {
            let temp = _.omit(permission, '_id');

            // Remove any malformed permissions.
            if (temp.type) {
              filteredSubmissionAccess.push(temp);
            }
          });

          form.submissionAccess = filteredSubmissionAccess;
        }

        // Save the current form
        try {
          await forms.updateOne({ _id: form._id }, { $set: { access: form.access, submissionAccess: form.submissionAccess } });
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      throw err;
    }
  };

  /**
   * The update process for the 2.0.1 access hotfix.
   */
  try {
    await fixProjects();
    await fixForms();
    done();
  } catch (err) {
    done(err);
  }
};
