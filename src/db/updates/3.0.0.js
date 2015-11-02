'use strict';

var async = require('async');

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
  var updateProjects = function(callback) {
    var projects = db.collection('projects');
    projects.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(project, key, next) {
        var machineName = project.name.toLowerCase().replace(/\W/g, '');
        projects.findOneAndUpdate(
          {_id: project._id},
          {$set: {machineName: machineName}},
          {returnOriginal: false},
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
  var updateForms = function(callback) {
    var projects = db.collection('projects');
    var forms = db.collection('forms');
    forms.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(form, key, next) {
        projects.findOne({_id: form.project}, function(err, project) {
          if (err) { return next(err); }
          var machineName = '';
          if (project) {
            machineName = project.machineName + ':';
          }
          machineName = machineName + form.name;
          forms.findOneAndUpdate(
            {_id: form._id},
            {$set: {machineName: machineName}},
            {returnOriginal: false},
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
  var updateActions = function(callback) {
    var forms = db.collection('forms');
    var actions = db.collection('actions');
    actions.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(action, key, next) {
        forms.findOne({_id: action.form}, function(err, form) {
          if (err) { return next(err); }
          var machineName = '';
          if (form) {
            machineName = form.machineName + ':';
          }
          machineName = machineName + action.name;
          actions.findOneAndUpdate(
            {_id: action._id},
            {$set: {machineName: machineName}},
            {returnOriginal: false},
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
  var updateRoles = function(callback) {
    var projects = db.collection('projects');
    var roles = db.collection('roles');
    roles.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return callback(err);
      }
      async.forEachOf(docs, function(role, key, next) {
        projects.findOne({_id: role.project}, function(err, project) {
          if (err) { return next(err); }
          var machineName = '';
          if (project) {
            machineName = project.machineName + ':';
          }
          machineName = machineName + role.title.toLowerCase();
          roles.findOneAndUpdate(
            {_id: role._id},
            {$set: {machineName: machineName}},
            {returnOriginal: false},
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
