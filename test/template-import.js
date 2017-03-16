'use strict';

let assert = require('assert');
let _ = require('lodash');

module.exports = (app, template, hook) => {
  describe('Template Imports', function() {
    /**
     * Util function to compare the input template with the current resources in mongo.
     *
     * @param project
     * @param input
     * @param done
     */
    let checkTemplateRoles = (project, input, done) => {
      input = input || {};

      app.formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
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

        // Memoize the roles.
        project.roles = {};
        roles.forEach(role => {
          role = role.toObject();

          // Check that each role in mongo has an _id and a machineName.
          assert.equal(role.hasOwnProperty('_id'), true);
          assert.equal(role.hasOwnProperty('machineName'), true);

          project.roles[role.machineName] = role;
        });

        let given = roles.map(role => role.toObject().title);
        let expected = Object.keys(input).map(machineName => {
          return input[machineName].title;
        });

        assert.deepEqual(given, expected);
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

      app.formio.resources.form.model.find({type, deleted: {$eq: null}}).then(forms => {
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

        // Memoize the forms.
        project[`${type}s`] = {};
        forms.forEach(form => {
          form = form.toObject();

          // Check that each form in mongo has an _id and machineName.
          assert.equal(form.hasOwnProperty('_id'), true);
          assert.equal(form.hasOwnProperty('machineName'), true);

          project[`${type}s`][form.machineName] = form;
        });

        let given = forms.map(form => form.toObject().name);
        let expected = Object.keys(input).map(machineName => {
          return input[machineName].name;
        });

        assert.deepEqual(given, expected);
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

      app.formio.actions.model.find({deleted: {$eq: null}}).then(actions => {
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

        // Memoize the forms.
        project.actions = {};
        actions.forEach(action => {
          action = action.toObject();

          // Check that each action in mongo has an _id and machineName.
          assert.equal(action.hasOwnProperty('_id'), true);
          assert.equal(action.hasOwnProperty('machineName'), true);

          project.actions[action.machineName] = action;
        });

        let given = actions.map(action => action.toObject().name);
        let expected = Object.keys(input).map(machineName => {
          return input[machineName].name;
        });

        assert.deepEqual(given, expected);
        done();
      })
      .catch(done);
    };

    describe('Empty Template', function() {
      let project = {};
      let emptyTemplate = require('../src/templates/empty.json');
      let _template = _.cloneDeep(emptyTemplate);

      describe('Import', function() {
        it('Should be able to bootstrap the empty template', function(done) {
          app.formio.template.import(_template, (err) => {
            if (err) {
              return done(err);
            }

            done();
          });
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, emptyTemplate.roles, done);
        });

        it('No forms should exist', function(done) {
          checkTemplateFormsAndResources(project, 'form', emptyTemplate.forms, done);
        });

        it('No resources should exist', function(done) {
          checkTemplateFormsAndResources(project, 'resource', emptyTemplate.resources, done);
        });

        it('No actions should exist', function(done) {
          checkTemplateActions(project, emptyTemplate.actions, done);
        });
      });

      describe('Export', function() {

      });

      before(function(done) {
        template.clearData(done);
      });

      after(function(done) {
        template.clearData(done);
      });
    });

    describe('Default Template', function() {
      let project = {};
      let defaultTemplate = require('../src/templates/default.json');
      let _template = _.cloneDeep(defaultTemplate);

      describe('Import', function() {
        it('Should be able to bootstrap the default template', function(done) {
          app.formio.template.import(_template, (err) => {
            if (err) {
              return done(err);
            }

            done();
          });
        });

        it('All the roles should be imported', function(done) {
          checkTemplateRoles(project, defaultTemplate.roles, done);
        });

        it('All the forms should be imported', function(done) {
          checkTemplateFormsAndResources(project, 'form', defaultTemplate.forms, done);
        });

        it('All the resources should be imported', function(done) {
          checkTemplateFormsAndResources(project, 'resource', defaultTemplate.resources, done);
        });

        it('All the actions should be imported', function(done) {
          checkTemplateActions(project, defaultTemplate.actions, done);
        });
      });

      describe('Export', function() {

      });

      before(function(done) {
        template.clearData(done);
      });

      after(function(done) {
        template.clearData(done);
      });
    });
  });
};
