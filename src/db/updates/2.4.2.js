'use strict';

let _ = require('lodash');

/**
 * Update 2.4.2
 *
 * @param db
 * @param config
 * @param tools
 *
 * Update all forms to have the required fields.
 */
module.exports = function(db, config, tools) {
  let projects = db.collection('projects');
  let roles = db.collection('roles');
  let forms = db.collection('forms');
  let validRegex = /^[A-Za-z_]+[A-Za-z0-9\-._]*$/g;
  let removeRegex = /[\!\@\#\$\%\^\&\*\(\)\_\+\`\~\=\,\/\<\>\?\;\'\:\"\[\]\{\}\\\|\ ]/g;
  let invalidRegex = /(\.undefined)/g;

  // Recursively get keys of components
  const getKeys = function getKeys(component) {
    if (!component) return [];

    let components = component.components || component.columns;
    if (components) {
      return _.map(components, getKeys).concat(component.key);
    } else if (component.input) {
      return component.key;
    }
  };

  // Make a new, random key.
  const newKey = function() {
    return 'key' + Math.floor(Math.random() * 100000).toString();
  };

  // Update the access properties for all pre-existing projects.
  const updateProjectAccess = () => {
    return projects.find({ deleted: { $eq: null } }).toArray()
      .then((docs) => {
        if (!docs) {
          throw new Error('No Projects found.');
        }

        const updatePromises = docs.map((project) => {
          return roles.find({ project: project._id, title: 'Administrator', deleted: { $eq: null } }).toArray()
            .then((rolesResult) => {
              let role;

              if (!rolesResult || rolesResult.length === 0) {
                const doc = {
                  project: project._id,
                  title: 'Administrator',
                  description: 'The Administrator Role.',
                  deleted: null,
                  default: false,
                  admin: true,
                };
                return roles.insertOne(doc)
                  .then((insertionResult) => {
                    if (!insertionResult.acknowledged || !insertionResult.insertedId) {
                      throw new Error('Failed to create Admin role for project: ' + project._id);
                    }
                    return roles.findOne({ _id: insertionResult.insertedId });
                  })
                  .then((newRole) => {
                    role = newRole;
                  });
              } else {
                if (rolesResult.length > 1) {
                  throw new Error('More than one admin role found for project: ' + project._id);
                }
                role = rolesResult[0];
              }

              const access = [
                { type: 'create_all', roles: [role._id] },
                { type: 'read_all', roles: [role._id] },
                { type: 'update_all', roles: [role._id] },
                { type: 'delete_all', roles: [role._id] },
              ];

              return projects.updateOne({ _id: project._id, deleted: { $eq: null } }, { $set: { access: access } });
            });
        });

        return Promise.all(updatePromises);
      });
  };

  // Prune the `settings` on pre-existing projects.
  const pruneProjectSettings = () => {
    return projects.find({ settings: { $ne: null } }).toArray()
      .then((docs) => {
        const updatePromises = docs.map((project) => {
          return projects.updateOne({ _id: project._id }, { $set: { settings: null } });
        });

        return Promise.all(updatePromises);
      });
  };

  // Remove invalid keys for layout form components.
  const cleanLayoutKeys = function(iter, _id) {
    iter = iter || [];
    for (let a = 0; a < iter.length; a++) {
      let element = iter[a];

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

  // Main process to clean form component keys
  const cleanFormComponentKeys = () => {
    return forms.find().toArray()
      .then((docs) => {
        if (!docs) {
          throw new Error('No forms found');
        }

        const updatePromises = docs.map((form) => {
          let changes = [];
          let uniques = [];

          const matches = function(item) {
            let _old = item;

            item = _.deburr(item);
            item = item.replace(removeRegex, '');
            let valid = item.match(validRegex);

            while (!item || !valid || item.match(invalidRegex) || uniques.indexOf(item) !== -1) {
              item = newKey();
              valid = item.match(validRegex);
            }

            if (!_.isEqual(_old, item)) {
              changes.push({
                _old: _old,
                _new: item,
                _done: false,
              });
            }

            uniques.push(item);
            return valid;
          };

          const keys = _(form.components).map(getKeys).flatten().filter((key) => !_.isUndefined(key)).value();
          if (keys.indexOf('') !== -1 || !_.isEqual(keys, _.uniq(keys))) {
            form.components = cleanLayoutKeys(form.components, form._id);
          }

          keys.forEach(matches);

          return forms.updateOne({ _id: form._id }, { $set: { components: form.components } });
        });

        return Promise.all(updatePromises);
      });
  };

  const verifyFormComponents = () => {
    return forms.find().toArray()
      .then((docs) => {
        if (!docs) {
          throw new Error('No forms found');
        }

        docs.forEach((form) => {
          let _valid = _(form.components).map(getKeys).flatten().filter((key) => !_.isUndefined(key)).every((key) => {
            if (!key) return true;
            return key.match(validRegex);
          });

          let _unique = _(form.components).map(getKeys).flatten().filter((key) => !_.isUndefined(key)).value();
          _unique = _.isEqual(_unique, _.uniq(_unique));

          if (!_valid) {
            throw new Error('Form w/ _id: ' + form._id + ', is not valid.');
          }

          if (!_unique) {
            throw new Error('Form w/ _id: ' + form._id + ', is not unique.');
          }
        });
      });
  };

  // Execute the entire update sequence
  return updateProjectAccess()
    .then(() => pruneProjectSettings())
    .then(() => cleanFormComponentKeys())
    .then(() => verifyFormComponents())
    .then(() => {
      console.log('Update completed successfully.');
    })
    .catch((err) => {
      console.error('Update failed:', err);
    });
};
