'use strict';

let assert = require('assert');
let _ = require('lodash');
const { Utils } = require('@formio/core/utils');
const formioUtils = Utils;
var docker = process.env.DOCKER;
const ignoredFormProps = ['revisions', 'submissionRevisions', 'esign'];

module.exports = (app, template, hook) => {
  describe('Template Imports', function() {
    if (docker) {
      return;
    }

    let formio = hook.alter('formio', app.formio);
    let importer = formio.template;

    /**
     * Util function to get the resource name, given an id.
     *
     * @param project
     * @param id
     * @returns {*}
     */
    let getResourceFromId = (project, id) => {
      project = project || {};
      project.forms = project.forms || {};
      project.resources = project.resources || {};

      let resourceName;
      if (project.forms[id]) {
        resourceName = project.forms[id].machineName;
      }
      else if (project.resources[id]) {
        resourceName = project.resources[id].machineName;
      }
      else if (project.roles[id]) {
        resourceName = project.roles[id].machineName
      }

      return resourceName;
    };

    /**
     * Util function to compare the input template with the current resources in mongo.
     *
     * @param project
     * @param input
     * @param done
     */
    let checkTemplateRoles = (project, input, done) => {
      input = input || {};

      formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
        assert.equal(roles.length, Object.keys(input).length);

        // If the input is empty, skip remaining checks.
        if (Object.keys(input).length === 0) {
          return done();
        }

        // Check that the template data doesnt contain any _id's or machineNames
        Object.keys(input).forEach(machineName => {
          let role = input[machineName];

          assert.equal(role.hasOwnProperty('_id'), false);
          assert.equal(role.hasOwnProperty('machineName'), false);
        });

        let given = {};

        // Memoize the roles.
        project.roles = {};
        roles.forEach(role => {
          role = role.toObject();

          // Check that each role in mongo has an _id and a machineName.
          assert.equal(role.hasOwnProperty('_id'), true);
          assert.equal(role.hasOwnProperty('machineName'), true);

          // Prepare the stored roles for comparison.
          let machineName = role.machineName;
          given[machineName] = _.omit(role, ['_id', '__v', 'created', 'deleted', 'modified', 'machineName']);

          project.roles[machineName] = project.roles[role._id] = role;
        });

        assert.deepEqual(hook.alter('templateRoles', given), input);
        done();
      })
      .catch(done);
    };

    /**
     * Util function to compare the input template with the current resources in mongo.
     *
     * @param project
     * @param type
     * @param input
     * @param done
     */
    let checkTemplateFormsAndResources = (project, type, input, done) => {
      input = input || {};

      formio.resources.form.model.find({type, deleted: {$eq: null}}).then(forms => {
        assert.equal(forms.length, Object.keys(input).length);

        if (Object.keys(input).length === 0) {
          return done()
        }

        // Check that the template data doesnt contain any _id's or machineNames
        Object.keys(input).forEach(machineName => {
          let form = input[machineName];

          assert.equal(form.hasOwnProperty('_id'), false);
          assert.equal(form.hasOwnProperty('machineName'), false);
        });

        let given = {};

        // Memoize the forms.
        project[`${type}s`] = {};
        forms.forEach(form => {
          form = form.toObject();

          // Check that each form in mongo has an _id and machineName.
          assert.equal(form.hasOwnProperty('_id'), true);
          assert.equal(form.hasOwnProperty('machineName'), true);

          let machineName = form.machineName;
          let tempForm = _.omit(form, ['_id', '__v', 'created', 'deleted', 'modified', 'machineName', 'owner', '_vid', ...ignoredFormProps]);

          tempForm.access = tempForm.access.map(access => {
            access.roles = access.roles.map(role => {
              return project.roles[role.toString()].machineName;
            });

            return access;
          });

          tempForm.submissionAccess = tempForm.submissionAccess.map(access => {
            access.roles = access.roles.map(role => {
              return project.roles[role.toString()].machineName;
            });

            return access;
          });
          given[machineName] = tempForm;

          project[`${type}s`][form.machineName] = project[`${type}s`][form._id] = form;
        });

        // Reassign the resources after the forms have been memoized.
        Object.keys(given).forEach(machineName => {
          let tempForm = given[machineName];
          // Convert all resources to point to the resource name;
          formioUtils.eachComponent(tempForm.components, (component) => {
            hook.alter('exportComponent', component);
            if (component.hasOwnProperty('resource') && project.resources && project.resources.hasOwnProperty(component.resource)) {
              component.resource = project.resources[component.resource].name;
            }
          }, true);
          given[machineName] = tempForm;
        });
        assert.deepEqual(hook.alter('templateFormsAndResources', given), input);
        done();
      })
      .catch(done);
    };

    /**
     * Util function to compare the input template with the current resources in mongo.
     *
     * @param project
     * @param input
     * @param done
     */
    let checkTemplateActions = (project, input, done) => {
      input = input || {};

      formio.actions.model.find({deleted: {$eq: null}}).then(actions => {
        assert.equal(actions.length, Object.keys(input).length);

        if (Object.keys(input).length === 0) {
          return done()
        }

        // Check that the template data doesnt contain any _id's or machineNames
        Object.keys(input).forEach(machineName => {
          let action = input[machineName];

          assert.equal(action.hasOwnProperty('_id'), false);
          assert.equal(action.hasOwnProperty('machineName'), false);
        });

        let given = {};

        // Memoize the forms.
        project.actions = {};
        actions.forEach(action => {
          action = action.toObject();

          // Check that each action in mongo has an _id and machineName.
          assert.equal(action.hasOwnProperty('_id'), true);
          assert.equal(action.hasOwnProperty('machineName'), true);

          // Prepare the stored actions for comparison.
          let machineName = action.machineName;
          let tempAction = _.omit(action, ['_id', '__v', 'created', 'deleted', 'modified', 'machineName']);
          tempAction.form = getResourceFromId(project, tempAction.form);
          if (_.has(tempAction, 'settings.resource')) {
            tempAction.settings.resource = getResourceFromId(project, tempAction.settings.resource);
          }
          if (_.has(tempAction, 'settings.resources')) {
            tempAction.settings.resources = tempAction.settings.resources.map(resource => {
              return getResourceFromId(project, resource);
            });
          }
          if (_.has(tempAction, 'settings.role')) {
            tempAction.settings.role = project.roles[tempAction.settings.role].machineName;
          }
          given[machineName] = tempAction;

          project.actions[machineName] = project.actions[action._id] = action;
        });

        assert.deepEqual(hook.alter('templateActions', given), input);
        done();
      })
      .catch(done);
    };

    let alters = hook.alter(`templateAlters`, {});
    const reportsEnabled = hook.alter('includeReports');

    describe('Default Template', function() {
      let testTemplate =  _.cloneDeep(require('../src/templates/default.json'));
      testTemplate.revisions = {};
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should export all its roles', function(done) {
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should export all of its forms', function(done) {
          assert.notDeepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all of its resources', function(done) {
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should export all of its actions', function(done) {
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('cyclicalResources Template', function() {
      let testTemplate = require('./fixtures/templates/cyclicalResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all of its resources', function(done) {
          assert.notDeepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('waterfallResources Template', function() {
      let testTemplate = require('./fixtures/templates/waterfallResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all of its resources', function(done) {
          assert.notDeepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('waterfallResourcesReverse Template', function() {
      let testTemplate = require('./fixtures/templates/waterfallResourcesReverse.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
         const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all of its resources', function(done) {
          assert.notDeepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('unknownResources Template', function() {
      let testTemplate = require('./fixtures/templates/unknownResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all of its resources', function(done) {
          assert.notDeepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('unknownFormResources Template', function() {
      let testTemplate = require('./fixtures/templates/unknownFormResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should export all of its forms', function(done) {
          assert.notDeepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('waterfallFormResources Template', function() {
      let testTemplate = require('./fixtures/templates/waterfallFormResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.notDeepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.notDeepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('waterfallFormResourcesReverse Template', function() {
      let testTemplate = require('./fixtures/templates/waterfallFormResourcesReverse.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should export all of its forms', function(done) {
          assert.notDeepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all of its resources', function(done) {
          assert.notDeepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('emptyResources Template', function() {
      let testTemplate = require('./fixtures/templates/emptyResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should export all of its forms', function(done) {
          assert.notDeepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('selfReferencingResources Template', function() {
      let testTemplate = require('./fixtures/templates/selfReferencingResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all of its resources', function(done) {
          assert.notDeepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('unknownActionResources Template', function() {
      let testTemplate = require('./fixtures/templates/unknownActionResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('Actions with invalid forms and resources should not be imported', function(done) {
          checkTemplateActions(project, {}, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any malformed actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');

          // Update the test template to not contain any of the malformed actions.
          testTemplate.actions = {};
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }

          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('emptyActionResources Template', function() {
      let testTemplate = require('./fixtures/templates/emptyActionResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('Actions with invalid forms and resources should not be imported', function(done) {
          checkTemplateActions(project, {}, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should export all its roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any malformed actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');

          // Update the test template to not contain any of the malformed actions.
          testTemplate.actions = {};
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }

          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingResourceAction', function() {
      let testTemplate = require('./fixtures/templates/missingResourceAction.json');
      let _template = _.cloneDeep(testTemplate);

      const checkMissingResourceActions = (actionsObject) => {
        Object.values(actionsObject).forEach((action) => {
          assert(action.settings && !action.settings.resource, 'Save to resource should be clear');
        });
      };

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('Save submission to resource should be empty', function(done) {
          formio.actions.model.find({deleted: {$eq: null}}).then((actions) => {
            checkMissingResourceActions(actions);
            done();
          });
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should export all forms', function(done) {
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should export all resources', function(done) {
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should export all actions without mapped resource', () => {
          checkMissingResourceActions(exportData.actions);
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('unknownRoleResources Template', function() {
      let testTemplate = require('./fixtures/templates/unknownRoleResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported with the defined roles only', function(done) {
          testTemplate.forms.foo.access[0].roles = [];
          testTemplate.forms.foo.submissionAccess[0].roles = [];

          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should export all its roles', function(done) {
          assert.notDeepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should export its forms without bad roles', function(done) {
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingRoleResources Template', function() {
      let testTemplate = require('./fixtures/templates/missingRoleResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('No roles should be imported', function(done) {
          assert.deepEqual(testTemplate.roles, undefined);
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should export an empty list of roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.deepEqual(exportData.roles, {});
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'roles', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'roles']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingResourceResources Template', function() {
      let testTemplate = require('./fixtures/templates/missingResourceResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('No resources should be imported', function(done) {
          assert.deepEqual(testTemplate.resources, undefined);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.deepEqual(exportData.resources, {});
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'resources', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'resources']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingFormResources Template', function() {
      let testTemplate = require('./fixtures/templates/missingFormResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('No forms should be imported', function(done) {
          assert.deepEqual(testTemplate.forms, undefined);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.deepEqual(exportData.forms, {});
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'forms', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'forms']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingActionResources Template', function() {
      let testTemplate = require('./fixtures/templates/missingActionResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('No actions should be imported', function(done) {
          assert.deepEqual(testTemplate.actions, undefined);
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.deepEqual(exportData.actions, {});
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'actions', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'actions']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingTitle Template', function() {
      let testTemplate = require('./fixtures/templates/missingTitle.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.deepEqual(exportData.title, 'Export');
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'title', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'title']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingName Template', function() {
      let testTemplate = require('./fixtures/templates/missingName.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'name', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'name']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingDescription Template', function() {
      let testTemplate = require('./fixtures/templates/missingDescription.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'description', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'description']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('missingVersion Template', function() {
      let testTemplate = require('./fixtures/templates/missingVersion.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('extraData Template', function() {
      let testTemplate = require('./fixtures/templates/extraData.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('The template should not export any additional information', function() {
          assert.deepEqual(exportData.foo, undefined);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'foo', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'foo']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('malformedRoles Template', function() {
      let testTemplate = require('./fixtures/templates/malformedRoles.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          assert.notDeepEqual(testTemplate.roles, {});
          checkTemplateRoles(project, {}, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any malformed roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'roles', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'roles']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('malformedResources Template', function() {
      let testTemplate = require('./fixtures/templates/malformedResources.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          assert.notDeepEqual(testTemplate.resources, {});
          checkTemplateFormsAndResources(project, 'resource', {}, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any malformed roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'resources', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'resources']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('malformedForms Template', function() {
      let testTemplate = require('./fixtures/templates/malformedForms.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          assert.notDeepEqual(testTemplate.forms, {});
          checkTemplateFormsAndResources(project, 'form', {}, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, testTemplate.actions, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any malformed roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          assert.deepEqual(exportData.forms, {});
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'forms', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'forms']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('malformedActions Template', function() {
      let testTemplate = require('./fixtures/templates/malformedActions.json');
      let _template = _.cloneDeep(testTemplate);

      describe('Import', function() {
        let project = {title: 'Export', name: 'export'};

        it('Should be able to bootstrap the template', async function() {
          await importer.import.template(_template, alters);
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, testTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.forms);
          checkTemplateFormsAndResources(project, 'form', testTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          hook.alter('templateImportComponent', testTemplate.resources);
          checkTemplateFormsAndResources(project, 'resource', testTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          assert.notDeepEqual(testTemplate.actions, {});
          checkTemplateActions(project, {}, done);
        });
      });

      describe('Export', function() {
        let project = {};
        let exportData = {};

        it('Should be able to export project data', async function() {
          const data = await importer.export(_template);
          exportData = data;
          exportData.forms = _.mapValues(exportData.forms, (form) => _.omit(form, ignoredFormProps));
          exportData.resources = _.mapValues(exportData.resources, (resource) => _.omit(resource, ignoredFormProps));
        });

        it('An export should contain the export title', function() {
          assert.equal(
            hook.alter('exportTitle', 'Export', exportData),
            'Export'
          );
        });

        it('An export should contain the current export version', function() {
          assert.equal(
            exportData.version,
            '2.0.0'
          );
        });

        it('An export should contain the description', function() {
          assert.equal(
            hook.alter('exportDescription', '', exportData),
            ''
          );
        });

        it('An export should contain the export name', function() {
          assert.equal(
            hook.alter('exportName', 'export', exportData),
            'export'
          );
        });

        it('An export should contain the export plan', function() {
          assert.equal(
            hook.alter('exportPlan', 'community', exportData),
            'community'
          );
        });

        it('The template should not export any malformed roles', function(done) {
          assert.deepEqual(exportData.roles, {});
          checkTemplateRoles(project, exportData.roles, done);
        });

        it('The template should not export any forms', function(done) {
          checkTemplateFormsAndResources(project, 'form', exportData.forms, done);
        });

        it('The template should not export any resources', function(done) {
          assert.deepEqual(exportData.resources, {});
          checkTemplateFormsAndResources(project, 'resource', exportData.resources, done);
        });

        it('The template should not export any actions', function(done) {
          assert.deepEqual(exportData.actions, {});
          hook.alter('templateActionExport', exportData.actions);
          checkTemplateActions(project, exportData.actions, done);
        });

        it('An export should match an import', function() {
          assert.equal(exportData.version, '2.0.0');
          if (reportsEnabled) {
            assert.deepEqual(exportData.reports, {});
          }
          assert.deepEqual(_.omit(exportData, ['version', 'tag', 'access', 'actions', 'reports']), _.omit(testTemplate, ['version', 'tag', 'access', 'actions']));
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('Everyone Roles Template', function() {
      let testTemplate = require('./fixtures/templates/everyoneRoles.json');
      let _template = _.cloneDeep(testTemplate);
      const EVERYONE = '000000000000000000000000';

      it('Should translate all "everyone" roles into 000000000000000000000000', async function() {
          await importer.import.template(_template, alters);
          assert.equal(_template.resources.a.submissionAccess[0].roles[0].toString(), _template.roles.anonymous._id.toString());
          assert.equal(_template.resources.a.submissionAccess[0].roles[1].toString(), EVERYONE);
          assert.equal(_template.resources.a.submissionAccess[1].roles[0].toString(), EVERYONE);
          assert.equal(_template.resources.b.access[0].roles[0].toString(), _template.roles.authenticated._id.toString());
          assert.equal(_template.resources.b.access[0].roles[1].toString(), _template.roles.anonymous._id.toString());
          assert.equal(_template.resources.b.access[1].roles[0].toString(), EVERYONE);
      });

      it('Should convert ObjectID(000000000000000000000000) to "everyone"', async function() {
        const data = await importer.export(_template);
        assert.equal(data.resources.a.submissionAccess[0].roles[0].toString(), 'anonymous');
        assert.equal(data.resources.a.submissionAccess[0].roles[1].toString(), 'everyone');
        assert.equal(data.resources.a.submissionAccess[1].roles[0].toString(), 'everyone');
        assert.equal(data.resources.b.access[0].roles[0].toString(), 'authenticated');
        assert.equal(data.resources.b.access[0].roles[1].toString(), 'anonymous');
        assert.equal(data.resources.b.access[1].roles[0].toString(), 'everyone');
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('No Revisions Block Template', function() {
      let testTemplate = require('./fixtures/templates/noRevisionsData.json');
      let _template = _.cloneDeep(testTemplate);
      let project;

      it('Should be able to bootstrap the template', async function() {
        const data = await importer.import.template(_template, alters);
        project = data;
      });

      it('All the forms should be imported', function(done) {
        
        assert.deepEqual(_.omit(project.forms.inner, ['_id', 'created', 'modified', '__v', 'owner', 'machineName', 'submissionAccess', 'deleted', 'access', '_vid', 'project', ...ignoredFormProps]),
        _.omit(testTemplate.forms.inner, ['revisions']));
        
        assert.deepEqual(_.omit(project.forms.outer, ['_id', 'created', 'modified', '__v', 'owner', 'machineName', 'submissionAccess', 'deleted', 'access', 'components', '_vid', 'project', ...ignoredFormProps]),
        _.omit(testTemplate.forms.outer, ['revisions', 'components']));
        assert.deepEqual(_.omit(project.forms.outer.components[0], ['form']),
        _.omit(testTemplate.forms.outer.components[0], ['form']));
        assert.deepEqual(project.forms.outer.components[1], testTemplate.forms.outer.components[1]);
       done();
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('Revisions Block Template', function() {
      let testTemplate = require('./fixtures/templates/revisionsData.json');
      let _template = _.cloneDeep(testTemplate);
      let project;

      it('Should be able to bootstrap the template', async function() {
        const data = await importer.import.template(_template, alters);
        project = data;
      });

      it('All the forms should be imported', function(done) {
        assert.deepEqual(_.omit(project.forms.inner, ['_id', 'created', 'modified', '__v', 'owner', 'machineName', 'submissionAccess', 'deleted', 'access', '_vid', 'project', 'revisions', 'submissionRevisions', ...ignoredFormProps]),
        _.omit(testTemplate.forms.inner, ['revisions']));
        assert.deepEqual(_.omit(project.forms.outer, ['_id', 'created', 'modified', '__v', 'owner', 'machineName', 'submissionAccess', 'deleted', 'access', 'components', '_vid', 'project', 'revisions', 'submissionRevisions', ...ignoredFormProps]),
        _.omit(testTemplate.forms.outer, ['revisions', 'components']));
        assert.deepEqual(_.omit(project.forms.outer.components[0], ['form']),
        _.omit(testTemplate.forms.outer.components[0], ['form']));
        assert.deepEqual(project.forms.outer.components[1], testTemplate.forms.outer.components[1]);
       done();
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('Template With Resource DataTable', function() {
      let testTemplate = require('./fixtures/templates/testDataTableWithResource.json');
      let _template = _.cloneDeep(testTemplate);
      let project;

      describe('Import', function() {
        it('Should be able to bootstrap the template', async function() {
          const data = await importer.import.template(_template, alters);
          project = data;
        });

        it ('The Data Table Fetch Resource should be replaced with valid resource id', function(done) {
          assert.equal(project.forms.formWithDt.components[0].fetch.resource, project.resources.resourceFormForDt._id.toString());
          done();
        });
      });

      describe('Export', function() {
        let exportData = {};

        it ('Should be able to export project', async function() {
          const data = await importer.export(project);
          exportData = data;
        });

        it ('The Data Table Fetch Resource should be replaced with resource name', function(done) {
          assert.equal(exportData.forms.formWithDt.components[0].fetch.resource,  exportData.resources.resourceFormForDt.name);
          done();
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });

    describe('Template with Select Dropdown with Default Value from Resource Data in Export Template with Existing Resources', function() {
      const existingResourceTemplate = 'projectWithExistingResource'
      let existingResourceTemplateSchema = require(`./fixtures/templates/${existingResourceTemplate}.json`);
      let _existingTemplate = _.cloneDeep(existingResourceTemplateSchema);

      const selectFormName = 'selectWithResourceDataSrcAndDefaultValueNoResourcesExport'
      let testTemplate = require(`./fixtures/templates/${selectFormName}.json`);
      let _template = _.cloneDeep(testTemplate);
      let project;

      // Modify the template name before importing
      // If not will not be able to import into same project.
      _template.name = existingResourceTemplate;

      let templateDataStartValue = _template.forms[selectFormName].components[0].data.resource;

      describe('Import', function() {
        it('Import existing resource template', async function() {
          const data = await importer.import.template(_existingTemplate, alters);
        });

        it('Should be able to bootstrap the template', async function() {
          const data = await importer.import.template(_template, alters);
          project = data;
        });

        it('Template on IMPORT checks for existing resource even if not included in export template', function() {
          assert.notEqual(
            project.forms[selectFormName].components[0].data.resource,
            templateDataStartValue
          );

          assert.equal(
            formio.mongoose.Types.ObjectId.isValid(project.forms[selectFormName].components[0].data.resource),
            true
          );
        });

        it('Template on IMPORT should de-ref select components defaultValue if dataSrc == resource', function() {
          assert.equal(
            project.forms[selectFormName].defaultValue,
            undefined
          );
        });
      });

      describe('Export', function() {
        let exportData = {};

        it ('Should be able to export project', async function() {
          const data = await importer.export(project);
          exportData = data;;
        });

        it('Template on EXPORT should de-ref select components defaultValue if dataSrc == resource', function() {
          assert.equal(
            exportData.forms[selectFormName].defaultValue,
            undefined
          );
        });
      });

      before(async function() {
        await template.clearData();
      });

      after(async function() {
        await template.clearData();
      });
    });
  });
};
