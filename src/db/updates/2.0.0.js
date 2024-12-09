'use strict';

/**
 * Update 2.0.0
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = async function(db, config, tools) {
  try {
    let applications = db.collection('applications');
    let forms = db.collection('forms');
    let roles = db.collection('roles');

    /**
     * Update the applications collection.
     *
     * Steps:
     *   1. Rename the application collection to projects.
     */
    let updateApplications = async () => {
      await applications.rename('projects');
    };

    /**
     * Update the forms collection.
     *
     * Steps:
     *   1. Drop the index for app
     *   2. Rename the app property for every document.
     *   3. Add an index for project
     */
    let updateForms = async () => {
      // Forms update step 1.
      await forms.dropIndex('app_1');

      // Forms update step 2.
      await forms.updateMany({}, { $rename: { 'app': 'project' } });

      // Forms update step 3.
      await forms.createIndex({ project: 1 });
    };

    /**
     * Update the roles collection.
     *
     * Steps:
     *   1. Drop the index for app
     *   2. Rename the app property for every document.
     *   3. Add an index for project
     */
    let updateRoles = async () => {
      // Roles update step 1.
      await roles.dropIndex('app_1');

      // Roles update step 2.
      await roles.updateMany({}, { $rename: { 'app': 'project' } });

      // Roles update step 3.
      await roles.createIndex({ project: 1 });
    };

    // Run updates in sequence
    await updateApplications();
    await updateForms();
    await updateRoles();
  } catch (err) {
    console.error(err);
    throw err;
  }
};
