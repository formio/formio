'use strict';

const async = require('async');
const _ = require('lodash');
const util = require('../util/util');
const EVERYONE = '000000000000000000000000';

/**
 * Perform an export of a specified template.
 *
 * @param {Object} router
 *   The express router object.
 */
module.exports = (router) => {
  const formio = router.formio;
  const hook = require('../util/hook')(formio);

  // Assign the role ids.
  const assignRoles = function(_map, perms) {
    _.each(perms, function(access) {
      _.each(access.roles, function(roleId, i) {
        roleId = roleId.toString();
        if (roleId === EVERYONE) {
          access.roles[i] = 'everyone';
        }
        else if (_map.roles && _map.roles.hasOwnProperty(roleId)) {
          access.roles[i] = _map.roles[roleId];
        }
      });
    });
  };

  // Assign the role to an entity.
  const assignRole = function(_map, entity) {
    if (!entity) {
      return;
    }

    if (entity.hasOwnProperty('role')) {
      if (entity.role.toString() === EVERYONE) {
        entity.role = 'everyone';
      }
      else if (_map.roles && _map.roles.hasOwnProperty(entity.role)) {
        entity.role = _map.roles[entity.role];
      }
    }
  };

  // Assign the resources.
  const assignResources = function(_map, entity) {
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
  const assignResource = function(_map, entity) {
    if (!entity || !entity.resource) {
      return;
    }
    if (_map.forms && _map.forms.hasOwnProperty(entity.resource)) {
      entity.resource = _map.forms[entity.resource];
    }
  };

  // Assign form.
  const assignForm = function(_map, entity) {
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
  const exportActions = function(_export, _map, options, next) {
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
          const machineName = action.machineName = hook.alter('machineNameExport', action.machineName);
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
  const exportForms = function(_export, _map, options, next) {
    formio.resources.form.model
      .find(hook.alter('formQuery', {deleted: {$eq: null}}, options))
      .lean(true)
      .exec(function(err, forms) {
        if (err) {
          return next(err);
        }
        _.each(forms, function(form) {
          if (!form || !form._id) {
            return;
          }
          assignRoles(_map, form.access);
          assignRoles(_map, form.submissionAccess);
          const machineName = form.machineName = hook.alter('machineNameExport', form.machineName);
          _export[`${form.type}s`][machineName] = _.pick(form,
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
            'submissionAccess',
            'properties',
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
  const exportRoles = function(_export, _map, options, next) {
    formio.resources.role.model
      .find(hook.alter('roleQuery', {deleted: {$eq: null}}, options))
      .lean(true)
      .exec(function(err, roles) {
        if (err) {
          return next(err);
        }
        _.each(roles, function(role) {
          if (!role || !role._id) {
            return;
          }
          const machineName = role.machineName = hook.alter('machineNameExport', role.machineName);
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
  const exportTemplate = (options, next) => {
    const template = hook.alter('defaultTemplate', Object.assign({
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
    const map = {
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
      const options = hook.alter('exportOptions', {}, req, res);
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
