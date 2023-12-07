/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
const assert = require('assert');
const _ = require('lodash');
const chance = new (require('chance'))();
const http = require('http');
const url = require('url');
const { UV_FS_O_FILEMAP } = require('constants');
const docker = process.env.DOCKER;

module.exports = (app, template, hook) => {
  const Helper = require('./helper')(app);
  describe('Actions', () => {
    // Store the temp form for this test suite.
    let tempForm = {
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
            required: false,
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
          input: true,
        },
      ],
    };

    // Store the temp action for this test suite.
    let tempAction = {};
    describe('Bootstrap', () => {
      it('Create a Form for Action tests', (done) => {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
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
            assert(response.access[0].roles.includes(template.roles.anonymous._id.toString()));
            assert(response.access[0].roles.includes(template.roles.authenticated._id.toString()));
            assert(response.access[0].roles.includes(template.roles.administrator._id.toString()));
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
                password: 'password',
              },
            };

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Project Level - Project Owner', () => {
      it('A Project Owner should be able to Create an Action', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${tempForm._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempAction)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
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

      it('A Project Owner should be able to Read an Action', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            assert.deepEqual(response, tempAction);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Update an Action', (done) => {
        const updatedAction = _.clone(tempAction);
        updatedAction.title = 'Updated';

        request(app)
          .put(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({title: updatedAction.title})
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            assert.deepEqual(response, updatedAction);

            tempAction = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should not be able to Patch an Action', (done) => {
        request(app)
          .patch(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send([{op: 'replace', path: 'title', value: 'Patched'}])
          // .expect('Content-Type', /json/)
          .expect(405)
          .end(done);
      });

      it('A Project Owner should be able to Read the Index of Actions', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${tempForm._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            assert.equal(response.length, 2);
            _.each(response, (action) => {
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

      it('Cant access an Action without a valid Action Id', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${tempForm._id}/action/2342342344234`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Project Level - Authenticated User', () => {
      it('A user should not be able to Create an Action for a User-Created Project Form', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${tempForm._id}/action`, template))
          .set('x-jwt-token', template.users.user1.token)
          .send(tempAction)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Read an Action for a User-Created Project Form', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Update an Action for a User-Created Project Form', (done) => {
        request(app)
          .put(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .set('x-jwt-token', template.users.user1.token)
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Read the Index of Actions for a User-Created Project Form', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${tempForm._id}/action`, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should not be able to Delete an Action for a User-Created Project Form', (done) => {
        request(app)
          .delete(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Permissions - Project Level - Anonymous User', () => {
      it('An Anonymous user should not be able to Create an Action for a User-Created Project Form', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${tempForm._id}/action`, template))
          .send(tempAction)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read an Action for a User-Created Project Form', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Update an Action for a User-Created Project Form', (done) => {
        request(app)
          .put(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .send({foo: 'bar'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read the Index of Actions for a User-Created Project Form', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${tempForm._id}/action`, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Delete an Action for a User-Created Project Form', (done) => {
        request(app)
          .delete(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Action MachineNames', () => {
      let _action;
      const name = chance.word();
      let helper;

      before(() => {
        helper = new Helper(template.users.admin, template);
      });

      it('Actions expose their machineNames through the api', (done) => {
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
              password: '',
            },
          })
          .execute((err, result) => {
            if (err) {
              return done(err);
            }

            const action = result.getAction('Webhook');
            assert(action.hasOwnProperty('machineName'));
            _action = action;

            done();
          });
      });

      it('A user can modify their action machineNames', (done) => {
        const newMachineName = chance.word();

        helper
          .action(name, {
            _id: _action._id,
            machineName: newMachineName,
          })
          .execute((err, result) => {
            if (err) {
              return done(err);
            }

            const action = result.getAction('Webhook');
            assert(action.hasOwnProperty('machineName'));
            assert.equal(action.machineName, newMachineName);

            done();
          });
      });
    });

    describe('Webhook Functionality tests', () => {
      if (docker) {
        return;
      }

      // The temp form with the add RoleAction for existing submissions.
      let webhookForm = {
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
              required: false,
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
            placeholder: 'foo',
            key: 'lastName',
            label: 'Last Name',
            inputMask: '',
            inputType: 'text',
            input: true,
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
            input: true,
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
            input: true,
          },
        ],
      };

      let webhookForm1 = {
        title: 'Webhook Form 1',
        name: 'webhookform1',
        path: 'webhookform1',
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
              required: false,
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
            placeholder: 'foo',
            key: 'lastName',
            label: 'Last Name',
            inputMask: '',
            inputType: 'text',
            input: true,
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
            input: true,
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
            input: true,
          },
        ],
      };

      let port = 4002;
      let webhookSubmission = null;
      let webhookHandler = () => {};
      let webhookServer = null;

      // Create a new server.
      const newServer = (ready) => {
        const server = http.createServer((request, response) => {
          let body = [];

          if (request.url === '/plain-text') {
            response.setHeader('Content-Type', 'text/plain; charset=utf-8;');
            response.write('200 OK');
            response.statusCode = 200;
            response.end();
          }
          else {
            request.on('data', (chunk) => {
              body.push(chunk);
            }).on('end', () => {
              body = Buffer.concat(body).toString();
              webhookHandler(body ? JSON.parse(body) : body, url.parse(request.url, true));
            });
          }
        });
        server.port = port++;
        server.url = `http://localhost:${server.port}`;
        server.listen(server.port, () => {
          hook.alter('webhookServer', server, app, template, (err, server) => {
            ready(err, server);
          });
        });
      };

      it('Should create the form and action for the webhook tests', (done) => {
        newServer((err, server) => {
          if (err) {
            return done(err);
          }

          webhookServer = server;

          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(webhookForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              webhookForm = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              request(app)
                .post(hook.alter('url', `/form/${webhookForm._id}/action`, template))
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
                    password: '',
                  },
                })
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });
      });

      it('Should send a webhook with create data.', (done) => {
        webhookHandler = (body) => {
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
          .post(hook.alter('url', `/form/${webhookForm._id}/submission`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              firstName: 'Test',
              lastName: 'Person',
              email: 'test@example.com',
              password: '123testing',
            },
          })
          .expect(201)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            webhookSubmission = res.body;
          });
      });

      it('Should be able to get the data from the webhook action.', (done) => {
        request(app)
          .get(hook.alter('url', `/form/${webhookForm._id}/submission/${webhookSubmission._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
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

      it('Should send a webhook with update data.', (done) => {
        webhookHandler = (body) => {
          body = hook.alter('webhookBody', body);

          assert.equal(body.params.formId, webhookForm._id.toString());
          assert.equal(body.request.data.email, 'test@example.com');
          assert.equal(body.request.data.firstName, 'Test2');
          assert.equal(body.request.data.lastName, 'Person3');
          assert.deepEqual(_.pick(body.submission, _.keys(webhookSubmission)), webhookSubmission);

          done();
        };
        request(app)
          .put(hook.alter('url', `/form/${webhookForm._id}/submission/${webhookSubmission._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              firstName: 'Test2',
              lastName: 'Person3',
              email: 'test@example.com',
            },
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            webhookSubmission = res.body;
          });
      });

      it('Should send a webhook with deleted data.', (done) => {
        webhookHandler = (body, url) => {
          body = hook.alter('webhookBody', body);

          assert.equal(url.query.formId, webhookForm._id);
          assert.equal(url.query.submissionId, webhookSubmission._id);

          done();
        };

        request(app)
          .delete(hook.alter('url', `/form/${webhookForm._id}/submission/${webhookSubmission._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err) => {
            if (err) {
              return done(err);
            }
          });
      });

      it('Should create the form and action for the webhook tests with conditionals', (done) => {
        newServer((err, server) => {
          if (err) {
            return done(err);
          }
          webhookServer = server;
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(webhookForm1)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }
              webhookForm1 = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              request(app)
                .post(hook.alter('url', `/form/${webhookForm1._id}/action`, template))
                .set('x-jwt-token', template.users.admin.token)
                .send({
                  title: 'Webhook',
                  name: 'webhook',
                  form: webhookForm1._id.toString(),
                  handler: ['after'],
                  method: ['create', 'update', 'delete'],
                  priority: 1,
                  settings: {
                    url: server.url,
                    username: '',
                    password: '',
                  },
                  condition: {
                    field: 'lastName',
                    eq: 'equals',
                    value: '123'
                  },
                })
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }
                  template.users.admin.token = res.headers['x-jwt-token'];
                  done();
                });
            });
        });
      });

      it('Should send a webhook with create data with conditionals', (done) => {
        request(app)
        .post(hook.alter('url', `/form/${webhookForm1._id}/submission`, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          data: {
            firstName: 'testCondition',
            lastName: 'Person',
            email: 'test@example.com',
            password: '123testing',
          },
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          done();
          webhookSubmission = res.body;
        });
      });

      it('Should send a webhook with deleted data with conditionals', (done) => {
        webhookHandler = (body, url) => {
          body = hook.alter('webhookBody', body);
          assert.equal(url.query.formId, webhookForm1._id);
          assert.equal(url.query.submissionId, webhookSubmission._id);
          done();
        };

        request(app)
          .delete(hook.alter('url', `/form/${webhookForm1._id}/submission/${webhookSubmission._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err) => {
            if (err) {
              return done(err);
            }
            done();
          });
      });

     if (app.hasProject) {
      describe('Webhook with non JSON response', () => {
        if (docker) {
          return;
        }

        // The temp form with the add RoleAction for existing submissions.
        let webhookForm2 = {
          title: 'Webhook Form 2',
          name: 'webhookform2',
          path: 'webhookform2',
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
                required: false,
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
              placeholder: 'foo',
              key: 'lastName',
              label: 'Last Name',
              inputMask: '',
              inputType: 'text',
              input: true,
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
              input: true,
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
              input: true,
            },
          ],
        };

        it('Should create the form and action for the webhook tests 2', (done) => {
          request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(webhookForm2)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            webhookForm2 = res.body;
            template.users.admin.token = res.headers['x-jwt-token'];
            request(app)
              .post(hook.alter('url', `/form/${webhookForm2._id}/action`, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({
                title: 'Webhook',
                name: 'webhook',
                form: webhookForm2._id.toString(),
                handler: ['after'],
                method: ['create', 'update', 'delete'],
                priority: 1,
                settings: {
                  url: `${webhookServer.url}/plain-text`,
                  username: '',
                  password: '',
                  block: true
                },
              })
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        it('Should send a webhook with create data and receive a 400 error.', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${webhookForm2._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
                email: 'test@example.com',
                password: '123testing',
              },
            })
            .expect(400)
            .end((err, res) => {
              if (err) {
                return done(err);
              }
              assert.equal(res.text.indexOf('invalid json response body'), 0);
              done();
            });
        });
      });
     }
    });

    describe('EmailAction Functionality tests', () => {
      if (docker) {
        return;
      }

      const adminUser = (token) => {
        const user = template.users.formioAdmin ? 'formioAdmin' : 'admin';

        if (token) {
          template.users[user].token = token;
        }
        else {
          return template.users[user];
        }
      };

      // The temp form with the add RoleAction for existing submissions.
      const emailForm = {
        title: 'Email Form',
        name: 'emailform',
        path: 'emailform',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            type: 'textfield',
            key: 'firstName',
            label: 'First Name',
            input: true,
          },
          {
            type: 'textfield',
            key: 'lastName',
            label: 'Last Name',
            input: true,
          },
          {
            type: 'email',
            key: 'email',
            label: 'Email',
            input: true,
          },
        ],
      };

      // The temp role add action for existing submissions.
      const emailAction = {
        title: 'Email',
        name: 'email',
        handler: ['after'],
        method: ['create'],
        priority: 1,
        settings: {},
      };

      let numTests = 0;
      const newEmailTest = (settings, done) => {
        numTests++;
        settings.transport = 'test';
        let testForm = _.assign(_.cloneDeep(emailForm), {
          title: (emailForm.title + numTests),
          name: (emailForm.name + numTests),
          path: (emailForm.path + numTests),
        });
        let testAction = _.assign(_.cloneDeep(emailAction), {
          settings,
        });

        // Create the form.
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', adminUser().token)
          .send(testForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            testForm = res.body;
            testAction.form = testForm._id;
            adminUser(res.headers['x-jwt-token']);

            // Add the action to the form.
            request(app)
              .post(hook.alter('url', `/form/${testForm._id}/action`, template))
              .set('x-jwt-token', adminUser().token)
              .send(testAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                testAction = res.body;
                adminUser(res.headers['x-jwt-token']);

                done(null, testForm, testAction);
              });
          });
      };

      it('Should send an email with messages (without Reply-To header).', (done) => {
        newEmailTest({
          from: 'travis@form.io',
          replyTo: '',
          emails: '{{ data.email }}',
          sendEach: false,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}',
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          event.once('newMail', (email) => {
            assert.equal(email.from, 'travis@form.io');
            assert.equal(email.to, 'test@example.com');
            assert(email.html.startsWith('Howdy, '));
            assert.equal(email.subject, 'Hello there Test Person');

            done();
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
                email: 'test@example.com',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                return done(err);
              }
            });
        });
      });

      it('Should send an email with messages (with Reply-To header).', (done) => {
        newEmailTest({
          from: 'travis@form.io',
          replyTo: 'reply@example.com',
          emails: '{{ data.email }}',
          sendEach: false,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}',
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          event.once('newMail', (email) => {
            assert.equal(email.from, 'travis@form.io');
            assert.equal(email.to, 'test@example.com');
            assert(email.html.startsWith('Howdy, '));
            assert.equal(email.subject, 'Hello there Test Person');
            assert.equal(email.replyTo, 'reply@example.com');

            done();
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
                email: 'test@example.com',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                return done(err);
              }
            });
        });
      });

      it('Should send an email with multiple recipients (without Reply-To header).', (done) => {
        newEmailTest({
          from: '{{ data.email }}',
          replyTo: '',
          emails: '{{ data.email }}, gary@form.io',
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}',
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          event.once('newMail', (email) => {
            assert.equal(email.from, 'joe@example.com');
            assert.equal(email.to, 'joe@example.com, gary@form.io');
            assert(email.html.startsWith('Howdy, '));
            assert.equal(email.subject, 'Hello there Joe Smith');

            done();
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Joe',
                lastName: 'Smith',
                email: 'joe@example.com',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                return done(err);
              }
            });
        });
      });

      it('Should send an email with multiple recipients (with Reply-To header).', (done) => {
        newEmailTest({
          from: '{{ data.email }}',
          replyTo: 'reply@example.com',
          emails: '{{ data.email }}, gary@form.io',
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}',
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          event.once('newMail', (email) => {
            assert.equal(email.from, 'joe@example.com');
            assert.equal(email.to, 'joe@example.com, gary@form.io');
            assert(email.html.startsWith('Howdy, '));
            assert.equal(email.subject, 'Hello there Joe Smith');
            assert.equal(email.replyTo, 'reply@example.com');

            done();
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Joe',
                lastName: 'Smith',
                email: 'joe@example.com',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                return done(err);
              }
            });
        });
      });

      it('Should send an email with multiple separate messages (without Reply-To header).', (done) => {
        newEmailTest({
          from: 'travis@form.io',
          replyTo: '',
          emails: '{{ data.email }}, gary@form.io',
          sendEach: true,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}',
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          const emailTos = {'gary@form.io': true, 'test@example.com': true};
          event.on('newMail', (email) => {
            assert.equal(email.from, 'travis@form.io');
            assert(emailTos[email.to]);
            delete emailTos[email.to];
            assert.equal(email.html.indexOf('Howdy, '), 0);
            assert.equal(email.subject, 'Hello there Test Person');
            if (Object.keys(emailTos).length === 0) {
              event.removeAllListeners('newMail');
              done();
            }
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
                email: 'test@example.com',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                done(err);
              }
            });
        });
      });

      it('Should send an email with multiple separate messages (with Reply-To header).', (done) => {
        newEmailTest({
          from: 'travis@form.io',
          replyTo: 'reply@example.com',
          emails: '{{ data.email }}, gary@form.io',
          sendEach: true,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message: 'Howdy, {{ id }}',
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          const emailTos = {'gary@form.io': true, 'test@example.com': true};
          event.on('newMail', (email) => {
            assert.equal(email.from, 'travis@form.io');
            assert(emailTos[email.to]);
            delete emailTos[email.to];
            assert.equal(email.html.indexOf('Howdy, '), 0);
            assert.equal(email.subject, 'Hello there Test Person');
            assert.equal(email.replyTo, 'reply@example.com');
            if (Object.keys(emailTos).length === 0) {
              event.removeAllListeners('newMail');
              done();
            }
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
                email: 'test@example.com',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                done(err);
              }
            });
        });
      });

      it('Should send a giant email to large amount of people (without Reply-To header).', (done) => {
        const amountOfEmails = 10000;
        const addresses = _.range(amountOfEmails).map((index) => `test${index}@example.com`).join(',');
        const message = chance.paragraph({sentences: 1000});
        let receivedEmails = 0;

        newEmailTest({
          from: 'travis@form.io',
          replyTo: false,
          emails: addresses,
          sendEach: true,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message,
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          event.on('newMail', (email) => {
            assert.equal(email.from, 'travis@form.io');
            // assert.equal(email.to, `test${receivedEmails}@example.com`);
            assert.equal(email.html, message);
            assert.equal(email.subject, 'Hello there Test Person');

            receivedEmails += 1;

            if (receivedEmails === amountOfEmails) {
              event.removeAllListeners('newMail');
              done();
            }
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                done(err);
              }
            });
        });
      });

      it('Should send a giant email to large amount of people (with Reply-To header).', (done) => {
        const amountOfEmails = 10000;
        const addresses = _.range(amountOfEmails).map((index) => `test${index}@example.com`).join(',');
        const message = chance.paragraph({sentences: 1000});
        let receivedEmails = 0;

        newEmailTest({
          from: 'travis@form.io',
          replyTo: 'reply@example.com',
          emails: addresses,
          sendEach: true,
          subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
          message,
        }, (err, testForm) => {
          if (err) {
            return done(err);
          }

          // Check for an email.
          const event = template.hooks.getEmitter();
          event.on('newMail', (email) => {
            assert.equal(email.from, 'travis@form.io');
            // assert.equal(email.to, `test${receivedEmails}@example.com`);
            assert.equal(email.html, message);
            assert.equal(email.subject, 'Hello there Test Person');
            assert.equal(email.replyTo, 'reply@example.com');

            receivedEmails += 1;

            if (receivedEmails === amountOfEmails) {
              event.removeAllListeners('newMail');
              done();
            }
          });

          request(app)
            .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
            .set('x-jwt-token', adminUser().token)
            .send({
              data: {
                firstName: 'Test',
                lastName: 'Person',
              },
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err) => {
              if (err) {
                done(err);
              }
            });
        });
      });

      if (template.users.formioAdmin) {
        describe('EmailAction form.io domain permissions', () => {
          if (docker) {
            return;
          }

          // The temp form with the add RoleAction for existing submissions.
          const emailForm = {
            title: 'Email Form',
            name: 'emailform2',
            path: 'emailform2',
            type: 'form',
            access: [],
            submissionAccess: [],
            components: [
              {
                type: 'textfield',
                key: 'firstName',
                label: 'First Name',
                input: true,
              },
              {
                type: 'textfield',
                key: 'lastName',
                label: 'Last Name',
                input: true,
              },
              {
                type: 'email',
                key: 'email',
                label: 'Email',
                input: true,
              },
            ],
          };

          // The temp role add action for existing submissions.
          const emailAction = {
            title: 'Email',
            name: 'email',
            handler: ['after'],
            method: ['create'],
            priority: 1,
            settings: {},
          };

          let numTests = 0;
          const newEmailTest = (settings, done) => {
            numTests++;
            settings.transport = 'test';
            let testForm = _.assign(_.cloneDeep(emailForm), {
              title: (emailForm.title + numTests),
              name: (emailForm.name + numTests),
              path: (emailForm.path + numTests),
            });
            let testAction = _.assign(_.cloneDeep(emailAction), {
              settings,
            });

            // Create the form.
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(testForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                testForm = res.body;
                testAction.form = testForm._id;
                template.users.admin.token = res.headers['x-jwt-token'];

                // Add the action to the form.
                request(app)
                  .post(hook.alter('url', `/form/${testForm._id}/action`, template))
                  .set('x-jwt-token', template.users.admin.token)
                  .send(testAction)
                  .expect('Content-Type', /json/)
                  .expect(201)
                  .end((err, res) => {
                    if (err) {
                      return done(err);
                    }

                    testAction = res.body;
                    template.users.admin.token = res.headers['x-jwt-token'];

                    done(null, testForm, testAction);
                  });
              });
          };

          it('Shouldn\'t send an email from form.io domain if owner is not related to form.io domain.', (done) => {
            newEmailTest({
              from: 'travis@form.io',
              emails: '{{ data.email }}',
              sendEach: false,
              subject: 'Hello there {{ data.firstName }} {{ data.lastName }}',
              message: 'Howdy, {{ id }}',
            }, (err, testForm) => {
              if (err) {
                return done(err);
              }

              // Check for an email.
              const event = template.hooks.getEmitter();
              event.once('newMail', (email) => {
                done('Shouldn\'t send an email from form.io domain if owner is not related to form.io domain.');
              });

              request(app)
                .post(hook.alter('url', `/form/${testForm._id}/submission`, template))
                .set('x-jwt-token', template.users.admin.token)
                .send({
                  data: {
                    firstName: 'Test',
                    lastName: 'Person',
                    email: 'test@example.com',
                  },
                })
                .expect(201)
                .expect('Content-Type', /json/)
                .end((err) => {
                  if (err) {
                    event.removeAllListeners('newMail');
                    return done(err);
                  }
                  console.log('Script execution timed out after 15000ms');
                  setTimeout(() => {
                    event.removeAllListeners('newMail');
                    done();
                  }, 15000);
                });
            });
          });
        });
      }
    });

    describe('RoleAction Functionality tests', () => {
      // The temp form with the add RoleAction for existing submissions.
      let addForm = {
        title: 'Add Form',
        name: 'addform',
        path: 'addform',
        type: 'form',
        submissionAccess: [],
        components: [],
      };

      // The temp form with the remove RoleAction for existing submissions.
      let removeForm = {
        title: 'Remove Form',
        name: 'removeform',
        path: 'removeform',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [],
      };

      // The temp form with the add RoleAction for new submissions.
      let submissionForm = {
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
              required: false,
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
            input: true,
          },
        ],
      };

      // The temp role add action for existing submissions.
      let addAction = {
        title: 'Add Role',
        name: 'role',
        handler: ['before'],
        method: ['create'],
        priority: 1,
        settings: {
          association: 'existing',
          type: 'add',
        },
      };

      // The temp role remove action for existing submissions.
      let removeAction = {
        title: 'Remove Role',
        name: 'role',
        handler: ['before'],
        method: ['create'],
        priority: 1,
        settings: {
          association: 'existing',
          type: 'remove',
        },
      };

      // The temp role add action for new submissions.
      let submissionAction = {
        title: 'Add Role',
        name: 'role',
        handler: ['after'],
        method: ['create'],
        priority: 1,
        settings: {
          association: 'new',
          type: 'add',
          role: null,
        },
      };

      // The temp submission.
      let submission = {};

      // The dummy role for this test suite.
      let dummyRole = {
        title: 'dummyRole',
        description: 'A dummy role.',
      };

      describe('Bootstrap', () => {
        it('Create the dummy role', (done) => {
          request(app)
            .post(hook.alter('url', '/role', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(dummyRole)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
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

        describe('Role dependent', () => {
          // Attach the dummy role to the submission action before starting its tests.
          before(() => {
            submissionForm.access = [
              {type: 'read_all', roles: [template.roles.anonymous._id.toString()]},
            ];
            submissionForm.submissionAccess = [
              {type: 'create_own', roles: [template.roles.anonymous._id.toString()]},
              {type: 'read_own', roles: [dummyRole._id]},
              {type: 'update_own', roles: [dummyRole._id]},
              {type: 'delete_own', roles: [dummyRole._id]},
            ];

            submissionAction.settings.role = dummyRole._id;
          });

          // Create the dummy forms and attach each respective action.
          it('Create the addForm Form', (done) => {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(addForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
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
                assert(response.access[0].roles.includes(template.roles.anonymous._id.toString()));
                assert.equal(response.submissionAccess.length, 0);
                assert.deepEqual(response.components, addForm.components);
                addForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Attach the addAction (RoleAction) to its Form', (done) => {
            request(app)
              .post(hook.alter('url', `/form/${addForm._id}/action`, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(addAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
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

          it('Create the removeForm Form', (done) => {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(removeForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
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
                assert(response.access[0].roles.includes(template.roles.anonymous._id.toString()));
                assert(response.access[0].roles.includes(template.roles.authenticated._id.toString()));
                assert(response.access[0].roles.includes(template.roles.administrator._id.toString()));
                assert(response.access[0].roles.includes(dummyRole._id));
                assert.deepEqual(response.submissionAccess, []);
                assert.deepEqual(response.components, removeForm.components);
                removeForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Attach the removeAction (RoleAction) to its Form', (done) => {
            request(app)
              .post(hook.alter('url', `/form/${removeForm._id}/action`, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(removeAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
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

          it('Create the submissionForm Form', (done) => {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submissionForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
                assert(response.hasOwnProperty('submissionAccess'), 'The response should contain an the `submissionAccess`.');
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 1);
                assert(response.access[0].roles.includes(template.roles.anonymous._id.toString()));
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

          it('Attach the submissionAction (RoleAction) to its Form', (done) => {
            request(app)
              .post(hook.alter('url', `/form/${submissionForm._id}/action`, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submissionAction)
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
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

      describe('RoleAction Functionality tests for Existing Submissions', () => {
        it('The user should not have the dummy Role assigned', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${template.resources.admin._id}/submission/${template.users.admin._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              // Confirm the response does not contain the dummy role.
              const response = res.body;
              assert(!response.roles.includes(dummyRole._id));

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A submission to the addForm Form should archive the role addition and update the Submission with the dummy Role added', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${addForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id,
              },
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to include the new role.
              request(app)
                .get(hook.alter('url', `/form/${template.resources.admin._id}/submission/${template.users.admin._id}`, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;
                  assert(response.roles.includes(dummyRole._id));

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('A submission to the removeForm Form should archive the role removal and update the Submission with the dummy Role removed', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${removeForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id,
              },
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to not include the dummy role.
              request(app)
                .get(hook.alter('url', `/form/${template.resources.admin._id}/submission/${template.users.admin._id}`, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;
                  assert(!response.roles.includes(dummyRole._id));

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('A submission to the addForm Form using the Form alias should return the updated Submission with the dummy Role added', (done) => {
          request(app)
            .post(hook.alter('url', `/${addForm.path}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id,
              },
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to include the new role.
              request(app)
                .get(hook.alter('url', `/form/${template.resources.admin._id}/submission/${template.users.admin._id}`, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;
                  assert(response.roles.includes(dummyRole._id));

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('A submission to the removeForm Form using the Form alias should return the updated Submission with the dummy Role removed', (done) => {
          request(app)
            .post(hook.alter('url', `/${removeForm.path}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: dummyRole._id,
                submission: template.users.admin._id,
              },
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              // Update the stored token.
              template.users.admin.token = res.headers['x-jwt-token'];

              // Confirm that the user was updated to not include the dummy role.
              request(app)
                .get(hook.alter('url', `/form/${template.resources.admin._id}/submission/${template.users.admin._id}`, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;
                  assert(!response.roles.includes(dummyRole._id));

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('The user should not be able to assign a role that they do not have access to (including invalid roles)', (done) => {
          request(app)
            .post(hook.alter('url', `/${addForm.path}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                role: template.users.user1._id, // invalid roleId, but a valid MongoDB ObjectId.
                submission: template.users.user1._id,
              },
            })
            .expect(400)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('RoleAction Functionality tests for New Submissions', () => {
        it('A new Submission to the submissionForm should create a new Submission and contain the dummyRole Role', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${submissionForm._id}/submission`, template))
            .send({
              data: {
                foo: 'bar',
              },
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.roles.includes(dummyRole._id));
              submission = response;

              done();
            });
        });
      });

      describe('RoleAction Normalization', () => {
        it('Remove the temp submission', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${submissionForm._id}/submission/${submission._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              submission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the dummy role', (done) => {
          request(app)
            .delete(hook.alter('url', `/role/${dummyRole._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              dummyRole = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the submissionAction', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${submissionForm._id}/action/${submissionAction._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              submissionAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the removeAction', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${removeForm._id}/action/${removeAction._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              removeAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the addAction', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${addForm._id}/action/${addAction._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              addAction = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the submissionForm', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${submissionForm._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              submissionForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the removeForm', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${removeForm._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              removeForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Remove the addForm', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${addForm._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              addForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('AuthAction Functionality tests', () => {
      let dummyResource = {
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
              required: false,
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
            input: true,
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'password',
            label: 'password',
            inputType: 'password',
            input: true,
          },
        ],
      };

      let authForm = {
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
              required: false,
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
            input: true,
          },
          {
            type: 'password',
            suffix: '',
            prefix: '',
            placeholder: 'password',
            key: 'password',
            label: 'password',
            inputType: 'password',
            input: true,
          },
        ],
      };

      describe('Bootstrap', () => {
        it('Create the dummy resource form', (done) => {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(dummyResource)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
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
              assert(response.access[0].roles.includes(template.roles.anonymous._id.toString()));
              assert(response.access[0].roles.includes(template.roles.authenticated._id.toString()));
              assert(response.access[0].roles.includes(template.roles.administrator._id.toString()));
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, dummyResource.components);
              dummyResource = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the dummy role assignment action', (done) => {
          let roleAction = {
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            settings: {
              association: 'new',
              type: 'add',
              role: template.users.admin._id.toString(),
            },
          };

          request(app)
            .post(hook.alter('url', `/form/${dummyResource._id}/action`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(roleAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
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

        it('Create the dummy auth form', (done) => {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(authForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
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
              assert(response.access[0].roles.includes(template.roles.anonymous._id.toString()));
              assert(response.access[0].roles.includes(template.roles.authenticated._id.toString()));
              assert(response.access[0].roles.includes(template.roles.administrator._id.toString()));
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, authForm.components);
              authForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the dummy save submission action', (done) => {
          let authAction = {
            title: 'Save Submission',
            name: 'save',
            handler: ['before'],
            method: ['create', 'update'],
            priority: 11,
            settings: {
              resource: dummyResource._id.toString(),
              fields: {
                username: 'username',
                password: 'password',
              },
            },
          };

          request(app)
            .post(hook.alter('url', `/form/${authForm._id}/action`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(authAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
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
        it('Create the dummy auth login action', (done) => {
          let authLoginAction = {
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
              lockWait: 10,
            },
          };

          request(app)
            .post(hook.alter('url', `/form/${authForm._id}/action`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(authLoginAction)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
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

      describe('AuthAction Functionality tests for New Submissions', () => {
        it('A AuthAction should not be able to assign a role that is not accessible (including invalid roles)', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${authForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                'username': chance.word({length: 10}),
                'password': chance.word({length: 10}),
              },
            })
            .expect(400)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('AuthAction Normalization', () => {
        it('Should delete the dummy resource', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${dummyResource._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              dummyResource = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Should delete the authForm', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${authForm._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});
              authForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Action Normalization', () => {
      it('A Project Owner should be able to Delete an Action', (done) => {
        request(app)
          .delete(hook.alter('url', `/form/${tempForm._id}/action/${tempAction._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            assert.deepEqual(response, {});

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      if (!docker) 
      it('A deleted Action should remain in the database', (done) => {
        const formio = hook.alter('formio', app.formio);
        formio.actions.model.findOne({_id: tempAction._id})
          .exec((err, action) => {
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

      it('Delete the Form used for Action tests', (done) => {
        request(app)
          .delete(hook.alter('url', `/form/${tempForm._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            assert.deepEqual(response, {});

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      if (!docker)
      it('A deleted Form should not have active actions in the database', (done) => {
        const formio = hook.alter('formio', app.formio);
        formio.actions.model.find({form: tempForm._id, deleted: {$eq: null}})
          .exec((err, action) => {
            if (err) {
              return done(err);
            }

            if (action && action.length !== 0) {
              return done(`Active actions found w/ form: ${tempForm._id}, expected 0.`);
            }

            done();
          });
      });

      let actionLogin = null;
      it('A Project Owner should be able to Create an Authentication Action (Login Form)', (done) => {
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
            lockWait: 10,
          },
        };

        request(app)
          .post(hook.alter('url', `/form/${template.forms.userLogin._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({data: actionLogin})
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
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

      it('Delete the login action', (done) => {
        request(app)
          .delete(hook.alter('url', `/form/${template.forms.userLogin._id}/action/${actionLogin._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(done);
      });

      let actionRegister = null;
      it('A Project Owner should be able to Create an Authentication Action (Registration Form)', (done) => {
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
            lockWait: 10,
          },
        };

        request(app)
          .post(hook.alter('url', `/form/${template.forms.userRegister._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({data: actionRegister})
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
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

      it('Delete the register action', (done) => {
        request(app)
          .delete(hook.alter('url', `/form/${template.forms.userRegister._id}/action/${actionRegister._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(done);
      });

      let actionRole = null;
      it('A Project Owner should be able to Create a Role Assignment Action (Registration Form)', (done) => {
        actionRole = {
          title: 'Role Assignment',
          name: 'role',
          handler: ['after'],
          method: ['create'],
          priority: 1,
          settings: {
            association: 'new',
            type: 'add',
            role: template.roles.authenticated._id.toString(),
          },
        };

        request(app)
          .post(hook.alter('url', `/form/${template.forms.userRegister._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({data: actionRole})
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
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

      it('Delete the role action', (done) => {
        request(app)
          .delete(hook.alter('url', `/form/${template.forms.userRegister._id}/action/${actionRole._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .end(done);
      });
    });

    describe('Conditional Actions', () => {
      let helper = null;
      it('Create the forms', (done) => {
        const owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
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
              input: true,
            },
            {
              type: 'select',
              label: 'Roles',
              key: 'roles',
              input: true,
              multiple: true,
              dataSrc: 'values',
              data: {
                values: [
                  {
                    label: 'Administrator',
                    value: 'administrator',
                  },
                  {
                    label: 'Authenticated',
                    value: 'authenticated',
                  },
                ],
              },
            },
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
              value: 'admin@example.com',
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'administrator',
            },
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
              value: 'auth@example.com',
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated',
            },
          })
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              custom: 'execute = (data.roles.indexOf("administrator") !== -1)',
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'administrator',
            },
          })
          .action({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            condition: {
              custom: 'execute = (data.roles.indexOf("authenticated") !== -1)',
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated',
            },
          })
          .execute(done);
      });

      it('Should conditionally execute the add role action.', (done) => {
        helper
          .submission({
            email: 'test@example.com',
            roles: ['administrator'],
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(submission.roles.includes(helper.template.roles.administrator._id));
            assert(!submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Should conditionally execute the add role action.', (done) => {
        helper
          .submission({
            email: 'test@example.com',
            roles: ['authenticated'],
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(!submission.roles.includes(helper.template.roles.administrator._id));
            assert(submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Should conditionally execute the add role action.', (done) => {
        helper
          .submission({
            email: 'admin@example.com',
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(submission.roles.includes(helper.template.roles.administrator._id));
            assert(!submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Should conditionally execute the add role action.', (done) => {
        helper
          .submission({
            email: 'auth@example.com',
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(!submission.roles.includes(helper.template.roles.administrator._id));
            assert(submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Should execute ALL role actions.', (done) => {
        helper
          .submission({
            email: 'auth@example.com',
            roles: ['administrator'],
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(submission.roles.includes(helper.template.roles.administrator._id));
            assert(submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Should NOT execute any role actions.', (done) => {
        helper
          .submission({
            email: 'test@example.com',
            roles: ['test'],
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(!submission.roles.includes(helper.template.roles.administrator._id));
            assert(!submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Executes a does not equal action when not equal', (done) => {
        const owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
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
              input: true,
            },
            {
              type: 'selectboxes',
              label: 'Roles',
              key: 'roles',
              input: true,
              values: [
                {
                  label: 'Administrator',
                  value: 'administrator',
                },
                {
                  label: 'Authenticated',
                  value: 'authenticated',
                },
              ],
            },
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
              value: 'none@example.com',
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated',
            },
          })
          .submission({
            email: 'test@example.com',
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(!submission.roles.includes(helper.template.roles.administrator._id));
            assert(submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Does not execute a does not equal action when equal', (done) => {
        helper
          .submission({
            email: 'none@example.com',
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(!submission.roles.includes(helper.template.roles.administrator._id));
            assert(!submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Executes a equal action when equal', (done) => {
        const owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
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
              input: true,
            },
            {
              type: 'selectboxes',
              label: 'Roles',
              key: 'roles',
              input: true,
              values: [
                {
                  label: 'Administrator',
                  value: 'administrator',
                },
                {
                  label: 'Authenticated',
                  value: 'authenticated',
                },
              ],
            },
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
              value: 'test@example.com',
            },
            settings: {
              association: 'new',
              type: 'add',
              role: 'authenticated',
            },
          })
          .submission({
            email: 'test@example.com',
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(!submission.roles.includes(helper.template.roles.administrator._id));
            assert(submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });

      it('Does not execute a equal action when not equal', (done) => {
        helper
          .submission({
            email: 'none@example.com',
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert(!submission.roles.includes(helper.template.roles.administrator._id));
            assert(!submission.roles.includes(helper.template.roles.authenticated._id));

            done();
          });
      });
    });
  });
};
