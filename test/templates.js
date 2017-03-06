'use strict';

let _ = require('lodash'); 
let formioUtils = require('formio-utils');
var request = require('supertest');
var assert = require('assert');

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

            var response = res.text;
            assert.equal(response, 'Unauthorized');
            done();
          });
      });
    });
  });
};
