'use strict';

var async = require('async');
var _ = require('lodash');

/**
 * Update 2.4.2
 *
 * @param db
 * @param config
 * @param tools
 * @param done
 *
 * Update all forms to have the required fields.
 */
module.exports = function(db, config, tools, done) {
  var projects = db.collection('projects');
  var roles = db.collection('roles');
  var forms = db.collection('forms');
  var validRegex = /^[A-Za-z_]+[A-Za-z0-9\-._]*$/g;
  var removeRegex = /[\!\@\#\$\%\^\&\*\(\)\_\+\`\~\=\,\/\<\>\?\;\'\:\"\[\]\{\}\\\|\ ]/g;
  var invalidRegex = /(\.undefined)/g;

  // Recursively get keys of components
  var getKeys = function getKeys(component) {
    if (!component) return [];

    var components = component.components || component.columns;
    if (components) {
      return _.map(components, getKeys).concat(component.key);
    }
    else if (component.input) {
      return component.key;
    }
  };

  // Make a new, random key.
  var newKey = function() {
    return 'key' + Math.floor(Math.random() * 100000).toString();
  };

  // Update the access properties for all pre-existing projects.
  var updateProjectAccess = function(then) {
    projects.find({deleted: {$eq: null}}).snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return then(err);
      }
      if (!docs) {
        return then('No Projects found.');
      }

      var createAdminRole = function(project, callback) {
        var doc = {
          project: project._id,
          title: 'Administrator',
          description : 'The Administrator Role.',
          deleted: null,
          default: false,
          admin: true
        };

        roles.insertOne(doc, function(err, document) {
          if (err) {
            return callback(err);
          }

          console.log('Making Admin role for project: ' + project._id);
          callback(null, document.ops[0]);
        });
      };

      async.forEachOf(docs, function(project, key, next) {
        async.waterfall([
          // Get the Admin role for each project.
          function(cb) {
            roles.find({project: project._id, title: 'Administrator', deleted: {$eq: null}}).toArray(function(err, docs) {
              if (err) {
                return cb(err)
              }
              if (!docs || docs.length === 0) {
                return createAdminRole(project, cb);
                //return cb('No Admin role found for project: ' + project._id);
              }
              if (docs && docs.length > 1) {
                return cb('More than one admin role found for project: ' + project._id);
              }

              cb(null, docs[0]);
            });
          },
          // Update the access for each project.
          function(role, cb) {
            var access = [
              {type: 'create_all', roles: [role._id]},
              {type: 'read_all', roles: [role._id]},
              {type: 'update_all', roles: [role._id]},
              {type: 'delete_all', roles: [role._id]}
            ];

            projects.findOneAndUpdate(
              {_id: project._id, deleted: {$eq: null}},
              {$set: {access: access}},
              {returnOriginal: false},
              function(err) {
                if (err) {
                  return cb(err);
                }

                cb();
              }
            );
          }
        ], function(err) {
          if (err) {
            return next(err);
          }

          next();
        });
      }, function(err) {
        if (err) {
          return then(err);
        }

        then();
      });
    });
  };

  // Prune the `settings` on pre-existing projects.
  var pruneProjectSettings = function(then) {
    projects.find({settings: {$ne: null}}).snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return then(err);
      }
      if (!docs) {
        return then('No Projects found.');
      }

      async.forEachOf(docs, function(project, key, next) {
        projects.findOneAndUpdate(
          {_id: project._id},
          {$set: {settings: null}},
          {returnOriginal: false},
          function(err) {
            if (err) {
              return next(err);
            }

            next();
          }
        );
      }, function(err) {
        if (err) {
          return then(err);
        }

        then();
      });
    });
  };

  // Remove invalid keys for layout form components.
  var cleanLayoutKeys = function(iter, _id) {
    iter = iter || [];
    for (var a = 0; a < iter.length; a++) {
      var element = iter[a];

      // Remove keys for layout components.
      if (element.hasOwnProperty('input') && element.input === false) {
        if (element.hasOwnProperty('key')) {
          console.log('Clearing key of non-input field for form: ' + _id);
          delete element.key;
        }
      }

      // Traverse child component lists.
      if (element.hasOwnProperty('components')) {
        element.components = cleanLayoutKeys(element.components, _id);
      }
      if (element.hasOwnProperty('columns')) {
        element.columns = cleanLayoutKeys(element.columns, _id);
      }
    }

    return iter;
  };

  var updateForm = function(form, changes, then) {
    var updateKey = function(iter, change) {
      iter = iter || [];

      if (!change._new && !change._old && !change._done) return;
      if (change._done) return iter;

      for (var a = 0; a < iter.length; a++) {
        var element = iter[a];

        // Add the key change if this element is a input component and the keys match.
        if (element.hasOwnProperty('input') && element.input === true) {
          if (element.hasOwnProperty('key') && element.key === change._old) {
            console.log('Found old form (' + form._id + ') component key "' + change._old + '" and updating => ' + change._new);
            element.key = change._new;
            change._done = true;
            break;
          }
        }

        // Traverse child component lists.
        if (element.hasOwnProperty('components')) {
          element.components = updateKey(element.components, change);
        }
        if (element.hasOwnProperty('columns')) {
          element.columns = updateKey(element.columns, change);
        }
      }

      return iter;
    };

    // Cycle through the changes and update the keys for each change.
    changes = changes || [];
    changes.forEach(function(change) {
      if (!change._new && !change._old) return;
      form.components = updateKey(form.components, change);
    });

    // Finalize the updates to each forms component list (including forms that had layout component key changes).
    forms.findOneAndUpdate({_id: form._id}, {$set: {components: form.components}}, function(err) {
      if (err) {
        return then(err);
      }

      console.log('Updating the form components for the form: ' + form._id);
      then();
    });
  };

  var cleanFormComponentKeys = function(then) {
    // Check each given component key for validity.
    var matches = function(item, changes, uniques) {
      var _old = item;

      item = _.deburr(item);
      item = item.replace(removeRegex, '');
      var valid = item.match(validRegex);

      while (!item || !valid || item.match(invalidRegex) || (uniques.indexOf(item) !== -1)) {
        item = newKey();
        valid = item.match(validRegex);
      }

      // Store the changes for form updates.
      if (!_.isEqual(_old, item)) {
        changes.push({
          _old: _old,
          _new: item,
          _done: false
        });
      }

      uniques.push(item);
      return valid;
    };

    // Check if the given form components have valid keys.
    var isValid = function(form, changes, uniques) {
      var keys = _(form.components).map(getKeys).flatten().filter(function(key) {
        return !_.isUndefined(key);
      }).values();

      // Potential errors, because the empty key was included (potential duplicates).
      if (keys.indexOf('') !== -1 || !_.isEqual(keys, _.unique(keys))) {
        form.components = cleanLayoutKeys(form.components, form._id);

        // Update the key list after cleaning erroneous form component layout keys.
        keys = _(form.components).map(getKeys).flatten().filter(function(key) {
          return !_.isUndefined(key);
        }).values();
      }

      return keys.all(function(key) {
        return matches(key, changes, uniques);
      });
    };

    forms.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return then(err);
      }
      if (!docs) {
        return then('No forms found');
      }

      async.forEachOf(docs, function(form, key, next) {
        var changes = [];
        var uniques = [];
        if (!isValid(form, changes, uniques)) {
          return next('Form w/ _id: ' + form._id + ', is not valid.');
        }

        // Update the form with the given changes.
        updateForm(form, changes, next);
      }, function(err) {
        if (err) {
          return then(err);
        }

        then();
      });
    });
  };

  var verifyFormComponents = function(then) {
    forms.find().snapshot({$snapshot: true}).toArray(function(err, docs) {
      if (err) {
        return then(err);
      }
      if (!docs) {
        return then('No forms found');
      }

      async.forEachOfSeries(docs, function(form, key, next) {
        var _valid = _(form.components).map(getKeys).flatten().filter(function(key) {
          return !_.isUndefined(key);
        }).all(function(key) {
          if (!key) return true;
          return key.match(validRegex);
        });

        var _unique = _(form.components).map(getKeys).flatten().filter(function(key) {
          return !_.isUndefined(key);
        }).value();
        _unique = _.isEqual(_unique, _.unique(_unique));

        // Confirm that each form has only valid components.
        if (!_valid) {
          return next('Form w/ _id: ' + form._id + ', is not valid.');
        }

        // Confirm that each form has only unique components.
        if (!_unique) {
          return next('Form w/ _id: ' + form._id + ', is not unique.');
        }

        next();
      }, function(err) {
        if (err) {
          return then(err);
        }

        then();
      });
    });
  };

  async.series([
    updateProjectAccess,
    pruneProjectSettings,
    cleanFormComponentKeys,
    verifyFormComponents
  ], function(err) {
    if (err) {
      return done(err);
    }

    done();
  });
};
