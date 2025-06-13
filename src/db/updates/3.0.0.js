'use strict';

const _ = require('lodash');

/**
 * Update 3.0.0
 *
 * Will go through each of the items in the database and set the machine name accordingly.
 *
 * @param db
 * @param config
 * @param tools
 */
module.exports = function (db, config, tools) {
  const projects = db.collection('projects');
  const forms = db.collection('forms');
  const actions = db.collection('actions');
  const roles = db.collection('roles');

  /**
   * Add machine names to projects.
   */
  const updateProjects = () => {
    return projects.find().toArray()
      .then(docs => {
        return Promise.all(docs.map(project => {
          const machineName = project.name.toLowerCase().replace(/\W/g, '');
          return projects.updateOne(
            { _id: project._id },
            { $set: { machineName: machineName } }
          );
        }));
      });
  };

  /**
   * Add machine names to forms.
   */
  const updateForms = () => {
    return forms.find().toArray()
      .then(docs => {
        return Promise.all(docs.map(form => {
          return projects.findOne({ _id: form.project })
            .then(project => {
              let machineName = '';
              if (project) {
                machineName = project.machineName + ':';
              }
              machineName += form.name;
              return forms.updateOne(
                { _id: form._id },
                { $set: { machineName: machineName } }
              );
            });
        }));
      });
  };

  /**
   * Add machine names to actions.
   */
  const updateActions = () => {
    return actions.find().toArray()
      .then(docs => {
        return Promise.all(docs.map(action => {
          return forms.findOne({ _id: action.form })
            .then(form => {
              let machineName = '';
              if (form) {
                machineName = form.machineName + ':';
              }
              machineName += action.name;
              return actions.updateOne(
                { _id: action._id },
                { $set: { machineName: machineName } }
              );
            });
        }));
      });
  };

  /**
   * Add machine names to roles.
   */
  const updateRoles = () => {
    return roles.find().toArray()
      .then(docs => {
        return Promise.all(docs.map(role => {
          return projects.findOne({ _id: role.project })
            .then(project => {
              let machineName = '';
              if (project) {
                machineName = project.machineName + ':';
              }
              machineName += _.camelCase(role.title);
              return roles.updateOne(
                { _id: role._id },
                { $set: { machineName: machineName } }
              );
            });
        }));
      });
  };

  // Execute all update functions sequentially
  updateProjects()
    .then(updateForms)
    .then(updateActions)
    .then(updateRoles)
    .then(() => {
      console.log('Update completed successfully.');
    })
    .catch(err => {
      console.error('Error during update:', err);
    });
};
