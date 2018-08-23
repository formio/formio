'use strict';

const assert = require('assert');
const formioUtils = require('formiojs/utils').default;
const _ = require('lodash');
let comparison = null;

module.exports = (app, template, hook) => {
  describe('Bootstrap test data', function() {
    it('Should remove old test data', function(done) {
      template.clearData(done);
    });

    it('Should be able to bootstrap the default template', function(done) {
      comparison = _.cloneDeep(template);

      app.formio.template.import.template(template, function(err) {
        if (err) {
          return done(err);
        }

        const resourceA = template.resources.a;
        const resourceB = template.resources.b;
        const resourceComponentA = formioUtils.getComponent(resourceB.components, 'a');
        const resourceComponentB = formioUtils.getComponent(resourceA.components, 'b');
        assert.equal(resourceA._id, resourceComponentA.resource, `Resource B's resource component for A should have the correct resource id. (Got ${resourceComponentA.resource}, expected ${resourceA._id})`);
        assert.equal(resourceB._id, resourceComponentB.resource, `Resource A's resource component for B should have the correct resource id. (Got ${resourceComponentB.resource}, expected ${resourceB._id})`);
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
