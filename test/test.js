/* eslint-env mocha */
'use strict';

var Q = require('q');
var _ = require('lodash');
var async = require('async');
var assert = require('assert');

// Bootstrap the test environment.
var ready = Q.defer();
var app = null;
var template = null;
var comparison = null;
var hook = null;
require('./bootstrap')()
  .then(function(state) {
    app = state.app;
    hook = require('../src/util/hook')(state.app.formio);
    template = state.template;
    ready.resolve();
  });

// Bootstrap all test suites.
describe('Bootstrap Test modules', function() {
  before(function(done) {
    ready.promise.then(done);
  });

  it('Should remove old test data', function(done) {
    /**
     * Remove all documents using a mongoose model.
     *
     * @param model
     *   The mongoose model to delete.
     * @param next
     *   The callback to execute.
     */
    var dropDocuments = function(model, next) {
      model.remove({}, function(err) {
        if (err) {
          return next(err);
        }

        next();
      });
    };

    async.series([
      async.apply(dropDocuments, app.formio.resources.form.model),
      async.apply(dropDocuments, app.formio.resources.submission.model),
      async.apply(dropDocuments, app.formio.actions.model),
      async.apply(dropDocuments, app.formio.roles.resource.model)
    ], done);
  });

  it('Should be able to bootstrap the default template', function(done) {
    comparison = _.clone(template, true);

    var importer = require('../src/templates/import')(app.formio);
    importer.template(template, done);
  });

  it('Should be able to export what was imported', function(done) {
    var exporter = require('../src/templates/export')(app.formio);
    exporter.export({
      title: template.title,
      description: template.description,
      name: template.name
    }, function(err, _export) {
      assert.equal(_export.title, comparison.title);
      assert.equal(_export.description, comparison.description);
      assert.equal(_export.name, comparison.name);
      assert.deepEqual(_export.roles, comparison.roles);
      assert.deepEqual(_export.forms, comparison.forms);
      assert.deepEqual(_export.resources, comparison.resources);
      assert.equal(_export.actions.length, comparison.actions.length);
      done();
    });
  });

  it('Load all tests', function() {
    require('./auth')(app, template, hook);
    require('./roles')(app, template, hook);
    require('./form')(app, template, hook);
    require('./resource')(app, template, hook);
    require('./nested')(app, template, hook);
    require('./actions')(app, template, hook);
    require('./submission')(app, template, hook);
    require('./oauth')(app, template, hook);
  });
});
