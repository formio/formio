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
    projects.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(project, key, next) {
        let machineName = project.name.toLowerCase().replace(/\W/g, '');
        projects.updateOne(
          {_id: project._id},
          {$set: {machineName: machineName}},
          function (err) {
            if (err) {
              return next(err);
            }
            next();
          }
        );
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });
    });
  };

  /**
   * Add machine names to forms.
   */
  let updateForms = function(callback) {
    let projects = db.collection('projects');
    let forms = db.collection('forms');
    forms.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(form, key, next) {
        projects.findOne({_id: form.project}, function(err, project) {
          if (err) { return next(err); }
          let machineName = '';
          if (project) {
            machineName = project.machineName + ':';
          }
          machineName = machineName + form.name;
          forms.updateOne(
            {_id: form._id},
            {$set: {machineName: machineName}},
            function (err) {
              if (err) { return next(err); }
              next();
            }
          );
        });
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });
    });
  };

  /**
   * Add machine names to actions.
   */
  let updateActions = function(callback) {
    let forms = db.collection('forms');
    let actions = db.collection('actions');
    actions.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(action, key, next) {
        forms.findOne({_id: action.form}, function(err, form) {
          if (err) { return next(err); }
          let machineName = '';
          if (form) {
            machineName = form.machineName + ':';
          }
          machineName = machineName + action.name;
          actions.updateOne(
            {_id: action._id},
            {$set: {machineName: machineName}},
            function (err) {
              if (err) { return next(err); }
              next();
            }
          );
        });
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });
    });
  };

  /**
   * Add machine names to roles.
   */
  let updateRoles = function(callback) {
    let projects = db.collection('projects');
    let roles = db.collection('roles');
    roles.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(role, key, next) {
        projects.findOne({_id: role.project}, function(err, project) {
          if (err) { return next(err); }
          let machineName = '';
          if (project) {
            machineName = project.machineName + ':';
          }
          machineName = machineName + _.camelCase(role.title);
          roles.updateOne(
            {_id: role._id},
            {$set: {machineName: machineName}},
            function (err) {
              if (err) { return next(err); }
              next();
            }
          );
        });
      }, function(err) {
        if (err) {
          return callback(err);
        }
        callback();
      });
    });
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
