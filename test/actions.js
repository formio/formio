/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var chance = new (require('chance'))();
var http = require('http');
var url = require('url');
var docker = process.env.DOCKER;

module.exports = function(app, template, hook) {
  var Helper = require('./helper')(app);
  describe('Actions', function() {
    // Store the temp form for this test suite.
    var tempForm = {
      title: 'Temp Form',
      name: 'tempForm',
      path: 'temp',
      type: 'form',
      access: [],
      submissionAccess: [],
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
          placeholder: 'foo',
          key: 'foo',
          label: 'foo',
          inputMask: '',
          inputType: 'text',
          input: true
        }
      ]
    };

    // Store the temp action for this test suite.
    var tempAction = {};
    describe('Bootstrap', function() {
      it('Create a Form for Action tests', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
            assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
            assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
            assert.equal(response.title, tempForm.title);
            assert.equal(response.name, tempForm.name);
            assert.equal(response.path, tempForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, tempForm.components);
            tempForm = response;
            tempAction = {
              title: 'Login',
              name: 'login',
              handler: ['before'],
              method: ['create'],
              priority: 0,
              settings: {
                resources: [tempForm._id.toString()],
                username: 'username',
                password: 'password'
              }
            };

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Project Level - Project Owner', function() {
      it('A Project Owner should be able to Create an Action', function(done) {
        request(app)
          .post(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempAction)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, tempAction.title);
            assert.equal(response.name, tempAction.name);
            assert.deepEqual(response.handler, tempAction.handler);
            assert.deepEqual(response.method, tempAction.method);
            assert.equal(response.priority, tempAction.priority);
            assert.deepEqual(response.settings, tempAction.settings);
            assert.equal(response.form, tempForm._id);
            tempAction = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Read an Action', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, tempAction);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Update an Action', function(done) {
        var updatedAction = _.clone(tempAction);
        updatedAction.title = 'Updated';

        request(app)
          .put(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({title: updatedAction.title})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, updatedAction);

            tempAction = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should not be able to Patch an Action', function(done) {
        request(app)
          .patch(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send([{op: 'replace', path: 'title', value: 'Patched'}])
          // .expect('Content-Type', /json/)
          .expect(405)
          .end(done);
      });

      it('A Project Owner should be able to Read the Index of Actions', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 2);
            _.each(response, function(action) {
              if (action.name === 'login') {
                assert.deepEqual(action, tempAction);
              }
              else {
                // Make sure it added a save action.
                assert.equal(action.name, 'save');
              }
            });

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Cant access an Action without a valid Action Id', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action/2342342344234', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Project Level - Authenticated User', function() {
      it('A user should not be able to Create an Action for a User-Created Project Form', function(done) {
        request(app)
          .post(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .set('x-jwt-token', template.users.user1.token)
          .send(tempAction)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Read an Action for a User-Created Project Form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Update an Action for a User-Created Project Form', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Read the Index of Actions for a User-Created Project Form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Delete an Action for a User-Created Project Form', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Permissions - Project Level - Anonymous User', function() {
      it('An Anonymous user should not be able to Create an Action for a User-Created Project Form', function(done) {
        request(app)
          .post(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .send(tempAction)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read an Action for a User-Created Project Form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Update an Action for a User-Created Project Form', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read the Index of Actions for a User-Created Project Form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Delete an Action for a User-Created Project Form', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Action MachineNames', function() {
      var _action;
      var name = chance.word();
      var helper;

      before(function() {
        helper = new Helper(template.users.admin, template);
      });

      it('Actions expose their machineNames through the api', function(done) {
        helper
          .form({name: name})
          .action({
            title: 'Webhook',
            name: 'webhook',
            handler: ['after'],
            method: ['create', 'update', 'delete'],
            priority: 1,
            settings: {
              url: 'example.com',
              username: '',
              password: ''
            }
          })
          .execute(function(err, result) {
            if (err) {
              return done(err);
            }

            var action = result.getAction('Webhook');
            assert(action.hasOwnProperty('machineName'));
            _action = action;
            done();
          });
      });

      it('A user can modify their action machineNames', function(done) {
        var newMachineName = chance.word();

        helper
          .action(name, {
            _id: _action._id,
            machineName: newMachineName
          })
          .execute(function(err, result) {
            if (err) {
              return done(err);
            }

            var action = result.getAction('Webhook');
            assert(action.hasOwnProperty('machineName'));
            assert.equal(action.machineName, newMachineName);
            done();
          });
      });
    });

    describe('Webhook Functionality tests', function() {
      if (docker) {
        return;
      }

      // The temp form with the add RoleAction for existing submissions.
      var webhookForm = {
        title: 'Webhook Form',
        name: 'webhookform',
        path: 'webhookform',
        type: 'form',
        access: [],
        submissionAccess: [],
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
            placeholder: 'foo',
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
            placeholder: 'foo',
            key: 'lastName',
            label: 'Last Name',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'email',
            persistent: true,
            unique: false,
            protected: false,
            defaultValue: '',
            suffix: '',
            prefix: '',
            placeholder: 'Enter your email address',
            key: 'email',
            label: 'Email',
            inputType: 'email',
            tableView: true,
            input: true
          },
          {
            type: 'password',
            persistent: true,
            unique: false,
            protected: false,
            defaultValue: '',
            suffix: '',
            prefix: '',
            placeholder: 'Enter your password',
            key: 'password',
            label: 'Password',
            inputType: 'password',
            tableView: true,
            input: true
          }
        ]
      };

      var port = 4002;
      var webhookSubmission = null;
      var webhookHandler = function(body) {};

      // Create a new server.
      var newServer = function(ready) {
        var server = http.createServer(function(request) {
          var body = [];
          request.on('data', function(chunk) {
            body.push(chunk);
          }).on('end', function() {
            body = Buffer.concat(body).toString();
            webhookHandler(body ? JSON.parse(body) : body, url.parse(request.url, true));
          });
        });
        server.port = port++;
        server.url = 'http://localhost:'+ server.port;
        server.listen(server.port, function(err) {
          hook.alter('webhookServer', server, app, template, function(err, server) {
            ready(err, server);
          });
        });
      };

      it('Should create the form and action for the webhook tests', function(done) {
        newServer(function(err, server) {
          if (err) {
            return done(err);
          }
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(webhookForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              webhookForm = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              request(app)
                .post(hook.alter('url', '/form/' + webhookForm._id + '/action', template))
                .set('x-jwt-token', template.users.admin.token)
                .send({
                  title: 'Webhook',
                  name: 'webhook',
                  form: webhookForm._id.toString(),
                  handler: ['after'],
                  method: ['create', 'update', 'delete'],
                  priority: 1,
                  settings: {
                    url: server.url,
                    username: '',
                    password: ''
                  }
                })
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }
                  template.users.admin.token = res.headers['x-jwt-token'];
                  done();
                });
            });
        });
      });

      it('Should send a webhook with create data.', function(done) {
        webhookHandler = function(body) {
          body = hook.alter('webhookBody', body);

          assert.equal(body.params.formId, webhookForm._id.toString());
          assert.equal(body.request.owner, template.users.admin._id.toString());
          assert.equal(body.request.data.email, 'test@example.com');
          assert.equal(body.request.data.firstName, 'Test');
          assert.equal(body.request.data.lastName, 'Person');
          assert(body.request.data.password !== '123testing', 'Passwords must not be visible via webhooks.');
          assert.deepEqual(_.pick(body.submission, _.keys(webhookSubmission)), webhookSubmission);
          done();
        };
        request(app)
          .post(hook.alter('url', '/form/' + webhookForm._id + '/submission', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              firstName: 'Test',
              lastName: 'Person',
              email: 'test@example.com',
              password: '123testing'
            }
          })
          .expect(201)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            webhookSubmission = res.body;
          });
      });

      it('Should be able to get the data from the webhook action.', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + webhookForm._id + '/submission/' + webhookSubmission._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            webhookSubmission = res.body;
            assert.equal(res.body.data.email, 'test@example.com');
            assert.equal(res.body.data.firstName, 'Test');
            assert.equal(res.body.data.lastName, 'Person');
            done();
          });
      });

      it('Should send a webhook with update data.', function(done) {
        webhookHandler = function(body) {
          body = hook.alter('webhookBody', body);

          assert.equal(body.params.formId, webhookForm._id.toString());
          assert.equal(body.request.data.email, 'test@example.com');
          assert.equal(body.request.data.firstName, 'Test2');
          assert.equal(body.request.data.lastName, 'Person3');
          assert.deepEqual(_.pick(body.submission, _.keys(webhookSubmission)), webhookSubmission);
          done();
        };
        request(app)
          .put(hook.alter('url', '/form/' + webhookForm._id + '/submission/' + webhookSubmission._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              firstName: 'Test2',
              lastName: 'Person3',
              email: 'test@example.com'
            }
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            webhookSubmission = res.body;
          });
      });

      it('Should send a webhook with deleted data.', function(done) {
        webhookHandler = function(body, url) {
          body = hook.alter('webhookBody', body);

          assert.equal(body, '');
          assert.equal(url.query.formId, webhookForm._id);
          assert.equal(url.query.submissionId, webhookSubmission._id);
          done();
        };
        request(app)
          .delete(hook.alter('url', '/form/' + webhookForm._id + '/submission/' + webhookSubmission._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
          });
      });
    });

    describe('EmailAction Functionality tests', function() {
      if (docker) {
        return;
      }

      // The temp form with the add RoleAction for existing submissions.
      var emailForm = {
        title: 'Email Form',
        name: 'emailform',
        path: 'emailform',
        type: 'form',
        access: [],
        submissionAccess: [],
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
            placeholder: 'foo',
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
            placeholder: 'foo',
            key: 'lastName',
            label: 'Last Name',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'email',
            persistent: true,
            unique: false,
            protected: false,
            defaultValue: '',
            suffix: '',
            prefix: '',
            placeholder: 'Enter your email address',
            key: 'email',
            label: 'Email',
            inputType: 'email',
            tableView: true,
            input: true
          }
        ]
      };

      // The temp role add action for existing submissions.
      var emailAction = {
        title: 'Email',
        name: 'email',
        handler: ['after'],
        method: ['create'],
        priority: 1,
        settings: {}
      };

      var numTests = 0;
      var newEmailTest = function(settings, done) {
        numTests++;
        settings.transport = 'test';
        var testForm = _.assign(_.cloneDeep(emailForm), {
          title: (emailForm.title + numTests),
          name: (emailForm.name + numTests),
          path: (emailForm.path + numTests)
        });
        var testAction = _.assign(_.cloneDeep(emailAction), {
          settings: settings
        });

        // Create the form.
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(testForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            testForm = res.body;
            testAction.form = testForm._id;
            template.users.admin.token = res.headers['x-jwt-token'];

            // Add the action to the form.
            request(app)
              .post(hook.alter('url', '/form/' + testForm._id + '/action', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(testAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                testAction = res.body;
                template.users.admin.token = res.headers['x-jwt-token'];
                done(null, testForm, testAction);
              });
          });
      };

      it('Should send an email with messages.', function(done) {
        newEmailTest({
          from: 'travis@form.io',
          emails: '{{ data.email }}',
          sendEach: false,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}'
        }, function(err, testForm, testAction) {
          if (err) {
            return done(err);
          }

          // Check for an email.
          let event = template.hooks.getEmitter();
          event.once('newMail', (email) => {
            assert.equal(email.from, 'travis@form.io');
            assert.equal(email.to, 'test@example.com');
            assert.equal(email.html.indexOf('Howdy, '), 0);
            assert.equal(email.subject, 'Hello there Test Person');
            done();
          });

          request(app)
            .post(hook.alter('url', '/form/' + testForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
                email: 'test@example.com'
              }
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }
            });
        });
      });

      it('Should send an email with multiple recipients.', function(done) {
        newEmailTest({
          from: '{{ data.email }}',
          emails: '{{ data.email }}, gary@form.io',
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}'
        }, function(err, testForm, testAction) {
          if (err) {
            return done(err);
          }

          // Check for an email.
          let event = template.hooks.getEmitter();
          event.once('newMail', (email) => {
            assert.equal(email.from, 'joe@example.com');
            assert.equal(email.to, 'joe@example.com, gary@form.io');
            assert.equal(email.html.indexOf('Howdy, '), 0);
            assert.equal(email.subject, 'Hello there Joe Smith');
            done();
          });

          request(app)
            .post(hook.alter('url', '/form/' + testForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                firstName: 'Joe',
                lastName: 'Smith',
                email: 'joe@example.com'
              }
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }
            });
        });
      });

      it('Should send an email with multiple separate messages.', function(done) {
        newEmailTest({
          from: 'travis@form.io',
          emails: '{{ data.email }}, gary@form.io',
          sendEach: true,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}'
        }, function(err, testForm, testAction) {
          if (err) {
            return done(err);
          }

          // Check for an email.
          let event = template.hooks.getEmitter();
          let email1 = new Promise((resolve, reject) => {
            event.once('newMail', (email) => {
              assert.equal(email.from, 'travis@form.io');
              assert.equal(email.to, 'gary@form.io');
              assert.equal(email.html.indexOf('Howdy, '), 0);
              assert.equal(email.subject, 'Hello there Test Person');
              resolve();
            });
          });

          let email2 = new Promise((resolve, reject) => {
            event.once('newMail', (email) => {
              assert.equal(email.from, 'travis@form.io');
              assert.equal(email.to, 'test@example.com');
              assert.equal(email.html.indexOf('Howdy, '), 0);
              assert.equal(email.subject, 'Hello there Test Person');
              resolve();
            });
          });
          Promise.all([email1, email2])
            .then(done)
            .catch(done);

          request(app)
            .post(hook.alter('url', '/form/' + testForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
                email: 'test@example.com'
              }
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end(done);
        });
      });
    });

    describe('RoleAction Functionality tests', function() {
      // The temp form with the add RoleAction for existing submissions.
      var addForm = {
        title: 'Add Form',
        name: 'addform',
        path: 'addform',
        type: 'form',
        submissionAccess: [],
        components: []
      };

      // The temp form with the remove RoleAction for existing submissions.
      var removeForm = {
        title: 'Remove Form',
        name: 'removeform',
        path: 'removeform',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: []
      };

      // The temp form with the add RoleAction for new submissions.
      var submissionForm = {
        title: 'Submission Form',
        name: 'submissionform',
        path: 'submissionform',
        type: 'form',
        access: [],
        submissionAccess: [],
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
            placeholder: 'foo',
            key: 'foo',
            label: 'foo',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // The temp role add action for existing submissions.
      var addAction = {
        title: 'Add Role',
        name: 'role',
        handler: ['before'],
        method: ['create'],
        priority: 1,
        settings: {
          association: 'existing',
          type: 'add'
        }
      };

      // The temp role remove action for existing submissions.
      var removeAction = {
        title: 'Remove Role',
        name: 'role',
        handler: ['before'],
        method: ['create'],
        priority: 1,
        settings: {
          association: 'existing',
          type: 'remove'
        }
      };

      // The temp role add action for new submissions.
      var submissionAction = {
        title: 'Add Role',
        name: 'role',
        handler: ['after'],
        method: ['create'],
        priority: 1,
        settings: {
          association: 'new',
          type: 'add',
          role: null
        }
      };

      // The temp submission.
      var submission = {};

      // The dummy role for this test suite.
      var dummyRole = {
        title: 'dummyRole',
        description: 'A dummy role.'
      };

      describe('Bootstrap', function() {
        it('Create the dummy role', function(done) {
          request(app)
            .post(hook.alter('url', '/role', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(dummyRole)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'Each role in the response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'Each role in the response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'Each role in the response should contain a `created` timestamp.');
              assert.equal(response.title, dummyRole.title);
              assert.equal(response.description, dummyRole.description);

              // Store this temp role for later use.
              dummyRole = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        describe('Role dependent', function() {
          // Attach the dummy role to the submission action before starting its tests.
          before(function() {
            submissionForm.access = [
              {type: 'read_all', roles: [template.roles.anonymous._id.toString()]}
            ];
            submissionForm.submissionAccess = [
              {type: 'create_own', roles: [template.roles.anonymous._id.toString()]},
              {type: 'read_own', roles: [dummyRole._id]},
              {type: 'update_own', roles: [dummyRole._id]},
              {type: 'delete_own', roles: [dummyRole._id]}
            ];

            submissionAction.settings.role = dummyRole._id;
          });

          // Create the dummy forms and attach each respective action.
          it('Create the addForm Form', function(done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(addForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
                assert.equal(response.title, addForm.title);
                assert.equal(response.name, addForm.name);
                assert.equal(response.path, addForm.path);
                assert.equal(response.type, addForm.type);
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 4);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
                assert.equal(response.submissionAccess.length, 0);
                assert.deepEqual(response.components, addForm.components);
                addForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Attach the addAction (RoleAction) to its Form', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + addForm._id + '/action', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(addAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert.equal(response.title, addAction.title);
                assert.equal(response.name, addAction.name);
                assert.deepEqual(response.handler, addAction.handler);
                assert.deepEqual(response.method, addAction.method);
                assert.equal(response.priority, addAction.priority);
                assert.deepEqual(response.settings, addAction.settings);
                assert.equal(response.form, addForm._id);
                addAction = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Create the removeForm Form', function(done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(removeForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
                assert.equal(response.title, removeForm.title);
                assert.equal(response.name, removeForm.name);
                assert.equal(response.path, removeForm.path);
                assert.equal(response.type, removeForm.type);
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 4);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(dummyRole._id), -1);
                assert.deepEqual(response.submissionAccess, []);
                assert.deepEqual(response.components, removeForm.components);
                removeForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Attach the removeAction (RoleAction) to its Form', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + removeForm._id + '/action', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(removeAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert.equal(response.title, removeAction.title);
                assert.equal(response.name, removeAction.name);
                assert.deepEqual(response.handler, removeAction.handler);
                assert.deepEqual(response.method, removeAction.method);
                assert.equal(response.priority, removeAction.priority);
                assert.deepEqual(response.settings, removeAction.settings);
                assert.equal(response.form, removeForm._id);
                removeAction = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Create the submissionForm Form', function(done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submissionForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
                assert(response.hasOwnProperty('submissionAccess'), 'The response should contain an the `submissionAccess`.');
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 1);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
                assert.equal(response.submissionAccess.length, 4);
                assert.equal(response.title, submissionForm.title);
                assert.equal(response.name, submissionForm.name);
                assert.equal(response.path, submissionForm.path);
                assert.equal(response.type, submissionForm.type);
                assert.deepEqual(response.components, submissionForm.components);
                submissionForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Attach the submissionAction (RoleAction) to its Form', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + submissionForm._id + '/action', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submissionAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert.equal(response.title, submissionAction.title);
                assert.equal(response.name, submissionAction.name);
                assert.deepEqual(response.handler, submissionAction.handler);
                assert.deepEqual(response.method, submissionAction.method);
                assert.equal(response.priority, submissionAction.priority);
                assert.deepEqual(response.settings, submissionAction.settings);
                assert.equal(response.form, submissionForm._id);
                submissionAction = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      describe('RoleAction Functionality tests for Existing Submissions', function() {
        it('The user should not have the dummy Role assigned', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + template.resources.admin._id + '/submission/' + template.users.admin._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              // Confirm the response does not contain the dummy role.
              var response = res.body;
              assert.equal(response.roles.indexOf(dummyRole._id), -1);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A submission to the addForm Form should archive the role addition and update the Submission with the dummy Role added', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + addForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to include the new role.
              request(app)
                .get(hook.alter('url', '/form/' + template.resources.admin._id + '/submission/' + template.users.admin._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.notEqual(response.roles.indexOf(dummyRole._id), -1);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('A submission to the removeForm Form should archive the role removal and update the Submission with the dummy Role removed', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + removeForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to not include the dummy role.
              request(app)
                .get(hook.alter('url', '/form/' + template.resources.admin._id + '/submission/' + template.users.admin._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.equal(response.roles.indexOf(dummyRole._id), -1);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('A submission to the addForm Form using the Form alias should return the updated Submission with the dummy Role added', function(done) {
          request(app)
            .post(hook.alter('url', '/' + addForm.path, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to include the new role.
              request(app)
                .get(hook.alter('url', '/form/' + template.resources.admin._id + '/submission/' + template.users.admin._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.notEqual(response.roles.indexOf(dummyRole._id), -1);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('A submission to the removeForm Form using the Form alias should return the updated Submission with the dummy Role removed', function(done) {
          request(app)
            .post(hook.alter('url', '/' + removeForm.path, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to not include the dummy role.
              request(app)
                .get(hook.alter('url', '/form/' + template.resources.admin._id + '/submission/' + template.users.admin._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.equal(response.roles.indexOf(dummyRole._id), -1);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('The user should not be able to assign a role that they do not have access to (including invalid roles)', function(done) {
          request(app)
            .post(hook.alter('url', '/' + addForm.path, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: template.users.user1._id, // invalid roleId, but a valid MongoDB ObjectId.
                submission: template.users.user1._id
              }
            })
            .expect(400)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('RoleAction Functionality tests for New Submissions', function() {
        it('A new Submission to the submissionForm should create a new Submission and contain the dummyRole Role', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + submissionForm._id + '/submission', template))
            .send({
              data: {
                foo: 'bar'
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.notEqual(response.roles.indexOf(dummyRole._id), -1);
              submission = response;

              done();
            });
        });
      });

      describe('RoleAction Normalization', function() {
        it('Remove the temp submission', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + submissionForm._id + '/submission/' + submission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              submission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the dummy role', function(done) {
          request(app)
            .delete(hook.alter('url', '/role/' + dummyRole._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              dummyRole = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the submissionAction', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + submissionForm._id + '/action/' + submissionAction._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              submissionAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the removeAction', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + removeForm._id + '/action/' + removeAction._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              removeAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the addAction', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + addForm._id + '/action/' + addAction._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              addAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the submissionForm', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + submissionForm._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              submissionForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the removeForm', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + removeForm._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              removeForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the addForm', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + addForm._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              addForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('AuthAction Functionality tests', function() {
      var dummyResource = {
        title: 'dummy',
        name: 'dummy',
        path: 'dummy',
        type: 'resource',
        access: [],
        submissionAccess: [],
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
            placeholder: 'username',
            key: 'username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'password',
            label: 'password',
            inputType: 'password',
            input: true
          }
        ]
      };

      var authForm = {
        title: 'Auth Form',
        name: 'authform',
        path: 'authform',
        type: 'form',
        access: [],
        submissionAccess: [],
        noSave: true,
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
            placeholder: 'username',
            key: 'username',
            label: 'username',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'password',
            label: 'password',
            inputType: 'password',
            input: true
          }
        ]
      };

      describe('Bootstrap', function() {
        it('Create the dummy resource form', function(done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(dummyResource)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, dummyResource.title);
              assert.equal(response.name, dummyResource.name);
              assert.equal(response.path, dummyResource.path);
              assert.equal(response.type, dummyResource.type);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
              assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
              assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, dummyResource.components);
              dummyResource = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the dummy role assignment action', function(done) {
          var roleAction = {
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            settings: {
              association: 'new',
              type: 'add',
              role: template.users.admin._id.toString()
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + dummyResource._id + '/action', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(roleAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert.equal(response.title, roleAction.title);
              assert.equal(response.name, roleAction.name);
              assert.deepEqual(response.handler, roleAction.handler);
              assert.deepEqual(response.method, roleAction.method);
              assert.equal(response.priority, roleAction.priority);
              assert.deepEqual(response.settings, roleAction.settings);
              assert.equal(response.form, dummyResource._id);
              roleAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the dummy auth form', function(done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(authForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
              assert.equal(response.title, authForm.title);
              assert.equal(response.name, authForm.name);
              assert.equal(response.path, authForm.path);
              assert.equal(response.type, authForm.type);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
              assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
              assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, authForm.components);
              authForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the dummy save submission action', function(done) {
          var authAction = {
            title: 'Save Submission',
            name: 'save',
            handler: ['before'],
            method: ['create', 'update'],
            priority: 11,
            settings: {
              resource: dummyResource._id.toString(),
              fields: {
                username: 'username',
                password: 'password'
              }
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + authForm._id + '/action', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(authAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert.equal(response.title, authAction.title);
              assert.equal(response.name, authAction.name);
              assert.deepEqual(response.handler, authAction.handler);
              assert.deepEqual(response.method, authAction.method);
              assert.equal(response.priority, authAction.priority);
              assert.deepEqual(response.settings, authAction.settings);
              assert.equal(response.form, authForm._id);
              authAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
        it('Create the dummy auth login action', function(done) {
          var authLoginAction = {
            title: 'Login',
            name: 'login',
            handler: ['before'],
            method: ['create'],
            priority: 0,
            settings: {
              resources: [dummyResource._id.toString()],
              username: 'username',
              password: 'password',
              allowedAttempts: 5,
              attemptWindow: 10,
              lockWait: 10
            }
          }

          request(app)
            .post(hook.alter('url', '/form/' + authForm._id + '/action', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(authLoginAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert.equal(response.title, authLoginAction.title);
              assert.equal(response.name, authLoginAction.name);
              assert.deepEqual(response.handler, authLoginAction.handler);
              assert.deepEqual(response.method, authLoginAction.method);
              assert.equal(response.priority, authLoginAction.priority);
              assert.deepEqual(response.settings, authLoginAction.settings);
              assert.equal(response.form, authForm._id);
              authLoginAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('AuthAction Functionality tests for New Submissions', function() {
        it('A AuthAction should not be able to assign a role that is not accessible (including invalid roles)', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + authForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                'username': chance.word({length: 10}),
                'password': chance.word({length: 10})
              }
            })
            .expect(400)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('AuthAction Normalization', function() {
        it('Should delete the dummy resource', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + dummyResource._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              dummyResource = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Should delete the authForm', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + authForm._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});
              authForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      })
    });

    describe('Action Normalization', function() {
      it('A Project Owner should be able to Delete an Action', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, {});

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      if (!docker)
      it('A deleted Action should remain in the database', function(done) {
        var formio = hook.alter('formio', app.formio);
        formio.actions.model.findOne({_id: tempAction._id})
          .exec(function(err, action) {
            if (err) {
              return done(err);
            }
            if (!action) {
              return done('No Action found, expected 1.');
            }

            action = action.toObject();
            assert.notEqual(action.deleted, null);
            done();
          });
      });

      it('Delete the Form used for Action tests', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, {});

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      if (!docker)
      it('A deleted Form should not have active actions in the database', function(done) {
        var formio = hook.alter('formio', app.formio);
        formio.actions.model.find({form: tempForm._id, deleted: {$eq: null}})
          .exec(function(err, action) {
            if (err) {
              return done(err);
            }
            if (action && action.length !== 0) {
              return done('Active actions found w/ form: ' + tempForm._id + ', expected 0.');
            }

            done();
          });
      });

      var actionLogin = null;
      it('A Project Owner should be able to Create an Authentication Action (Login Form)', function(done) {
        actionLogin = {
          title: 'Login',
          name: 'login',
          handler: ['before'],
          method: ['create'],
          priority: 0,
          settings: {
            resources: [template.resources.user._id.toString()],
            username: 'username',
            password: 'password',
            allowedAttempts: 5,
            attemptWindow: 10,
            lockWait: 10
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({ data: actionLogin })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, actionLogin.title);
            assert.equal(response.name, actionLogin.name);
            assert.deepEqual(response.handler, actionLogin.handler);
            assert.deepEqual(response.method, actionLogin.method);
            assert.equal(response.priority, actionLogin.priority);
            assert.deepEqual(response.settings, actionLogin.settings);
            assert.equal(response.form, template.forms.userLogin._id);
            actionLogin = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Delete the login action', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + template.forms.userLogin._id + '/action/' + actionLogin._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(done);
      });

      var actionRegister = null;
      it('A Project Owner should be able to Create an Authentication Action (Registration Form)', function(done) {
        actionRegister = {
          title: 'Login',
          name: 'login',
          handler: ['before'],
          method: ['create'],
          priority: 0,
          settings: {
            resources: [template.resources.user._id.toString()],
            username: 'username',
            password: 'password',
            allowedAttempts: 5,
            attemptWindow: 10,
            lockWait: 10
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.userRegister._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({ data: actionRegister })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, actionRegister.title);
            assert.equal(response.name, actionRegister.name);
            assert.deepEqual(response.handler, actionRegister.handler);
            assert.deepEqual(response.method, actionRegister.method);
            assert.equal(response.priority, actionRegister.priority);
            assert.deepEqual(response.settings, actionRegister.settings);
            assert.equal(response.form, template.forms.userRegister._id);
            actionRegister = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Delete the register action', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + template.forms.userRegister._id + '/action/' + actionRegister._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(done);
      });

      var actionRole = null;
      it('A Project Owner should be able to Create a Role Assignment Action (Registration Form)', function(done) {
        actionRole = {
          title: 'Role Assignment',
          name: 'role',
          handler: ['after'],
          method: ['create'],
          priority: 1,
          settings: {
            association: 'new',
            type: 'add',
            role: template.roles.authenticated._id.toString()
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.userRegister._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({ data: actionRole })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, actionRole.title);
            assert.equal(response.name, actionRole.name);
            assert.deepEqual(response.handler, actionRole.handler);
            assert.deepEqual(response.method, actionRole.method);
            assert.equal(response.priority, actionRole.priority);
            assert.deepEqual(response.settings, actionRole.settings);
            assert.equal(response.form, template.forms.userRegister._id);
            actionRole = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Delete the role action', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + template.forms.userRegister._id + '/action/' + actionRole._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(done);
      });
    });

    describe('Conditional Actions', function() {
      var helper = null;
      it('Create the forms', function(done) {
        var owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
        helper = new Helper(owner);
        helper
          .project()
          .resource([
            {
              type: 'email',
              persistent: true,
              unique: false,
              protected: false,
              defaultValue: '',
              suffix: '',
              prefix: '',
              placeholder: 'Enter your email address',
              key: 'email',
              label: 'Email',
              inputType: 'email',
              tableView: true,
              input: true
            },
            {
              type: 'selectboxes',
              label: 'Roles',
              key: 'roles',
              input: true,
              values: [
                {
                  label: 'Administrator',
                  value: 'administrator'
                },
                {
                  label: 'Authenticated',
                  value: 'authenticated'
                }
              ]
            }
          ])
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              field: 'email',
              eq: 'equals',
              value: 'admin@example.com'
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'administrator'
            }
          })
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              field: 'email',
              eq: 'equals',
              value: 'auth@example.com'
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated'
            }
          })
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              custom: 'execute = (data.roles.indexOf("administrator") !== -1)'
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'administrator'
            }
          })
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              custom: 'execute = (data.roles.indexOf("authenticated") !== -1)'
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated'
            }
          })
          .execute(done);
      });

      it('Should conditionally execute the add role action.', function(done) {
        helper
          .submission({
            email: 'test@example.com',
            roles: ['administrator']
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) !== -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) === -1);
            done();
          })
      });

      it('Should conditionally execute the add role action.', function(done) {
        helper
          .submission({
            email: 'test@example.com',
            roles: ['authenticated']
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) === -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) !== -1);
            done();
          })
      });

      it('Should conditionally execute the add role action.', function(done) {
        helper
          .submission({
            email: 'admin@example.com'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) !== -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) === -1);
            done();
          })
      });

      it('Should conditionally execute the add role action.', function(done) {
        helper
          .submission({
            email: 'auth@example.com'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) === -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) !== -1);
            done();
          })
      });

      it('Should execute ALL role actions.', function(done) {
        helper
          .submission({
            email: 'auth@example.com',
            roles: ['administrator']
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) !== -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) !== -1);
            done();
          })
      });

      it('Should NOT execute any role actions.', function(done) {
        helper
          .submission({
            email: 'test@example.com',
            roles: ['test']
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) === -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) === -1);
            done();
          });
      });

      it('Executes a does not equal action when not equal', function(done) {
        var owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
        helper = new Helper(owner);
        helper
          .project()
          .resource([
            {
              type: 'email',
              persistent: true,
              unique: false,
              protected: false,
              defaultValue: '',
              suffix: '',
              prefix: '',
              placeholder: 'Enter your email address',
              key: 'email',
              label: 'Email',
              inputType: 'email',
              tableView: true,
              input: true
            },
            {
              type: 'selectboxes',
              label: 'Roles',
              key: 'roles',
              input: true,
              values: [
                {
                  label: 'Administrator',
                  value: 'administrator'
                },
                {
                  label: 'Authenticated',
                  value: 'authenticated'
                }
              ]
            }
          ])
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              field: 'email',
              eq: 'notEqual',
              value: 'none@example.com'
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated'
            }
          })
          .submission({
            email: 'test@example.com'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) === -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) !== -1);
            done();
          });
      });

      it('Does not execute a does not equal action when equal', function(done) {
        helper
          .submission({
            email: 'none@example.com'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) === -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) === -1);
            done();
          });
      });

      it('Executes a equal action when equal', function(done) {
        var owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
        helper = new Helper(owner);
        helper
          .project()
          .resource([
            {
              type: 'email',
              persistent: true,
              unique: false,
              protected: false,
              defaultValue: '',
              suffix: '',
              prefix: '',
              placeholder: 'Enter your email address',
              key: 'email',
              label: 'Email',
              inputType: 'email',
              tableView: true,
              input: true
            },
            {
              type: 'selectboxes',
              label: 'Roles',
              key: 'roles',
              input: true,
              values: [
                {
                  label: 'Administrator',
                  value: 'administrator'
                },
                {
                  label: 'Authenticated',
                  value: 'authenticated'
                }
              ]
            }
          ])
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              field: 'email',
              eq: 'equals',
              value: 'test@example.com'
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated'
            }
          })
          .submission({
            email: 'test@example.com'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) === -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) !== -1);
            done();
          });
      });

      it('Does not execute a equal action when not equal', function(done) {
        helper
          .submission({
            email: 'none@example.com'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.roles.indexOf(helper.template.roles.administrator._id) === -1);
            assert(submission.roles.indexOf(helper.template.roles.authenticated._id) === -1);
            done();
          });
      });

    });
  });
};
