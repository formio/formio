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
    let includeFormFields = [];
    if (options && options.includeFormFields) {
      includeFormFields = options.includeFormFields;
    }

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
            'controller',
            'submissionRevisions',
            ...includeFormFields,
          );
          if (form.revisions) {
            _map.revisions.formsWithEnabledRevisions.push({
              machineName,
              revisionType: form.revisions,
              project: form.project
            });
          }
          _map.forms[form._id.toString()] = machineName;
        });

        // Now assign the resource components.
        _.each(forms, function(form) {
          util.eachComponent(form.components, function(component) {
            assignForm(_map, component);
            assignForm(_map, component.data);
            assignResource(_map, component);
            assignResource(_map, component.data);
            assignResource(_map, component.fetch);
            if (component && component.data && component.data.project) {
              component.data.project = 'project';
            }
            if (component && component.project) {
              component.project = 'project';
            }

            if (component.hasOwnProperty('form') && component.revision) {
              _map.revisions.revisionsData.push(component);
            }
            // Allow hooks to alter fields.
            hook.alter('exportComponent', component);
          });
        });
        next();
      });
  };

  // Export reports.
  const exportReports = function(_export, _map, options, next) {
    const reportingConfigurationFormId = _.findKey(_map.forms, name => name === 'reportingui');

    if (!reportingConfigurationFormId) {
      return next();
    }

    formio.resources.submission.model
      .find(hook.alter('submissionQuery', {form: reportingConfigurationFormId, deleted: {$eq: null}}, options))
      .lean(true)
      .exec(function(err, reports) {
        if (err) {
          return next(err);
        }

        _.each(reports, report =>  {
          if (!report || !report.data) {
            return;
          }
          const formattedReport = _.pick(report, 'data');
          const reportFormsPath = 'data.forms';
          const reportForms = _.get(formattedReport, reportFormsPath, []);
          const assignedForms = {};

          _.each(reportForms, formId => {
            const formName = _map.forms[formId];
            assignedForms[`${formName || formId}`] = formId;
          });

          _.set(formattedReport, reportFormsPath, assignedForms);
          _export.reports[_.get(formattedReport, 'data.name', '')] = formattedReport;
        });

        next();
      });
  };

  const exportRevisions = function(_export, _map, options, next) {
    if (_map.revisions.revisionsData.length > 0) {
      let includeFormFields = [];
      if (options && options.includeFormFields) {
        includeFormFields = options.includeFormFields;
      }
      const revisionsArray = [];
      _.each(_map.revisions.revisionsData, (revision) => {
        if (revision.revision.length === 24) {
          revisionsArray.push({
            _id: formio.util.idToBson(revision.revision)
          });
        }
        else {
          if (_map.revisions.formsWithEnabledRevisions.length > 0) {
            const form = _map.revisions.formsWithEnabledRevisions.find((form) => form.machineName === revision.form);
            if (form) {
              revisionsArray.push({
                project: form.project,
                name: revision.form,
                _vid: parseInt(revision.revision, 10)
              });
            }
          }
        }
      });
      if (revisionsArray.length > 0) {
        const query = {
          deleted: {$eq: null},
          $or: revisionsArray
        };
        return hook.alter('formRevisionModel').find(query)
          .lean(true)
          .exec((err, revisions) => {
            if (err) {
              return next(err);
            }
            if (
              revisions && revisions.length > 0
              && _map.revisions.revisionsData.length > 0
              && _map.revisions.formsWithEnabledRevisions.length > 0
            ) {
              revisions.forEach(revision => {
                const component = _map.revisions.revisionsData.find(component => component.form === revision.name);
                if (component) {
                  const componentRevision = component.revision;
                  assignRoles(_map, revision.access);
                  assignRoles(_map, revision.submissionAccess);
                  const machineName = revision.name;
                  _export.revisions[`${machineName}:${componentRevision}`] = _.pick(revision,
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
                    'controller',
                    'submissionRevisions',
                    '_vid',
                    ...includeFormFields
                  );
                  const form = _map.revisions.formsWithEnabledRevisions
                    .find((form) => form.machineName === revision.name);
                  if (form) {
                    _export[`${revision.type}s`][machineName].revisions = form.revisionType;
                  }
                }
              });
            }
            return next();
          });
      }
      return next();
    }
    else {
      return next();
    }
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
    const basicTemplate = {
      title: 'Export',
      version: '2.0.0',
      description: '',
      name: 'export',
      roles: {},
      forms: {},
      actions: {},
      resources: {},
      revisions: {},
    };

    if (hook.alter('includeReports')) {
      basicTemplate.reports = {};
    }

    const template = hook.alter(
      'defaultTemplate',
      Object.assign(basicTemplate, _.pick(options, ['title', 'version', 'description', 'name'])),
      options
    );

    // Memoize resource mapping.
    const map = {
      roles: {},
      forms: {},
      revisions: {
        revisionsData: [],
        formsWithEnabledRevisions: []
      }
    };

    // Export the roles forms and actions.
    async.series(hook.alter(`templateExportSteps`, [
      async.apply(exportRoles, template, map, options),
      async.apply(exportForms, template, map, options),
      async.apply(exportActions, template, map, options),
      async.apply(exportRevisions, template, map, options),
      async.apply(exportReports, template, map, options),
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
      if (options) {
        options.includeFormFields = (req.query.include && req.query.include.split(',').filter((field) => !!field));
      }

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
