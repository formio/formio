'use strict';

let _ = require('lodash'); 
let formioUtils = require('formio-utils');
let request = require('supertest');
let assert = require('assert');

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

      let projectRoles = {};
      it('An export should contain the project roles', function(done) {
        app.formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
          let expectedRoles = exportTemplate.roles;
          let responseRoles = {};

          roles.forEach(role => {
            projectRoles[role._id] = role;

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
                return projectRoles[role.toString()].machineName;
              });

              return access;
            });

            tempForm.submissionAccess = tempForm.submissionAccess.map(access => {
              access.roles = access.roles.map(role => {
                return projectRoles[role.toString()].machineName;
              });

              return access;
            });

            formioUtils.eachComponent(tempForm.components, (component) => {
              if (component.hasOwnProperty('resource')) {

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

            tempResource.submissionAccess = tempResource.submissionAccess.map(access => {
              access.roles = access.roles.map(role => {
                return projectRoles[role.toString()].machineName;
              });

              return access;
            });

            responseResources[machineName] = tempResource;
          });

          assert.deepEqual(responseResources, expectedResources);
          return done();
        })
        .catch(done);
      });

      it('An export should contain the project actions', function(done) {
        app.formio.resources.action.model.find({deleted: {$eq: null}}).then(forms => {
          let expectedForms = exportTemplate.forms;
          let responseForms = {};
          forms.map(form => {
            let machineName = form.toObject().machineName;
            let tempForm = _.omit(form.toObject(), ['_id', '__v', 'created', 'deleted', 'modified', 'machineName', 'owner']);

            tempForm.access = tempForm.access.map(access => {
              access.roles = access.roles.map(role => {
                return projectRoles[role.toString()].machineName;
              });

              return access;
            });

            tempForm.submissionAccess = tempForm.submissionAccess.map(access => {
              access.roles = access.roles.map(role => {
                return projectRoles[role.toString()].machineName;
              });

              return access;
            });

            responseForms[machineName] = tempForm;
          });

          assert.deepEqual(responseForms, expectedForms);
          return done();
        })
          .catch(done);
      });
    });
  });
};
