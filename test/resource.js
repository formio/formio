/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
var assert = require('assert');
var _ = require('lodash');

module.exports = function(app, template, hook) {
  var ignoreFields = ['config', 'plan'];

  describe('Resources', function() {
    // Store the temp resource for this test suite.
    var tempResource = {
      title: 'tempResource',
      name: 'tempResource',
      path: 'temp',
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
          placeholder: 'foo',
          key: 'foo',
          label: 'foo',
          inputMask: '',
          inputType: 'text',
          input: true
        }
      ]
    };

    describe('Permissions - Resource Level - Project Owner', function() {
      it('An administrator should be able to Create a Resource', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempResource)
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
            assert.equal(response.title, tempResource.title);
            assert.equal(response.name, tempResource.name);
            assert.equal(response.path, tempResource.path);
            assert.equal(response.type, 'resource');
            assert.deepEqual(response.components, tempResource.components);
            template.resources.tempResource = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('A Project Owner should be able to Read a Resource', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.resources.tempResource._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.resources.tempResource, ignoreFields));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Update a Resource', function(done) {
        var updatedResource = _.clone(template.resources.tempResource);
        updatedResource.title = 'Updated';

        request(app)
          .put(hook.alter('url', '/form/' + template.resources.tempResource._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({title: updatedResource.title})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // Update the modified timestamp, before comparison.
            updatedResource.modified = response.modified;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(updatedResource, ignoreFields));

            // Save this resource for later use.
            template.resources.tempResource = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Read the Index of Resources', function(done) {
        request(app)
          .get(hook.alter('url', '/form?type=resource', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, _.size(template.resources));
            _.each(response, function(resource) {
              assert(template.resources.hasOwnProperty(resource.name), 'Resource not found.');
            });

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Read a Resource using its alias', function(done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.tempResource.path, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.resources.tempResource, ignoreFields));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Update a Resource using its alias', function(done) {
        var updatedResource = _.clone(template.resources.tempResource);
        updatedResource.title = 'Updated2';

        request(app)
          .put(hook.alter('url', '/' + template.resources.tempResource.path, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({title: updatedResource.title})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // Update the modified timestamp, before comparison.
            updatedResource.modified = response.modified;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(updatedResource, ignoreFields));

            // Save this resource for later use.
            template.resources.tempResource = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Permissions - Resource Level - Authenticated User', function() {
      it('An user should not be able to Create a Resource for a User-Created Project', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.user1.token)
          .send(template.resources.tempResource)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should be able to Read a Resource for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.resources.tempResource._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.resources.tempResource, ignoreFields));

            done();
          });
      });

      it('A user should not be able to Update a Resource for a User-Created Project', function(done) {
        var updatedResource = _.clone(template.resources.tempResource);
        updatedResource.title = 'Updated';

        request(app)
          .put(hook.alter('url', '/form/' + template.resources.tempResource._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .send({title: updatedResource.title})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('A user should be able to Read the Index of Resource for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/form?type=resource', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', template.project ? /text\/plain/ : /json/)
          .expect(template.project ? 401 : 200)
          .end(done);
      });

      it('A user should not be able to Read a Resource for a User-Created Project using it alias', function(done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.tempResource.path, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.resources.tempResource, ignoreFields));

            done();
          });
      });

      it('A user should not be able to Update a Resource for a User-Created Project using it alias', function(done) {
        var updatedResource = _.clone(template.resources.tempResource);
        updatedResource.title = 'Updated2';

        request(app)
          .put(hook.alter('url', '/' + template.resources.tempResource.path, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Permissions - Resource Level - Anonymous User', function() {
      it('An Anonymous user should not be able to Create a Resource for a User-Created Project', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .send(template.resources.tempResource)
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should be able to Read a Resource for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.resources.tempResource._id, template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.resources.tempResource, ignoreFields));

            done();
          });
      });

      it('An Anonymous user should not be able to Update a Resource for a User-Created Project', function(done) {
        var updatedResource = _.clone(template.resources.tempResource);
        updatedResource.title = 'Updated';

        request(app)
          .put(hook.alter('url', '/form/' + template.resources.tempResource._id, template))
          .send({title: updatedResource.title})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should be able to Read the Index of Resource for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/form?type=resource', template))
          .expect('Content-Type', template.project ? /text\/plain/ : /json/)
          .expect(template.project ? 401 : 200)
          .end(done);
      });

      it('An Anonymous user should not be able to Read a Resource for a User-Created Project using it alias', function(done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.tempResource.path, template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.resources.tempResource, ignoreFields));

            done();
          });
      });

      it('An Anonymous user should not be able to Update a Resource for a User-Created Project using it alias', function(done) {
        var updatedResource = _.clone(template.resources.tempResource);
        updatedResource.title = 'Updated2';

        request(app)
          .put(hook.alter('url', '/' + template.resources.tempResource.path, template))
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Resource Normalization', function() {
      it('A Project Owner should be able to Delete a Resource', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + template.resources.tempResource._id, template))
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

      it('A Project Owner should be able to Create a User Resource', function(done) {
        var userResource = {
          title: 'Users',
          name: 'user2',
          path: 'user2',
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

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(userResource)
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
            assert.equal(response.title, userResource.title);
            assert.equal(response.name, userResource.name);
            assert.equal(response.path, userResource.path);
            assert.equal(response.type, 'resource');
            assert.deepEqual(response.components, userResource.components);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });
  });
};
