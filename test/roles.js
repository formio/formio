/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var docker = process.env.DOCKER;
var chance = new (require('chance'))();

module.exports = function(app, template, hook) {
  var Helper = require('./helper')(app);

  describe('Roles', function() {
    // Store the temp role for this test suite.
    var tempRole = {
      title: 'TestRole',
      description: 'A test role.'
    };

    describe('CRUD Operations', function() {
      it('An administrator should be able to Create a Role', function(done) {
        request(app)
          .post(hook.alter('url', '/role', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempRole)
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
            assert.equal(response.title, tempRole.title);
            assert.equal(response.description, tempRole.description);

            // Store this temp role for later use.
            template.roles.tempRole = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should NOT be able to create a role', function(done) {
        request(app)
          .post(hook.alter('url', '/role', template))
          .set('x-jwt-token', template.users.user1.token)
          .send(tempRole)
          .expect(401)
          .end(done);
      });

      it('An administrator should be able to Read an available Role', function(done) {
        request(app)
          .get(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.roles.tempRole);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should NOT be able to Read an available Role', function(done) {
        request(app)
          .get(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect(401)
          .end(done);
      });

      it('An administrator should be able to Update an available Role', function(done) {
        var updatedRole = _.clone(template.roles.tempRole);
        updatedRole.title = 'Update';

        request(app)
          .put(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({title: updatedRole.title})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // Update the modified timestamp, before comparison.
            updatedRole.modified = response.modified;
            assert.deepEqual(response, updatedRole);

            // Store this temp role for later use.
            template.roles.tempRole = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should NOT be able to update an available Role', function(done) {
        request(app)
          .put(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .send({title: 'THIS SHOULD NOT WORK!!!'})
          .expect(401)
          .end(done);
      });

      it('An administrator should be able to Read the Index of available Roles', function(done) {
        request(app)
          .get(hook.alter('url', '/role?limit=9999', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 4);

            // Iterate the roles and determine if they contain the correct data.
            for (var a = 0; a < response.length; a++) {
              assert(response[a].hasOwnProperty('_id'), 'Each role in the response should contain an `_id`.');
              assert(response[a].hasOwnProperty('modified'), 'Each role in the response should contain a `modified` timestamp.');
              assert(response[a].hasOwnProperty('created'), 'Each role in the response should contain a `created` timestamp.');

              // Store the response data, because the order is unsure (Dont store dummy template.roles.tempRole).
              if (response[a].title === 'Administrator') {
                assert.equal(response[a].title, 'Administrator');
                assert.equal(response[a].description, 'A role for Administrative Users.');
              }
              else if (response[a].title === 'Authenticated') {
                assert.equal(response[a].title, 'Authenticated');
                assert.equal(response[a].description, 'A role for Authenticated Users.');
              }
              else if (response[a].title === 'Anonymous') {
                assert.equal(response[a].title, 'Anonymous');
                assert.equal(response[a].description, 'A role for Anonymous Users.');
              }
            }

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Cant access a Role without a valid Role Id', function(done) {
        request(app)
          .get(hook.alter('url', '/role/2342342344234', template))
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

      it('A USER should NOT be able to Read the Index of available Roles', function(done) {
        request(app)
          .get(hook.alter('url', '/role', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect(401)
          .end(done);
      });

      it('should not be able to PATCH a role', function(done) {
        request(app)
          .patch(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send([{op: 'replace', path: 'default', value: false}])
          .expect(405)
          .end(done);
      });
    });

    describe('Permissions - Project Level - Anonymous User', function() {
      it('An Anonymous user should not be able to Create a Role for a User-Created Project', function(done) {
        request(app)
          .post(hook.alter('url', '/role', template))
          .send(template.roles.tempRole)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read a Role for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Update a Role for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .send({title: 'Some Update'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read the Index of Roles for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/role', template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Delete a Role for a User-Created Project', function(done) {
        request(app)
          .delete(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Other Role Tests', function() {
      it('The defaultAccess Role for a Project cannot be deleted', function(done) {
        request(app)
          .delete(hook.alter('url', '/role/' + template.roles.anonymous._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /text\/plain/)
          .expect(405)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Method Not Allowed');

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('The default Admin Role for a Project cannot be deleted', function(done) {
        request(app)
          .delete(hook.alter('url', '/role/' + template.roles.administrator._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /text\/plain/)
          .expect(405)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.text;
            assert.equal(response, 'Method Not Allowed');

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Role Normalization', function() {
      it('A Form.io Project Owner should be able to Delete a Role', function(done) {
         request(app)
          .delete(hook.alter('url', '/role/' + template.roles.tempRole._id, template))
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
      it('Deleted roles should remain in the DB', function(done) {
        var formio = hook.alter('formio', app.formio);
        formio.resources.role.model.findOne({_id: template.roles.tempRole._id}, function(err, role) {
          if (err) {
            return done(err);
          }
          if (!role) {
            return done('No role found with _id: ' + template.roles.tempRole._id + ', expected 1.');
          }

          role = role.toObject();
          assert.notEqual(role.deleted, null);
          done();
        });
      });

      it('The default Project Roles should still be available', function(done) {
        request(app)
          .get(hook.alter('url', '/role?limit=9999', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 3);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Form access on role modification', function() {
      var f1 = {
        title: 'Temp Form',
        name: 'tempForm',
        path: 'temp/form',
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
      var f2 = {
        title: 'Temp Form',
        name: 'tempForm2',
        path: 'temp/form2',
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
      var r1 = _.clone(tempRole);

      describe('Role tests', function() {
        it('Create a test form', function(done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(f1)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.notEqual(response.access, []);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              f1 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create a test role', function(done) {
          request(app)
            .post(hook.alter('url', '/role', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(r1)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              r1 = res.body;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Existing forms should get updated with any new roles', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + f1._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.notEqual(response.access, []);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 4);
              assert.notEqual(response.access[0].roles.indexOf(r1._id), -1);
              f1 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('New forms should allow read access from all roles', function(done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(f2)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.notEqual(response.access, []);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 4);
              assert.notEqual(response.access[0].roles.indexOf(r1._id), -1);
              f2 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Any custom role can be removed', function(done) {
          request(app)
            .delete(hook.alter('url', '/role/' + r1._id, template))
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

        it('Forms existing before new roles are added, should be updated after a role is removed', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + f1._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.notEqual(response.access, []);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.equal(response.access[0].roles.indexOf(r1._id), -1);
              f1 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Forms existing after new roles are added, should be updated after a role is removed', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + f2._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.notEqual(response.access, []);
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.equal(response.access[0].roles.indexOf(r1._id), -1);
              f2 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Suite normalization', function() {
        it('Clean up the test forms', function(done) {
          async.each([f1, f2], function(form, cb) {
            request(app)
              .delete(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return cb(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                cb();
              });
          }, function(err) {
            if (err) {
              return done(err);
            }

            done();
          });
        });
      });
    });

    describe('Role MachineNames', function() {
      var _role;
      var name = chance.word();
      var helper;

      before(function() {
        helper = new Helper(template.users.admin, template);
      });

      after(function(done) {
        helper.deleteRole(name, done);
      });

      it('Roles expose their machineNames through the api', function(done) {
        helper
          .role({
            title: name
          })
          .execute(function(err, result) {
            if (err) {
              return done(err);
            }

            var role = result.getRole(name);
            assert(role.hasOwnProperty('machineName'));
            _role = role;
            done();
          });
      });

      it('A user can modify their role machineNames', function(done) {
        var newMachineName = chance.word();

        helper
          .role(name, {
            _id: _role._id,
            machineName: newMachineName
          })
          .execute(function(err, result) {
            if (err) {
              return done(err);
            }

            var role = result.getRole(name);
            assert(role.hasOwnProperty('machineName'));
            assert.equal(role.machineName, newMachineName);
            done();
          });
      });
    });
  });

  describe('Submission Role Access', () => {
    let accessHelper = null;
    let manager = null;
    let employee = null;
    it('Bootstrap', (done) => {
      const owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      accessHelper = new Helper(owner, null, hook);
      accessHelper
        .project()
        .role({
          title: 'access-manager'
        })
        .role({
          title: 'access-employee'
        })
        .resource('access-manager', [
          {
            type: 'email',
            key: 'email',
            label: 'Email'
          },
          {
            type: 'password',
            key: 'password',
            label: 'Password'
          }
        ], {
          submissionAccess: [
            {
              type: 'create_all',
              roles: ['anonymous']
            },
            {
              type: 'update_own',
              roles: ['access-manager']
            }
          ]
        })
        .action('access-manager', {
          title: 'Save Submission',
          name: 'save',
          handler: ['before'],
          method: ['create', 'update'],
          priority: 11,
          settings: {}
        })
        .action('access-manager', {
          title: 'Role Assignment',
          name: 'role',
          priority: 1,
          handler: ['after'],
          method: ['create'],
          settings: {
            association: 'new',
            type: 'add',
            role: 'access-manager'
          }
        })
        .action('access-manager', {
          title: 'Role Assignment',
          name: 'role',
          priority: 2,
          handler: ['after'],
          method: ['create'],
          settings: {
            association: 'new',
            type: 'add',
            role: 'access-employee'
          }
        })
        .resource('access-employee', [
          {
            type: 'email',
            key: 'email',
            label: 'Email'
          },
          {
            type: 'password',
            key: 'password',
            label: 'Password'
          }
        ], {
          submissionAccess: [
            {
              type: 'create_all',
              roles: ['anonymous']
            },
            {
              type: 'update_own',
              roles: ['access-employee']
            }
          ]
        })
        .action('access-employee', {
          title: 'Save Submission',
          name: 'save',
          handler: ['before'],
          method: ['create', 'update'],
          priority: 11,
          settings: {}
        })
        .action('access-employee', {
          title: 'Role Assignment',
          name: 'role',
          priority: 1,
          handler: ['after'],
          method: ['create'],
          settings: {
            association: 'new',
            type: 'add',
            role: 'access-employee'
          }
        })
        .form('access-login', [
          {
            type: 'email',
            key: 'email',
            label: 'Email'
          },
          {
            type: 'password',
            key: 'password',
            label: 'Password'
          }
        ], {
          submissionAccess: [
            {
              type: 'create_own',
              roles: ['anonymous']
            }
          ]
        })
        .action('access-login', {
          title: 'Login',
          name: 'login',
          handler: ['before'],
          method: ['create'],
          priority: 0,
          settings: {
            resources: ['access-manager', 'access-employee'],
            username: 'email',
            password: 'password'
          }
        })
        .execute(function(err) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('Should allow an anonymous user to create a Manager record.', (done) => {
      accessHelper.submission('access-manager', {
        email: 'manager@example.com',
        password: 'manager123'
      }, null).execute((err) => {
        if (err) {
          return done(err);
        }

        manager = accessHelper.getLastSubmission();

        // Make sure that the owner is set for the manager.
        assert.equal(manager._id, manager.owner);
        assert.equal(_.intersection(manager.roles, [
          accessHelper.template.roles['access-manager']._id.toString(),
          accessHelper.template.roles['access-employee']._id.toString()]
        ).length, 2);
        done();
      });
    });

    it('Should allow an anonymous user to create an Employee record.', (done) => {
      accessHelper.submission('access-employee', {
        email: 'employee@example.com',
        password: 'employee123'
      }, null).execute((err) => {
        if (err) {
          return done(err);
        }

        employee = accessHelper.getLastSubmission();

        // Make sure that the owner is set for the manager.
        assert.equal(employee._id, employee.owner);
        assert.deepEqual(employee.roles, [
          accessHelper.template.roles['access-employee']._id.toString()
        ]);
        done();
      });
    });

    it('Should allow the manager to log in', (done) => {
      accessHelper.submission('access-login', {
        email: 'manager@example.com',
        password: 'manager123'
      }, null).execute((err) => {
        if (err) {
          return done(err);
        }

        manager.token = accessHelper.lastResponse.headers['x-jwt-token'];
        assert(!!manager.token, 'No token was created');
        done();
      });
    });

    it('Should allow the employee to log in', (done) => {
      accessHelper.submission('access-login', {
        email: 'employee@example.com',
        password: 'employee123'
      }, null).execute((err) => {
        if (err) {
          return done(err);
        }

        employee.token = accessHelper.lastResponse.headers['x-jwt-token'];
        assert(!!employee.token, 'No token was created');
        done();
      });
    });

    it('Should allow the manager to update their own record, but not roles.', (done) => {
      manager.data.email = 'manager2@example.com';
      manager.roles = [
        accessHelper.template.roles['access-manager']._id.toString(),
        accessHelper.template.roles['access-employee']._id.toString(),
        accessHelper.template.roles.authenticated._id.toString()
      ];
      accessHelper.submission('access-manager', manager, manager)
        .execute((err) => {
          if (err) {
            return done(err);
          }

          // Make sure they cannot add roles.
          const updated = accessHelper.getLastSubmission();
          assert.equal(updated.data.email, 'manager2@example.com');
          assert.equal(_.intersection(updated.roles, [
            accessHelper.template.roles['access-manager']._id.toString(),
            accessHelper.template.roles['access-employee']._id.toString()]
          ).length, 2);
          _.assign(manager, updated);
          done();
        });
    });

    it('Should not allow an anonymous user to update the manager record', (done) => {
      manager.data.email = 'manager3@example.com';
      accessHelper.submission('access-manager', manager, null, [/text\/plain/, 401]).execute((err) => {
        if (err) {
          return done(err);
        }

        manager.data.email = 'manager2@example.com';
        done();
      });
    });

    it('Should not allow an employee user to update the manager record', (done) => {
      manager.data.email = 'manager3@example.com';
      accessHelper.submission('access-manager', manager, employee, [/text\/plain/, 401]).execute((err) => {
        if (err) {
          return done(err);
        }

        manager.data.email = 'manager2@example.com';
        done();
      });
    });

    it('Should not allow the manager to add role.', (done) => {
      manager.roles = [
        accessHelper.template.roles['access-employee']._id.toString(),
        accessHelper.template.roles['access-manager']._id.toString(),
        accessHelper.template.roles.authenticated._id.toString()
      ];
    
      accessHelper.submission('access-manager', manager, manager).execute((err) => {
        if (err) {
          return done(err);
        }
        const updated = accessHelper.getLastSubmission();
        assert.deepEqual(updated.roles, [
          accessHelper.template.roles['access-employee']._id.toString(),
          accessHelper.template.roles['access-manager']._id.toString(),
        ]);
        _.assign(manager, updated);
        done();
      });
    });
    
    it('Should allow the manager to remove a role.', (done) => {
      manager.roles = [
        accessHelper.template.roles['access-manager']._id.toString(),
      ];
    
      accessHelper.submission('access-manager', manager, manager).execute((err) => {
        if (err) {
          return done(err);
        }
        const updated = accessHelper.getLastSubmission();       
        assert.deepEqual(updated.roles, [
          accessHelper.template.roles['access-manager']._id.toString()
        ]);
        _.assign(manager, updated);
        done();
      });
    });

    it('Should not allow the manager to re-add the roles since they do not have access.', (done) => {
      manager.roles = [
        accessHelper.template.roles['access-manager']._id.toString(),
        accessHelper.template.roles['access-employee']._id.toString()
      ];
      accessHelper.submission('access-manager', manager, manager).execute((err) => {
        if (err) {
          return done(err);
        }

        const updated = accessHelper.getLastSubmission();
        assert.deepEqual(updated.roles, [
          accessHelper.template.roles['access-manager']._id.toString()
        ]);
        _.assign(manager, updated);
        done();
      });
    });

    it('Cleanup', (done) => {
      accessHelper
        .deleteForm('access-manager')
        .deleteForm('access-employee')
        .deleteForm('access-login')
        .execute((err) => {
          if (err) {
            return done(err);
          }

          async.series(
            [
              (next) => accessHelper.deleteRole('access-manager', next), 
              (next) => accessHelper.deleteRole('access-employee', next)
            ],
            (err) => {
              if (err) {
                return done(err);
              }

              done();
            }
          );
        });
    });
  });
};
