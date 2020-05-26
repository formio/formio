/* eslint-env mocha */
'use strict';

var async = require('async');

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

      // Listen on this port.
      state.server.listen(state.config.port);

      // Establish the helper library.
      template.Helper = require('./helper')(app);
      template.hooks = app.formio.hooks || {};
      template.config = state.config;

      /**
       * Remove all the mongo data.
       *
       * @param cb
       *   The callback to execute.
       */
      template.clearData = (cb) => {
        /**
         * Remove all documents using a mongoose model.
         *
         * @param model
         *   The mongoose model to delete.
         * @param next
         *   The callback to execute.
         */
        var dropDocuments = function(model, next) {
          model.deleteMany({}, next);
        };

        async.series([
          async.apply(dropDocuments, app.formio.resources.form.model),
          async.apply(dropDocuments, app.formio.resources.submission.model),
          async.apply(dropDocuments, app.formio.actions.model),
          async.apply(dropDocuments, app.formio.resources.role.model)
        ], cb);
      };

      done();
    });
  });

  after(function() {
    require('./templates')(app, template, hook);
    require('./bootstrap')(app, template, hook);
    require('./auth')(app, template, hook);
    require('./roles')(app, template, hook);
    require('./form')(app, template, hook);
    require('./resource')(app, template, hook);
    require('./nested')(app, template, hook);
    require('./actions')(app, template, hook);
    require('./submission-access')(app, template, hook);
    require('./submission')(app, template, hook);
    require('./export/CSVExporter/CSVExporter')(app, template, hook);
    require('./unit')(app, template, hook);
  });
});
