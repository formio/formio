/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
const assert = require('assert');

module.exports = function (app, template, hook) {
  describe('MongoDB query sanitization', function () {
    it('does not crash when a MongoDB operator appears in the query string', function (done) {
      request(app)
        .get('/current?$where=1')
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          // Before the fix, the sanitization middleware threw a TypeError
          // (app.formio.log is not a function), producing a 500 server error.
          assert.ok(
            res.status < 500,
            `expected the request to be handled without a server error, got ${res.status}`,
          );
          return done();
        });
    });
  });
};
