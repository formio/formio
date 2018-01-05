'use strict';

/**
 * Update 2.1.1
 *
 * Update all of the defaultAccess roles to have a "default" flag set.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  // Add default flags to all of the project default roles.
  let projects = db.collection('projects');
  let roles = db.collection('roles');
  projects.find({}).forEach(function(project) {
    if (project.defaultAccess) {
      roles.update(
        { _id: project.defaultAccess },
        { $set: { default: true } }
      );
    }
  }, done);
};
