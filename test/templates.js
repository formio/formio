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

      it('An export should contain the project roles', function(done) {
        app.formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
          let expectedRoles = Object.keys(exportTemplate.roles).map(key => exportTemplate.roles[key]);
          let responseRoles = roles.map(role => _.omit(role.toObject(), ['_id', '__v', 'created', 'deleted', 'modified']));

          assert.equal(responseRoles.length, expectedRoles.length);
          assert.deepEqual(responseRoles, expectedRoles);
          return done();
        })
        .catch(done);
      });

      it('An export should contain the project forms', function(done) {
        app.formio.resources.form.model.find({type: 'form', deleted: {$eq: null}}).then(forms => {
          let expectedForms = Object.keys(exportTemplate.forms).map(key => exportTemplate.forms[key]);
          let responseForms = forms.map(form => _.omit(form.toObject(), ['_id', '__v', 'created', 'deleted', 'modified']));

          assert.equal(responseForms.length, expectedForms.length);
          assert.deepEqual(responseForms, expectedForms);
          return done();
        })
        .catch(done);
      });

      it('An export should contain the project actions', function(done) {

      });

      it('An export should contain the project resources', function(done) {
        app.formio.resources.form.model.find({type: 'resource', deleted: {$eq: null}}).then(resources => {
          let expectedResources = Object.keys(exportTemplate.resources).map(key => exportTemplate.forms[key]);
          let responseResources = resources.map(resource => _.omit(resource.toObject(), ['_id', '__v', 'created', 'deleted', 'modified']));

          assert.equal(responseResources.length, expectedResources.length);
          assert.deepEqual(responseResources, expectedResources);
          return done();
        })
        .catch(done);
      });
    });
  });
};
