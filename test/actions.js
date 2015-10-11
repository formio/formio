'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var chance = new (require('chance'))();

module.exports = function(app, template, hook) {
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
    var tempAction = {
      title: 'Authentication',
      name: 'auth',
      handler: ['before'],
      method: ['create'],
      priority: 0,
      settings: {
        association: 'existing',
        username: 'user.username',
        password: 'user.password'
      }
    };

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
            assert.equal(response.length, 1);
            assert.deepEqual(response, [tempAction]);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Cant access an Action without a valid Action Id', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action/💩', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(500)
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
          .expect('Content-Type', /json/)
          .expect(200)
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

      it('A user should be able to Read the Index of Actions for a User-Created Project Form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1);
            assert.deepEqual(response, [tempAction]);

            done();
          });
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
          .expect('Content-Type', /json/)
          .expect(200)
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

      it('An Anonymous user should be able to Read the Index of Actions for a User-Created Project Form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/action', template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1);
            assert.deepEqual(response, [tempAction]);

            done();
          });
      });

      it('An Anonymous user should not be able to Delete an Action for a User-Created Project Form', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + tempForm._id + '/action/' + tempAction._id, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('RoleAction Functionality tests', function() {
      // The temp form with the add RoleAction for existing submissions.
      var addForm = {
        title: 'Add Form',
        name: 'addform',
        path: 'addform',
        type: 'form',
        access: [],
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
                assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(dummyRole._id), -1);
                assert.deepEqual(response.submissionAccess, []);
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
                assert.equal(response.access[0].roles.length, 4);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
                assert.notEqual(response.access[0].roles.indexOf(dummyRole._id), -1);
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
            .get(hook.alter('url', '/form/' + template.resources.user._id + '/submission/' + template.users.user1._id, template))
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
                submission: template.users.user1._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.data.role, dummyRole._id);
              assert.equal(response.data.submission, template.users.user1._id);

              request(app)
                .get(hook.alter('url', '/form/' + template.resources.user._id + '/submission/' + template.users.user1._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var _response = res.body;
                  assert.notEqual(_response.roles.indexOf(dummyRole._id), -1);

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
                submission: template.users.user1._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.data.role, dummyRole._id);
              assert.equal(response.data.submission, template.users.user1._id);

              request(app)
                .get(hook.alter('url', '/form/' + template.resources.user._id + '/submission/' + template.users.user1._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var _response = res.body;
                  assert.equal(_response.roles.indexOf(dummyRole._id), -1);

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
                submission: template.users.user1._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.data.role, dummyRole._id);
              assert.equal(response.data.submission, template.users.user1._id);

              request(app)
                .get(hook.alter('url', '/form/' + template.resources.user._id + '/submission/' + template.users.user1._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var _response = res.body;
                  assert.notEqual(_response.roles.indexOf(dummyRole._id), -1);

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
                submission: template.users.user1._id
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.data.role, dummyRole._id);
              assert.equal(response.data.submission, template.users.user1._id);

              request(app)
                .get(hook.alter('url', '/form/' + template.resources.user._id + '/submission/' + template.users.user1._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var _response = res.body;
                  assert.equal(_response.roles.indexOf(dummyRole._id), -1);

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
            .expect(200)
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
        components: []
      };

      var authAction = {
        title: 'Authentication',
        name: 'auth',
        handler: ['before'],
        method: ['create'],
        priority: 0,
        settings: {
          association: 'new',
          username: 'dummy.username',
          password: 'dummy.password'
        }
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

        it('Create the dummy auth action', function(done) {
          authAction.settings.role = template.users.admin._id; // Some random, but valid ObjectId.

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
      });

      describe('AuthAction Functionality tests for New Submissions', function() {
        it('A AuthAction should not be able to assign a role that is not accessible (including invalid roles)', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + authForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                'dummy.username': chance.word({length: 10}),
                'dummy.password': chance.word({length: 10})
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
            .expect(204)
            .end(function(err, res) {
              if(err) {
                return done(err);
              }

              var response = res.text;
              assert.equal(response, '');
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
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, '');

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A deleted Action should remain in the database', function(done) {
        if (!app.formio) return done();

        app.formio.actions.model.findOne({_id: tempAction._id})
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
          .expect(204)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.deepEqual(response, '');

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A deleted Form should not have active actions in the database', function(done) {
        if (!app.formio) return done();

        app.formio.actions.model.find({form: tempForm._id, deleted: {$eq: null}})
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
          title: 'Authentication',
          name: 'auth',
          handler: ['before'],
          method: ['create'],
          priority: 0,
          settings: {
            association: 'existing',
            username: 'user.username',
            password: 'user.password'
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
          .expect(204)
          .end(done);
      });

      var actionRegister = null;
      it('A Project Owner should be able to Create an Authentication Action (Registration Form)', function(done) {
        actionRegister = {
          title: 'Authentication',
          name: 'auth',
          handler: ['before'],
          method: ['create'],
          priority: 0,
          settings: {
            association: 'new',
            username: 'user.username',
            password: 'user.password'
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
          .expect(204)
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
          .expect(204)
          .end(done);
      });
    });
  });
};
