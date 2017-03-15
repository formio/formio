'use strict';

let assert = require('assert');

module.exports = (app, template, hook) => {
  describe('Template Imports', function() {
    describe('Empty Template', function() {
      let project = {};
      let emptyTemplate = require('../src/templates/empty.json');

      it('Should be able to bootstrap the empty template', function(done) {
        app.formio.template.import(emptyTemplate, function(err) {
          if (err) {
            return done(err);
          }

          done();
        });
      });

      it('All the roles should be imported', function(done) {
        app.formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
          assert.equal(roles.length, Object.keys(emptyTemplate.roles).length);

          // Memoize the roles.
          project.roles = {};
          roles.forEach(role => {
            role = role.toObject();

            assert.equal(role.machineName, role.title.toString().toLowerCase());
            project.roles[role.machineName] = role;
          });

          let given = Object.keys(emptyTemplate.roles).map(key => {
            return emptyTemplate.roles[key].title;
          });
          let expected = roles.map(role => role.toObject().title);

          assert.deepEqual(given, expected);
          done();
        })
        .catch(done);
      });

      it('No forms should exist', function(done) {
        app.formio.resources.form.model.find({type: 'form', deleted: {$eq: null}}).then(forms => {
          assert.equal(forms.length, 0);
          return done();
        })
        .catch(done);
      });

      it('No resources should exist', function(done) {
        app.formio.resources.form.model.find({type: 'resource', deleted: {$eq: null}}).then(resources => {
          assert.equal(resources.length, 0);
          done();
        })
        .catch(done);
      });

      it('No actions should exist', function(done) {
        app.formio.actions.model.find({deleted: {$eq: null}}).then(actions => {
          assert.equal(actions.length, 0);
          done();
        })
        .catch(done);
      });

      after(function(done) {
        template.clearData(done);
      });
    });
  });
};
