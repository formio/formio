'use strict';

let assert = require('assert');

module.exports = (app, template, hook) => {
  describe('Template Imports', function() {
    /**
     * Util function to compare the input template with the current resources in mongo.
     *
     * @param project
     * @param input
     * @param done
     */
    let checkTemplateRoles = (project, input, done) => {
      input = input || {};

      app.formio.resources.role.model.find({deleted: {$eq: null}}).then(roles => {
        assert.equal(roles.length, Object.keys(input).length);

        if (Object.keys(input).length === 0) {
          return done();
        }

        // Memoize the roles.
        project.roles = {};
        roles.forEach(role => {
          role = role.toObject();
          project.roles[role.machineName] = role;
        });

        let given = Object.keys(roles).map(key => {
          return roles[key].title;
        });
        let expected = roles.map(role => role.toObject().title);

        assert.deepEqual(given, expected);
        done();
      })
      .catch(done);
    };

    /**
     * Util function to compare the input template with the current resources in mongo.
     *
     * @param project
     * @param type
     * @param input
     * @param done
     */
    let checkTemplateFormsAndResources = (project, type, input, done) => {
      input = input || {};

      app.formio.resources.form.model.find({type, deleted: {$eq: null}}).then(forms => {
        assert.equal(forms.length, Object.keys(input).length);

        if (Object.keys(input).length === 0) {
          return done()
        }

        done();
      })
      .catch(done);
    };

    /**
     * Util function to compare the input template with the current resources in mongo.
     *
     * @param project
     * @param input
     * @param done
     */
    let checkTemplateActions = (project, input, done) => {
      input = input || {};

      app.formio.actions.model.find({deleted: {$eq: null}}).then(actions => {
        assert.equal(actions.length, Object.keys(input).length);

        if (Object.keys(input).length === 0) {
          return done()
        }

        done();
      })
      .catch(done);
    };

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
        checkTemplateRoles(project, emptyTemplate.roles, done);
      });

      it('No forms should exist', function(done) {
        checkTemplateFormsAndResources(project, 'form', emptyTemplate.forms, done);
      });

      it('No resources should exist', function(done) {
        checkTemplateFormsAndResources(project, 'resource', emptyTemplate.resources, done);
      });

      it('No actions should exist', function(done) {
        checkTemplateActions(project, emptyTemplate.actions, done);
      });

      before(function(done) {
        template.clearData(done);
      });

      after(function(done) {
        template.clearData(done);
      });
    });

    describe('Default Template', function() {
      let project = {};
      let defaultTemplate = require('../src/templates/default.json');

      it('Should be able to bootstrap the default template', function(done) {
        app.formio.template.import(defaultTemplate, function(err) {
          if (err) {
            return done(err);
          }

          done();
        });
      });

      it('All the roles should be imported', function(done) {
        checkTemplateRoles(project, defaultTemplate.roles, done);
      });

      it('All the forms should be imported', function(done) {
        checkTemplateFormsAndResources(project, 'form', defaultTemplate.forms, done);
      });

      it('All the resources should be imported', function(done) {
        checkTemplateFormsAndResources(project, 'resource', defaultTemplate.resources, done);
      });

      it('All the actions should be imported', function(done) {
        checkTemplateActions(project, defaultTemplate.actions, done);
      });

      before(function(done) {
        template.clearData(done);
      });

      after(function(done) {
        template.clearData(done);
      });
    });
  });
};
