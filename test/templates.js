'use strict';

let _ = require('lodash'); 
let formioUtils = require('formio-utils');
let request = require('supertest');
let assert = require('assert');
let DOCKER = process.env.DOCKER;
let CUSTOMER = process.env.CUSTOMER;

module.exports = (app, template, hook) => {
  describe('Template Tests', function() {
    describe('Export', function() {
      it('An Anonymous user should not be able to export a project', function(done) {
        request(app)
          .get(hook.alter('url', '/export', template))
          .expect(401)
          .expect('Content-Type', /text/)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            let response = res.text;
            assert.equal(response, 'Unauthorized');
            done();
          });
      });

      it('An Admin user should be able to export a project', function(done) {
        request(app)
          .get(hook.alter('url', '/export', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            let response = res.body;
            assert.deepEqual(
              Object.keys(response),
              ['title', 'version', 'description', 'name', 'plan', 'roles', 'forms', 'actions', 'resources']
            );
            return done();
          });
      });
    });

    describe('Export Format', function() {
      let exportTemplate;

      before(function(done) {
        request(app)
          .get(hook.alter('url', '/export', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            exportTemplate = res.body;
            assert.deepEqual(
              Object.keys(exportTemplate),
              ['title', 'version', 'description', 'name', 'plan', 'roles', 'forms', 'actions', 'resources']
            );

            return done();
          });
      });

      it('An export should contain the export title', function() {
        assert.equal(
          hook.alter('exportTitle', 'Export', template),
          'Export'
        );
      });

      it('An export should contain the current export version', function() {
        assert.equal(
          exportTemplate.version,
          '2.0.0'
        );
      });

      it('An export should contain the description', function() {
        assert.equal(
          hook.alter('exportDescription', '', template),
          ''
        );
      });

      it('An export should contain the export name', function() {
        assert.equal(
          hook.alter('exportName', 'export', template),
          'export'
        );
      });

      it('An export should contain the export plan', function() {
        assert.equal(
          hook.alter('exportPlan', 'community', template),
          'community'
        );
      });

      // Skip the remaining tests if this is a docker or customer test.
      let project = {};
      if (DOCKER || CUSTOMER) {
        return;
      }
      it('Grab all the project resources', function(done) {
        let roleP = app.formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
          project.roles = {};
          roles.forEach(role => {
            role = role.toObject();

            project.roles[role._id] = role;
          });
        });

        let formP = app.formio.resources.form.model.find({type: 'form', deleted: {$eq: null}}).then(forms => {
          project.forms = {};
          forms.forEach(form => {
            form = form.toObject();

            project.forms[form._id] = form;
          });
        });

        let resourceP = app.formio.resources.form.model.find({type: 'resource', deleted: {$eq: null}}).then(resources => {
          project.resources = {};
          resources.forEach(resource => {
            resource = resource.toObject();

            project.resources[resource._id] = resource;
          });
        });

        let actionP = app.formio.actions.model.find({deleted: {$eq: null}}).then(actions => {
          project.actions = {};
          actions.forEach(action => {
            action = action.toObject();

            project.actions[action._id] = action;
          });
        });

        Promise.all([roleP, formP, resourceP, actionP])
        .then(() => done())
        .catch(done);
      });

      it('An export should contain the project roles', function(done) {
        app.formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
          let expectedRoles = exportTemplate.roles;
          let responseRoles = {};

          roles.forEach(role => {
            let tempRole = _.omit(role.toObject(), ['_id', '__v', 'created', 'deleted', 'modified']);
            let machineName = tempRole.machineName;
            delete tempRole.machineName;

            responseRoles[machineName] = tempRole;
          });

          assert.deepEqual(responseRoles, expectedRoles);
          return done();
        })
        .catch(done);
      });

      it('An export should contain the project forms', function(done) {
        app.formio.resources.form.model.find({type: 'form', deleted: {$eq: null}}).then(forms => {
          let expectedForms = exportTemplate.forms;
          let responseForms = {};
          forms.map(form => {
            let machineName = form.toObject().machineName;
            let tempForm = _.omit(form.toObject(), ['_id', '__v', 'created', 'deleted', 'modified', 'machineName', 'owner']);

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

            // Convert all resources to point to the resource name;
            formioUtils.eachComponent(tempForm.components, (component) => {
              if (component.hasOwnProperty('resource')) {
                component.resource = project.resources[component.resource].name;
              }
            }, true);

            responseForms[machineName] = tempForm;
          });

          assert.deepEqual(responseForms, expectedForms);
          return done();
        })
        .catch(done);
      });

      it('An export should contain the project resources', function(done) {
        app.formio.resources.form.model.find({type: 'resource', deleted: {$eq: null}}).then(resources => {
          let expectedResources = exportTemplate.resources;
          let responseResources = {};
          resources.map(resource => {
            let machineName = resource.toObject().machineName;
            let tempResource = _.omit(resource.toObject(), ['_id', '__v', 'created', 'deleted', 'modified', 'machineName', 'owner']);

            tempResource.access = tempResource.access.map(access => {
              access.roles = access.roles.map(role => {
                return project.roles[role.toString()].machineName;
              });

              return access;
            });

            tempResource.submissionAccess = tempResource.submissionAccess.map(access => {
              access.roles = access.roles.map(role => {
                return project.roles[role.toString()].machineName;
              });

              return access;
            });

            // Convert all resources to point to the resource name;
            formioUtils.eachComponent(tempResource.components, (component) => {
              if (component.hasOwnProperty('resource')) {
                component.resource = project.resources[component.resource].name;
              }
            }, true);

            responseResources[machineName] = tempResource;
          });

          assert.deepEqual(responseResources, expectedResources);
          return done();
        })
        .catch(done);
      });

      it('An export should contain the project actions', function(done) {
        let getResourceFromId = (id) => {
          let resourceName;

          if (project.forms[id]) {
            resourceName = project.forms[id].name;
          }
          else if (project.resources[id]) {
            resourceName = project.resources[id].name;
          }

          return resourceName;
        };

        app.formio.actions.model.find({deleted: {$eq: null}}).then(actions => {
          let expectedActions = exportTemplate.actions;
          let responseActions = {};
          actions.map(action => {
            let machineName = action.toObject().machineName;
            let tempAction = _.omit(action.toObject(), ['_id', '__v', 'created', 'deleted', 'modified', 'machineName']);

            tempAction.form = getResourceFromId(tempAction.form);
            if (_.has(tempAction, 'settings.resource')) {
              tempAction.settings.resource = getResourceFromId(tempAction.settings.resource);
            }
            if (_.has(tempAction, 'settings.resources')) {
              tempAction.settings.resources = tempAction.settings.resources.map(resource => {
                return getResourceFromId(resource);
              });
            }
            if (_.has(tempAction, 'settings.role')) {
              tempAction.settings.role = project.roles[tempAction.settings.role].machineName;
            }

            responseActions[machineName] = tempAction;
          });

          assert.deepEqual(responseActions, expectedActions);
          return done();
        })
        .catch(done);
      });
    });
  });
};
