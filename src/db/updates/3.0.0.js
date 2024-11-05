'use strict';

const _ = require('lodash');
const async = require('async');

/**
 * Update 3.0.0
 *
 * Will go through each of the items in the database and set the machine name accordingly.
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 */
module.exports = function(db, config, tools, done) {
  /**
   * Add machine names to projects.
   */
  let updateProjects = function(callback) {
    let projects = db.collection('projects');
    projects.find().toArray()
    .then(docs => {
      async.forEachOf(docs, function(project, key, next) {
        let machineName = project.name.toLowerCase().replace(/\W/g, '');
        projects.updateOne(
          {_id: project._id},
          {$set: {machineName: machineName}})
        .then(() => next())
        .catch(err => next(err))
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });

    })
    .catch(err => callback(err));
  };

  /**
   * Add machine names to forms.
   */
  let updateForms = function(callback) {
    let projects = db.collection('projects');
    let forms = db.collection('forms');
    forms.find().toArray()
    .then(docs => {
      async.forEachOf(docs, function(form, key, next) {
        projects.findOne({_id: form.project})
        .then(project => {
          let machineName = '';
          if (project) {
            machineName = project.machineName + ':';
          }
          machineName = machineName + form.name;
          forms.updateOne(
            {_id: form._id},
            {$set: {machineName: machineName}})
          .then(() => next())
          .catch(err => next(err));
        })
        .catch(err => next(err));
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });
    })
    .catch(err => callback(err));
  };

  /**
   * Add machine names to actions.
   */
  let updateActions = function(callback) {
    let forms = db.collection('forms');
    let actions = db.collection('actions');
    actions.find().toArray()
    .then(docs => {
      async.forEachOf(docs, function(action, key, next) {
        forms.findOne({_id: action.form})
        .then(form => {
          let machineName = '';
          if (form) {
            machineName = form.machineName + ':';
          }
          machineName = machineName + action.name;
          actions.updateOne(
            {_id: action._id},
            {$set: {machineName: machineName}})
          .then(() => next())
          .catch(err => next(err));
        })
        .catch(err => next(err));
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });
    })
    .catch(err => callback(err));
  };

  /**
   * Add machine names to roles.
   */
  let updateRoles = function(callback) {
    let projects = db.collection('projects');
    let roles = db.collection('roles');
    roles.find().toArray()
    .then(docs => {
      async.forEachOf(docs, function(role, key, next) {
        projects.findOne({_id: role.project})
        .then(project => {
          let machineName = '';
          if (project) {
            machineName = project.machineName + ':';
          }
          machineName = machineName + _.camelCase(role.title);
          roles.updateOne(
            {_id: role._id},
            {$set: {machineName: machineName}})
          .then(() => next())
          .catch(err => next(err));
        })
        .catch(err => next(err));
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });
    })
    .catch(err => callback(err));
  };

  async.series([
      updateProjects,
      updateForms,
      updateActions,
      updateRoles
    ],
    function(err) {
      if (err) {
        return done(err);
      }

      done();
    });
};
