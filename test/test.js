/* eslint-env mocha */
'use strict';

var async = require('async');
var assert = require('assert');
let _ = require('lodash');
let formioUtils = require('formio-utils');

// Bootstrap the test environment.
var app = null;
var template = require('./fixtures/template')();
var hook = null;
var comparison = null;

describe('Bootstrap Test modules', function() {
  before(function(done) {
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
      model.remove({}, next);
    };

    async.series([
      async.apply(dropDocuments, app.formio.resources.form.model),
      async.apply(dropDocuments, app.formio.resources.submission.model),
      async.apply(dropDocuments, app.formio.actions.model),
      async.apply(dropDocuments, app.formio.resources.role.model)
    ], done);
  });

  it('Should be able to bootstrap the default template', function(done) {
    comparison = _.cloneDeep(template);

    app.formio.template.import(template, function(err) {
      if (err) {
        return done(err);
      }

      var resourceA = template.resources.a;
      var resourceB = template.resources.b;
      var resourceComponentA = formioUtils.getComponent(resourceB.components, 'a');
      var resourceComponentB = formioUtils.getComponent(resourceA.components, 'b');

      assert.equal(resourceA._id, resourceComponentA.resource, 'Resource B\'s resource component for A should have the correct resource id');
      assert.equal(resourceB._id, resourceComponentB.resource, 'Resource A\'s resource component for B should have the correct resource id');
      done();
    });
  });

  it('Should be able to export what was imported', function(done) {
    app.formio.template.export({
      title: template.title,
      description: template.description,
      name: template.name
    }, function(err, _export) {
      if (err) {
        return done(err);
      }

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

  after(function() {
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
