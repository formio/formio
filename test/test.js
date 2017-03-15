/* eslint-env mocha */
'use strict';

var assert = require('assert');

// Bootstrap the test environment.
var app = null;
var template = require('./fixtures/template')();
var hook = null;

describe('Initialization', function() {
  it('Initialize the test server', function(done) {
    var hooks = require('./hooks');
    require('../server')({
      hooks: hooks
    })
    .then(function(state) {
      app = state.server;
      hook = require('../src/util/hook')(app.formio);

      // Establish the helper library.
      template.Helper = require('./helper')(app);
      template.hooks = app.formio.hooks || {};
      done();
    });
  });

  after(function() {
    require('./bootstrap')(app, template, hook);
    require('./unit')(app, template, hook);
    require('./auth')(app, template, hook);
    require('./templates')(app, template, hook);
    require('./roles')(app, template, hook);
    require('./form')(app, template, hook);
    require('./resource')(app, template, hook);
    require('./nested')(app, template, hook);
    require('./actions')(app, template, hook);
    require('./submission-access')(app, template, hook);
    require('./submission')(app, template, hook);
  });
});
