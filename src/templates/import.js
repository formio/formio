'use strict';

var async = require('async');
var _ = require('lodash');
var util = require('../util/util');
var pjson = require('../../package.json');
var semver = require('semver');
var debug = {
  template: require('debug')('formio:template:template'),
  items: require('debug')('formio:template:items'),
  _install: require('debug')('formio:template:_install'),
  translateSchema: require('debug')('formio:template:translateSchema'),
  final: require('debug')('formio:template:final'),
  postResourceInstall: require('debug')('formio:template:postResourceInstall')
};

/**
 * Perform an installation of a specified template.
 *
 * @param {Object} router
 *   The express router object.
 */
module.exports = function(router) {
  let formio = router.formio;
  var hook = require('../util/hook')(formio);

  /**
   * Provide a default alter method.
   *
   * @param item
   * @param done
   * @private
   */
  var _alter = function(item, done) {
    done(null, item);
  };

  /**
   * Converts an entities role id (machineName) to bson id.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Object} entity
   *   The role object to convert.
   *
   * @returns {boolean}
   *   Whether or not the conversion was successful.
   */
  var roleMachineNameToId = function(template, entity) {
    if (!entity || !template.hasOwnProperty('roles')) {
      return false;
    }

    if (!(entity instanceof Array)) {
      if (entity.hasOwnProperty('role') && template.roles.hasOwnProperty(entity.role)) {
        entity.role = template.roles[entity.role]._id.toString();
        return true;
      }

      return false;
    }

    // Used for permissions arrays.
    _.each(entity, function(access) {
      _.each(access.roles, function(role, i) {
        if (template.roles.hasOwnProperty(role)) {
          access.roles[i] = template.roles[role]._id.toString();
        }
      });
    });

    return true;
  };

  /**
   * Converts an entities form id (machineName) to a bson id.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Object} entity
   *   The entity object to convert.
   *
   * @returns {boolean}
   *   Whether or not the conversion was successful.
   */
  var formMachineNameToId = function(template, entity) {
    if (!entity.hasOwnProperty('form')) {
      return false;
    }
    if (template.hasOwnProperty('forms') && template.forms.hasOwnProperty(entity.form)) {
      entity.form = template.forms[entity.form]._id.toString();
      return true;
    }
    if (template.hasOwnProperty('resources') && template.resources.hasOwnProperty(entity.form)) {
      entity.form = template.resources[entity.form]._id.toString();
      return true;
    }

    return false;
  };

  /**
   * Converts an entities resource id (machineName) to a bson id.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Object} entity
   *   The entity object to convert.
   *
   * @returns {boolean}
   *   Whether or not the conversion was successful.
   */
  let resourceMachineNameToId = (template, entity) => {
    // Check the template and entity for resource and resources definitions.
    if (
      !entity ||
      (
        (!entity.resouces || !template.hasOwnProperty(`resources`)) &&
        (!entity.resouce || !template.hasOwnProperty(`resource`))
      )
    ) {
      return false;
    }

    let changes = false;

    // Attempt to update resources if present.
    if (entity.resources && template.hasOwnProperty(`resources`)) {
      _.each(entity.resources, function(resource, index) {
        if (template.resources.hasOwnProperty(resource)) {
          entity.resources[index] = template.resources[resource]._id.toString();
          changes = true;
        }
      });
    }

    // Attempt to update a single resource if present.
    if (entity.resource && template.hasOwnProperty(`resource`)) {
      entity.resource = template.resources[entity.resource]._id.toString();
      changes = true;
    }

    return changes;
  };

  /**
   * Converts any resource id (machineName) references in the form components.
   *
   * @param {Object} template
   *   The project memoization of imported entities.
   * @param {Array} components
   *   The form components to scan.
   *
   * @returns {boolean}
   *   Whether or not the any changes were made.
   */
  var componentMachineNameToId = function(template, components) {
    var changed = false;
    util.eachComponent(components, function(component) {
      // Update resource machineNames for resource components.
      if ((component.type === 'resource') && resourceMachineNameToId(template, component)) {
        changed = true;
      }

      // Update resource machineNames for select components with the resource data type.
      if (
        (component.type === 'select') &&
        (component.dataSrc === 'resource') &&
        resourceMachineNameToId(template, component.data)
      ) {
        hook.alter('importComponent', template, components, component.data);
        changed = true;
      }

      // Allow importing of components.
      if (hook.alter('importComponent', template, components, component)) {
        changed = true;
      }
    });

    return changed;
  };

  /**
   * Methods to fill in all necessary ID's.
   *
   * @type {*}
   */
  var parse = {
    role: function(template, role) {
      return role;
    },
    resource: function(template, form) {
      roleMachineNameToId(template, form.submissionAccess);
      roleMachineNameToId(template, form.access);
      return form;
    },
    form: function(template, form) {
      roleMachineNameToId(template, form.submissionAccess);
      roleMachineNameToId(template, form.access);
      componentMachineNameToId(template, form.components);
      return form;
    },
    action: function(template, action) {
      formMachineNameToId(template, action);
      resourceMachineNameToId(template, action.settings);
      resourceMachineNameToId(template, action.settings);
      roleMachineNameToId(template, action.settings);
      return action;
    },
    submission: function(template, submission) {
      formMachineNameToId(template, submission);
      return submission;
    }
  };

  /**
   *
   * @param model
   * @param template
   * @param items
   * @param done
   */
  var postResourceInstall = function(model, template, items, done) {
    async.forEachOf(items, function(item, name, itemDone) {
      if (!componentMachineNameToId(template, item.components)) {
        return itemDone();
      }

      debug.postResourceInstall('Need to update resource component _ids for', name);

      model.findOneAndUpdate(
        {_id: item._id, deleted: {$eq: null}},
        {components: item.components},
        {new: true},
        function(err, doc) {
          if (err) {
            return itemDone(err);
          }
          items[name] = doc.toObject();
          debug.postResourceInstall('Updated resource component _ids for', name);
          itemDone();
        }
      );
    }, done);
  };

  /**
   * Install a model with a parse method.
   *
   * @param model
   * @param _parse
   * @param _postInstall
   * @returns {Function}
   * @private
   */
  var _install = function(model, _parse, _postInstall) {
    return function(template, items, alter, done) {
      if (!items || _.isEmpty(items)) {
        return done();
      }

      // Normalize arguments.
      if (!done) {
        done = alter;
        alter = null;
      }

      debug.items(items);
      alter = alter || _alter;
      async.forEachOfSeries(items, function(item, name, itemDone) {
        var document = _parse ? _parse(template, item) : item;
        document.machineName = name;
        alter(document, function(err, document) {
          if (err) {
            return itemDone(err);
          }

          debug._install(document);
          model.findOne({machineName: document.machineName, deleted: {$eq: null}}, function(err, doc) {
            if (err) {
              debug._install(err);
              return itemDone(err);
            }
            if (!doc) {
              debug._install('Existing not found (', document.machineName, ')');
              /* eslint-disable new-cap */
              doc = new model(document);
              /* eslint-enable new-cap */
            }
            else {
              debug._install('Existing found');
              doc = _.assign(doc, document);
              debug._install(doc);
            }

            doc.save(function(err, result) {
              if (err) {
                debug._install(err);
                return itemDone(err);
              }

              debug._install(result);
              items[name] = result.toObject();
              itemDone();
            });
          });
        });
      }, function(err) {
        if (err) {
          return done(err);
        }
        if (_postInstall) {
          return _postInstall(model, template, items, done);
        }

        done();
      });
    };
  };

  /**
   * Update a template to the latest version, using the transforms.
   *
   * @param {Object} template
   * @param {Function} done
   *
   * @returns {*}
   */
  var translateSchema = function(template, done) {
    // Skip if the template has a correct version.
    debug.translateSchema('template.version: ', template.version);
    debug.translateSchema('pjson.templateVersion: ', pjson.templateVersion);
    if (template.version && !semver.gt(pjson.templateVersion, template.version)) {
      debug.translateSchema('Skipping');
      debug.translateSchema(template);
      return done();
    }

    // Create a pick method.
    var name = function(name) {
      return function(value) {
        return value.name === name;
      };
    };

    // Fix all schemas.
    _.each(['forms', 'resources'], function(type) {
      _.each(template[type], function(form, formKey) {
        // If no auth action exists, then add a save submission action.
        var authAction = _.find(template.actions, {name: 'auth', form: formKey});
        var noSubmit = _.find(template.actions, {name: 'nosubmit', form: formKey});
        if (!authAction && !noSubmit) {
          template.actions[formKey + 'Save'] = {
            title: 'Save Submission',
            name: 'save',
            form: formKey,
            handler: ['before'],
            method: ['create', 'update'],
            priority: 10,
            settings: {}
          };
        }

        util.eachComponent(form.components, function(component) {
          if (component.validate && component.validate.custom) {
            _.each(template.resources, function(resource) {
              component.validate.custom = component.validate.custom.replace(resource.name + '.password', 'password');
            });
          }
          if (component.key && component.key.indexOf('.') !== -1) {
            component.key = component.key.split('.')[1];
          }
        });
      });
    });

    // Turn all "auth" actions into the new authentication system.
    _.each(_.pick(template.actions, name('auth')), function(authAction, key) {
      delete template.actions[key];
      var userparts = authAction.settings.username.split('.');
      if (userparts.length <= 1) {
        return;
      }

      var resource = userparts[0];
      var username = userparts[1];
      var password = authAction.settings.password.split('.')[1];

      // Add the Resource action for new associations.
      if (authAction.settings.association === 'new') {
        // Ensure that the underlying resource has a role assignment action.
        var roleAction = _.find(template.actions, {name: 'role', form: resource});
        if (!roleAction) {
          template.actions[resource + 'Role'] = {
            title: 'Role Assignment',
            name: 'role',
            'priority': 1,
            'handler': ['after'],
            'method': ['create'],
            'form': resource,
            'settings': {
              'association': 'new',
              'type': 'add',
              'role': authAction.settings.role
            }
          };
        }

        var fields = {};
        fields[username] = username;
        fields[password] = password;
        template.actions[key + 'SaveResource'] = {
          title: 'Save Submission',
          name: 'save',
          form: authAction.form,
          handler: ['before'],
          method: ['create', 'update'],
          priority: 11,
          settings: {
            resource: resource,
            fields: fields
          }
        };
      }

      // Add the login action.
      template.actions[key + 'Login'] = {
        title: 'Login',
        name: 'login',
        form: authAction.form,
        handler: ['before'],
        method: ['create'],
        priority: 2,
        settings: {
          resources: [resource],
          username: username,
          password: password
        }
      };
    });

    // Remove all nosubmit actions.
    _.each(_.pick(template.actions, name('nosubmit')), function(action, key) {
      delete template.actions[key];
    });

    // Convert resource actions into Save Submission actions with resource association.
    _.each(_.pick(template.actions, name('resource')), function(resourceAction, key) {
      delete template.actions[key];

      var roleAction = _.find(template.actions, {name: 'role', form: resourceAction.settings.resource});
      if (!roleAction) {
        template.actions[resourceAction.settings.resource + 'Role'] = {
          title: 'Role Assignment',
          name: 'role',
          'priority': 1,
          'handler': ['after'],
          'method': ['create'],
          'form': resourceAction.settings.resource,
          'settings': {
            'association': 'new',
            'type': 'add',
            'role': resourceAction.settings.role
          }
        };
      }

      template.actions[key + 'SaveResource'] = {
        title: 'Save Submission',
        name: 'save',
        form: resourceAction.form,
        handler: ['before'],
        method: ['create', 'update'],
        priority: 11,
        settings: {
          resource: resourceAction.settings.resource,
          fields: resourceAction.settings.fields
        }
      };
    });

    done();
  };

  /**
   * Import the formio template.
   *
   * Note: This is all of the core entities, not submission data.
   *
   * @param {Object} template
   *   The parsed JSON template to import.
   * @param {Object} alter
   *   A map of alter functions.
   * @param {Function} done
   *   The callback function to invoke after the import is complete.
   *
   * @returns {*}
   */
  let importTemplate = function(template, alter, done) {
    if (!done) {
      done = alter;
      alter = null;
    }
    alter = alter || {};
    if (!template) {
      return done('No template provided.');
    }

    debug.items(JSON.stringify(template));
    async.series([
      async.apply(translateSchema, template),
      async.apply(_install(formio.resources.role.model, parse.role), template, template.roles, alter.role),
      async.apply(_install(formio.resources.form.model, parse.resource, postResourceInstall), template, template.resources, alter.form),
      async.apply(_install(formio.resources.form.model, parse.form), template, template.forms, alter.form),
      async.apply(_install(formio.actions.model, parse.action), template, template.actions, alter.action),
      async.apply(_install(formio.resources.submission.model, parse.submission), template, template.submissions, alter.submission)
    ], function(err) {
      if (err) {
        debug.template(err);
        return done(err);
      }

      debug.final(JSON.stringify(template));
      done(null, template);
    });
  };
  
  return importTemplate;
};
