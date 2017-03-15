'use strict';

var async = require('async');
let assert = require('assert');
let formioUtils = require('formio-utils');
let _ = require('lodash');
var comparison = null;

module.exports = (app, template, hook) => {
  describe('Bootstrap test data', function() {
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
  });
};