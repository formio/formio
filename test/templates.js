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
  });
};
