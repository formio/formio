/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');

module.exports = function(app, template, hook) {
  describe('Nested Resources', function() {
    var customerResource = null;
    it('A Project Owner should be able to Create a Customer Resource', function(done) {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          title: 'Customer',
          name: 'customer',
          path: 'customer',
          type: 'resource',
          access: [],
          submissionAccess: [
            {
              type: 'read_own',
              roles: [template.roles.authenticated._id.toString()]
            },
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id.toString()]
            },
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id.toString()]
            }
          ],
          components: [
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false
              },
              defaultValue: '',
              multiple: false,
              suffix: '',
              prefix: '',
              placeholder: 'First Name',
              key: 'firstName',
              label: 'First Name',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false
              },
              defaultValue: '',
              multiple: false,
              suffix: '',
              prefix: '',
              placeholder: 'Last Name',
              key: 'lastName',
              label: 'Last Name',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          customerResource = res.body;
          assert(res.body.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(res.body.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(res.body.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(res.body.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(res.body.title, 'Customer');
          assert.equal(res.body.name, 'customer');
          assert.equal(res.body.path, 'customer');
          assert.equal(res.body.type, 'resource');
          template.forms.customerForm = res.body;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    var customerForm = null;
    it('Should be able to create a Customer Survey form', function(done) {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          title: 'Customer Survey',
          name: 'survey',
          path: 'survey',
          type: 'form',
          access: [],
          submissionAccess: [
            {
              type: 'read_own',
              roles: [template.roles.authenticated._id.toString()]
            },
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id.toString()]
            },
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id.toString()]
            }
          ],
          components: [
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false
              },
              defaultValue: '',
              multiple: false,
              suffix: '',
              prefix: '',
              placeholder: 'First Name',
              key: 'firstName',
              label: 'First Name',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false
              },
              defaultValue: '',
              multiple: false,
              suffix: '',
              prefix: '',
              placeholder: 'Last Name',
              key: 'lastName',
              label: 'Last Name',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          customerForm = res.body;
          assert(res.body.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(res.body.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(res.body.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(res.body.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(res.body.title, 'Customer Survey');
          assert.equal(res.body.name, 'survey');
          assert.equal(res.body.path, 'survey');
          assert.equal(res.body.type, 'form');
          template.forms.surveyForm = res.body;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Should be able to create the save resource to another field action', function(done) {
      var saveResourceAction = {
        title: 'Save Submission',
        name: 'save',
        handler: ['before'],
        method: ['create', 'update'],
        priority: 11,
        settings: {
          resource: customerResource._id.toString(),
          property: 'customer',
          fields: {
            firstName: 'firstName',
            lastName: 'lastName'
          }
        }
      };

      request(app)
        .post(hook.alter('url', '/form/' + customerForm._id + '/action', template))
        .set('x-jwt-token', template.users.admin.token)
        .send(saveResourceAction)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert.equal(response.title, saveResourceAction.title);
          assert.equal(response.name, saveResourceAction.name);
          assert.deepEqual(response.handler, saveResourceAction.handler);
          assert.deepEqual(response.method, saveResourceAction.method);
          assert.equal(response.priority, saveResourceAction.priority);
          assert.deepEqual(response.settings, saveResourceAction.settings);
          assert.equal(response.form, customerForm._id);
          saveResourceAction = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    var survey = null;
    it('Should be able to create a submission in the survey', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.surveyForm._id + '/submission', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          data: {
            'firstName': 'Joe',
            'lastName': 'Smith'
          }
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('data'), 'The response body should have data.');
          assert(response.hasOwnProperty('created'), 'The submission should have a created date');
          assert(response.hasOwnProperty('modified'), 'The submission should have a modified date');
          assert(response.hasOwnProperty('_id'), 'The response should have an _id');
          assert(response.data.hasOwnProperty('customer'), 'The response body should have a customer.');
          assert(response.data.customer.hasOwnProperty('created'), 'The data should have created timestamp.');
          assert(response.data.customer.hasOwnProperty('modified'), 'Make sure there is a modified date');
          assert(response.data.customer.hasOwnProperty('_id'), 'The customer should have an ID.');
          assert.equal(response.data.customer.form, template.forms.customerForm._id);
          assert.equal(response.data.customer.data.firstName, 'Joe');
          assert.equal(response.data.customer.data.lastName, 'Smith');
          survey = res.body;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Should be able to get the customer', function(done) {
      request(app)
        .get(hook.alter('url', '/form/' + template.forms.customerForm._id + '/submission/' + survey.data.customer._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;

          assert(response.hasOwnProperty('data'), 'The response should have data.');
          assert.equal(response.form, template.forms.customerForm._id);
          assert.equal(response.data.firstName, 'Joe');
          assert.equal(response.data.lastName, 'Smith');

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Should be able to query the survey submission', function(done) {
      request(app)
        .get(hook.alter('url', '/form/' + template.forms.surveyForm._id + '/submission/' + survey._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('data'), 'The response should have data.');
          assert.equal(response.form, template.forms.surveyForm._id);
          assert(response.data.hasOwnProperty('customer'), 'Customer object was not found');
          assert(response.data.customer.hasOwnProperty('_id'), 'Customer should have an _id');
          assert.equal(response.data.customer.data.firstName, 'Joe');
          assert.equal(response.data.customer.data.lastName, 'Smith');

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });

  describe('Nested Passwords', function() {
    it('Should be able to create a form with a Password component in a panel component', function(done) {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          title: 'Nested Password Test',
          name: 'nestedPassword',
          path: 'nestedPassword',
          type: 'form',
          access: [],
          submissionAccess: [
            {
              type: 'read_own',
              roles: [template.roles.authenticated._id.toString()]
            },
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id.toString()]
            },
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id.toString()]
            }
          ],
          components: [
            {
              type: 'panel',
              input: false,
              title: 'Panel',
              theme: 'default',
              components: [
                {
                  input: true,
                  tableView: false,
                  inputType: 'password',
                  label: 'Panel Password',
                  key: 'panelPassword',
                  placeholder: '',
                  prefix: '',
                  suffix: '',
                  protected: true,
                  persistent: true,
                  type: 'password'
                }
              ]
            }
          ]
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert(res.body.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(res.body.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(res.body.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(res.body.hasOwnProperty('access'), 'The response should contain an the `access`.');
          assert.equal(res.body.title, 'Nested Password Test');
          assert.equal(res.body.name, 'nestedPassword');
          assert.equal(res.body.path, 'nestedpassword');
          assert.equal(res.body.type, 'form');
          template.forms.nestedPasswordForm = res.body;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    var submission;
    it('Should be able to create a submission in the form, and not get the password in response', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.nestedPasswordForm._id + '/submission', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          data: {
            'panelPassword': 'hunter2'
          }
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('data'), 'The response body should have data.');
          assert(response.hasOwnProperty('created'), 'The submission should have a created date');
          assert(response.hasOwnProperty('modified'), 'The submission should have a modified date');
          assert(response.hasOwnProperty('_id'), 'The response should have an _id');
          assert.equal(response.data.panelPassword, undefined);

          submission = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Should be able to get a submission in the form, and not get the password in response', function(done) {
      request(app)
        .get(hook.alter('url', '/form/' + template.forms.nestedPasswordForm._id + '/submission/' + submission._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send()
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if(err) {
            return done(err);
          }
          var response = res.body;
          assert(response.hasOwnProperty('data'), 'The response body should have data.');
          assert(response.hasOwnProperty('created'), 'The submission should have a created date');
          assert(response.hasOwnProperty('modified'), 'The submission should have a modified date');
          assert(response.hasOwnProperty('_id'), 'The response should have an _id');
          assert.equal(response.data.panelPassword, undefined);

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
};
