'use strict';

var async = require('async');
var _ = require('lodash');
var util = require('../util/util');

/**
 * Perform an export of a specified template.
 *
 * @param formio
 *   The formio object.
 */
module.exports = function(formio) {
  var hook = require('../util/hook')(formio);

  // Assign the role ids.
  var assignRoles = function(_map, perms) {
    _.each(perms, function(access) {
      _.each(access.roles, function(roleId, i) {
        roleId = roleId.toString();
        if (_map.roles.hasOwnProperty(roleId)) {
          access.roles[i] = _map.roles[roleId];
        }
      });
    });
  };

  // Assign the role to an entity.
  var assignRole = function(_map, entity) {
    if (entity.hasOwnProperty('role') && _map.roles.hasOwnProperty(entity.role)) {
      entity.role = _map.roles[entity.role];
    }
  };

  // Assign form.
  var assignForm = function(_map, entity) {
    if (entity.hasOwnProperty('form')) {
      if (_map.forms.hasOwnProperty(entity.form)) {
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
          var machineName = action.machineName = hook.alter('machineNameExport', action.machineName);
          _export.actions[machineName] = _.pick(action,
            'title',
            'name',
            'form',
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
            'components',
            'access',
            'submissionAccess'
          );
          _map.forms[form._id.toString()] = machineName;
        });

        // Now assign the resource components.
        _.each(forms, function(form) {
          util.eachComponent(form.components, function(component) {
            if (
              (component.type === 'resource') &&
              (_map.forms.hasOwnProperty(component.resource))
            ) {
              component.resource = _map.forms[component.resource];
            }
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
   * Return an easy way for someone to install a template.
   */
  return {
    export: function(options, next) {
      var _export = {
        title: options.title ? options.title : 'Export',
        description: options.description ? options.description : '',
        name: options.name ? options.name : 'export',
        plan: options.plan ? options.plan : 'community',
        roles: {},
        forms: {},
        actions: {},
        resources: {}
      };

      // Keep track of a resource mapping.
      var _map = {
        roles: {},
        forms: {}
      };

      // Export the roles forms and actions.
      async.series([
        async.apply(exportRoles, _export, _map, options),
        async.apply(exportForms, _export, _map, options),
        async.apply(exportActions, _export, _map, options)
      ], function(err) {
        if (err) {
          return next(err);
        }

        // Send the export.
        return next(null, _export);
      });
    }
  };
};
