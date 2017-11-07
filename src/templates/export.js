'use strict';

let async = require('async');
let _ = require('lodash');
let util = require('../util/util');

/**
 * Perform an export of a specified template.
 *
 * @param {Object} router
 *   The express router object.
 */
module.exports = (router) => {
  let formio = router.formio;
  let hook = require('../util/hook')(formio);

  // Assign the role ids.
  var assignRoles = function(_map, perms) {
    _.each(perms, function(access) {
      _.each(access.roles, function(roleId, i) {
        roleId = roleId.toString();
        if (_map.roles && _map.roles.hasOwnProperty(roleId)) {
          access.roles[i] = _map.roles[roleId];
        }
      });
    });
  };

  // Assign the role to an entity.
  var assignRole = function(_map, entity) {
    if (!entity) {
      return;
    }
    if (entity.hasOwnProperty('role') && _map.roles && _map.roles.hasOwnProperty(entity.role)) {
      entity.role = _map.roles[entity.role];
    }
  };

  // Assign the resources.
  var assignResources = function(_map, entity) {
    if (!entity || !entity.resources) {
      return;
    }
    _.each(entity.resources, function(resource, index) {
      if (_map.forms && _map.forms.hasOwnProperty(resource)) {
        entity.resources[index] = _map.forms[resource];
      }
    });
  };

  // Assign the resource of an entity.
  var assignResource = function(_map, entity) {
    if (!entity || !entity.resource) {
      return;
    }
    if (_map.forms && _map.forms.hasOwnProperty(entity.resource)) {
      entity.resource = _map.forms[entity.resource];
    }
  };

  // Assign form.
  var assignForm = function(_map, entity) {
    if (!entity) {
      return;
    }
    if (entity.hasOwnProperty('form')) {
      if (_map.forms && _map.forms.hasOwnProperty(entity.form)) {
        entity.form = _map.forms[entity.form];
      }
    }
  };

  // Export actions.
  var exportActions = function(_export, _map, options, next) {
    formio.actions.model.find({
        form: {$in: _.keys(_map.forms)},
        deleted: {$eq: null}
      })
      .lean(true)
      .exec(function(err, actions) {
        if (err) {
          return next(err);
        }
        _.each(actions, function(action, index) {
          assignForm(_map, action);
          assignRole(_map, action.settings);
          assignResource(_map, action.settings);
          assignResources(_map, action.settings);
          var machineName = action.machineName = hook.alter('machineNameExport', action.machineName);
          _export.actions[machineName] = _.pick(action,
            'title',
            'name',
            'form',
            'condition',
            'settings',
            'priority',
            'method',
            'handler'
          );
        });
        next();
      });
  };

  // Export forms.
  var exportForms = function(_export, _map, options, next) {
    formio.resources.form.model
      .find(hook.alter('formQuery', {deleted: {$eq: null}}, options))
      .lean(true)
      .exec(function(err, forms) {
        if (err) {
          return next(err);
        }
        _.each(forms, function(form) {
          assignRoles(_map, form.access);
          assignRoles(_map, form.submissionAccess);
          var machineName = form.machineName = hook.alter('machineNameExport', form.machineName);
          _export[form.type + 's'][machineName] = _.pick(form,
            'title',
            'type',
            'name',
            'path',
            'display',
            'action',
            'tags',
            'settings',
            'components',
            'access',
            'submissionAccess'
          );
          _map.forms[form._id.toString()] = machineName;
        });

        // Now assign the resource components.
        _.each(forms, function(form) {
          util.eachComponent(form.components, function(component) {
            assignForm(_map, component);
            assignForm(_map, component.data);
            assignResource(_map, component);
            assignResource(_map, component.data);
            if (component && component.data && component.data.project) {
              component.data.project = 'project';
            }
            if (component && component.project) {
              component.project = 'project';
            }

            // Allow hooks to alter fields.
            hook.alter('exportComponent', component);
          });
        });
        next();
      });
  };

  // Export the roles.
  var exportRoles = function(_export, _map, options, next) {
    formio.resources.role.model
      .find(hook.alter('roleQuery', {deleted: {$eq: null}}, options))
      .lean(true)
      .exec(function(err, roles) {
        if (err) {
          return next(err);
        }
        _.each(roles, function(role) {
          var machineName = role.machineName = hook.alter('machineNameExport', role.machineName);
          _export.roles[machineName] = _.pick(role,
            'title',
            'description',
            'admin',
            'default'
          );
          _map.roles[role._id.toString()] = machineName;
        });

        next();
      });
  };

  /**
   * Export the formio template.
   *
   * Note: This is all of the core entities, not submission data.
   */
  let exportTemplate = (options, next) => {
    let template = hook.alter('defaultTemplate', Object.assign({
      title: 'Export',
      version: '2.0.0',
      description: '',
      name: 'export',
      roles: {},
      forms: {},
      actions: {},
      resources: {}
    }, _.pick(options, ['title', 'version', 'description', 'name'])), options);

    // Memoize resource mapping.
    let map = {
      roles: {},
      forms: {}
    };

    // Export the roles forms and actions.
    async.series(hook.alter(`templateExportSteps`, [
      async.apply(exportRoles, template, map, options),
      async.apply(exportForms, template, map, options),
      async.apply(exportActions, template, map, options)
    ], template, map, options), (err) => {
      if (err) {
        return next(err);
      }

      // Send the export.
      return next(null, template);
    });
  };

  // Add the export endpoint
  if (router.get) {
    router.get('/export', (req, res, next) => {
      let options = hook.alter('exportOptions', {}, req, res);
      exportTemplate(options, (err, data) => {
        if (err) {
          return next(err.message || err);
        }

        res.attachment(`${options.name}-${options.version}.json`);
        res.end(JSON.stringify(data));
      });
    });
  }

  return exportTemplate;
};
