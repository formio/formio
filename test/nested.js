/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
var assert = require('assert');
var docker = process.env.DOCKER;

module.exports = function (app, template, hook) {
  let Helper;

  before(function () {
    Helper = require('./helper')(app);
  });

  describe('Nested Resources', function () {
    var customerResource = null;
    var customerForm = null;
    var saveResourceAction = null;
    var saveResourceActionResponse = null;
    var survey = null;

    // Each fixture below is built by the test that asserts on it and reused by every later
    // consumer, so any one of these tests can also run on its own.
    var ensureCustomerResource = function (done) {
      if (customerResource) {
        return done(null, customerResource);
      }

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
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id.toString()],
            },
          ],
          components: [
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false,
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
              input: true,
            },
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false,
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
              input: true,
            },
          ],
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          customerResource = res.body;
          template.forms.customerForm = res.body;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done(null, customerResource);
        });
    };

    it('A Project Owner should be able to Create a Customer Resource', function (done) {
      ensureCustomerResource(function (err, resource) {
        if (err) {
          return done(err);
        }

        assert(resource.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(
          resource.hasOwnProperty('modified'),
          'The response should contain a `modified` timestamp.',
        );
        assert(
          resource.hasOwnProperty('created'),
          'The response should contain a `created` timestamp.',
        );
        assert(resource.hasOwnProperty('access'), 'The response should contain an the `access`.');
        assert.equal(resource.title, 'Customer');
        assert.equal(resource.name, 'customer');
        assert.equal(resource.path, 'customer');
        assert.equal(resource.type, 'resource');

        done();
      });
    });

    var ensureSurveyForm = function (done) {
      if (customerForm) {
        return done(null, customerForm);
      }

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
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id.toString()],
            },
          ],
          components: [
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false,
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
              input: true,
            },
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: false,
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
              input: true,
            },
          ],
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          customerForm = res.body;
          template.forms.surveyForm = res.body;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done(null, customerForm);
        });
    };

    it('Should be able to create a Customer Survey form', function (done) {
      ensureSurveyForm(function (err, form) {
        if (err) {
          return done(err);
        }

        assert(form.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(
          form.hasOwnProperty('modified'),
          'The response should contain a `modified` timestamp.',
        );
        assert(
          form.hasOwnProperty('created'),
          'The response should contain a `created` timestamp.',
        );
        assert(form.hasOwnProperty('access'), 'The response should contain an the `access`.');
        assert.equal(form.title, 'Customer Survey');
        assert.equal(form.name, 'survey');
        assert.equal(form.path, 'survey');
        assert.equal(form.type, 'form');

        done();
      });
    });

    var ensureSaveResourceAction = function (done) {
      ensureCustomerResource(function (err) {
        if (err) {
          return done(err);
        }

        ensureSurveyForm(function (err) {
          if (err) {
            return done(err);
          }

          // Guard on identity: the action has to belong to the survey form we are holding.
          if (saveResourceActionResponse && saveResourceActionResponse.form === customerForm._id) {
            return done(null, saveResourceActionResponse);
          }

          saveResourceAction = {
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
                lastName: 'lastName',
              },
            },
          };

          request(app)
            .post(hook.alter('url', '/form/' + customerForm._id + '/action', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(saveResourceAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              saveResourceActionResponse = res.body;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done(null, saveResourceActionResponse);
            });
        });
      });
    };

    it('Should be able to create the save resource to another field action', function (done) {
      ensureSaveResourceAction(function (err, response) {
        if (err) {
          return done(err);
        }

        assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert.equal(response.title, saveResourceAction.title);
        assert.equal(response.name, saveResourceAction.name);
        assert.deepEqual(response.handler, saveResourceAction.handler);
        assert.deepEqual(response.method, saveResourceAction.method);
        assert.equal(response.priority, saveResourceAction.priority);
        assert.deepEqual(response.settings, saveResourceAction.settings);
        assert.equal(response.form, customerForm._id);

        done();
      });
    });

    var ensureSurveySubmission = function (done) {
      ensureSaveResourceAction(function (err) {
        if (err) {
          return done(err);
        }

        if (survey) {
          return done(null, survey);
        }

        request(app)
          .post(
            hook.alter('url', '/form/' + template.forms.surveyForm._id + '/submission', template),
          )
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              firstName: 'Joe',
              lastName: 'Smith',
            },
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            survey = res.body;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done(null, survey);
          });
      });
    };

    it('Should be able to create a submission in the survey', function (done) {
      ensureSurveySubmission(function (err, response) {
        if (err) {
          return done(err);
        }

        assert(response.hasOwnProperty('data'), 'The response body should have data.');
        assert(response.hasOwnProperty('created'), 'The submission should have a created date');
        assert(response.hasOwnProperty('modified'), 'The submission should have a modified date');
        assert(response.hasOwnProperty('_id'), 'The response should have an _id');
        assert(
          response.data.hasOwnProperty('customer'),
          'The response body should have a customer.',
        );
        assert(
          response.data.customer.hasOwnProperty('created'),
          'The data should have created timestamp.',
        );
        assert(
          response.data.customer.hasOwnProperty('modified'),
          'Make sure there is a modified date',
        );
        assert(response.data.customer.hasOwnProperty('_id'), 'The customer should have an ID.');
        assert.equal(response.data.customer.form, template.forms.customerForm._id);
        assert.equal(response.data.customer.data.firstName, 'Joe');
        assert.equal(response.data.customer.data.lastName, 'Smith');

        done();
      });
    });

    it('Should be able to get the customer', function (done) {
      ensureSurveySubmission(function (err) {
        if (err) {
          return done(err);
        }

        request(app)
          .get(
            hook.alter(
              'url',
              '/form/' +
                template.forms.customerForm._id +
                '/submission/' +
                survey.data.customer._id,
              template,
            ),
          )
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
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
    });

    it('Should be able to query the survey submission', function (done) {
      ensureSurveySubmission(function (err) {
        if (err) {
          return done(err);
        }

        request(app)
          .get(
            hook.alter(
              'url',
              '/form/' + template.forms.surveyForm._id + '/submission/' + survey._id,
              template,
            ),
          )
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
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
  });

  describe('Nested Resource Permissions', () => {
    var helper = null;
    var createdSubmission = null;
    var savedSubmission = null;

    // This suite is one cumulative chain: project -> resourcea -> savetoa -> submission. Each
    // link lives in a guarded builder that the test asserting on it calls, and that every later
    // consumer calls too, so any single test here can also run on its own. Every guard keys on
    // the effect it produces rather than on a "did I run" flag.
    const ensureProject = (done) => {
      if (helper) {
        return done();
      }

      var owner = app.hasProjects || docker ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().user('user', 'user1').execute(done);
    };

    it('Create the project with a new user account.', (done) => {
      ensureProject(done);
    });

    const ensureResourceA = (done) => {
      ensureProject((err) => {
        if (err) {
          return done(err);
        }

        if (helper.template.forms.resourcea) {
          return done();
        }

        helper
          .resource(
            'resourcea',
            [
              {
                type: 'textfield',
                persistent: true,
                unique: false,
                protected: false,
                defaultValue: '',
                suffix: '',
                prefix: '',
                placeholder: '',
                key: 'a',
                label: 'a',
                inputType: 'text',
                tableView: true,
                input: true,
              },
              {
                type: 'textfield',
                persistent: true,
                unique: false,
                protected: false,
                defaultValue: '',
                suffix: '',
                prefix: '',
                placeholder: '',
                key: 'b',
                label: 'b',
                inputType: 'text',
                tableView: true,
                input: true,
              },
              {
                type: 'textfield',
                persistent: true,
                unique: false,
                protected: false,
                defaultValue: '',
                suffix: '',
                prefix: '',
                placeholder: '',
                key: 'c',
                label: 'c',
                inputType: 'text',
                tableView: true,
                input: true,
              },
            ],
            {
              submissionAccess: [
                {
                  type: 'create_own',
                  roles: [helper.template.roles.authenticated._id.toString()],
                },
                {
                  type: 'read_own',
                  roles: [helper.template.roles.authenticated._id.toString()],
                },
                {
                  type: 'update_own',
                  roles: [helper.template.roles.authenticated._id.toString()],
                },
              ],
            },
          )
          .execute(done);
      });
    };

    it('Create the resource', function (done) {
      ensureResourceA(done);
    });

    const ensureSaveToAForm = (done) => {
      ensureResourceA((err) => {
        if (err) {
          return done(err);
        }

        if (helper.template.forms.savetoa) {
          return done();
        }

        helper
          .form(
            'savetoa',
            [
              {
                type: 'textfield',
                persistent: true,
                unique: false,
                protected: false,
                defaultValue: '',
                suffix: '',
                prefix: '',
                placeholder: '',
                key: 'a',
                label: 'a',
                inputType: 'text',
                tableView: true,
                input: true,
              },
              {
                type: 'textfield',
                persistent: true,
                unique: false,
                protected: false,
                defaultValue: '',
                suffix: '',
                prefix: '',
                placeholder: '',
                key: 'b',
                label: 'b',
                inputType: 'text',
                tableView: true,
                input: true,
              },
              {
                type: 'textfield',
                persistent: true,
                unique: false,
                protected: false,
                defaultValue: '',
                suffix: '',
                prefix: '',
                placeholder: '',
                key: 'c',
                label: 'c',
                inputType: 'text',
                tableView: true,
                input: true,
              },
            ],
            {
              submissionAccess: [
                {
                  type: 'create_own',
                  roles: [helper.template.roles.authenticated._id.toString()],
                },
                {
                  type: 'read_own',
                  roles: [helper.template.roles.authenticated._id.toString()],
                },
                {
                  type: 'update_own',
                  roles: [helper.template.roles.authenticated._id.toString()],
                },
              ],
            },
          )
          .action({
            title: 'Save to A',
            name: 'save',
            handler: ['before'],
            method: ['create', 'update'],
            priority: 11,
            settings: {
              resource: helper.template.forms.resourcea._id.toString(),
              fields: {
                a: 'a',
                b: 'b',
                c: 'c',
              },
            },
          })
          .execute(done);
      });
    };

    it('Create the form', (done) => {
      ensureSaveToAForm(done);
    });

    const ensureCreatedSubmission = (done) => {
      ensureSaveToAForm((err) => {
        if (err) {
          return done(err);
        }

        if (createdSubmission) {
          return done(null, createdSubmission);
        }

        helper.createSubmission(
          'savetoa',
          {
            data: {
              a: 'one',
              b: 'two',
              c: 'three',
            },
          },
          'user1',
          (err, submission) => {
            if (err) {
              return done(err);
            }

            createdSubmission = submission;
            done(null, createdSubmission);
          },
        );
      });
    };

    it('Create a new submission in "savetoa" form as Authenticated user.', (done) => {
      ensureCreatedSubmission((err, submission) => {
        if (err) {
          return done(err);
        }

        assert(submission, 'There must be a submission');
        assert.equal(submission.owner, helper.template.users.user1._id);
        done();
      });
    });

    // The three update/delete tests below all work against the copy of the resourcea row that
    // user1 reads back, so that read is a builder of its own.
    const ensureSavedSubmission = (done) => {
      ensureCreatedSubmission((err) => {
        if (err) {
          return done(err);
        }

        if (savedSubmission) {
          return done(null, savedSubmission);
        }

        helper.getSubmission('resourcea', 0, 'user1', (err, submission) => {
          if (err) {
            return done(err);
          }

          savedSubmission = submission;
          done(null, savedSubmission);
        });
      });
    };

    it('Should be able retrieve the first submission from resource as an admin user.', (done) => {
      ensureCreatedSubmission((err) => {
        if (err) {
          return done(err);
        }

        helper.getSubmission('resourcea', 0, (err, submission) => {
          if (err) {
            return done(err);
          }
          assert(submission._id, 'The submission must have an id.');
          // The owner should be set to the original users id.
          assert.equal(submission.owner, helper.template.users.user1._id);
          assert.deepEqual(submission.data, {
            a: 'one',
            b: 'two',
            c: 'three',
          });
          done();
        });
      });
    });

    it('Should be able to retrieve the first submission as user1 user', (done) => {
      ensureSavedSubmission((err, submission) => {
        if (err) {
          return done(err);
        }
        assert(submission._id, 'The submission must have an id.');
        // The owner should be set to the original users id.
        assert.equal(submission.owner, helper.template.users.user1._id);
        assert.deepEqual(submission.data, {
          a: 'one',
          b: 'two',
          c: 'three',
        });
        done();
      });
    });

    it('Should be able to update the submission as user1', (done) => {
      ensureSavedSubmission((err) => {
        if (err) {
          return done(err);
        }

        savedSubmission.data.a = 'one updated';
        savedSubmission.data.b = 'two updated';
        savedSubmission.data.c = 'three updated';
        helper.updateSubmission(savedSubmission, 'user1', (err, updated) => {
          if (err) {
            return done(err);
          }

          assert.deepEqual(savedSubmission.data, updated.data);
          done();
        });
      });
    });

    it('An admin should also be able to update the submission', (done) => {
      ensureSavedSubmission((err) => {
        if (err) {
          return done(err);
        }

        savedSubmission.data.a = 'one updated again';
        savedSubmission.data.b = 'two updated again';
        savedSubmission.data.c = 'three updated again';
        helper.updateSubmission(savedSubmission, (err, updated) => {
          if (err) {
            return done(err);
          }

          assert.deepEqual(savedSubmission.data, updated.data);
          done();
        });
      });
    });

    it("Should NOT be able to delete the submission as user1 since they don't have permission", (done) => {
      ensureSavedSubmission((err) => {
        if (err) {
          return done(err);
        }

        helper.deleteSubmission(savedSubmission, 'user1', [/text\/plain/, 401], done);
      });
    });

    it('Should be able to delete the submission as admin.', (done) => {
      ensureSavedSubmission((err) => {
        if (err) {
          return done(err);
        }

        helper.deleteSubmission(savedSubmission, done);
      });
    });
  });

  describe('Nested Passwords', function () {
    var nestedPasswordForm = null;
    var submission = null;

    // Both submission tests need the form the first test builds, so it lives in a guarded
    // builder they can call too.
    var ensureNestedPasswordForm = function (done) {
      if (nestedPasswordForm) {
        return done(null, nestedPasswordForm);
      }

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
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id.toString()],
            },
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
                  type: 'password',
                },
              ],
            },
          ],
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          nestedPasswordForm = res.body;
          template.forms.nestedPasswordForm = res.body;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done(null, nestedPasswordForm);
        });
    };

    it('Should be able to create a form with a Password component in a panel component', function (done) {
      ensureNestedPasswordForm(function (err, form) {
        if (err) {
          return done(err);
        }

        assert(form.hasOwnProperty('_id'), 'The response should contain an `_id`.');
        assert(
          form.hasOwnProperty('modified'),
          'The response should contain a `modified` timestamp.',
        );
        assert(
          form.hasOwnProperty('created'),
          'The response should contain a `created` timestamp.',
        );
        assert(form.hasOwnProperty('access'), 'The response should contain an the `access`.');
        assert.equal(form.title, 'Nested Password Test');
        assert.equal(form.name, 'nestedPassword');
        assert.equal(form.path, 'nestedpassword');
        assert.equal(form.type, 'form');

        done();
      });
    });

    var ensureNestedPasswordSubmission = function (done) {
      ensureNestedPasswordForm(function (err) {
        if (err) {
          return done(err);
        }

        if (submission) {
          return done(null, submission);
        }

        request(app)
          .post(
            hook.alter(
              'url',
              '/form/' + template.forms.nestedPasswordForm._id + '/submission',
              template,
            ),
          )
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              panelPassword: 'hunter2',
            },
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            submission = res.body;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done(null, submission);
          });
      });
    };

    it('Should be able to create a submission in the form, and not get the password in response', function (done) {
      ensureNestedPasswordSubmission(function (err, response) {
        if (err) {
          return done(err);
        }

        assert(response.hasOwnProperty('data'), 'The response body should have data.');
        assert(response.hasOwnProperty('created'), 'The submission should have a created date');
        assert(response.hasOwnProperty('modified'), 'The submission should have a modified date');
        assert(response.hasOwnProperty('_id'), 'The response should have an _id');
        assert.equal(response.data.panelPassword, undefined);

        done();
      });
    });

    it('Should be able to get a submission in the form, and not get the password in response', function (done) {
      ensureNestedPasswordSubmission(function (err) {
        if (err) {
          return done(err);
        }

        request(app)
          .get(
            hook.alter(
              'url',
              '/form/' + template.forms.nestedPasswordForm._id + '/submission/' + submission._id,
              template,
            ),
          )
          .set('x-jwt-token', template.users.admin.token)
          .send()
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            var response = res.body;
            assert(response.hasOwnProperty('data'), 'The response body should have data.');
            assert(response.hasOwnProperty('created'), 'The submission should have a created date');
            assert(
              response.hasOwnProperty('modified'),
              'The submission should have a modified date',
            );
            assert(response.hasOwnProperty('_id'), 'The response should have an _id');
            assert.equal(response.data.panelPassword, undefined);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });

  describe('Nested Resources', () => {
    let childForm, parentForm;
    before('Build the forms', (done) => {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          title: 'Simple Child Form',
          name: 'simpleChildForm',
          path: 'simplechildform',
          display: 'form',
          components: [
            {
              type: 'textfield',
              key: 'name',
              input: true,
            },
            {
              type: 'textfield',
              key: 'phone',
              input: true,
            },
          ],
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          assert(res.body._id);
          childForm = res.body;
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              title: 'Simple Parent Form',
              name: 'simpleParentForm',
              path: 'simpleparentform',
              display: 'form',
              components: [
                {
                  type: 'textfield',
                  key: 'name',
                  input: true,
                },
                {
                  type: 'textfield',
                  key: 'phone',
                  input: true,
                },
                {
                  tableView: true,
                  form: childForm._id,
                  useOriginalRevision: false,
                  key: 'childForm',
                  type: 'form',
                  input: true,
                },
              ],
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }
              assert(res.body._id);
              parentForm = res.body;
              done();
            });
        });
    });

    it('Should not merge submission data of parent form draft submission data with nested form data with the same key', (done) => {
      request(app)
        .post(hook.alter('url', '/form/' + parentForm._id + '/submission', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          data: {
            name: 'John Doe',
            phone: '555-867-5309',
            childForm: {
              data: {
                name: 'Mary Jane',
                phone: '555-123-4567',
              },
            },
          },
          state: 'draft',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          const submission = res.body;
          assert.equal(submission.data.name, 'John Doe');
          assert.equal(submission.data.phone, '555-867-5309');
          assert.equal(submission.data.childForm.data.name, 'Mary Jane');
          assert.equal(submission.data.childForm.data.phone, '555-123-4567');
          done();
        });
    });
  });
};
