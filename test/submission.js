/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');
var async = require('async');
var _ = require('lodash');

// Request a 401.
var request401 = function(request, done, user) {
  if (user) {
    request.set('x-jwt-token', user.token);
  }
  request
    .expect(401)
    .expect('Content-Type', /text\/plain/)
    .end(function(err, res) {
      if (err) {
        return done(err);
      }

      assert.equal(res.text, 'Unauthorized');

      if (user) {
        // Store the JWT for future API calls.
        user.token = res.headers['x-jwt-token'];
      }

      done();
    }
  );
};

module.exports = function(app, template, hook) {
  describe('Submissions', function() {
    describe('Submission Level Permissions (Project Owner)', function() {
      describe('Submission CRUD', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Project owner access check',
          name: 'access',
          path: 'access/owner',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the temp submission for this test suite.
        var tempSubmission = {data: {value: 'foo'}};
        var tempSubmissions = [];

        describe('Bootstrap', function() {
          it('Create a Form for a Submission level Access Check - Project Owner', function(done) {
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

        describe('Project Owner Submission', function() {
          it('The Project Owner should be able to Create a submission without explicit permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmission = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Read a submission without explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmission);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Update a submission without explicit permissions', function(done) {
            var updatedSubmission = _.clone(tempSubmission);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmission = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Read the Index of submissions without explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1, 'The response should contain 1 element');
                assert.deepEqual(response[0], tempSubmission);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Read a submission without explicit permissions using the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmission);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Update a submission without explicit permissions using the Form alias', function(done) {
            var updatedSubmission = _.clone(tempSubmission);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);
                tempSubmission = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Read the Index of submissions without explicit permissions using the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);
                assert.deepEqual(response[0], tempSubmission);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A user with full permissions should not be able to edit data outside the submission.data object', function(done) {
            var updatedSubmission = _.clone(tempSubmission);
            updatedSubmission.data.value = 'bar3';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({
                other: 'this should not save', // try to add a field that is not present
                externalIds: [{foo: 'bar'}], // try to edit a field that exists on the submissions w/ timestamp plugin
                roles: [].concat(tempSubmission.roles, template.users.admin._id), // try to edit a field that exists on the submissions
                data: {value: updatedSubmission.data.value}
              })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;

                // Confirm that other data was not saved.
                assert.equal(response.hasOwnProperty('other'), false);

                // Confirm that the externalIds were not modified by the user request.
                assert.deepEqual(response.externalIds, tempSubmission.externalIds);

                // Confirm that the roles were not modified by the user request.
                assert.deepEqual(response.roles, tempSubmission.roles);

                // Confirm that nothing else was changes (besides the automatic modified timestamp).
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmission = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          var deleteTest = {data: {value: 'foo'}};
          it('The Project Owner should be able to Create a submission without explicit permissions using the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(deleteTest)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, deleteTest.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                deleteTest = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Delete a submission without explicit permissions using the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + deleteTest._id, template))
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

          it('A deleted Submission should remain in the database', function(done) {
            if (!app.formio) return done();

            app.formio.resources.submission.model.findOne({_id: deleteTest._id}, function(err, submission) {
              if (err) {
                return done(err);
              }
              if (!submission) {
                return done('No submission found with _id: ' + deleteTest._id + ', expected 1.');
              }

              submission = submission.toObject();
              assert.notEqual(submission.deleted, null);
              done();
            });
          });

          it('Cant access a submission without a valid Submission Id', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/💩', template))
              .set('x-jwt-token', template.users.admin.token)
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

        describe('Authenticated User Submission', function() {
          it('A Registered user should not be able to Create a submission without explicit permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
              .send({foo: 'bar'});

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template))
              .send({foo: 'bar'});

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Create a submissions without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(tempSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submissions without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit permissions', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template));

            request401(req, done, template.users.user1);
          });
        });

        describe('Anonymous User Submission', function() {
          it('An Anonymous user should not be able to Create a submission without explicit permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
              .send({foo: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions using the Form alias', function(done) {
            var req  = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template))
              .send({foo: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Create a submission without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send({foo: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions using the Form alias', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmission._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template));

            request401(req, done);
          });
        });

        describe('Submission Normalization', function() {
          it('The Project owner should be able to Delete a submission with explicit Own permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
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

          it('A deleted Submission should remain in the database', function(done) {
            if (!app.formio) return done();

            app.formio.resources.submission.model.findOne({_id: tempSubmission._id})
              .exec(function(err, submission) {
                if (err) {
                  return done(err);
                }
                if (!submission) {
                  return done('No submission found w/ _id: ' + submission._id + ', expected 1.');
                }

                submission = submission.toObject();
                assert.notEqual(submission.deleted, null);
                done();
              });
          });

          it('Delete the Submissions created for Ownership Checks', function(done) {
            tempSubmissions.forEach(function(submission) {
              request(app)
                .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + submission._id, template))
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
                });
            });

            tempSubmissions = [];
            done();
          });
        });

        describe('Form Normalization', function() {
          it('Delete the form created for Access Checks', function(done) {
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

          it('A deleted Form should not have active submissions in the database', function(done) {
            if (!app.formio) return done();

            app.formio.resources.submission.model.findOne({form: tempForm._id, deleted: {$eq: null}})
              .exec(function(err, submissions) {
                if (err) {
                  return done(err);
                }
                if (submissions && submissions.length !== 0) {
                  return done(submissions.length + ' submissions found with the form: ' + tempForm._id + ', expected 0.');
                }

                done();
              });
          });
        });
      });

      describe('Submission Ownership', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'dummyForm',
          name: 'dummyForm',
          path: 'dummy/form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the temp submissions for this test suite.
        var tempSubmissions = [];
        var temp = {};

        describe('Bootstrap', function() {
          it('Create the Form for Ownership Checks', function(done) {
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

        describe('Project Owner', function() {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
            var tempSubmission = {data: {value: 'foo'}};

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.equal(response.owner, template.users.admin._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
            var tempSubmission = {data: {value: 'foo'}, owner: template.users.user1._id};

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, tempSubmission.owner);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to update the owner of a submission, without explicit permissions', function(done) {
            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({owner: template.users.admin._id})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the owner of temp for comparison.
                temp.owner = template.users.admin._id;

                // Remove the modified timestamp for comparison.
                assert.deepEqual(_.omit(response, 'modified'), _.omit(temp, 'modified'));

                // Update the temp form contents.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Updating a submission with explicit empty data, will remove all the data', function(done) {
            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Compare the previous and current data contents before deep comparison.
                assert.equal(Object.keys(response.data).length, 0);
                assert.notEqual(temp.data, response.data);
                temp.data = {};

                // Remove the modified timestamp for comparison.
                assert.deepEqual(_.omit(response, 'modified'), _.omit(temp, 'modified'));

                // Update the temp form contents.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User', function() {
          it('An Authenticated User should not be able create a submission in their name, without permissions', function(done) {
            var submission = {data: {value: 'foo'}, owner: template.users.user1._id};
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to create a submission in someones name, without permissions', function(done) {
            var submission = {data: {value: 'foo'}, owner: template.users.user2._id};
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to update the owner of a submission, without permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({owner: template.users.user1._id});

            request401(req, done, template.users.user1);
          });
        });

        describe('Anonymous User', function() {
          it('An Anonymous User should not be able create a submission in their name, without permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send({data: temp.data});

            request401(req, done);
          });

          it('An Anonymous User should not be able to create a submission in someones name, without permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send({data: {value: 'foo'}, owner: template.users.user2._id});

            request401(req, done);
          });

          it('An Anonymous User should not be able to update the owner of a submission, without permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({data: temp.data, owner: template.users.admin._id});

            request401(req, done);
          });
        });

        describe('Submission Normalization', function() {
          it('Delete the Submissions created for Ownership Checks', function(done) {
            tempSubmissions.forEach(function(submission) {
              request(app)
                .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + submission._id, template))
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
                });
            });

            tempSubmissions = [];
            done();
          });
        });

        describe('Form Normalization', function() {
          it('Delete the Form created for Ownership Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });
    });

    describe('Submission Level Permissions (Authenticated User)', function() {
      describe('Submission CRUD - _own', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Authenticated access check',
          name: 'access',
          path: 'access/authenticated',
          type: 'form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the template submission for this test suite.
        var templateSubmission = {data: {value: 'foo'}};

        // Store the user1 temp submission for this test suite.
        var tempSubmissionUser1 = {};

        // Store the user2 temp submission for this test suite.
        var tempSubmissionUser2 = {};

        // Store the Project Owners submission for this test suite.
        var tempSubmissionOwner1 = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.authenticated._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_own', roles: [template.roles.authenticated._id.toString()]},
            {type: 'read_own', roles: [template.roles.authenticated._id.toString()]},
            {type: 'update_own', roles: [template.roles.authenticated._id.toString()]},
            {type: 'delete_own', roles: [template.roles.authenticated._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create a Form for a Submission level Access Check - Authenticated User', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User Submission', function() {
          it('A Registered user should be able to Create a submission with explicit Own permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);

                // Update the submission data.
                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read a submission with explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Update a submission with explicit Own permissions', function(done) {
            var updatedSubmission = _.clone(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmissionUser1 = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);
                assert.deepEqual(response[0], tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read a submission with explicit Own permissions using the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Update a submission with explicit Own permissions using the Form alias', function(done) {
            var updatedSubmission = _.clone(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmissionUser1 = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions using the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);
                assert.deepEqual(response[0], tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Delete a submission with explicit Own permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Create a submission with explicit Own permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);

                // Update the submission data.
                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('An Additional Registered user should be able to Create a submission with explicit Own permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user2.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);

                tempSubmissionUser2 = response;

                // Store the JWT for future API calls.
                template.users.user2.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should not be able to Read a Submission with explicit Own permissions, that they do not personally Own', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1, 'The response should contain 1 element');
                assert.deepEqual(response[0], tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('An Additional Registered user should be able to Read the Index of their submissions with explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user2.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);
                assert.deepEqual(response[0], tempSubmissionUser2);

                // Store the JWT for future API calls.
                template.users.user2.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Project Owner Submission', function() {
          it('The Project owner should be able to Create a submission without explicit Own permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionUser2);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit Own permissions', function(done) {
            var updatedSubmission = _.clone(tempSubmissionUser2);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);
                tempSubmissionUser2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
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

          it('The Project owner should be able to Delete a submission without explicit Own permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionOwner1);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
            var updatedSubmission = _.clone(tempSubmissionOwner1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
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

          it('The Project owner should be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Anonymous User Submission', function() {
          it('An Anonymous user should not be able to Create a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .send({foo: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .send({foo: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });
        });

        describe('Submission Normalization', function() {
          it('A Registered user should be able to Delete a submission with explicit Own permissions using the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Delete a submission without explicit Own permissions using the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionUser2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Form Normalization', function() {
          it('Delete the form created for Access Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      describe('Submission CRUD - _all', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Authenticated access check',
          name: 'access',
          path: 'access/authenticated',
          type: 'form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the template submission for this test suite.
        var templateSubmission = {data: {value: 'foo'}};

        // Store the user1 temp submission for this test suite.
        var tempSubmissionUser1 = {};

        // Store the Project Owners submission for this test suite.
        var tempSubmissionOwner1 = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.authenticated._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_all', roles: [template.roles.authenticated._id.toString()]},
            {type: 'read_all', roles: [template.roles.authenticated._id.toString()]},
            {type: 'update_all', roles: [template.roles.authenticated._id.toString()]},
            {type: 'delete_all', roles: [template.roles.authenticated._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create a Form for a Submission level Access Check - Authenticated User', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User Submission', function() {
          it('A Registered user should be able to Create a submission with explicit permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);

                // Update the submission data.
                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read a submission with explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Update a submission with explicit permissions', function(done) {
            var updatedSubmission = _.clone(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmissionUser1 = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read the Index of submissions with explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);
                assert.deepEqual(response[0], tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read a submission with explicit permissions using the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Update a submission with explicit permissions using the Form alias', function(done) {
            var updatedSubmission = _.clone(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmissionUser1 = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read the Index of submissions with explicit permissions using the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);
                assert.deepEqual(response[0], tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Delete a submission with explicit permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Create a submission with explicit permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);

                // Update the submission data.
                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Project Owner Submission', function() {
          it('The Project owner should be able to Create a submission without explicit permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionUser1);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit permissions', function(done) {
            var updatedSubmission = _.clone(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);
                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 2);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Delete a submission without explicit permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Create a submission without explicit permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionOwner1);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit permissions with the Form alias', function(done) {
            var updatedSubmission = _.clone(tempSubmissionOwner1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 2);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Delete a submission without explicit permissions with the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Anonymous User Submission', function() {
          it('An Anonymous user should not be able to Create a submission without explicit permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template))
              .send({foo: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Create a submission without explicit permissions with the Form alias', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions with the Form alias', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .send({foo: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions with the Form alias', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template));

            request401(req, done);
          });
        });

        describe('Submission Normalization', function() {
          it('A Registered user should be able to Delete a submission with explicit permissions using the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Form Normalization', function() {
          it('Delete the form created for Access Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      describe('Submission Ownership - _own', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'dummyForm',
          name: 'dummyForm',
          path: 'dummy/form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = {data: {value: 'foo'}};
        var tempSubmissions = [];
        var temp = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.authenticated._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_own', roles: [template.roles.authenticated._id.toString()]},
            {type: 'read_own', roles: [template.roles.authenticated._id.toString()]},
            {type: 'update_own', roles: [template.roles.authenticated._id.toString()]},
            {type: 'delete_own', roles: [template.roles.authenticated._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create the Form for Ownership Checks', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Project Owner', function() {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without explicit permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user2._id;
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
            var doc = {data: temp.data, owner: template.users.admin._id};

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(doc)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Remove the modified timestamp for comparison.
                response = _.omit(response, 'modified');
                // Update the owner of temp for comparison.
                temp.owner = doc.owner;

                assert.deepEqual(response, _.omit(temp, 'modified'));

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User', function() {
          it('An Authenticated User should be able create a submission in their name, with _own permissions', function(done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          // The submission will be made, but in there name rather than the one supplied.
          it('An Authenticated User should not be able to create a submission in someones name, with _own permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.admin._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(_.has(response, 'owner'));
                assert.equal(response.owner, template.users.user1._id);
                assert.notEqual(response.owner, template.users.admin._id);

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('An Authenticated User should not be able to update the owner of a submission, with _own permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({data: temp.data, owner: template.users.admin._id});

            request401(req, done, template.users.user1);
          });
        });

        describe('Anonymous User', function() {
          it('An Anonymous User should not be able create a submission in their name, without permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done);
          });

          it('An Anonymous User should not be able to create a submission in someones name, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user1._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done);
          });

          it('An Anonymous User should not be able to update the owner of a submission, without permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({data: temp.data, owner: template.users.admin._id});

            request401(req, done);
          });
        });

        describe('Submission Normalization', function() {
          it('Delete the Submissions created for Ownership Checks', function(done) {
            tempSubmissions.forEach(function(submission) {
              request(app)
                .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + submission._id, template))
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
                });
            });

            tempSubmissions = [];
            done();
          });
        });

        describe('Form Normalization', function() {
          it('Delete the Form created for Ownership Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      describe('Submission Ownership - _all', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'dummyForm',
          name: 'dummyForm',
          path: 'dummy/form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = {data: {value: 'foo'}};
        var tempSubmissions = [];
        var temp = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.authenticated._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_all', roles: [template.roles.authenticated._id.toString()]},
            {type: 'read_all', roles: [template.roles.authenticated._id.toString()]},
            {type: 'update_all', roles: [template.roles.authenticated._id.toString()]},
            {type: 'delete_all', roles: [template.roles.authenticated._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create the Form for Ownership Checks', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Project Owner', function() {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user2._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user1._id;

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({owner: submission.owner})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Remove the modified timestamp for comparison.
                response = _.omit(response, 'modified');
                // Update the temp owner for comparison.
                temp.owner = submission.owner;

                assert.deepEqual(response, _.omit(temp, 'modified'));

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User', function() {
          it('An Authenticated User should be able create a submission in their name, with _all permissions', function(done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('An Authenticated User should be able to create a submission in someones name, with _all permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.admin._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('An Authenticated User should be able to update the owner of a submission, with _all permissions', function(done) {
            var doc = {owner: template.users.admin._id};

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .set('x-jwt-token', template.users.user1.token)
              .send(doc)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Remove the modified timestamp for comparison.
                response = _.omit(response, 'modified');
                // Update the owner of temp for comparison.
                temp.owner = doc.owner;

                assert.deepEqual(response, _.omit(temp, 'modified'));

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Anonymous User', function() {
          it('An Anonymous User should not be able create a submission in their name, without permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done);
          });

          it('An Anonymous User should not be able to create a submission in someones name, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user1._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done);
          });

          it('An Anonymous User should not be able to update the owner of a submission, without permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({data: temp.data, owner: template.users.admin._id});

            request401(req, done);
          });
        });

        describe('Submission Normalization', function() {
          it('Delete the Submissions created for Ownership Checks', function(done) {
            tempSubmissions.forEach(function(submission) {
              request(app)
                .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + submission._id, template))
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
                });
            });

            tempSubmissions = [];
            done();
          });
        });

        describe('Form Normalization', function() {
          it('Delete the Form created for Ownership Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });
    });

    describe('Submission Level Permissions (Anonymous User)', function() {
      describe('Submission CRUD - _own', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Anonymous access check',
          name: 'access',
          path: 'access/anonymous',
          type: 'form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the template submission for this test suite.
        var templateSubmission = {data: {value: 'foo'}};

        // Store the anonymous temp submission1 for this test suite.
        var tempSubmissionAnon1 = {};

        // Store the anonymous temp submission2 for this test suite.
        var tempSubmissionAnon2 = {};

        // Store the Project Owners submission1 for this test suite.
        var tempSubmissionOwner1 = {};

        // Store the Project Owners submission2 for this test suite.
        var tempSubmissionOwner2 = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_own', roles: [template.roles.anonymous._id.toString()]},
            {type: 'read_own', roles: [template.roles.anonymous._id.toString()]},
            {type: 'update_own', roles: [template.roles.anonymous._id.toString()]},
            {type: 'delete_own', roles: [template.roles.anonymous._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create a Form for a Submission level Access Check - Anonymous User', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Anonymous User Submission', function() {
          it('An Anonymous user should be able to Create a submission with explicit Own permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);

                // Update the submission data.
                tempSubmissionAnon1 = response;

                done();
              });
          });

          it('An Anonymous user should not be able to Read a submission with explicit Own permissions, because Anonymous cannot own an entity', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission with explicit Own permissions, because Anonymous cannot own an entity', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template))
              .send({value: 'bar'});

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission with explicit Own permissions, because Anonymous cannot own an entity', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should be able to Create a submission with explicit Own permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);

                // Update the submission data.
                tempSubmissionAnon2 = response;

                done();
              });
          });

          it('An Anonymous user should not be able to Read a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template));

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id, template));

            request401(req, done);
          });
        });

        describe('Project Owner Submission', function() {
          it('The Project owner should be able to Create a submission without explicit Own permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionOwner1);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit Own permissions', function(done) {
            var updatedSubmission = _.clone(tempSubmissionOwner1);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the stored resource.
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
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

          it('The Project owner should be able to Delete a submission without explicit Own permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionOwner2);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
            var updatedSubmission = _.clone(tempSubmissionOwner2);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the stored resource.
                tempSubmissionOwner2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
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

          it('The Project owner should be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionOwner2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User Submission', function() {
          it('A Registered user should not be able to Create a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template))
              .send({foo: 'bar'});

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission)

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id, template))
              .send({foo: 'bar'});

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id, template));

            request401(req, done, template.users.user1);
          });
        });

        describe('Submission Normalization', function() {
          it('The Project owner should be able to Delete a submission with explicit Own permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionAnon1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Delete a submission with explicit Own permissions with the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionAnon2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Form Normalization', function() {
          it('Delete the form created for Access Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      describe('Submission CRUD - _all', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Anonymous access check',
          name: 'access',
          path: 'access/anonymous',
          type: 'form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the template submission for this test suite.
        var templateSubmission = {data: {value: 'foo'}};

        // Store the annonymous temp submission1 for this test suite.
        var tempSubmissionAnon1 = {};

        // Store the annonymous temp submission2 for this test suite.
        var tempSubmissionAnon2 = {};

        // Store the Project Owners submission1 for this test suite.
        var tempSubmissionOwner1 = {};

        // Store the Project Owners submission2 for this test suite.
        var tempSubmissionOwner2 = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_all', roles: [template.roles.anonymous._id.toString()]},
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]},
            {type: 'update_all', roles: [template.roles.anonymous._id.toString()]},
            {type: 'delete_all', roles: [template.roles.anonymous._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create a Form for a Submission level Access Check - Anonymous User', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Anonymous User Submission', function() {
          it('An Anonymous user should be able to Create a submission with explicit permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);

                // Update the submission data.
                tempSubmissionAnon1 = response;

                done();
              });
          });

          it('An Anonymous user should be able to Read a submission with explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionAnon1);

                done();
              });
          });

          it('An Anonymous user should be able to Update a submission with explicit permissions', function(done) {
            var compare = _.omit(tempSubmissionAnon1, 'modified');
            compare.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template))
              .send({data: {value: compare.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(_.omit(response, 'modified'), compare);
                tempSubmissionAnon1 = response;

                done();
              });
          });

          it('An Anonymous user should be able to Read the Index of submissions without explicit permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);

                done();
              });
          });

          it('An Anonymous user should be able to Delete a submission with explicit permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id, template))
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});
                tempSubmissionAnon1 = response;

                done();
              });
          });

          it('An Anonymous user should be able to Create a submission with explicit permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);

                // Update the submission data.
                tempSubmissionAnon2 = response;

                done();
              });
          });

          it('An Anonymous user should be able to Read a submission with explicit permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id, template))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionAnon2);

                done();
              });
          });

          it('An Anonymous user should be able to Update a submission with explicit permissions with the Form alias', function(done) {
            var compare = _.omit(tempSubmissionAnon2, 'modified');
            compare.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id, template))
              .send({data: {value: compare.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(_.omit(response, 'modified'), compare);
                tempSubmissionAnon2 = response;

                done();
              });
          });

          it('An Anonymous user should be able to Read the Index of submissions without explicit permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);

                done();
              });
          });

          it('An Anonymous user should be able to Delete a submission with explicit permissions with the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id, template))
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});
                tempSubmissionAnon2 = response;

                done();
              });
          });
        });

        describe('Project Owner Submission', function() {
          it('The Project owner should be able to Create a submission without explicit Own permissions', function(done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionOwner1);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit Own permissions', function(done) {
            var updatedSubmission = _.clone(tempSubmissionOwner1);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the stored resource.
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function(done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionOwner2);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
            var updatedSubmission = _.clone(tempSubmissionOwner2);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send({data: {value: updatedSubmission.data.value}})
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp before response comparison.
                updatedSubmission.modified = response.modified;
                assert.deepEqual(response, updatedSubmission);

                // Update the stored resource.
                tempSubmissionOwner2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 2);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User Submission', function() {
          it('A Registered user should not be able to Create a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .send({foo: 'bar'});

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit Own permissions', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Create a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template))
              .send({foo: 'bar'});

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template));

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit Own permissions with the Form alias', function(done) {
            var req = request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id, template));

            request401(req, done, template.users.user1);
          });
        });

        describe('Submission Normalization', function() {
          it('The Project owner should be able to Delete a submission with explicit Own permissions', function(done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Delete a submission with explicit Own permissions with the Form alias', function(done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});

                tempSubmissionOwner2 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Form Normalization', function() {
          it('Delete the form created for Access Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      describe('Submission Ownership - _own', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'dummyForm',
          name: 'dummyForm',
          path: 'dummy/form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = {data: {value: 'foo'}};
        var tempSubmissions = [];
        var temp = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_own', roles: [template.roles.anonymous._id.toString()]},
            {type: 'read_own', roles: [template.roles.anonymous._id.toString()]},
            {type: 'update_own', roles: [template.roles.anonymous._id.toString()]},
            {type: 'delete_own', roles: [template.roles.anonymous._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create the Form for Ownership Checks', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Project Owner', function() {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user2._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
            var doc = {data: temp.data, owner: template.users.admin._id};

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(doc)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Remove the modified timestamp for comparison.
                response = _.omit(response, 'modified');
                // Update the temp owner for comparison.
                temp.owner = doc.owner;

                assert.deepEqual(response, _.omit(temp, 'modified'));

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User', function() {
          it('An Authenticated User should not be able create a submission in their name, without _own permissions', function(done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to create a submission in someones name, without _own permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.admin._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to update the owner of a submission, without _own permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({data: temp.data, owner: template.users.admin._id});

            request401(req, done, template.users.user1);
          });
        });

        describe('Anonymous User', function() {
          it('An Anonymous User should be able create a submission in their name, with _own permissions', function(done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.equal(response.owner, null);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it('An Anonymous User should not be able to create a submission in someones name, with _own permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user1._id;
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.equal(response.owner, null);
                assert.notEqual(response.owner, template.users.user1._id);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it('An Anonymous User should not be able to update the owner of a submission, with _own permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({data: temp.data, owner: template.users.admin._id});

            request401(req, done);
          });
        });

        describe('Submission Normalization', function() {
          it('Delete the Submissions created for Ownership Checks', function(done) {
            async.eachSeries(tempSubmissions, function(submission, subDone) {
              request(app)
                .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + submission._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function(err, res) {
                  if (err) {
                    return subDone(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, {});

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];
                  subDone();
                });
            }, function(err) {
              if (err) {
                return done(err);
              }

              tempSubmissions = [];
              done();
            });
          });
        });

        describe('Form Normalization', function() {
          it('Delete the Form created for Ownership Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });

      describe('Submission Ownership - _all', function() {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'dummyForm',
          name: 'dummyForm',
          path: 'dummy/form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ]
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = {data: {value: 'foo'}};
        var tempSubmissions = [];
        var temp = {};

        // Before the suite runs, attach the test Project's id to the payload.
        before(function() {
          tempForm.access = [
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]}
          ];
          tempForm.submissionAccess = [
            {type: 'create_all', roles: [template.roles.anonymous._id.toString()]},
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]},
            {type: 'update_all', roles: [template.roles.anonymous._id.toString()]},
            {type: 'delete_all', roles: [template.roles.anonymous._id.toString()]}
          ];
        });

        describe('Bootstrap', function() {
          it('Create the Form for Ownership Checks', function(done) {
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

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function(role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Project Owner', function() {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function(done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user2._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to update the owner of a submission, without permissions', function(done) {
            var doc = {data: temp.data, owner: template.users.admin._id};

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(doc)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Remove the modified timestamp for comparison.
                response = _.omit(response, 'modified');
                // Update the temp owner for comparison.
                temp.owner = doc.owner;

                assert.deepEqual(response, _.omit(temp, 'modified'));

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User', function() {
          it('An Authenticated User should not be able create a submission in their name, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to create a submission in someones name, without permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.admin._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to update the owner of a submission, without permissions', function(done) {
            var req = request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send({data: temp.data, owner: template.users.admin._id});

            request401(req, done, template.users.user1);
          });
        });

        describe('Anonymous User', function() {
          it('An Anonymous User should be able create a submission with no owner, with _all permissions', function(done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.equal(response.owner, null);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it('An Anonymous User should be able to create a submission in someones name, with _all permissions', function(done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user1._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
                assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
                assert.equal(response.form, tempForm._id);
                assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
                assert.deepEqual(response.roles, []);
                assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, submission.owner);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it('An Anonymous User should be able to update the owner of a submission, with _all permissions', function(done) {
            var doc = {data: temp.data, owner: template.users.admin._id};

            request(app)
              .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
              .send(doc)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Remove the modified timestamp for comparison.
                response = _.omit(response, 'modified');
                // Update the temp owner for comparison.
                temp.owner = doc.owner;

                assert.deepEqual(response, _.omit(temp, 'modified'));

                done();
              });
          });
        });

        describe('Submission Normalization', function() {
          it('Delete the Submissions created for Ownership Checks', function(done) {
            tempSubmissions.forEach(function(submission) {
              request(app)
                .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + submission._id, template))
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
                });
            });

            tempSubmissions = [];
            done();
          });
        });

        describe('Form Normalization', function() {
          it('Delete the Form created for Ownership Checks', function(done) {
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
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });
    });

    describe('Non-Persistent Fields', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'Non-Persistent Field Test',
        name: 'nonPersistentFieldTest',
        path: 'nonpersistentfieldtest',
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
            key: 'persistent',
            persistent: true,
            label: 'Persistent',
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
            key: 'implicitPersistent',
            label: 'Implicitly Persistent',
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
            key: 'nonpersistent',
            persistent: false,
            label: 'Non-Persistent',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submission for this test suite.
      var tempSubmission = {data: {
        persistent: 'exists',
        implicitPersistent: 'also exists',
        nonPersistent: 'should not exist'
      }};

      describe('Bootstrap', function() {
        it('Create a Form for a Persistent Field Test', function(done) {
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

      describe('Should return Persistent fields and not return Non-Persistent fields', function() {
        it('on Create', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;

              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert.deepEqual(response.data, {
                persistent: 'exists',
                implicitPersistent: 'also exists'
              }, 'The response should return persistent fields and not return non-persistent fields.');

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('on Read', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;

              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert.deepEqual(response.data, {
                persistent: 'exists',
                implicitPersistent: 'also exists'
              }, 'The response should return persistent fields and not return non-persistent fields.');

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('on Index', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;

              assert.equal(response.length, 1);
              assert(response[0].hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert.deepEqual(response[0].data, {
                persistent: 'exists',
                implicitPersistent: 'also exists'
              }, 'The response should return persistent fields and not return non-persistent fields.');

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('on Update', function(done) {
          var updateSubmission = _.clone(tempSubmission);
          updateSubmission.data = {
            persistent: 'still exists',
            implicitPersistent: 'still also exists',
            nonPersistent: 'still should not exist'
          };

          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(updateSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;

              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert.deepEqual(response.data, {
                persistent: 'still exists',
                implicitPersistent: 'still also exists'
              }, 'The response should return persistent fields and not return non-persistent fields.');

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      })
    });

    describe('create_all submission access with update_all submission permissions', function() {
      // Store the temp form for this test suite.
      var tempForm = {
        title: 'dummyForm2',
        name: 'dummyForm2',
        path: 'dummy/form2',
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
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submissions for this test suite.
      var tempSubmission = {data: {value: 'foo'}};
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function() {
        tempForm.access = [
          {type: 'read_all', roles: [template.roles.authenticated._id.toString()]}
        ];
        tempForm.submissionAccess = [
          {type: 'update_all', roles: [template.roles.authenticated._id.toString()]}
        ];
      });

      describe('Bootstrap', function() {
        it('Create the Form for Ownership Checks', function(done) {
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

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function(role) {
                tempSubmissionAccess.push(_.omit(role, '_id'));
              });
              assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', function() {
        it('An Authenticated User should be able create a submission in their name, with update_all permissions', function(done) {
          var submission = _.clone(tempSubmission);

          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.user1.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.user1._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);
              temp = response;

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should be able to create a submission in someones name, with update_all permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = template.users.admin._id;

          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.user1.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should be able to update the owner of a submission, with update_all permissions', function(done) {
          var doc = {owner: template.users.admin._id};

          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(doc)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              // Remove the modified timestamp for comparison.
              response = _.omit(response, 'modified');
              // Update the owner of temp for comparison.
              temp.owner = doc.owner;

              assert.deepEqual(response, _.omit(temp, 'modified'));

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User', function() {
        it('An Anonymous User should not be able create a submission in their name, without permissions', function(done) {
          var req = request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .send(tempSubmission);

          request401(req, done);
        });

        it('An Anonymous User should not be able to create a submission in someones name, without permissions', function(done) {
          var submission = _.clone(tempSubmission);
          submission.owner = template.users.user1._id;
          var req = request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .send(submission);

          request401(req, done);
        });

        it('An Anonymous User should not be able to update the owner of a submission, without permissions', function(done) {
          var req = request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
            .send({data: temp.data, owner: template.users.admin._id});

          request401(req, done);
        });
      });

      describe('Submission Normalization', function() {
        it('Delete the temp Submissions', function(done) {
          tempSubmissions.forEach(function(submission) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + submission._id, template))
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
              });
          });

          tempSubmissions = [];
          done();
        });
      });

      describe('Form Normalization', function() {
        it('Delete the temp Form', function(done) {
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
              tempForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });
    });

    describe('Submission Resource Access', function() {
      // Create the temp form for testing.
      var tempForm = {
        title: 'Submission resource access check',
        name: 'resourceaccess',
        path: 'resourceaccess',
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
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ]
      };

      // Store the temp submission for this test suite.
      var submission = {data: {value: 'foo'}};
      var tempSubmission = {};
      var tempSubmissions = [];

      before(function() {
        //tempForm.submissionAccess = [
        //  {type: 'update_all', roles: [template.roles.administrator._id.toString()]}
        //];
      });

      describe('Bootstrap', function() {
        it('Create the form', function(done) {
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
              assert.deepEqual(response.submissionAccess, tempForm.submissionAccess);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Admin Users', function() {
        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, without explicit resource access (read)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submissions resource access, without explicit resource access (read)', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.admin._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, with explicit resource access (read)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission, without explicit resource access (read)', function(done) {
          var update = {data: {value: '1231888123q'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data.value = update.data.value;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission owner, without explicit resource access (read)', function(done) {
          var update = {owner: null};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.owner = update.owner;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              update = {owner: template.users.admin._id};
              request(app)
                .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .send(update)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  var expected = _.clone(tempSubmission);
                  expected.owner = update.owner;
                  assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, the owner, can update a submissions resource access, without explicit resource access (read)', function(done) {
          var update = {access: []};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can delete a submission, without explicit resource access (read)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
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

        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submissions resource access, without explicit resource access (write)', function(done) {
          var update = {access: [{type: 'write', resources: [template.users.admin._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, with explicit resource access (write)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission, without explicit resource access (write)', function(done) {
          var update = {data: {value: '1231888123q'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data.value = update.data.value;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission owner, without explicit resource access (write)', function(done) {
          var update = {owner: null};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.owner = update.owner;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              update = {owner: template.users.admin._id};
              request(app)
                .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .send(update)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  var expected = _.clone(tempSubmission);
                  expected.owner = update.owner;
                  assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, the owner, can update a submissions resource access, without explicit resource access (write)', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.user2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can delete a submission, without explicit resource access (write)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
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

        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submissions resource access, with explicit resource access (admin)', function(done) {
          var update = {access: [{type: 'admin', resources: [template.users.admin._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, with explicit resource access (admin)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission, with explicit resource access (admin)', function(done) {
          var update = {data: {value: 'qqwee1231'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data.value = update.data.value;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission owner, with explicit resource access (admin)', function(done) {
          var update = {owner: null};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.owner = update.owner;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              update = {owner: template.users.admin._id};
              request(app)
                .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
                .set('x-jwt-token', template.users.admin.token)
                .send(update)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  var expected = _.clone(tempSubmission);
                  expected.owner = update.owner;
                  assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, the owner, can update a submissions resource access, with explicit resource access (admin)', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.user2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can delete a submission, with explicit resource access (admin)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
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

        // Repeat the tests with another admin, not the owner.
        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, without explicit resource access (read)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (read)', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.admin2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, with explicit resource access (read)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission, without explicit resource access (read)', function(done) {
          var update = {data: {value: '1231888123q'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data.value = update.data.value;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission owner, without explicit resource access (read)', function(done) {
          var update = {owner: null};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.owner = update.owner;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              update = {owner: template.users.admin2._id};
              request(app)
                .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
                .set('x-jwt-token', template.users.admin2.token)
                .send(update)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  var expected = _.clone(tempSubmission);
                  expected.owner = update.owner;
                  assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin2.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (read)', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.user2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can delete a submission, without explicit resource access (read)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (write)', function(done) {
          var update = {access: [{type: 'write', resources: [template.users.admin2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, with explicit resource access (write)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission, with explicit resource access (write)', function(done) {
          var update = {data: {value: '1231888123q'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data.value = update.data.value;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission owner, without explicit resource access (write)', function(done) {
          var update = {owner: null};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.owner = update.owner;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              update = {owner: template.users.admin2._id};
              request(app)
                .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
                .set('x-jwt-token', template.users.admin2.token)
                .send(update)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  var expected = _.clone(tempSubmission);
                  expected.owner = update.owner;
                  assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin2.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (write)', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.user2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can delete a submission, without explicit resource access (write)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, with explicit resource access (admin)', function(done) {
          var update = {access: [{type: 'admin', resources: [template.users.admin2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, with explicit resource access (admin)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission, with explicit resource access (admin)', function(done) {
          var update = {data: {value: '1231888123q'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data.value = update.data.value;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission owner, with explicit resource access (admin)', function(done) {
          var update = {owner: null};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.owner = update.owner;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              update = {owner: template.users.admin2._id};
              request(app)
                .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
                .set('x-jwt-token', template.users.admin2.token)
                .send(update)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  var expected = _.clone(tempSubmission);
                  expected.owner = update.owner;
                  assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin2.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, with explicit resource access (admin)', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.user2._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .send(update)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can delete a submission, with explicit resource access (admin)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', function() {
        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not view a submission, without explicit resource access', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submission, without explicit resource access', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send({data: {value: 'baz'}})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submissions owner, without explicit resource access (read)', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send({owner: template.users.user1._id})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submissions resource access, without explicit resource access', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send({access: [{type: 'admin', resources: [template.users.user1._id]}]})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not delete a submission, without explicit resource access', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Give the user read access to the submission', function(done) {
          var update = {access: [{type: 'read', resources: [template.users.user1._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));

              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can view a submission, with explicit resource access (read)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submission, without explicit resource access (read)', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send({data: {value: 'baz'}})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submissions owner, without explicit resource access (read)', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send({owner: template.users.user1._id})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submissions resource access, without explicit resource access (read)', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send({access: [{type: 'admin', resources: [template.users.user1._id]}]})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not delete a submission, without explicit resource access (read)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Give the user write access to the submission', function(done) {
          var update = {access: [{type: 'write', resources: [template.users.user1._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));

              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can view a submission, with explicit resource access (write)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can update a submission, with explicit resource access (write)', function(done) {
          var update = {data: {value: 'baz'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data = update.data;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));

              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submissions owner, without explicit resource access (write)', function(done) {
          var update = {owner: template.users.user1._id};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              assert.notEqual(response.owner, update.owner);

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submissions resource access, without explicit resource access (write)', function(done) {
          var update = {access: [{type: 'admin', resources: [template.users.user1._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              assert.notEqual(response.access, update.access);

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not delete a submission, without explicit resource access (write)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Give the user admin access to the submission', function(done) {
          var update = {access: [{type: 'admin', resources: [template.users.user1._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));

              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can view a submission, with explicit resource access (admin)', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can update a submission, with explicit resource access (admin)', function(done) {
          var update = {data: {value: 'bqqqweqaz'}};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.data = update.data;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));

              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can update a submissions owner, with explicit resource access (admin)', function(done) {
          var update = {owner: template.users.user1._id};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.owner = update.owner;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));

              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can update a submissions resource access, with explicit resource access (admin)', function(done) {
          var update = {access: [{type: 'admin', resources: [template.users.user1._id]}]};
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(update)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var expected = _.clone(tempSubmission);
              expected.access = update.access;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));

              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];
              done();
            });
        });

        it('A user can delete a submission, with explicit resource access (admin)', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Anonymous User', function() {
        it('An Admin can create a submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
              assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
              assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
              assert(response.data.hasOwnProperty('value'), 'The submission `data` should contain the `value`.');
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
              assert.deepEqual(response.roles, []);
              assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

              // Update the submission data.
              tempSubmission = response;
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A anonymous user can not view a submission, without explicit resource access', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              done();
            });
        });

        it('A anonymous user can not update a submission, without explicit resource access', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .send({data: {foo: 'anything'}})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              done();
            });
        });

        it('A anonymous user can not update a submissions owner, with explicit resource access', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .send({owner: template.users.user2._id})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              done();
            });
        });

        it('A anonymous user can not update a submissions resource access, without explicit resource access', function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .send({access: [{type: 'admin', resources: [template.users.user2._id]}]})
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              done();
            });
        });

        it('A anonymous user can not delete a submission, without explicit resource access', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id + '/submission/' + tempSubmission._id, template))
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response, {});

              done();
            });
        });
      });

      describe('Form Normalization', function() {
        it('Delete the form', function(done) {
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
      });
    });
  });
};
