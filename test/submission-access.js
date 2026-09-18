/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
var assert = require('assert');
var async = require('async');
var _ = require('lodash');
var docker = process.env.DOCKER;

// Request a 401.
var request401 = function (request, done, user) {
  if (user) {
    request.set('x-jwt-token', user.token);
  }
  request
    .expect(401)
    .expect('Content-Type', /text\/plain/)
    .end(function (err, res) {
      if (err) {
        return done(err);
      }

      assert.equal(res.text, 'Unauthorized');

      if (user) {
        // Store the JWT for future API calls.
        user.token = res.headers['x-jwt-token'];
      }

      done();
    });
};

module.exports = function (app, template, hook) {
  const nock = require('nock');

  let Helper;

  before(function () {
    nock('http://myfake.com').persist().get('/nothing').query(true).reply(200, []);
    Helper = require('./helper')(app);
  });

  describe('Submissions', function () {
    describe('Submission Level Permissions (Project Owner)', function () {
      describe('Submission CRUD', function () {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Project owner access check',
          name: 'access',
          path: 'accessowner',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true,
            },
          ],
        };

        // Store the temp submission for this test suite.
        var tempSubmission = { data: { value: 'foo' } };
        var tempSubmissions = [];

        // Shared with the sibling describes below, which consume `tempSubmission` but
        // cannot see a sibling's hook when a test is run in isolation. No-op once built,
        // so whole-file ordering and assertions are unchanged.
        function ensureProjectOwnerSubmission(done) {
          if (tempSubmission._id) {
            return done();
          }
          // Test that roles can not be added on creation.
          tempSubmission.roles = [template.roles.administrator._id.toString()];
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        }

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before(
          'Create a Form for a Submission level Access Check - Project Owner',
          function (done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('access'),
                  'The response should contain an the `access`.',
                );
                assert.equal(response.title, tempForm.title);
                assert.equal(response.name, tempForm.name);
                assert.equal(response.path, tempForm.path);
                assert.equal(response.type, 'form');
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 3);
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                  -1,
                );
                assert.deepEqual(response.submissionAccess, []);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          },
        );

        describe('Project Owner Submission - Delete all submissions', function () {
          var deleteTest = { data: { value: 'foo' } };
          before(
            'The Project Owner should be able to Create a submission without explicit permissions using the Form alias',
            function (done) {
              request(app)
                .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .send(deleteTest)
                .expect(201)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                  assert(
                    response.hasOwnProperty('modified'),
                    'The response should contain a `modified` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('created'),
                    'The response should contain a `created` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('data'),
                    'The response should contain a submission `data` object.',
                  );
                  assert(
                    response.data.hasOwnProperty('value'),
                    'The submission `data` should contain the `value`.',
                  );
                  assert.equal(response.data.value, deleteTest.data.value);
                  assert(
                    response.hasOwnProperty('form'),
                    'The response should contain the `form` id.',
                  );
                  assert.equal(response.form, tempForm._id);
                  assert(
                    response.hasOwnProperty('roles'),
                    'The response should contain the resource `roles`.',
                  );
                  assert.deepEqual(response.roles, []);
                  assert(
                    res.headers.hasOwnProperty('x-jwt-token'),
                    'The response should contain a `x-jwt-token` header.',
                  );

                  // Update the submission data.
                  deleteTest = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            },
          );

          it('The Project Owner should be able to Delete all form submissions with the confirmation header', function (done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .set('x-delete-confirm', tempForm._id)
              .expect(200)
              .end(function (err, res) {
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

          it('The Project Owner should not be able to Delete all form submissions without the confirmation header', function (done) {
            request(app)
              .delete(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(400)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, { error: 'No confirmation header provided' });

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Project Owner Submission', function () {
          before(
            'The Project Owner should be able to Create a submission without explicit permissions',
            ensureProjectOwnerSubmission,
          );

          it('The Project Owner should be able to Read a submission without explicit permissions', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project Owner should be able to Update a submission without explicit permissions', function (done) {
            var updatedSubmission = _.clone(tempSubmission);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project Owner should not be able to add roles to a submission', (done) => {
            var updatedSubmission = _.clone(tempSubmission);
            updatedSubmission.data.value = 'bar';
            updatedSubmission.roles = [template.roles.administrator._id.toString()];
            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send(updatedSubmission)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                updatedSubmission.roles = [];
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmission = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Read the Index of submissions without explicit permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project Owner should be able to Read the Index of submissions without explicit permissions without data', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission?list=1', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1, 'The response should contain 1 element');
                assert(!response[0].hasOwnProperty('data'));

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to Read a submission without explicit permissions using the Form alias', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project Owner should be able to Update a submission without explicit permissions using the Form alias', function (done) {
            var updatedSubmission = _.clone(tempSubmission);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project Owner should be able to Read the Index of submissions without explicit permissions using the Form alias', function (done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A user with full permissions should not be able to edit data outside the submission.data object', function (done) {
            var updatedSubmission = _.clone(tempSubmission);
            updatedSubmission.data.value = 'bar3';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send({
                other: 'this should not save', // try to add a field that is not present
                externalIds: [{ foo: 'bar' }], // try to edit a field that exists on the submissions w/ timestamp plugin
                roles: [].concat(tempSubmission.roles, template.users.admin._id), // try to edit a field that exists on the submissions
                data: { value: updatedSubmission.data.value },
              })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          var deleteTest = { data: { value: 'foo' } };
          // Pattern E: a three-link chain — one test creates `deleteTest` through the form alias,
          // the next deletes it, and the third asserts the deleted row is still in the database.
          // Two builders, so the second and third links can each run on their own. The delete guard
          // keys on *identity* (`deletedAliasId === deleteTest._id`) rather than existence, because
          // a rebuild produces a different submission that has not been deleted yet.
          function ensureDeleteTestSubmission(cb) {
            if (deleteTest._id) {
              return cb();
            }
            createDeleteTestSubmission(cb);
          }

          var deletedAliasId = null;
          function ensureDeleteTestDeleted(cb) {
            ensureDeleteTestSubmission(function (err) {
              if (err) {
                return cb(err);
              }
              if (deletedAliasId === deleteTest._id) {
                return cb();
              }
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + deleteTest._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return cb(err);
                  }
                  deletedAliasId = deleteTest._id;
                  template.users.admin.token = res.headers['x-jwt-token'];
                  cb(null, res);
                });
            });
          }

          it(
            'The Project Owner should be able to Create a submission without explicit permissions using the Form alias',
            ensureDeleteTestSubmission,
          );

          function createDeleteTestSubmission(done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(deleteTest)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, deleteTest.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                deleteTest = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          }

          it('The Project Owner should be able to Delete a submission without explicit permissions using the Form alias', function (done) {
            ensureDeleteTestDeleted(function (err, res) {
              if (err) {
                return done(err);
              }

              assert.deepEqual(res.body, {});
              done();
            });
          });

          if (!docker)
            it('A deleted Submission should remain in the database', function (done) {
              ensureDeleteTestDeleted(async function (err) {
                if (err) {
                  return done(err);
                }

                try {
                  var formio = hook.alter('formio', app.formio);
                  let submission = await formio.resources.submission.model.findOne({
                    _id: deleteTest._id,
                  });
                  if (!submission) {
                    throw new Error(
                      'No submission found with _id: ' + deleteTest._id + ', expected 1.',
                    );
                  }

                  submission = submission.toObject();
                  assert.notEqual(submission.deleted, null);
                  done();
                } catch (error) {
                  done(error);
                }
              });
            });

          it('Cant access a submission without a valid Submission Id', function (done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission/2342342344234', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(400)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Authenticated User Submission', function () {
          before(ensureProjectOwnerSubmission);
          it('A Registered user should not be able to Create a submission without explicit permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit permissions', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit permissions', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit permissions', function (done) {
            var req = request(app).get(
              hook.alter('url', '/form/' + tempForm._id + '/submission', template),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit permissions using the Form alias', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit permissions using the Form alias', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit permissions using the Form alias', function (done) {
            var req = request(app).get(
              hook.alter('url', '/' + tempForm.path + '/submission', template),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Create a submissions without explicit permissions using the Form alias', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(tempSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submissions without explicit permissions using the Form alias', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit permissions', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });
        });

        describe('Anonymous User Submission', function () {
          before(ensureProjectOwnerSubmission);
          it('An Anonymous user should not be able to Create a submission without explicit permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions', function (done) {
            var req = request(app).get(
              hook.alter('url', '/form/' + tempForm._id + '/submission', template),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions using the Form alias', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions using the Form alias', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions using the Form alias', function (done) {
            var req = request(app).get(
              hook.alter('url', '/' + tempForm.path + '/submission', template),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Create a submission without explicit permissions using the Form alias', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send({ foo: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions using the Form alias', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                template,
              ),
            );

            request401(req, done);
          });
        });

        describe('Submission Normalization', function () {
          before(ensureProjectOwnerSubmission);

          // Pattern E: the soft-delete check below needs the delete above it to have happened.
          // Guarded on identity, not existence — `ensureProjectOwnerSubmission` can hand back a
          // freshly built submission that has not been deleted yet.
          var deletedProjectOwnerId = null;
          function ensureProjectOwnerSubmissionDeleted(cb) {
            ensureProjectOwnerSubmission(function (err) {
              if (err) {
                return cb(err);
              }
              if (deletedProjectOwnerId === tempSubmission._id) {
                return cb();
              }
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return cb(err);
                  }
                  deletedProjectOwnerId = tempSubmission._id;
                  template.users.admin.token = res.headers['x-jwt-token'];
                  cb(null, res);
                });
            });
          }

          it('The Project owner should be able to Delete a submission with explicit Own permissions', function (done) {
            ensureProjectOwnerSubmissionDeleted(function (err, res) {
              if (err) {
                return done(err);
              }

              assert.deepEqual(res.body, {});
              done();
            });
          });

          if (!docker)
            it('A deleted Submission should remain in the database', function (done) {
              ensureProjectOwnerSubmissionDeleted(async function (err) {
                if (err) {
                  return done(err);
                }

                try {
                  var formio = hook.alter('formio', app.formio);
                  let submission = await formio.resources.submission.model
                    .findOne({ _id: tempSubmission._id })
                    .exec();
                  if (!submission) {
                    throw new Error(
                      'No submission found w/ _id: ' + tempSubmission._id + ', expected 1.',
                    );
                  }

                  submission = submission.toObject();
                  assert.notEqual(submission.deleted, null);
                  done();
                } catch (error) {
                  done(error);
                }
              });
            });

          it('Delete the Submissions created for Ownership Checks', function (done) {
            async.eachSeries(
              tempSubmissions,
              function (submission, subDone) {
                request(app)
                  .delete(
                    hook.alter(
                      'url',
                      '/form/' + tempForm._id + '/submission/' + submission._id,
                      template,
                    ),
                  )
                  .set('x-jwt-token', template.users.admin.token)
                  .expect(200)
                  .end(function (err, res) {
                    if (err) {
                      return subDone(err);
                    }

                    var response = res.body;
                    assert.deepEqual(response, {});

                    // Store the JWT for future API calls.
                    template.users.admin.token = res.headers['x-jwt-token'];
                    subDone();
                  });
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                tempSubmissions = [];
                done();
              },
            );
          });
        });

        describe('Form Normalization', function () {
          it('Delete the form created for Access Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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
            it('A deleted Form should not have active submissions in the database', async function () {
              var formio = hook.alter('formio', app.formio);
              const submissions = await formio.resources.submission.model
                .findOne({ form: tempForm._id, deleted: { $eq: null } })
                .exec();
              if (submissions && submissions.length !== 0) {
                throw (
                  submissions.length +
                  ' submissions found with the form: ' +
                  tempForm._id +
                  ', expected 0.'
                );
              }
            });
        });
      });

      describe('Submission Ownership', function () {
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
                required: false,
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
              input: true,
            },
          ],
        };

        // Store the temp submissions for this test suite.
        var tempSubmissions = [];
        var temp = {};

        // Pattern B/E (formio-server/test/tools/INDEPENDENCE.md): `temp` is created by a test inside
        // `Project Owner` and then read both by the tests after it and by the `Authenticated User` /
        // `Anonymous User` siblings — and mocha runs neither a sibling suite's hooks nor its tests. This
        // builder recreates exactly what that test creates. The `_id` guard keeps whole-file ordering
        // byte-identical: in file order the original creator is still the only POST, and every call from
        // a consumer is a no-op.
        function ensureOwnedSubmission(cb) {
          if (temp._id) {
            return cb(null, temp);
          }

          var owned = { data: { value: 'foo' }, owner: template.users.user1._id };
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(owned)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return cb(err);
              }

              tempSubmissions.push(res.body);
              temp = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              cb(null, temp);
            });
        }

        // Runs the builder, then the test body verbatim.
        var withOwnedSubmission = (body) =>
          function (done) {
            ensureOwnedSubmission((err) => (err ? done(err) : body.call(this, done)));
          };

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before('Create the Form for Ownership Checks', function (done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('access'),
                'The response should contain an the `access`.',
              );
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                -1,
              );
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, tempForm.components);
              tempForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        describe('Project Owner', function () {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function (done) {
            var tempSubmission = { data: { value: 'foo' } };

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.equal(response.owner, template.users.admin._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function (done) {
            var tempSubmission = { data: { value: 'foo' }, owner: template.users.user1._id };

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, tempSubmission.owner);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it(
            'The Project Owner should be able to update the owner of a submission, without explicit permissions',
            withOwnedSubmission(function (done) {
              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send({ owner: template.users.admin._id })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );

          it(
            'Updating a submission with explicit empty data, will remove all the data',
            withOwnedSubmission(function (done) {
              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send({ data: {} })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Authenticated User', function () {
          it('An Authenticated User should not be able create a submission in their name, without permissions', function (done) {
            var submission = { data: { value: 'foo' }, owner: template.users.user1._id };
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to create a submission in someones name, without permissions', function (done) {
            var submission = { data: { value: 'foo' }, owner: template.users.user2._id };
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it(
            'An Authenticated User should not be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ owner: template.users.user1._id });

              request401(req, done, template.users.user1);
            }),
          );
        });

        describe('Anonymous User', function () {
          it(
            'An Anonymous User should not be able create a submission in their name, without permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
                .send({ data: temp.data });

              request401(req, done);
            }),
          );

          it('An Anonymous User should not be able to create a submission in someones name, without permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send({ data: { value: 'foo' }, owner: template.users.user2._id });

            request401(req, done);
          });

          it(
            'An Anonymous User should not be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ data: temp.data, owner: template.users.admin._id });

              request401(req, done);
            }),
          );
        });

        describe('Submission Normalization', function () {
          it('Delete the Submissions created for Ownership Checks', function (done) {
            async.eachSeries(
              tempSubmissions,
              function (submission, subDone) {
                request(app)
                  .delete(
                    hook.alter(
                      'url',
                      '/form/' + tempForm._id + '/submission/' + submission._id,
                      template,
                    ),
                  )
                  .set('x-jwt-token', template.users.admin.token)
                  .expect(200)
                  .end(function (err, res) {
                    if (err) {
                      return subDone(err);
                    }

                    var response = res.body;
                    assert.deepEqual(response, {});

                    // Store the JWT for future API calls.
                    template.users.admin.token = res.headers['x-jwt-token'];
                    subDone();
                  });
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                tempSubmissions = [];
                done();
              },
            );
          });
        });

        describe('Form Normalization', function () {
          it('Delete the Form created for Ownership Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

    describe('Submission Level Permissions (Authenticated User)', function () {
      describe('Submission CRUD - _own', function () {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Authenticated access check',
          name: 'access',
          path: 'accessauthenticated',
          type: 'form',
          components: [
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: true,
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
              input: true,
            },
          ],
        };

        // Store the template submission for this test suite.
        var templateSubmission = { data: { value: 'foo' } };

        // Store the user1 temp submission for this test suite.
        var tempSubmissionUser1 = {};

        // Store the user2 temp submission for this test suite.
        var tempSubmissionUser2 = {};

        // Pattern E (formio-server/test/tools/INDEPENDENCE.md): `tempSubmissionUser2` is built by one
        // test and read by later tests and by sibling describes, which never see each
        // other's hooks. The `_id` guard keeps whole-file ordering byte-identical: in file
        // order the original producer is still the only POST.
        function ensureTempSubmissionUser2(done) {
          if (tempSubmissionUser2._id) {
            return done();
          }

          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.user2.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.user2._id);

              tempSubmissionUser2 = response;

              // Store the JWT for future API calls.
              template.users.user2.token = res.headers['x-jwt-token'];

              done();
            });
        }

        // Runs the builder, then the test body verbatim.
        var withTempSubmissionUser2 = (fn) =>
          function (done) {
            ensureTempSubmissionUser2((err) => (err ? done(err) : fn.call(this, done)));
          };

        // Store the Project Owners submission for this test suite.
        var tempSubmissionOwner1 = {};

        // Shared with the sibling describes below, which consume `tempSubmissionUser1` but
        // cannot see a sibling's hook when a test runs in isolation. No-op once built.
        function ensureUser1Submission(done) {
          if (tempSubmissionUser1._id) {
            return done();
          }
          // Try to create a submission with elevated permissions.
          templateSubmission.roles = [template.roles.administrator._id.toString()];
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.user1.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.user1._id);

              // Update the submission data.
              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        }

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                ,
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_own',
              roles: [template.roles.authenticated._id.toString()],
            },
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
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before(
          'Create a Form for a Submission level Access Check - Authenticated User',
          function (done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('access'),
                  'The response should contain an the `access`.',
                );
                assert.equal(response.title, tempForm.title);
                assert.equal(response.name, tempForm.name);
                assert.equal(response.path, tempForm.path);
                assert.equal(response.type, 'form');
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 3);
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                  -1,
                );

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function (role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          },
        );

        describe('Authenticated User Submission', function () {
          it('A bad user should be able to run a dry run and get unauthorized.', function (done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission?dryrun=1', template))
              .set('x-jwt-token', 'badtoken')
              .send({ data: {} })
              .expect(400)
              .end(function (err, res) {
                assert.equal(res.text, 'Bad Token');
                done();
              });
          });

          it('A Registered user should be able to run a dry run and get validation errors', function (done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission?dryrun=1', template))
              .set('x-jwt-token', template.users.user1.token)
              .send({ data: {} })
              .expect(400)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.name, 'ValidationError');
                assert(
                  res.headers.hasOwnProperty('x-jwt-token') && !!res.headers['x-jwt-token'],
                  'The response should contain token.',
                );
                template.users.user1.token = res.headers['x-jwt-token'];
                done();
              });
          });

          it('A Registered user should be able to run a dry run to create a submission', function (done) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission?dryrun=1', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(templateSubmission)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(
                  res.headers.hasOwnProperty('x-jwt-token') && !!res.headers['x-jwt-token'],
                  'The response should contain token.',
                );

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          before(
            'A Registered user should be able to Create a submission with explicit Own permissions',
            ensureUser1Submission,
          );

          it('A Registered user should be able to Read a submission with explicit Own permissions', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Update a submission with explicit Own permissions', function (done) {
            var updatedSubmission = _.cloneDeep(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar';
            // Attempt to elevate permissions.
            updatedSubmission.roles = [template.roles.administrator._id.toString()];

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                // Update the modified timestamp for response comparison.
                updatedSubmission.modified = response.modified;
                updatedSubmission.roles = [];
                assert.deepEqual(response, updatedSubmission);

                // Update the submission data.
                tempSubmissionUser1 = updatedSubmission;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Read the Index of their submissions with owner property set', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' +
                    tempForm._id +
                    '/submission?owner=' +
                    template.users.user1._id.toString(),
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Read a submission with explicit Own permissions using the Form alias', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Update a submission with explicit Own permissions using the Form alias', function (done) {
            var updatedSubmission = _.cloneDeep(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions using the Form alias', function (done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Delete a submission with explicit Own permissions', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function (err, res) {
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

          it('A Registered user should be able to Create a submission with explicit Own permissions with the Form alias', function (done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);

                // Update the submission data.
                tempSubmissionUser1 = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it(
            'An Additional Registered user should be able to Create a submission with explicit Own permissions',
            ensureTempSubmissionUser2,
          );

          it(
            'A Registered user should not be able to Read a Submission with explicit Own permissions, that they do not personally Own',
            withTempSubmissionUser2(function (done) {
              var req = request(app).get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id,
                  template,
                ),
              );

              request401(req, done, template.users.user1);
            }),
          );

          it('A Registered user should be able to Read the Index of their submissions with explicit Own permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it(
            'An Additional Registered user should be able to Read the Index of their submissions with explicit Own permissions',
            withTempSubmissionUser2(function (done) {
              request(app)
                .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
                .set('x-jwt-token', template.users.user2.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Submission Exists Endpoints', function () {
          before(ensureUser1Submission);
          it('Should not allow you to create a reserved form path', function (done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send({
                title: 'Bad Form',
                name: 'exists',
                path: 'exists',
                type: 'form',
                components: [],
              })
              .expect(400)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }
                assert(
                  res.text.indexOf('Form path cannot contain one of the following names') === 0,
                  'Form path not valid',
                );
                done();
              });
          });

          it('Test if a submissions exists', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' +
                    tempForm._id +
                    '/exists?data.value=foo&owner=' +
                    template.users.user1._id.toString(),
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                assert.equal(res.body._id, tempSubmissionUser1._id.toString());
                done();
              });
          });

          it('Should give me an error if no query is provided', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/exists', template))
              .expect(400)
              .end(done);
          });

          it('Should strip MongoDB operators (i.e. $where) from the /exists query', async function () {
            // The sanitize middleware must remove the $where operator. Once it is
            // gone the only query param is empty -> 400 'Invalid query'.
            await request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/exists?$where=true', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(400)
              .expect('Invalid query');
          });

          it(
            'Test if a submissions exists',
            withTempSubmissionUser2(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' +
                      tempForm._id +
                      '/exists?data.value=foo&owner=' +
                      template.users.user2._id.toString(),
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  assert.equal(res.body._id, tempSubmissionUser2._id.toString());
                  done();
                });
            }),
          );

          it(
            'Should give an unuthorized error for anonymous',
            withTempSubmissionUser2(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' +
                      tempForm._id +
                      '/exists?data.value=foo&owner=' +
                      template.users.user2._id.toString(),
                    template,
                  ),
                )
                .expect(401)
                .end(done);
            }),
          );

          it('Test if a submissions exists', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/exists?data.value=foo', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(done);
          });

          it(
            'Test if a submissions exists',
            withTempSubmissionUser2(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' +
                      tempForm._id +
                      '/exists?owner=' +
                      template.users.user2._id.toString(),
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  assert.equal(res.body._id, tempSubmissionUser2._id.toString());
                  done();
                });
            }),
          );

          it('Should 404 if it does not exist', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' +
                    tempForm._id +
                    '/exists?data.value=test&owner=' +
                    template.users.user2._id.toString(),
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(404)
              .end(done);
          });

          it('Should 404 if it does not exist', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/exists?data.value=test', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(404)
              .end(done);
          });
        });

        describe('Project Owner Submission', function () {
          before(ensureUser1Submission);
          before(
            'The Project owner should be able to Create a submission without explicit Own permissions',
            function (done) {
              request(app)
                .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .send(templateSubmission)
                .expect(201)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                  assert(
                    response.hasOwnProperty('modified'),
                    'The response should contain a `modified` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('created'),
                    'The response should contain a `created` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('data'),
                    'The response should contain a submission `data` object.',
                  );
                  assert(
                    response.data.hasOwnProperty('value'),
                    'The submission `data` should contain the `value`.',
                  );
                  assert.equal(response.data.value, templateSubmission.data.value);
                  assert(
                    response.hasOwnProperty('form'),
                    'The response should contain the `form` id.',
                  );
                  assert.equal(response.form, tempForm._id);
                  assert(
                    response.hasOwnProperty('roles'),
                    'The response should contain the resource `roles`.',
                  );
                  assert.deepEqual(response.roles, []);
                  assert(
                    res.headers.hasOwnProperty('x-jwt-token'),
                    'The response should contain a `x-jwt-token` header.',
                  );
                  assert(
                    response.hasOwnProperty('owner'),
                    'The response should contain the resource `owner`.',
                  );
                  assert.notEqual(response.owner, null);
                  assert.equal(response.owner, template.users.admin._id);

                  tempSubmissionOwner1 = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            },
          );

          it(
            'The Project owner should be able to Read a submission without explicit Own permissions',
            withTempSubmissionUser2(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, tempSubmissionUser2);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );

          it(
            'The Project owner should be able to Update a submission without explicit Own permissions',
            withTempSubmissionUser2(function (done) {
              var updatedSubmission = _.cloneDeep(tempSubmissionUser2);
              updatedSubmission.data.value = 'bar2';

              request(app)
                .put(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + tempSubmissionUser2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send({ data: { value: updatedSubmission.data.value } })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );

          it(
            'The Project owner should be able to Read the Index of submissions without explicit Own permissions',
            withTempSubmissionUser2(function (done) {
              request(app)
                .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.equal(response.length, 3);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );

          it('The Project owner should be able to Delete a submission without explicit Own permissions', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

          it('The Project owner should be able to Create a submission without explicit Own permissions with the Form alias', function (done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit Own permissions with the Form alias', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Update a submission without explicit Own permissions with the Form alias', function (done) {
            var updatedSubmission = _.cloneDeep(tempSubmissionOwner1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it(
            'The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias',
            withTempSubmissionUser2(function (done) {
              request(app)
                .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.equal(response.length, 3);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );

          it('The Project owner should be able to Delete a submission without explicit Own permissions with the Form alias', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

        describe('Anonymous User Submission', function () {
          before(ensureUser1Submission);
          it('An Anonymous user should not be able to Create a submission without explicit Own permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit Own permissions', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit Own permissions', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions', function (done) {
            var req = request(app).get(
              hook.alter('url', '/form/' + tempForm._id + '/submission', template),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit Own permissions', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Create a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter('url', '/' + tempForm.path + '/submission', template),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });
        });

        describe('Submission Normalization', function () {
          before(ensureUser1Submission);
          it('A Registered user should be able to Delete a submission with explicit Own permissions using the Form alias', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function (err, res) {
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

          it(
            'The Project owner should be able to Delete a submission without explicit Own permissions using the Form alias',
            withTempSubmissionUser2(function (done) {
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionUser2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Form Normalization', function () {
          it('Delete the form created for Access Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

      describe('Submission CRUD - _all', function () {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Authenticated access check',
          name: 'access',
          path: 'accessauthenticated',
          type: 'form',
          components: [
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: true,
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
              input: true,
            },
          ],
        };

        // Store the template submission for this test suite.
        var templateSubmission = { data: { value: 'foo' } };

        // Store the user1 temp submission for this test suite.
        var tempSubmissionUser1 = {};

        // Store the Project Owners submission for this test suite.
        var tempSubmissionOwner1 = {};

        // Shared with the sibling describes below, which consume this fixture but cannot
        // see a sibling's hook when a test runs in isolation. No-op once built.
        function ensureUser1SubmissionAll(done) {
          if (tempSubmissionUser1._id) {
            return done();
          }
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.user1.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.user1._id);

              // Update the submission data.
              tempSubmissionUser1 = response;

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        }

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_all',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'read_all',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'update_all',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'delete_all',
              roles: [template.roles.authenticated._id.toString()],
            },
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before(
          'Create a Form for a Submission level Access Check - Authenticated User',
          function (done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('access'),
                  'The response should contain an the `access`.',
                );
                assert.equal(response.title, tempForm.title);
                assert.equal(response.name, tempForm.name);
                assert.equal(response.path, tempForm.path);
                assert.equal(response.type, 'form');
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 3);
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                  -1,
                );

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function (role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          },
        );

        describe('Authenticated User Submission', function () {
          before(
            'A Registered user should be able to Create a submission with explicit permissions',
            ensureUser1SubmissionAll,
          );

          it('A Registered user should be able to Read a submission with explicit permissions', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Update a submission with explicit permissions', function (done) {
            var updatedSubmission = _.cloneDeep(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Read the Index of submissions with explicit permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Read a submission with explicit permissions using the Form alias', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Update a submission with explicit permissions using the Form alias', function (done) {
            var updatedSubmission = _.cloneDeep(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Read the Index of submissions with explicit permissions using the Form alias', function (done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('A Registered user should be able to Delete a submission with explicit permissions', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function (err, res) {
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

          it('A Registered user should be able to Create a submission with explicit permissions with the Form alias', function (done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
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

        describe('Project Owner Submission', function () {
          before(ensureUser1SubmissionAll);
          before(
            'The Project owner should be able to Create a submission without explicit permissions',
            function (done) {
              request(app)
                .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .send(templateSubmission)
                .expect(201)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                  assert(
                    response.hasOwnProperty('modified'),
                    'The response should contain a `modified` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('created'),
                    'The response should contain a `created` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('data'),
                    'The response should contain a submission `data` object.',
                  );
                  assert(
                    response.data.hasOwnProperty('value'),
                    'The submission `data` should contain the `value`.',
                  );
                  assert.equal(response.data.value, templateSubmission.data.value);
                  assert(
                    response.hasOwnProperty('form'),
                    'The response should contain the `form` id.',
                  );
                  assert.equal(response.form, tempForm._id);
                  assert(
                    response.hasOwnProperty('roles'),
                    'The response should contain the resource `roles`.',
                  );
                  assert.deepEqual(response.roles, []);
                  assert(
                    res.headers.hasOwnProperty('x-jwt-token'),
                    'The response should contain a `x-jwt-token` header.',
                  );
                  assert(
                    response.hasOwnProperty('owner'),
                    'The response should contain the resource `owner`.',
                  );
                  assert.notEqual(response.owner, null);
                  assert.equal(response.owner, template.users.admin._id);

                  tempSubmissionOwner1 = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            },
          );

          it('The Project owner should be able to Read a submission without explicit permissions', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Update a submission without explicit permissions', function (done) {
            var updatedSubmission = _.cloneDeep(tempSubmissionUser1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Read the Index of submissions without explicit permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Delete a submission without explicit permissions', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

          it('The Project owner should be able to Create a submission without explicit permissions with the Form alias', function (done) {
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(templateSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);

                tempSubmissionOwner1 = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project owner should be able to Read a submission without explicit permissions with the Form alias', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Update a submission without explicit permissions with the Form alias', function (done) {
            var updatedSubmission = _.cloneDeep(tempSubmissionOwner1);
            updatedSubmission.data.value = 'bar2';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Read the Index of submissions without explicit permissions with the Form alias', function (done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Delete a submission without explicit permissions with the Form alias', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

        describe('Anonymous User Submission', function () {
          before(ensureUser1SubmissionAll);
          it('An Anonymous user should not be able to Create a submission without explicit permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions', function (done) {
            var req = request(app).get(
              hook.alter('url', '/form/' + tempForm._id + '/submission', template),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Create a submission without explicit permissions with the Form alias', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission);

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read a submission without explicit permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission without explicit permissions with the Form alias', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter('url', '/' + tempForm.path + '/submission', template),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission without explicit permissions with the Form alias', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                template,
              ),
            );

            request401(req, done);
          });
        });

        describe('Submission Normalization', function () {
          before(ensureUser1SubmissionAll);
          it('A Registered user should be able to Delete a submission with explicit permissions using the Form alias', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionUser1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end(function (err, res) {
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

        describe('Form Normalization', function () {
          it('Delete the form created for Access Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

      describe('Submission Ownership - _own', function () {
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
                required: true,
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
              input: true,
            },
          ],
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = { data: { value: 'foo' } };
        var tempSubmissions = [];
        var temp = {};

        // Pattern B/E (formio-server/test/tools/INDEPENDENCE.md): `temp` is created by a test inside
        // `Project Owner` and then read both by the tests after it and by the `Authenticated User` /
        // `Anonymous User` siblings — and mocha runs neither a sibling suite's hooks nor its tests. This
        // builder recreates exactly what that test creates. The `_id` guard keeps whole-file ordering
        // byte-identical: in file order the original creator is still the only POST, and every call from
        // a consumer is a no-op.
        function ensureOwnedSubmission(cb) {
          if (temp._id) {
            return cb(null, temp);
          }

          var owned = Object.assign(_.cloneDeep(tempSubmission), {
            owner: template.users.user2._id,
          });
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(owned)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return cb(err);
              }

              tempSubmissions.push(res.body);
              temp = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              cb(null, temp);
            });
        }

        // Runs the builder, then the test body verbatim.
        var withOwnedSubmission = (body) =>
          function (done) {
            ensureOwnedSubmission((err) => (err ? done(err) : body.call(this, done)));
          };

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_own',
              roles: [template.roles.authenticated._id.toString()],
            },
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
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before('Create the Form for Ownership Checks', function (done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('access'),
                'The response should contain an the `access`.',
              );
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                -1,
              );

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function (role) {
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

        describe('Project Owner', function () {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without explicit permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);
            submission.owner = template.users.user2._id;
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it(
            'The Project Owner should be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var doc = { data: temp.data, owner: template.users.admin._id };

              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send(doc)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Authenticated User', function () {
          it('An Authenticated User should be able create a submission in their name, with _own permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          // The submission will be made, but in there name rather than the one supplied.
          it('An Authenticated User should not be able to create a submission in someones name, with _own permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);
            submission.owner = template.users.admin._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it(
            'An Authenticated User should not be able to update the owner of a submission, with _own permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ data: temp.data, owner: template.users.admin._id });

              request401(req, done, template.users.user1);
            }),
          );
        });

        describe('Anonymous User', function () {
          it('An Anonymous User should not be able create a submission in their name, without permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done);
          });

          it('An Anonymous User should not be able to create a submission in someones name, without permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);
            submission.owner = template.users.user1._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done);
          });

          it(
            'An Anonymous User should not be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ data: temp.data, owner: template.users.admin._id });

              request401(req, done);
            }),
          );
        });

        describe('Submission Normalization', function () {
          it('Delete the Submissions created for Ownership Checks', function (done) {
            async.eachSeries(
              tempSubmissions,
              function (submission, subDone) {
                request(app)
                  .delete(
                    hook.alter(
                      'url',
                      '/form/' + tempForm._id + '/submission/' + submission._id,
                      template,
                    ),
                  )
                  .set('x-jwt-token', template.users.admin.token)
                  .expect(200)
                  .end(function (err, res) {
                    if (err) {
                      return subDone(err);
                    }

                    var response = res.body;
                    assert.deepEqual(response, {});

                    // Store the JWT for future API calls.
                    template.users.admin.token = res.headers['x-jwt-token'];
                    subDone();
                  });
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                tempSubmissions = [];
                done();
              },
            );
          });
        });

        describe('Form Normalization', function () {
          it('Delete the Form created for Ownership Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

      describe('Submission Ownership - _all', function () {
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
                required: true,
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
              input: true,
            },
          ],
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = { data: { value: 'foo' } };
        var tempSubmissions = [];
        var temp = {};

        // Pattern B/E (formio-server/test/tools/INDEPENDENCE.md): `temp` is created by a test inside
        // `Project Owner` and then read both by the tests after it and by the `Authenticated User` /
        // `Anonymous User` siblings — and mocha runs neither a sibling suite's hooks nor its tests. This
        // builder recreates exactly what that test creates. The `_id` guard keeps whole-file ordering
        // byte-identical: in file order the original creator is still the only POST, and every call from
        // a consumer is a no-op.
        function ensureOwnedSubmission(cb) {
          if (temp._id) {
            return cb(null, temp);
          }

          var owned = Object.assign(_.cloneDeep(tempSubmission), {
            owner: template.users.user2._id,
          });
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(owned)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return cb(err);
              }

              tempSubmissions.push(res.body);
              temp = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              cb(null, temp);
            });
        }

        // Runs the builder, then the test body verbatim.
        var withOwnedSubmission = (body) =>
          function (done) {
            ensureOwnedSubmission((err) => (err ? done(err) : body.call(this, done)));
          };

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_all',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'read_all',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'update_all',
              roles: [template.roles.authenticated._id.toString()],
            },
            {
              type: 'delete_all',
              roles: [template.roles.authenticated._id.toString()],
            },
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before('Create the Form for Ownership Checks', function (done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('access'),
                'The response should contain an the `access`.',
              );
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                -1,
              );

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function (role) {
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

        describe('Project Owner', function () {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);
            submission.owner = template.users.user2._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it(
            'The Project Owner should be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var submission = _.cloneDeep(tempSubmission);
              submission.owner = template.users.user1._id;

              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send({ owner: submission.owner })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  // Update the temp owner for comparison.
                  temp.owner = submission.owner;

                  assert.deepEqual(_.omit(response, 'modified'), _.omit(temp, 'modified'));

                  temp = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );
        });

        describe('Authenticated User', function () {
          it('An Authenticated User should be able create a submission in their name, with _all permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user1._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('An Authenticated User should be able to create a submission in someones name, with _all permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);
            submission.owner = template.users.admin._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it(
            'An Authenticated User should be able to update the owner of a submission, with _all permissions',
            withOwnedSubmission(function (done) {
              var doc = { owner: template.users.admin._id };

              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .set('x-jwt-token', template.users.user1.token)
                .send(doc)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Anonymous User', function () {
          it('An Anonymous User should not be able create a submission in their name, without permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done);
          });

          it('An Anonymous User should not be able to create a submission in someones name, without permissions', function (done) {
            var submission = _.cloneDeep(tempSubmission);
            submission.owner = template.users.user1._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done);
          });

          it(
            'An Anonymous User should not be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ data: temp.data, owner: template.users.admin._id });

              request401(req, done);
            }),
          );
        });

        describe('Submission Normalization', function () {
          it('Delete the Submissions created for Ownership Checks', function (done) {
            async.eachSeries(
              tempSubmissions,
              function (submission, subDone) {
                request(app)
                  .delete(
                    hook.alter(
                      'url',
                      '/form/' + tempForm._id + '/submission/' + submission._id,
                      template,
                    ),
                  )
                  .set('x-jwt-token', template.users.admin.token)
                  .expect(200)
                  .end(function (err, res) {
                    if (err) {
                      return subDone(err);
                    }

                    var response = res.body;
                    assert.deepEqual(response, {});

                    // Store the JWT for future API calls.
                    template.users.admin.token = res.headers['x-jwt-token'];
                    subDone();
                  });
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                tempSubmissions = [];
                done();
              },
            );
          });
        });

        describe('Form Normalization', function () {
          it('Delete the Form created for Ownership Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

    describe('Submission Level Permissions (Anonymous User)', function () {
      describe('Submission CRUD - _own', function () {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Anonymous access check',
          name: 'access',
          path: 'accessanonymous',
          type: 'form',
          components: [
            {
              type: 'textfield',
              validate: {
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                required: true,
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
              input: true,
            },
          ],
        };

        // Store the template submission for this test suite.
        var templateSubmission = { data: { value: 'foo' } };

        // Store the anonymous temp submission1 for this test suite.
        var tempSubmissionAnon1 = {};

        // Store the anonymous temp submission2 for this test suite.
        var tempSubmissionAnon2 = {};

        // Pattern E (formio-server/test/tools/INDEPENDENCE.md): `tempSubmissionAnon2` is built by one
        // test and read by later tests and by sibling describes, which never see each
        // other's hooks. The `_id` guard keeps whole-file ordering byte-identical: in file
        // order the original producer is still the only POST.
        function ensureTempSubmissionAnon2(done) {
          if (tempSubmissionAnon2._id) {
            return done();
          }

          request(app)
            .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon2 = response;

              done();
            });
        }

        // Runs the builder, then the test body verbatim.
        var withTempSubmissionAnon2 = (fn) =>
          function (done) {
            ensureTempSubmissionAnon2((err) => (err ? done(err) : fn.call(this, done)));
          };

        // Store the Project Owners submission1 for this test suite.
        var tempSubmissionOwner1 = {};

        // Store the Project Owners submission2 for this test suite.
        var tempSubmissionOwner2 = {};

        // Pattern E (formio-server/test/tools/INDEPENDENCE.md): `tempSubmissionOwner2` is built by one
        // test and read by later tests and by sibling describes, which never see each
        // other's hooks. The `_id` guard keeps whole-file ordering byte-identical: in file
        // order the original producer is still the only POST.
        function ensureTempSubmissionOwner2(done) {
          if (tempSubmissionOwner2._id) {
            return done();
          }

          request(app)
            .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.admin._id);

              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        }

        // Runs the builder, then the test body verbatim.
        var withTempSubmissionOwner2 = (fn) =>
          function (done) {
            ensureTempSubmissionOwner2((err) => (err ? done(err) : fn.call(this, done)));
          };

        // Shared with the sibling describes below, which consume this fixture but cannot
        // see a sibling's hook when a test runs in isolation. No-op once built.
        function ensureAnon1SubmissionOwn(done) {
          if (tempSubmissionAnon1._id) {
            return done();
          }
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon1 = response;

              done();
            });
        }

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_own',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'read_own',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'update_own',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'delete_own',
              roles: [template.roles.anonymous._id.toString()],
            },
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before(
          'Create a Form for a Submission level Access Check - Anonymous User',
          function (done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('access'),
                  'The response should contain an the `access`.',
                );
                assert.equal(response.title, tempForm.title);
                assert.equal(response.name, tempForm.name);
                assert.equal(response.path, tempForm.path);
                assert.equal(response.type, 'form');
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 3);
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                  -1,
                );

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function (role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          },
        );

        describe('Anonymous User Submission', function () {
          before(
            'An Anonymous user should be able to Create a submission with explicit Own permissions',
            ensureAnon1SubmissionOwn,
          );

          it('An Anonymous user should not be able to Read a submission with explicit Own permissions, because Anonymous cannot own an entity', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission with explicit Own permissions, because Anonymous cannot own an entity', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                  template,
                ),
              )
              .send({ value: 'bar' });

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions', function (done) {
            var req = request(app).get(
              hook.alter('url', '/form/' + tempForm._id + '/submission', template),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Delete a submission with explicit Own permissions, because Anonymous cannot own an entity', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An anonymous user should not be able to Create a submission without Anonymous added to create_all', function (done) {
            var ownerSubmission = _.cloneDeep(templateSubmission);
            ownerSubmission.owner = template.users.user1._id;
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(ownerSubmission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, templateSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert.equal(response.owner, null);
                done();
              });
          });

          // Pattern E: the three `Should be able to update the form with ...` tests below widen
          // `tempForm.submissionAccess` in place, and each `create` test after one of them only
          // passes with that widening applied. Every guard reads the permission back off `tempForm`
          // — the effect the mutation produces — so it is applied exactly once and is never
          // re-applied to a form that already has it. `create_all` for authenticated needs the
          // `create_all` entry to exist at all, so that builder composes with the first.
          var accessFor = (type) => _.find(tempForm.submissionAccess, { type: type });

          var grants = (type, role) => {
            var access = accessFor(type);
            return !!access && access.roles.indexOf(role) !== -1;
          };

          var putForm = (cb) =>
            request(app)
              .put(hook.alter('url', '/' + tempForm.path, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(_.omit(tempForm, 'modified'))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(cb);

          function ensureAnonymousCreateAll(cb) {
            if (grants('create_all', template.roles.anonymous._id.toString())) {
              return cb();
            }
            tempForm.submissionAccess.push({
              type: 'create_all',
              roles: [template.roles.anonymous._id.toString()],
            });
            putForm(cb);
          }

          function ensureAuthenticatedCreateOwn(cb) {
            if (grants('create_own', template.roles.authenticated._id.toString())) {
              return cb();
            }
            accessFor('create_own').roles.push(template.roles.authenticated._id.toString());
            putForm(cb);
          }

          function ensureAuthenticatedCreateAll(cb) {
            ensureAnonymousCreateAll(function (err) {
              if (err) {
                return cb(err);
              }
              ensureAuthenticatedCreateOwn(function (err) {
                if (err) {
                  return cb(err);
                }
                if (grants('create_all', template.roles.authenticated._id.toString())) {
                  return cb();
                }
                accessFor('create_all').roles.push(template.roles.authenticated._id.toString());
                putForm(cb);
              });
            });
          }

          // Runs the widening a test depends on, then the test body verbatim.
          var withAccess = (ensure, body) =>
            function (done) {
              ensure((err) => (err ? done(err) : body.call(this, done)));
            };

          it('Should be able to update the form with create_all permissions', function (done) {
            ensureAnonymousCreateAll(function (err, res) {
              if (err) {
                return done(err);
              }
              var response = res.body;
              assert.equal(response.submissionAccess.length, 5);
              assert.equal(
                response.submissionAccess[4].roles.indexOf(template.roles.anonymous._id.toString()),
                0,
              );
              assert.equal(response.submissionAccess[4].type, 'create_all');
              done();
            });
          });

          it(
            'An anonymous user should be able to Create a submission with owner set with Anonymous role within create_all',
            withAccess(ensureAnonymousCreateAll, function (done) {
              var ownerSubmission = _.cloneDeep(templateSubmission);
              ownerSubmission.owner = template.users.user1._id;
              request(app)
                .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
                .send(ownerSubmission)
                .expect(201)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                  assert(
                    response.hasOwnProperty('modified'),
                    'The response should contain a `modified` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('created'),
                    'The response should contain a `created` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('data'),
                    'The response should contain a submission `data` object.',
                  );
                  assert(
                    response.data.hasOwnProperty('value'),
                    'The submission `data` should contain the `value`.',
                  );
                  assert.equal(response.data.value, templateSubmission.data.value);
                  assert(
                    response.hasOwnProperty('form'),
                    'The response should contain the `form` id.',
                  );
                  assert.equal(response.form, tempForm._id);
                  assert(
                    response.hasOwnProperty('roles'),
                    'The response should contain the resource `roles`.',
                  );
                  assert.deepEqual(response.roles, []);
                  assert.equal(response.owner, template.users.user1._id);
                  done();
                });
            }),
          );

          it('An authenticated user should not be able to create a submission', function (done) {
            var ownerSubmission = _.cloneDeep(templateSubmission);
            ownerSubmission.owner = template.users.user1._id;
            request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(ownerSubmission)
              .set('x-jwt-token', template.users.user2.token)
              .expect(401)
              .end(done);
          });

          it('Should be able to update the form with create_own permissions for authenticated', function (done) {
            ensureAuthenticatedCreateOwn(function (err, res) {
              if (err) {
                return done(err);
              }
              var response = res.body;
              _.each(response.submissionAccess, function (access) {
                if (access.type === 'create_own') {
                  assert(access.roles.indexOf(template.roles.authenticated._id.toString()) !== -1);
                }
              });
              done();
            });
          });

          it(
            'An authenticated user should be able to Create a submission but cannot change owner.',
            withAccess(ensureAuthenticatedCreateOwn, function (done) {
              var ownerSubmission = _.cloneDeep(templateSubmission);
              ownerSubmission.owner = template.users.user1._id;
              request(app)
                .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
                .send(ownerSubmission)
                .set('x-jwt-token', template.users.user2.token)
                .expect(201)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                  assert(
                    response.hasOwnProperty('modified'),
                    'The response should contain a `modified` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('created'),
                    'The response should contain a `created` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('data'),
                    'The response should contain a submission `data` object.',
                  );
                  assert(
                    response.data.hasOwnProperty('value'),
                    'The submission `data` should contain the `value`.',
                  );
                  assert.equal(response.data.value, templateSubmission.data.value);
                  assert(
                    response.hasOwnProperty('form'),
                    'The response should contain the `form` id.',
                  );
                  assert.equal(response.form, tempForm._id);
                  assert(
                    response.hasOwnProperty('roles'),
                    'The response should contain the resource `roles`.',
                  );
                  assert.deepEqual(response.roles, []);
                  assert.equal(response.owner, template.users.user2._id);
                  done();
                });
            }),
          );

          it('Should be able to update the form with create_all permissions for authenticated', function (done) {
            ensureAuthenticatedCreateAll(function (err, res) {
              if (err) {
                return done(err);
              }
              var response = res.body;
              _.each(response.submissionAccess, function (access) {
                if (access.type === 'create_all') {
                  assert(access.roles.indexOf(template.roles.authenticated._id.toString()) !== -1);
                }
              });
              done();
            });
          });

          it(
            'An authenticated user should be able to Create a submission AND change owner.',
            withAccess(ensureAuthenticatedCreateAll, function (done) {
              var ownerSubmission = _.cloneDeep(templateSubmission);
              ownerSubmission.owner = template.users.user1._id;
              request(app)
                .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
                .send(ownerSubmission)
                .set('x-jwt-token', template.users.user2.token)
                .expect(201)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                  assert(
                    response.hasOwnProperty('modified'),
                    'The response should contain a `modified` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('created'),
                    'The response should contain a `created` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('data'),
                    'The response should contain a submission `data` object.',
                  );
                  assert(
                    response.data.hasOwnProperty('value'),
                    'The submission `data` should contain the `value`.',
                  );
                  assert.equal(response.data.value, templateSubmission.data.value);
                  assert(
                    response.hasOwnProperty('form'),
                    'The response should contain the `form` id.',
                  );
                  assert.equal(response.form, tempForm._id);
                  assert(
                    response.hasOwnProperty('roles'),
                    'The response should contain the resource `roles`.',
                  );
                  assert.deepEqual(response.roles, []);
                  assert.equal(response.owner, template.users.user1._id);
                  done();
                });
            }),
          );

          it('Reset the form permission settings', function (done) {
            tempForm.submissionAccess = [
              {
                type: 'create_own',
                roles: [template.roles.anonymous._id.toString()],
              },
              {
                type: 'read_own',
                roles: [template.roles.anonymous._id.toString()],
              },
              {
                type: 'update_own',
                roles: [template.roles.anonymous._id.toString()],
              },
              {
                type: 'delete_own',
                roles: [template.roles.anonymous._id.toString()],
              },
            ];
            request(app)
              .put(hook.alter('url', '/' + tempForm.path, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(_.omit(tempForm, 'modified'))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(done);
          });

          it(
            'An Anonymous user should be able to Create a submission with explicit Own permissions with the Form alias',
            ensureTempSubmissionAnon2,
          );

          it('An Anonymous user should not be able to Read a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Update a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity', function (done) {
            var req = request(app).put(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done);
          });

          it('An Anonymous user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter('url', '/' + tempForm.path + '/submission', template),
            );

            request401(req, done);
          });

          it(
            'An Anonymous user should not be able to Delete a submission with explicit Own permissions with the Form alias, because Anonymous cannot own an entity',
            withTempSubmissionAnon2(function (done) {
              var req = request(app).delete(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id,
                  template,
                ),
              );

              request401(req, done);
            }),
          );
        });

        describe('Project Owner Submission', function () {
          before(ensureAnon1SubmissionOwn);
          before(
            'The Project owner should be able to Create a submission without explicit Own permissions',
            function (done) {
              request(app)
                .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .send(templateSubmission)
                .expect(201)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                  assert(
                    response.hasOwnProperty('modified'),
                    'The response should contain a `modified` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('created'),
                    'The response should contain a `created` timestamp.',
                  );
                  assert(
                    response.hasOwnProperty('data'),
                    'The response should contain a submission `data` object.',
                  );
                  assert(
                    response.data.hasOwnProperty('value'),
                    'The submission `data` should contain the `value`.',
                  );
                  assert.equal(response.data.value, templateSubmission.data.value);
                  assert(
                    response.hasOwnProperty('form'),
                    'The response should contain the `form` id.',
                  );
                  assert.equal(response.form, tempForm._id);
                  assert(
                    response.hasOwnProperty('roles'),
                    'The response should contain the resource `roles`.',
                  );
                  assert.deepEqual(response.roles, []);
                  assert(
                    res.headers.hasOwnProperty('x-jwt-token'),
                    'The response should contain a `x-jwt-token` header.',
                  );
                  assert(
                    response.hasOwnProperty('owner'),
                    'The response should contain the resource `owner`.',
                  );
                  assert.notEqual(response.owner, null);
                  assert.equal(response.owner, template.users.admin._id);

                  tempSubmissionOwner1 = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            },
          );

          it('The Project owner should be able to Read a submission without explicit Own permissions', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it('The Project owner should be able to Update a submission without explicit Own permissions', function (done) {
            var updatedSubmission = _.clone(tempSubmissionOwner1);
            updatedSubmission.data.value = 'bar';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send({ data: { value: updatedSubmission.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          // Pattern C (formio-server/test/tools/INDEPENDENCE.md): the expected total used to be the
          // literal 7 that this scope's chain of creates happens to leave behind, so the test could
          // only pass after every one of them had run. What it is really asserting is that the
          // project owner's index is *unfiltered*, so derive the total from what is actually stored
          // for this form. That holds however many creates preceded it, and still fails if the
          // index starts dropping rows the owner is entitled to see.
          function assertIndexIsUnfiltered(response, cb) {
            var formio = hook.alter('formio', app.formio);
            formio.resources.submission.model
              .countDocuments({ form: tempForm._id, deleted: { $eq: null } })
              .then(function (total) {
                assert.equal(response.length, total);
                cb();
              }, cb);
          }

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                assertIndexIsUnfiltered(res.body, done);
              });
          });

          it('The Project owner should be able to Delete a submission without explicit Own permissions', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

          it(
            'The Project owner should be able to Create a submission without explicit Own permissions with the Form alias',
            ensureTempSubmissionOwner2,
          );

          it(
            'The Project owner should be able to Read a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, tempSubmissionOwner2);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );

          it(
            'The Project owner should be able to Update a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              var updatedSubmission = _.clone(tempSubmissionOwner2);
              updatedSubmission.data.value = 'bar';

              request(app)
                .put(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send({ data: { value: updatedSubmission.data.value } })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );

          it(
            'The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              request(app)
                .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  assertIndexIsUnfiltered(res.body, done);
                });
            }),
          );

          it(
            'The Project owner should be able to Delete a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Authenticated User Submission', function () {
          before(ensureAnon1SubmissionOwn);
          it('A Registered user should not be able to Create a submission without explicit Own permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit Own permissions', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit Own permissions', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions', function (done) {
            var req = request(app).get(
              hook.alter('url', '/form/' + tempForm._id + '/submission', template),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit Own permissions', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Create a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission);

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Update a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app)
              .put(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id,
                  template,
                ),
              )
              .send({ foo: 'bar' });

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter('url', '/' + tempForm.path + '/submission', template),
            );

            request401(req, done, template.users.user1);
          });

          it('A Registered user should not be able to Delete a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).delete(
              hook.alter(
                'url',
                '/' + tempForm.path + '/submission/' + tempSubmissionAnon1._id,
                template,
              ),
            );

            request401(req, done, template.users.user1);
          });
        });

        describe('Submission Normalization', function () {
          before(ensureAnon1SubmissionOwn);
          it('The Project owner should be able to Delete a submission with explicit Own permissions', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

          it(
            'The Project owner should be able to Delete a submission with explicit Own permissions with the Form alias',
            withTempSubmissionAnon2(function (done) {
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Form Normalization', function () {
          it('Delete the form created for Access Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

      describe('Submission CRUD - _all', function () {
        // Store the temp form for this test suite.
        var tempForm = {
          title: 'Anonymous access check',
          name: 'access',
          path: 'accessanonymous',
          type: 'form',
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
              placeholder: 'value',
              key: 'value',
              label: 'value',
              inputMask: '',
              inputType: 'text',
              input: true,
            },
          ],
        };

        // Store the template submission for this test suite.
        var templateSubmission = { data: { value: 'foo' } };

        // Store the annonymous temp submission1 for this test suite.
        var tempSubmissionAnon1 = {};

        // Store the annonymous temp submission2 for this test suite.
        var tempSubmissionAnon2 = {};

        // Pattern E (formio-server/test/tools/INDEPENDENCE.md): `tempSubmissionAnon2` is built by one
        // test and read by later tests and by sibling describes, which never see each
        // other's hooks. The `_id` guard keeps whole-file ordering byte-identical: in file
        // order the original producer is still the only POST.
        function ensureTempSubmissionAnon2(done) {
          if (tempSubmissionAnon2._id) {
            return done();
          }

          request(app)
            .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon2 = response;

              done();
            });
        }

        // Runs the builder, then the test body verbatim.
        var withTempSubmissionAnon2 = (fn) =>
          function (done) {
            ensureTempSubmissionAnon2((err) => (err ? done(err) : fn.call(this, done)));
          };

        // Store the Project Owners submission1 for this test suite.
        var tempSubmissionOwner1 = {};

        // Pattern E (formio-server/test/tools/INDEPENDENCE.md): `tempSubmissionOwner1` is built by one
        // test and read by later tests and by sibling describes, which never see each
        // other's hooks. The `_id` guard keeps whole-file ordering byte-identical: in file
        // order the original producer is still the only POST.
        function ensureTempSubmissionOwner1(done) {
          if (tempSubmissionOwner1._id) {
            return done();
          }

          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.admin._id);

              tempSubmissionOwner1 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        }

        // Runs the builder, then the test body verbatim.
        var withTempSubmissionOwner1 = (fn) =>
          function (done) {
            ensureTempSubmissionOwner1((err) => (err ? done(err) : fn.call(this, done)));
          };

        // Store the Project Owners submission2 for this test suite.
        var tempSubmissionOwner2 = {};

        // Pattern E (formio-server/test/tools/INDEPENDENCE.md): `tempSubmissionOwner2` is built by one
        // test and read by later tests and by sibling describes, which never see each
        // other's hooks. The `_id` guard keeps whole-file ordering byte-identical: in file
        // order the original producer is still the only POST.
        function ensureTempSubmissionOwner2(done) {
          if (tempSubmissionOwner2._id) {
            return done();
          }

          request(app)
            .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.admin._id);

              tempSubmissionOwner2 = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        }

        // Runs the builder, then the test body verbatim.
        var withTempSubmissionOwner2 = (fn) =>
          function (done) {
            ensureTempSubmissionOwner2((err) => (err ? done(err) : fn.call(this, done)));
          };

        // Shared with the sibling describes below, which consume this fixture but cannot
        // see a sibling's hook when a test runs in isolation. No-op once built.
        function ensureAnon1SubmissionAll(done) {
          if (tempSubmissionAnon1._id) {
            return done();
          }
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .send(templateSubmission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, templateSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);

              // Update the submission data.
              tempSubmissionAnon1 = response;

              done();
            });
        }

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_all',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'read_all',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'update_all',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'delete_all',
              roles: [template.roles.anonymous._id.toString()],
            },
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before(
          'Create a Form for a Submission level Access Check - Anonymous User',
          function (done) {
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(tempForm)
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('access'),
                  'The response should contain an the `access`.',
                );
                assert.equal(response.title, tempForm.title);
                assert.equal(response.name, tempForm.name);
                assert.equal(response.path, tempForm.path);
                assert.equal(response.type, 'form');
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 3);
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                  -1,
                );
                assert.notEqual(
                  response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                  -1,
                );

                // Build a temp list to compare access without mongo id's.
                var tempSubmissionAccess = [];
                response.submissionAccess.forEach(function (role) {
                  tempSubmissionAccess.push(_.omit(role, '_id'));
                });
                assert.deepEqual(tempSubmissionAccess, tempForm.submissionAccess);
                assert.deepEqual(response.components, tempForm.components);
                tempForm = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          },
        );

        describe('Anonymous User Submission', function () {
          before(
            'An Anonymous user should be able to Create a submission with explicit permissions',
            ensureAnon1SubmissionAll,
          );

          it('An Anonymous user should be able to Read a submission with explicit permissions', function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                  template,
                ),
              )
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, tempSubmissionAnon1);

                done();
              });
          });

          it('An Anonymous user should be able to Update a submission with explicit permissions', function (done) {
            var compare = _.omit(tempSubmissionAnon1, 'modified');
            compare.data.value = 'bar';

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                  template,
                ),
              )
              .send({ data: { value: compare.data.value } })
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(_.omit(response, 'modified'), compare);
                tempSubmissionAnon1 = response;

                done();
              });
          });

          it('An Anonymous user should be able to Read the Index of submissions without explicit permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);

                done();
              });
          });

          it('An Anonymous user should be able to Delete a submission with explicit permissions', function (done) {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionAnon1._id,
                  template,
                ),
              )
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response, {});
                tempSubmissionAnon1 = response;

                done();
              });
          });

          it(
            'An Anonymous user should be able to Create a submission with explicit permissions with the Form alias',
            ensureTempSubmissionAnon2,
          );

          it(
            'An Anonymous user should be able to Read a submission with explicit permissions with the Form alias',
            withTempSubmissionAnon2(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id,
                    template,
                  ),
                )
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, tempSubmissionAnon2);

                  done();
                });
            }),
          );

          it(
            'An Anonymous user should be able to Update a submission with explicit permissions with the Form alias',
            withTempSubmissionAnon2(function (done) {
              var compare = _.omit(tempSubmissionAnon2, 'modified');
              compare.data.value = 'bar';

              request(app)
                .put(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id,
                    template,
                  ),
                )
                .send({ data: { value: compare.data.value } })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.deepEqual(_.omit(response, 'modified'), compare);
                  tempSubmissionAnon2 = response;

                  done();
                });
            }),
          );

          it('An Anonymous user should be able to Read the Index of submissions without explicit permissions with the Form alias', function (done) {
            request(app)
              .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.equal(response.length, 1);

                done();
              });
          });

          it(
            'An Anonymous user should be able to Delete a submission with explicit permissions with the Form alias',
            withTempSubmissionAnon2(function (done) {
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionAnon2._id,
                    template,
                  ),
                )
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, {});
                  tempSubmissionAnon2 = response;

                  done();
                });
            }),
          );
        });

        describe('Project Owner Submission', function () {
          before(
            'The Project owner should be able to Create a submission without explicit Own permissions',
            ensureTempSubmissionOwner1,
          );

          it(
            'The Project owner should be able to Read a submission without explicit Own permissions',
            withTempSubmissionOwner1(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, tempSubmissionOwner1);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );

          it(
            'The Project owner should be able to Update a submission without explicit Own permissions',
            withTempSubmissionOwner1(function (done) {
              var updatedSubmission = _.clone(tempSubmissionOwner1);
              updatedSubmission.data.value = 'bar';

              request(app)
                .put(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send({ data: { value: updatedSubmission.data.value } })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );

          it('The Project owner should be able to Read the Index of submissions without explicit Own permissions', function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
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

          it(
            'The Project owner should be able to Create a submission without explicit Own permissions with the Form alias',
            ensureTempSubmissionOwner2,
          );

          it(
            'The Project owner should be able to Read a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, tempSubmissionOwner2);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );

          it(
            'The Project owner should be able to Update a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              var updatedSubmission = _.clone(tempSubmissionOwner2);
              updatedSubmission.data.value = 'bar';

              request(app)
                .put(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send({ data: { value: updatedSubmission.data.value } })
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );

          it(
            'The Project owner should be able to Read the Index of submissions without explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              request(app)
                .get(hook.alter('url', '/' + tempForm.path + '/submission', template))
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }

                  var response = res.body;
                  assert.equal(response.length, 2);

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            }),
          );
        });

        describe('Authenticated User Submission', function () {
          before(ensureAnon1SubmissionAll);
          it('A Registered user should not be able to Create a submission without explicit Own permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(templateSubmission);

            request401(req, done, template.users.user1);
          });

          it(
            'A Registered user should not be able to Read a submission without explicit Own permissions',
            withTempSubmissionOwner1(function (done) {
              var req = request(app).get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              );

              request401(req, done, template.users.user1);
            }),
          );

          it(
            'A Registered user should not be able to Update a submission without explicit Own permissions',
            withTempSubmissionOwner1(function (done) {
              var req = request(app)
                .put(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                    template,
                  ),
                )
                .send({ foo: 'bar' });

              request401(req, done, template.users.user1);
            }),
          );

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions', function (done) {
            var req = request(app).get(
              hook.alter('url', '/form/' + tempForm._id + '/submission', template),
            );

            request401(req, done, template.users.user1);
          });

          it(
            'A Registered user should not be able to Delete a submission without explicit Own permissions',
            withTempSubmissionOwner1(function (done) {
              var req = request(app).delete(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              );

              request401(req, done, template.users.user1);
            }),
          );

          it('A Registered user should not be able to Create a submission without explicit Own permissions with the Form alias', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/' + tempForm.path + '/submission', template))
              .send(templateSubmission);

            request401(req, done, template.users.user1);
          });

          it(
            'A Registered user should not be able to Read a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner1(function (done) {
              var req = request(app).get(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              );

              request401(req, done, template.users.user1);
            }),
          );

          it(
            'A Registered user should not be able to Update a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner1(function (done) {
              var req = request(app)
                .put(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                    template,
                  ),
                )
                .send({ foo: 'bar' });

              request401(req, done, template.users.user1);
            }),
          );

          it('A Registered user should not be able to Read the Index of submissions without explicit Own permissions with the Form alias', function (done) {
            var req = request(app).get(
              hook.alter('url', '/' + tempForm.path + '/submission', template),
            );

            request401(req, done, template.users.user1);
          });

          it(
            'A Registered user should not be able to Delete a submission without explicit Own permissions with the Form alias',
            withTempSubmissionOwner1(function (done) {
              var req = request(app).delete(
                hook.alter(
                  'url',
                  '/' + tempForm.path + '/submission/' + tempSubmissionOwner1._id,
                  template,
                ),
              );

              request401(req, done, template.users.user1);
            }),
          );
        });

        describe('Submission Normalization', function () {
          before(ensureAnon1SubmissionAll);
          it(
            'The Project owner should be able to Delete a submission with explicit Own permissions',
            withTempSubmissionOwner1(function (done) {
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + tempSubmissionOwner1._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
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
            }),
          );

          it(
            'The Project owner should be able to Delete a submission with explicit Own permissions with the Form alias',
            withTempSubmissionOwner2(function (done) {
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/' + tempForm.path + '/submission/' + tempSubmissionOwner2._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Form Normalization', function () {
          it('Delete the form created for Access Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

      describe('Submission Ownership - _own', function () {
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
                required: false,
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
              input: true,
            },
          ],
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = { data: { value: 'foo' } };
        var tempSubmissions = [];
        var temp = {};

        // Pattern B/E (formio-server/test/tools/INDEPENDENCE.md): `temp` is created by a test inside
        // `Project Owner` and then read both by the tests after it and by the `Authenticated User` /
        // `Anonymous User` siblings — and mocha runs neither a sibling suite's hooks nor its tests. This
        // builder recreates exactly what that test creates. The `_id` guard keeps whole-file ordering
        // byte-identical: in file order the original creator is still the only POST, and every call from
        // a consumer is a no-op.
        function ensureOwnedSubmission(cb) {
          if (temp._id) {
            return cb(null, temp);
          }

          var owned = Object.assign(_.cloneDeep(tempSubmission), {
            owner: template.users.user2._id,
          });
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(owned)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return cb(err);
              }

              tempSubmissions.push(res.body);
              temp = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              cb(null, temp);
            });
        }

        // Runs the builder, then the test body verbatim.
        var withOwnedSubmission = (body) =>
          function (done) {
            ensureOwnedSubmission((err) => (err ? done(err) : body.call(this, done)));
          };

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_own',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'read_own',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'update_own',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'delete_own',
              roles: [template.roles.anonymous._id.toString()],
            },
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before('Create the Form for Ownership Checks', function (done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('access'),
                'The response should contain an the `access`.',
              );
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                -1,
              );

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function (role) {
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

        describe('Project Owner', function () {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function (done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function (done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user2._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it(
            'The Project Owner should be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var doc = { data: temp.data, owner: template.users.admin._id };

              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send(doc)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Authenticated User', function () {
          it('An Authenticated User should not be able create a submission in their name, without _own permissions', function (done) {
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(tempSubmission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to create a submission in someones name, without _own permissions', function (done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.admin._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it(
            'An Authenticated User should not be able to update the owner of a submission, without _own permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ data: temp.data, owner: template.users.admin._id });

              request401(req, done, template.users.user1);
            }),
          );
        });

        describe('Anonymous User', function () {
          it('An Anonymous User should be able create a submission in their name, with _own permissions', function (done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.equal(response.owner, null);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it('An Anonymous User should not be able to create a submission in someones name, with _own permissions', function (done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user1._id;
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.equal(response.owner, null);
                assert.notEqual(response.owner, template.users.user1._id);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it(
            'An Anonymous User should not be able to update the owner of a submission, with _own permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ data: temp.data, owner: template.users.admin._id });

              request401(req, done);
            }),
          );
        });

        describe('Submission Normalization', function () {
          it('Delete the Submissions created for Ownership Checks', function (done) {
            async.eachSeries(
              tempSubmissions,
              function (submission, subDone) {
                request(app)
                  .delete(
                    hook.alter(
                      'url',
                      '/form/' + tempForm._id + '/submission/' + submission._id,
                      template,
                    ),
                  )
                  .set('x-jwt-token', template.users.admin.token)
                  .expect(200)
                  .end(function (err, res) {
                    if (err) {
                      return subDone(err);
                    }

                    var response = res.body;
                    assert.deepEqual(response, {});

                    // Store the JWT for future API calls.
                    template.users.admin.token = res.headers['x-jwt-token'];
                    subDone();
                  });
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                tempSubmissions = [];
                done();
              },
            );
          });
        });

        describe('Form Normalization', function () {
          it('Delete the Form created for Ownership Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

      describe('Submission Ownership - _all', function () {
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
                required: false,
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
              input: true,
            },
          ],
        };

        // Store the temp submissions for this test suite.
        var tempSubmission = { data: { value: 'foo' } };
        var tempSubmissions = [];
        var temp = {};

        // Pattern B/E (formio-server/test/tools/INDEPENDENCE.md): `temp` is created by a test inside
        // `Project Owner` and then read both by the tests after it and by the `Authenticated User` /
        // `Anonymous User` siblings — and mocha runs neither a sibling suite's hooks nor its tests. This
        // builder recreates exactly what that test creates. The `_id` guard keeps whole-file ordering
        // byte-identical: in file order the original creator is still the only POST, and every call from
        // a consumer is a no-op.
        function ensureOwnedSubmission(cb) {
          if (temp._id) {
            return cb(null, temp);
          }

          var owned = Object.assign(_.cloneDeep(tempSubmission), {
            owner: template.users.user2._id,
          });
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(owned)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return cb(err);
              }

              tempSubmissions.push(res.body);
              temp = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              cb(null, temp);
            });
        }

        // Runs the builder, then the test body verbatim.
        var withOwnedSubmission = (body) =>
          function (done) {
            ensureOwnedSubmission((err) => (err ? done(err) : body.call(this, done)));
          };

        // Before the suite runs, attach the test Project's id to the payload.
        before(function () {
          tempForm.access = [
            {
              type: 'read_all',
              roles: [
                template.roles.anonymous._id.toString(),
                template.roles.authenticated._id.toString(),
                template.roles.administrator._id.toString(),
              ],
            },
          ];
          tempForm.submissionAccess = [
            {
              type: 'create_all',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'read_all',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'update_all',
              roles: [template.roles.anonymous._id.toString()],
            },
            {
              type: 'delete_all',
              roles: [template.roles.anonymous._id.toString()],
            },
          ];
        });

        // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
        before('Create the Form for Ownership Checks', function (done) {
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(tempForm)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('access'),
                'The response should contain an the `access`.',
              );
              assert.equal(response.title, tempForm.title);
              assert.equal(response.name, tempForm.name);
              assert.equal(response.path, tempForm.path);
              assert.equal(response.type, 'form');
              assert.equal(response.access.length, 1);
              assert.equal(response.access[0].type, 'read_all');
              assert.equal(response.access[0].roles.length, 3);
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
                -1,
              );
              assert.notEqual(
                response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
                -1,
              );

              // Build a temp list to compare access without mongo id's.
              var tempSubmissionAccess = [];
              response.submissionAccess.forEach(function (role) {
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

        describe('Project Owner', function () {
          it('The Project Owner should create a submission in their name, when the owner is not specified, without permissions', function (done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.admin._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('The Project Owner should be able to create a submission in someones name, without permissions', function (done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user2._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, template.users.user2._id);
                assert(
                  res.headers.hasOwnProperty('x-jwt-token'),
                  'The response should contain a `x-jwt-token` header.',
                );

                // Update the submission data.
                tempSubmissions.push(response);

                // Store the response for an update test.
                temp = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it(
            'The Project Owner should be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var doc = { data: temp.data, owner: template.users.admin._id };

              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send(doc)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Authenticated User', function () {
          it('An Authenticated User should not be able create a submission in their name, without permissions', function (done) {
            var submission = _.clone(tempSubmission);
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it('An Authenticated User should not be able to create a submission in someones name, without permissions', function (done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.admin._id;
            var req = request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission);

            request401(req, done, template.users.user1);
          });

          it(
            'An Authenticated User should not be able to update the owner of a submission, without permissions',
            withOwnedSubmission(function (done) {
              var req = request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send({ data: temp.data, owner: template.users.admin._id });

              request401(req, done, template.users.user1);
            }),
          );
        });

        describe('Anonymous User', function () {
          it('An Anonymous User should be able create a submission with no owner, with _all permissions', function (done) {
            var submission = _.clone(tempSubmission);

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.equal(response.owner, null);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it('An Anonymous User should be able to create a submission in someones name, with _all permissions', function (done) {
            var submission = _.clone(tempSubmission);
            submission.owner = template.users.user1._id;

            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .send(submission)
              .expect(201)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(
                  response.hasOwnProperty('modified'),
                  'The response should contain a `modified` timestamp.',
                );
                assert(
                  response.hasOwnProperty('created'),
                  'The response should contain a `created` timestamp.',
                );
                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert(
                  response.data.hasOwnProperty('value'),
                  'The submission `data` should contain the `value`.',
                );
                assert.equal(response.data.value, tempSubmission.data.value);
                assert(
                  response.hasOwnProperty('form'),
                  'The response should contain the `form` id.',
                );
                assert.equal(response.form, tempForm._id);
                assert(
                  response.hasOwnProperty('roles'),
                  'The response should contain the resource `roles`.',
                );
                assert.deepEqual(response.roles, []);
                assert(
                  response.hasOwnProperty('owner'),
                  'The response should contain the resource `owner`.',
                );
                assert.notEqual(response.owner, null);
                assert.equal(response.owner, submission.owner);

                // Update the submission data.
                tempSubmissions.push(response);

                done();
              });
          });

          it(
            'An Anonymous User should be able to update the owner of a submission, with _all permissions',
            withOwnedSubmission(function (done) {
              var doc = { data: temp.data, owner: template.users.admin._id };

              request(app)
                .put(
                  hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template),
                )
                .send(doc)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
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
            }),
          );
        });

        describe('Submission Normalization', function () {
          it('Delete the Submissions created for Ownership Checks', function (done) {
            async.eachSeries(
              tempSubmissions,
              function (submission, subDone) {
                request(app)
                  .delete(
                    hook.alter(
                      'url',
                      '/form/' + tempForm._id + '/submission/' + submission._id,
                      template,
                    ),
                  )
                  .set('x-jwt-token', template.users.admin.token)
                  .expect(200)
                  .end(function (err, res) {
                    if (err) {
                      return subDone(err);
                    }

                    var response = res.body;
                    assert.deepEqual(response, {});

                    // Store the JWT for future API calls.
                    template.users.admin.token = res.headers['x-jwt-token'];
                    subDone();
                  });
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                tempSubmissions = [];
                done();
              },
            );
          });
        });

        describe('Form Normalization', function () {
          it('Delete the Form created for Ownership Checks', function (done) {
            request(app)
              .delete(hook.alter('url', '/form/' + tempForm._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .end(function (err, res) {
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

    describe('Non-Persistent Fields', function () {
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
              required: false,
            },
            defaultValue: '',
            multiple: false,
            key: 'persistent',
            persistent: true,
            label: 'Persistent',
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
            key: 'implicitPersistent',
            label: 'Implicitly Persistent',
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
            key: 'nonpersistent',
            persistent: false,
            label: 'Non-Persistent',
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
            key: 'clientOnly',
            persistent: 'client-only',
            label: 'Client only',
            inputType: 'text',
            input: true,
          },
        ],
      };

      // Store the temp submission for this test suite.
      var tempSubmission = {
        data: {
          persistent: 'exists',
          implicitPersistent: 'also exists',
          nonPersistent: 'should not exist',
          clientOnly: 'should also not exist',
        },
      };

      // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
      before('Create a Form for a Persistent Field Test', function (done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(
              response.hasOwnProperty('modified'),
              'The response should contain a `modified` timestamp.',
            );
            assert(
              response.hasOwnProperty('created'),
              'The response should contain a `created` timestamp.',
            );
            assert(
              response.hasOwnProperty('access'),
              'The response should contain an the `access`.',
            );
            assert.equal(response.title, tempForm.title);
            assert.equal(response.name, tempForm.name);
            assert.equal(response.path, tempForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
              -1,
            );
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
              -1,
            );
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
              -1,
            );
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, tempForm.components);

            tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      describe('Should return Persistent fields and not return Non-Persistent fields', function () {
        // Pattern E: `on Read`, `on Index` and `on Update` all read the submission `on Create`
        // makes. Guarded on `_id`, so in file order `on Create` still creates it — which also keeps
        // `on Index`'s exact count of 1 correct either way, because the builder creates exactly one.
        var submissionPayload = _.cloneDeep(tempSubmission);
        function ensureNonPersistentSubmission(cb) {
          if (tempSubmission._id) {
            return cb(null, tempSubmission);
          }
          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(submissionPayload)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return cb(err);
              }

              // Update the submission data.
              tempSubmission = res.body;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              cb(null, tempSubmission);
            });
        }

        it('on Create', function (done) {
          ensureNonPersistentSubmission(function (err, response) {
            if (err) {
              return done(err);
            }

            assert(
              response.hasOwnProperty('data'),
              'The response should contain a submission `data` object.',
            );
            assert.deepEqual(
              response.data,
              {
                persistent: 'exists',
                implicitPersistent: 'also exists',
              },
              'The response should return persistent fields and not return non-persistent fields.',
            );

            done();
          });
        });

        // Runs the builder, then the test body verbatim.
        var withSubmission = (body) =>
          function (done) {
            ensureNonPersistentSubmission((err) => (err ? done(err) : body.call(this, done)));
          };

        it(
          'on Read',
          withSubmission(function (done) {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;

                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert.deepEqual(
                  response.data,
                  {
                    persistent: 'exists',
                    implicitPersistent: 'also exists',
                  },
                  'The response should return persistent fields and not return non-persistent fields.',
                );

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'on Index',
          withSubmission(function (done) {
            request(app)
              .get(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;

                assert.equal(response.length, 1);
                assert(
                  response[0].hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert.deepEqual(
                  response[0].data,
                  {
                    persistent: 'exists',
                    implicitPersistent: 'also exists',
                  },
                  'The response should return persistent fields and not return non-persistent fields.',
                );

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'on Update',
          withSubmission(function (done) {
            var updateSubmission = _.clone(tempSubmission);
            updateSubmission.data = {
              persistent: 'still exists',
              implicitPersistent: 'still also exists',
              nonPersistent: 'still should not exist',
              clientOnly: 'still should also not exist',
            };

            request(app)
              .put(
                hook.alter(
                  'url',
                  '/form/' + tempForm._id + '/submission/' + tempSubmission._id,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.admin.token)
              .send(updateSubmission)
              .expect(200)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;

                assert(
                  response.hasOwnProperty('data'),
                  'The response should contain a submission `data` object.',
                );
                assert.deepEqual(
                  response.data,
                  {
                    persistent: 'still exists',
                    implicitPersistent: 'still also exists',
                  },
                  'The response should return persistent fields and not return non-persistent fields.',
                );

                // Update the submission data.
                tempSubmission = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );
      });
    });

    describe('create_all submission access with update_all submission permissions', function () {
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
              required: false,
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
            input: true,
          },
        ],
      };

      // Store the temp submissions for this test suite.
      var tempSubmission = { data: { value: 'foo' } };
      var tempSubmissions = [];
      var temp = {};

      // Before the suite runs, attach the test Project's id to the payload.
      before(function () {
        tempForm.access = [
          {
            type: 'read_all',
            roles: [
              template.roles.anonymous._id.toString(),
              template.roles.authenticated._id.toString(),
              template.roles.administrator._id.toString(),
            ],
          },
        ];
        tempForm.submissionAccess = [
          {
            type: 'update_all',
            roles: [template.roles.authenticated._id.toString()],
          },
        ];
      });

      // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
      before('Create the Form for Ownership Checks', function (done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(
              response.hasOwnProperty('modified'),
              'The response should contain a `modified` timestamp.',
            );
            assert(
              response.hasOwnProperty('created'),
              'The response should contain a `created` timestamp.',
            );
            assert(
              response.hasOwnProperty('access'),
              'The response should contain an the `access`.',
            );
            assert.equal(response.title, tempForm.title);
            assert.equal(response.name, tempForm.name);
            assert.equal(response.path, tempForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
              -1,
            );
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
              -1,
            );
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.administrator._id.toString()),
              -1,
            );

            // Build a temp list to compare access without mongo id's.
            var tempSubmissionAccess = [];
            response.submissionAccess.forEach(function (role) {
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

      function createOwnedSubmission(done) {
        var submission = _.clone(tempSubmission);

        request(app)
          .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
          .set('x-jwt-token', template.users.user1.token)
          .send(submission)
          .expect(201)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(
              response.hasOwnProperty('modified'),
              'The response should contain a `modified` timestamp.',
            );
            assert(
              response.hasOwnProperty('created'),
              'The response should contain a `created` timestamp.',
            );
            assert(
              response.hasOwnProperty('data'),
              'The response should contain a submission `data` object.',
            );
            assert(
              response.data.hasOwnProperty('value'),
              'The submission `data` should contain the `value`.',
            );
            assert.equal(response.data.value, tempSubmission.data.value);
            assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
            assert.equal(response.form, tempForm._id);
            assert(
              response.hasOwnProperty('roles'),
              'The response should contain the resource `roles`.',
            );
            assert.deepEqual(response.roles, []);
            assert(
              response.hasOwnProperty('owner'),
              'The response should contain the resource `owner`.',
            );
            assert.notEqual(response.owner, null);
            assert.equal(response.owner, template.users.user1._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );

            // Update the submission data.
            tempSubmissions.push(response);
            temp = response;

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      }

      // Pattern B: this `before` builds `temp`, which the `Anonymous User` sibling below also reads
      // — and mocha never runs a sibling suite's hooks. Guarded so it stays a single POST.
      function ensureOwnedSubmission(done) {
        if (temp._id) {
          return done();
        }
        createOwnedSubmission(done);
      }

      describe('Authenticated User', function () {
        before(
          'An Authenticated User should be able create a submission in their name, with update_all permissions',
          ensureOwnedSubmission,
        );

        it('An Authenticated User should be able to create a submission in someones name, with update_all permissions', function (done) {
          var submission = _.clone(tempSubmission);
          submission.owner = template.users.admin._id;

          request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .set('x-jwt-token', template.users.user1.token)
            .send(submission)
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, tempSubmission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.notEqual(response.owner, null);
              assert.equal(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmissions.push(response);

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Authenticated User should be able to update the owner of a submission, with update_all permissions', function (done) {
          var doc = { owner: template.users.admin._id };

          request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
            .set('x-jwt-token', template.users.user1.token)
            .send(doc)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
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

      describe('Anonymous User', function () {
        before(ensureOwnedSubmission);

        it('An Anonymous User should not be able create a submission in their name, without permissions', function (done) {
          var req = request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .send(tempSubmission);

          request401(req, done);
        });

        it('An Anonymous User should not be able to create a submission in someones name, without permissions', function (done) {
          var submission = _.clone(tempSubmission);
          submission.owner = template.users.user1._id;
          var req = request(app)
            .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
            .send(submission);

          request401(req, done);
        });

        it('An Anonymous User should not be able to update the owner of a submission, without permissions', function (done) {
          var req = request(app)
            .put(hook.alter('url', '/form/' + tempForm._id + '/submission/' + temp._id, template))
            .send({ data: temp.data, owner: template.users.admin._id });

          request401(req, done);
        });
      });

      describe('Submission Normalization', function () {
        it('Delete the temp Submissions', function (done) {
          async.eachSeries(
            tempSubmissions,
            function (submission, subDone) {
              request(app)
                .delete(
                  hook.alter(
                    'url',
                    '/form/' + tempForm._id + '/submission/' + submission._id,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return subDone(err);
                  }

                  var response = res.body;
                  assert.deepEqual(response, {});

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];
                  subDone();
                });
            },
            function (err) {
              if (err) {
                return done(err);
              }

              tempSubmissions = [];
              done();
            },
          );
        });
      });

      describe('Form Normalization', function () {
        it('Delete the temp Form', function (done) {
          request(app)
            .delete(hook.alter('url', '/form/' + tempForm._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function (err, res) {
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

    describe('Submission Resource Access Initial', () => {
      let subAccessForm = {
        title: 'Submission Access',
        name: 'subaccess',
        path: 'subaccess',
        components: [
          {
            defaultPermission: 'bad',
            type: 'select',
            dataSrc: 'url',
            data: {
              url: 'http://myfake.com/nothing',
            },
            key: 'permField',
            label: 'Perm Field',
            input: true,
          },
        ],
      };

      before('Create the form with submission access component', (done) => {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(subAccessForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            assert.deepEqual(response.components, subAccessForm.components);

            subAccessForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Should not allow bad permissions.', (done) => {
        let submission = {
          data: {
            permField: {
              _id: '5919b9ddf6cc4b15bd98e0d4',
              other: 'data',
              title: 'None',
            },
          },
        };

        request(app)
          .post(hook.alter('url', `/form/${subAccessForm._id}/submission`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send(submission)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            submission = response;

            assert.deepEqual(submission.access, []);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Changes permission to read', (done) => {
        subAccessForm.components[0].defaultPermission = 'read';

        request(app)
          .put(hook.alter('url', `/form/${subAccessForm._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send(subAccessForm)
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            assert.deepEqual(response.components, subAccessForm.components);

            subAccessForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Should handle objects without ids.', (done) => {
        let submission = {
          data: {
            permField: {
              other: 'data',
              title: 'None',
            },
          },
        };

        request(app)
          .post(hook.alter('url', `/form/${subAccessForm._id}/submission`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send(submission)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const response = res.body;
            submission = response;

            assert.deepEqual(submission.access, []);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Submission Resource Access - Legacy Mode', () => {
      // Create the temp form for testing.
      let tempForm = {
        title: 'Submission resource access check',
        name: 'resourceaccess',
        path: 'resourceaccess',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            defaultPermission: 'read',
            type: 'select',
            multiple: true,
            dataSrc: 'url',
            data: {
              url: 'http://myfake.com/nothing',
            },
            key: 'readPerm',
            label: 'Read Field',
            input: true,
          },
          {
            submissionAccess: [
              {
                type: 'read',
                roles: [],
              },
              {
                type: 'create',
                roles: [],
              },
              {
                type: 'update',
                roles: [],
              },
            ],
            type: 'select',
            multiple: true,
            dataSrc: 'url',
            data: {
              url: 'http://myfake.com/nothing',
            },
            key: 'writePerm',
            label: 'Write Field',
            input: true,
          },
          {
            submissionAccess: [
              {
                type: 'read',
                roles: [],
              },
              {
                type: 'create',
                roles: [],
              },
              {
                type: 'update',
                roles: [],
              },
              {
                type: 'delete',
                roles: [],
              },
            ],
            type: 'select',
            multiple: true,
            dataSrc: 'url',
            data: {
              url: 'http://myfake.com/nothing',
            },
            key: 'adminPerm',
            label: 'Admin Field',
            input: true,
          },
          {
            type: 'textfield',
            key: 'value',
            label: 'value',
            input: true,
          },
        ],
      };

      // Store the temp submission for this test suite.
      let submission = {
        data: {
          value: 'foo',
        },
      };
      let tempSubmission = {};
      let managerRole = null;
      let managerResource = null;
      let managerRegister = null;
      let manager = null;

      // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
      before('Create a manager role', (done) => {
        request(app)
          .post(hook.alter('url', '/role', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'Manager',
            description: 'A role for Manager Users.',
            admin: false,
            default: false,
          })
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            managerRole = res.body;

            done();
          });
      });

      before('Create a manager resource', (done) => {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'Manager',
            name: 'manager',
            path: 'manager',
            type: 'resource',
            components: [
              {
                type: 'email',
                key: 'email',
                label: 'Email',
                input: true,
              },
              {
                type: 'password',
                key: 'password',
                label: 'Password',
                input: true,
              },
            ],
          })
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            managerResource = res.body;

            done();
          });
      });

      before('Create a manager role assignment action', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${managerResource._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'Role Assignment',
            name: 'role',
            priority: 1,
            handler: ['after'],
            method: ['create'],
            form: managerResource._id,
            settings: {
              association: 'new',
              type: 'add',
              role: managerRole._id,
            },
          })
          .expect(201)
          .end(done);
      });

      before('Create a manager role save action', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${managerResource._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'Save Submission',
            name: 'save',
            form: managerResource._id,
            handler: ['before'],
            method: ['create', 'update'],
            priority: 10,
          })
          .expect(201)
          .end(done);
      });

      before('Create a manager register form', (done) => {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'Manager',
            name: 'managerRegister',
            path: 'manager/register',
            type: 'form',
            submissionAccess: [
              {
                type: 'create_own',
                roles: [template.roles.anonymous._id.toString()],
              },
            ],
            access: [
              {
                type: 'read_all',
                roles: [template.roles.anonymous._id.toString()],
              },
            ],
            components: [
              {
                type: 'email',
                key: 'email',
                label: 'Email',
                input: true,
              },
              {
                type: 'password',
                key: 'password',
                label: 'Password',
                input: true,
              },
            ],
          })
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            managerRegister = res.body;

            done();
          });
      });

      before('Create a manager register save action', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${managerRegister._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            name: 'save',
            title: 'Save Submission',
            form: managerRegister._id,
            priority: 11,
            method: ['create', 'update'],
            handler: ['before'],
            settings: {
              resource: managerResource._id,
              fields: {
                email: 'email',
                password: 'password',
              },
            },
          })
          .expect(201)
          .end(done);
      });

      before('Create a manager login action', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${managerRegister._id}/action`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            name: 'login',
            title: 'Login',
            form: managerRegister._id,
            priority: 2,
            method: ['create'],
            handler: ['before'],
            settings: {
              resources: [managerResource._id],
              username: 'email',
              password: 'password',
              allowedAttempts: 5,
              attemptWindow: 10,
              lockWait: 10,
            },
          })
          .expect(201)
          .end(done);
      });

      before('Register a new manager', (done) => {
        request(app)
          .post(hook.alter('url', '/manager/register/submission', template))
          .send({
            data: {
              email: 'manager@example.com',
              password: 'test123',
            },
          })
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            manager = res.body;
            manager.token = res.headers['x-jwt-token'];

            done();
          });
      });

      before('Create the form', (done) => {
        tempForm.submissionAccess = [
          {
            type: 'read_all',
            roles: [managerRole._id],
          },
        ];

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
            assert(
              response.hasOwnProperty('modified'),
              'The response should contain a `modified` timestamp.',
            );
            assert(
              response.hasOwnProperty('created'),
              'The response should contain a `created` timestamp.',
            );
            assert(
              response.hasOwnProperty('access'),
              'The response should contain an the `access`.',
            );
            assert.equal(response.title, tempForm.title);
            assert.equal(response.name, tempForm.name);
            assert.equal(response.path, tempForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 4);
            assert(response.access[0].roles.includes(template.roles.anonymous._id.toString()));
            assert(response.access[0].roles.includes(template.roles.authenticated._id.toString()));
            assert(response.access[0].roles.includes(template.roles.administrator._id.toString()));
            assert(response.access[0].roles.includes(managerRole._id.toString()));
            assert.deepEqual(response.submissionAccess, tempForm.submissionAccess);
            assert.deepEqual(response.components, tempForm.components);
            tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      describe('Admin Users', () => {
        before('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, without explicit resource access (read)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read the index of submissions, without explicit resource access (read)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submissions resource access, without explicit resource access (read)', (done) => {
          tempSubmission.data.readPerm = [template.users.admin];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.cloneDeep(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin._id],
                },
              ];

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, with explicit resource access (read)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read the index of submissions, with explicit resource access (read)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission, without explicit resource access (read)', (done) => {
          tempSubmission.data.value = '1231888123q';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission owner, without explicit resource access (read)', (done) => {
          tempSubmission.owner = '';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              tempSubmission.owner = template.users.admin._id;
              request(app)
                .put(
                  hook.alter(
                    'url',
                    `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send(tempSubmission)
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;

                  assert.deepEqual(
                    _.omit(response, 'modified'),
                    _.omit(tempSubmission, 'modified'),
                  );
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, the owner, can delete a submission, without explicit resource access (read)', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
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

        it('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submissions resource access, without explicit resource access (write)', (done) => {
          tempSubmission.data.writePerm = [template.users.admin];
          tempSubmission.data.readPerm = [];
          tempSubmission.data.adminPerm = [];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin._id],
                },
                {
                  type: 'create',
                  resources: [template.users.admin._id],
                },
                {
                  type: 'update',
                  resources: [template.users.admin._id],
                },
              ];

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, with explicit resource access (write)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read the index of submissions, with explicit resource access (write)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A Manager can read the index of submissions, with explicit resource access', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', manager.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);
              done();
            });
        });

        it('An Admin, the owner, can update a submission, with explicit resource access (write)', (done) => {
          tempSubmission.data.value = '1231888123q';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission owner, without explicit resource access (write)', (done) => {
          tempSubmission.owner = '';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              tempSubmission.owner = template.users.admin._id;
              request(app)
                .put(
                  hook.alter(
                    'url',
                    `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send(tempSubmission)
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;

                  assert.deepEqual(
                    _.omit(response, 'modified'),
                    _.omit(tempSubmission, 'modified'),
                  );
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, the owner, can delete a submission, without explicit resource access (write)', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
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

        it('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submissions resource access, with explicit resource access (admin)', (done) => {
          tempSubmission.data.adminPerm = [template.users.admin];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin._id],
                },
                {
                  type: 'create',
                  resources: [template.users.admin._id],
                },
                {
                  type: 'update',
                  resources: [template.users.admin._id],
                },
                {
                  type: 'delete',
                  resources: [template.users.admin._id],
                },
              ];

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read a submission, with explicit resource access (admin)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can read the index of submissions, with explicit resource access (admin)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission, with explicit resource access (admin)', (done) => {
          tempSubmission.data.value = 'qqwee1231';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, the owner, can update a submission owner, with explicit resource access (admin)', (done) => {
          tempSubmission.owner = '';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              tempSubmission.owner = template.users.admin._id;
              request(app)
                .put(
                  hook.alter(
                    'url',
                    `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin.token)
                .send(tempSubmission)
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;

                  assert.deepEqual(
                    _.omit(response, 'modified'),
                    _.omit(tempSubmission, 'modified'),
                  );
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, the owner, can delete a submission, with explicit resource access (admin)', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .expect('Content-Type', /json/)
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

        // Repeat the tests with another admin, not the owner.
        it('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, without explicit resource access (read)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read the index of submissions, without explicit resource access (read)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (read)', (done) => {
          tempSubmission.data.readPerm = [template.users.admin2];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin2._id],
                },
              ];
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, with explicit resource access (read)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read the index of submissions, with explicit resource access (read)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission, without explicit resource access (read)', (done) => {
          tempSubmission.data.value = '1231888123q';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission owner, without explicit resource access (read)', (done) => {
          tempSubmission.owner = '';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              tempSubmission.owner = template.users.admin._id;
              request(app)
                .put(
                  hook.alter(
                    'url',
                    `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin2.token)
                .send(tempSubmission)
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;

                  assert.deepEqual(
                    _.omit(response, 'modified'),
                    _.omit(tempSubmission, 'modified'),
                  );
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin2.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (read)', (done) => {
          tempSubmission.data.readPerm = [template.users.user2];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.user2._id],
                },
              ];
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can delete a submission, without explicit resource access (read)', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (write)', (done) => {
          tempSubmission.data.writePerm = [template.users.admin2];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin2._id],
                },
                {
                  type: 'create',
                  resources: [template.users.admin2._id],
                },
                {
                  type: 'update',
                  resources: [template.users.admin2._id],
                },
              ];
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, with explicit resource access (write)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read the index of submissions, with explicit resource access (write)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission, with explicit resource access (write)', (done) => {
          tempSubmission.data.value = '1231888123q';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission owner, without explicit resource access (write)', (done) => {
          tempSubmission.owner = '';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              tempSubmission.owner = template.users.admin._id;
              request(app)
                .put(
                  hook.alter(
                    'url',
                    `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin2.token)
                .send(tempSubmission)
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;

                  assert.deepEqual(
                    _.omit(response, 'modified'),
                    _.omit(tempSubmission, 'modified'),
                  );
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin2.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, without explicit resource access (write)', (done) => {
          tempSubmission.data.writePerm = [template.users.user2];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.user2._id],
                },
                {
                  type: 'create',
                  resources: [template.users.user2._id],
                },
                {
                  type: 'update',
                  resources: [template.users.user2._id],
                },
              ];
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can delete a submission, without explicit resource access (write)', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, with explicit resource access (admin)', (done) => {
          tempSubmission.data.adminPerm = [template.users.admin2];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin2._id],
                },
                {
                  type: 'create',
                  resources: [template.users.admin2._id],
                },
                {
                  type: 'update',
                  resources: [template.users.admin2._id],
                },
                {
                  type: 'delete',
                  resources: [template.users.admin2._id],
                },
              ];
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read a submission, with explicit resource access (admin)', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, tempSubmission);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can read the index of submissions, with explicit resource access (admin)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(Array.isArray(response));

              let found = false;
              response.forEach((result) => {
                if (result._id === tempSubmission._id) {
                  found = true;
                  assert.deepEqual(_.omit(result, 'modified'), _.omit(tempSubmission, 'modified'));
                }
              });
              assert(found);

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission, with explicit resource access (admin)', (done) => {
          tempSubmission.data.value = '1231888123233q';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can update a submission owner, with explicit resource access (admin)', (done) => {
          tempSubmission.owner = '';

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;

              assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              tempSubmission.owner = template.users.admin._id;
              request(app)
                .put(
                  hook.alter(
                    'url',
                    `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                    template,
                  ),
                )
                .set('x-jwt-token', template.users.admin2.token)
                .send(tempSubmission)
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }

                  const response = res.body;

                  assert.deepEqual(
                    _.omit(response, 'modified'),
                    _.omit(tempSubmission, 'modified'),
                  );
                  tempSubmission = response;

                  // Store the JWT for future API calls.
                  template.users.admin2.token = res.headers['x-jwt-token'];

                  done();
                });
            });
        });

        it('An Admin, not the owner, can update a submissions resource access, with explicit resource access (admin)', (done) => {
          tempSubmission.data.adminPerm = [template.users.user2];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.user2._id],
                },
                {
                  type: 'create',
                  resources: [template.users.user2._id],
                },
                {
                  type: 'update',
                  resources: [template.users.user2._id],
                },
                {
                  type: 'delete',
                  resources: [template.users.user2._id],
                },
              ];
              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin, not the owner, can delete a submission, with explicit resource access (admin)', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin2.token)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.deepEqual(response, {});

              // Store the JWT for future API calls.
              template.users.admin2.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Authenticated User', () => {
        before('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        // Pattern E. This suite grants user1 progressively wider access to `tempSubmission` in
        // three `Give the user X access` tests, and the tests after each grant depend on it. Alone
        // they saw an ungranted submission: the positive ones 401'd, and the negative ones passed
        // for the wrong reason — denied because no grant existed rather than because the grant they
        // name is insufficient.
        //
        // Each grant sets all three perm fields absolutely, so the three are independent of one
        // another and the guard can read the active grant straight off the submission rather than
        // tracking a "did I run" flag.
        const PERM_KEYS = ['readPerm', 'writePerm', 'adminPerm'];

        const grantedTo = (permKey) => {
          const value = tempSubmission.data[permKey];
          return Array.isArray(value) && value.length > 0;
        };

        function ensureGrant(permKey, cb) {
          if (grantedTo(permKey) && !PERM_KEYS.some((key) => key !== permKey && grantedTo(key))) {
            return cb();
          }

          PERM_KEYS.forEach((key) => {
            tempSubmission.data[key] = key === permKey ? [template.users.user1] : [];
          });

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return cb(err);
              }

              tempSubmission = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              cb(null, res.body);
            });
        }

        // Runs the grant this test depends on, then the test body verbatim.
        const withGrant = (permKey, body) => (done) =>
          ensureGrant(permKey, (err) => (err ? done(err) : body(done)));

        it('A user can not read a submission, without explicit resource access', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.user1.token)
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not read the index of submissions, without explicit resource access (read)', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.user1.token)
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert.equal(response.length, 0);

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not update a submission, without explicit resource access', (done) => {
          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.user1.token)
            .send({ data: { value: 'baz' } })
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it(
          'A user can not update a submissions owner, without explicit resource access (read)',
          withGrant('readPerm', (done) => {
            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({ owner: template.users.user1._id })
              .expect(401)
              .expect('Content-Type', /text/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.text;
                assert.deepEqual(response, 'Unauthorized');

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it('A user can not update a submissions resource access, without explicit resource access', (done) => {
          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.user1.token)
            .send({
              access: [
                {
                  type: 'delete',
                  resources: [template.users.user1._id],
                },
              ],
            })
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A user can not delete a submission, without explicit resource access', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.user1.token)
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              // Store the JWT for future API calls.
              template.users.user1.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Give the user read access to the submission', (done) => {
          ensureGrant('readPerm', (err) => done(err));
        });

        it(
          'A user can read a submission, with explicit resource access (read)',
          withGrant('readPerm', (done) => {
            request(app)
              .get(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can read the index of submissions, with explicit resource access (read)',
          withGrant('readPerm', (done) => {
            request(app)
              .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert(Array.isArray(response));

                let found = false;
                response.forEach((result) => {
                  if (result._id === tempSubmission._id) {
                    found = true;
                    assert.deepEqual(
                      _.omit(result, 'modified'),
                      _.omit(tempSubmission, 'modified'),
                    );
                  }
                });
                assert(found);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can not update a submission, without explicit resource access (read)',
          withGrant('readPerm', (done) => {
            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({ data: { value: 'baz' } })
              .expect(401)
              .expect('Content-Type', /text/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.text;
                assert.deepEqual(response, 'Unauthorized');

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can not update a submissions owner, without explicit resource access (read)',
          withGrant('readPerm', (done) => {
            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({ owner: template.users.user1._id })
              .expect(401)
              .expect('Content-Type', /text/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.text;
                assert.deepEqual(response, 'Unauthorized');

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can not update a submissions resource access, without explicit resource access (read)',
          withGrant('readPerm', (done) => {
            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send({
                access: [
                  {
                    type: 'delete',
                    resources: [template.users.user1._id],
                  },
                ],
              })
              .expect(401)
              .expect('Content-Type', /text/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.text;
                assert.deepEqual(response, 'Unauthorized');

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can not delete a submission, without explicit resource access (read)',
          withGrant('readPerm', (done) => {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(401)
              .expect('Content-Type', /text/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.text;
                assert.deepEqual(response, 'Unauthorized');

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it('Give the user write access to the submission', (done) => {
          ensureGrant('writePerm', (err) => done(err));
        });

        it(
          'A user can read a submission, with explicit resource access (write)',
          withGrant('writePerm', (done) => {
            request(app)
              .get(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can read the index of submissions, with explicit resource access (write)',
          withGrant('writePerm', (done) => {
            request(app)
              .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert(Array.isArray(response));

                let found = false;
                response.forEach((result) => {
                  if (result._id === tempSubmission._id) {
                    found = true;
                    assert.deepEqual(
                      _.omit(result, 'modified'),
                      _.omit(tempSubmission, 'modified'),
                    );
                  }
                });
                assert(found);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can update a submission, with explicit resource access (write)',
          withGrant('writePerm', (done) => {
            tempSubmission.data.value = 'baz';

            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send(tempSubmission)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;

                assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

                tempSubmission = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can not update a submissions owner, without explicit resource access (write)',
          withGrant('writePerm', (done) => {
            tempSubmission.owner = template.users.user1._id;

            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send(tempSubmission)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert.deepEqual(
                  _.omit(response, ['modified', 'owner']),
                  _.omit(tempSubmission, ['modified', 'owner']),
                );
                assert.notEqual(response.owner, tempSubmission.owner);

                tempSubmission = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can not delete a submission, without explicit resource access (write)',
          withGrant('writePerm', (done) => {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(401)
              .expect('Content-Type', /text/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.text;
                assert.deepEqual(response, 'Unauthorized');

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it('Give the user admin access to the submission', (done) => {
          ensureGrant('adminPerm', (err) => done(err));
        });

        it(
          'A user can read a submission, with explicit resource access (admin)',
          withGrant('adminPerm', (done) => {
            request(app)
              .get(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can read the index of submissions, with explicit resource access (admin)',
          withGrant('adminPerm', (done) => {
            request(app)
              .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .expect('Content-Type', /json/)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert(Array.isArray(response));

                let found = false;
                response.forEach((result) => {
                  if (result._id === tempSubmission._id) {
                    found = true;
                    assert.deepEqual(
                      _.omit(result, 'modified'),
                      _.omit(tempSubmission, 'modified'),
                    );
                  }
                });
                assert(found);

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can update a submission, with explicit resource access (admin)',
          withGrant('adminPerm', (done) => {
            tempSubmission.data.value = 'bqqqweqaz';

            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send(tempSubmission)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;

                assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

                tempSubmission = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can update a submissions owner, with explicit resource access (admin)',
          withGrant('adminPerm', (done) => {
            tempSubmission.owner = template.users.user1._id;

            request(app)
              .put(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .send(tempSubmission)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;

                assert.deepEqual(_.omit(response, 'modified'), _.omit(tempSubmission, 'modified'));

                tempSubmission = response;

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );

        it(
          'A user can delete a submission, with explicit resource access (admin)',
          withGrant('adminPerm', (done) => {
            request(app)
              .delete(
                hook.alter(
                  'url',
                  `/form/${tempForm._id}/submission/${tempSubmission._id}`,
                  template,
                ),
              )
              .set('x-jwt-token', template.users.user1.token)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                const response = res.body;
                assert.deepEqual(response, {});

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              });
          }),
        );
      });

      describe('Anonymous User', () => {
        before('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A anonymous user can not read a submission, without explicit resource access', (done) => {
          request(app)
            .get(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              done();
            });
        });

        it('A anonymous user can not read the index of submissions, without explicit resource access', (done) => {
          request(app)
            .get(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              done();
            });
        });

        it('A anonymous user can not update a submission, without explicit resource access', (done) => {
          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .send({ data: { foo: 'anything' } })
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              done();
            });
        });

        it('A anonymous user can not update a submissions owner, with explicit resource access', (done) => {
          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .send({ owner: template.users.user2._id })
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              done();
            });
        });

        it('A anonymous user can not update a submissions resource access, without explicit resource access', (done) => {
          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .send({
              access: [
                {
                  type: 'admin',
                  resources: [template.users.user2._id],
                },
              ],
            })
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              done();
            });
        });

        it('A anonymous user can not delete a submission, without explicit resource access', (done) => {
          request(app)
            .delete(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .expect(401)
            .expect('Content-Type', /text/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.text;
              assert.deepEqual(response, 'Unauthorized');

              done();
            });
        });
      });

      describe('Multiple permissions', () => {
        before('An Admin can create a submission', (done) => {
          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );

              // Update the submission data.
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An Admin can update the submissions resource access', (done) => {
          tempSubmission.data.readPerm = [template.users.admin];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin._id],
                },
              ];

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An update to the submissions resource access, will be condensed (single)', (done) => {
          tempSubmission.data.readPerm = [template.users.admin, template.users.admin2];
          tempSubmission.data.writePerm = [null];
          tempSubmission.data.adminPerm = [null];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin._id, template.users.admin2._id],
                },
              ];

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('An update to the submissions resource access, will be condensed (multi)', (done) => {
          tempSubmission.data.readPerm = [template.users.admin, template.users.admin2];
          tempSubmission.data.writePerm = [template.users.admin, template.users.admin2];
          tempSubmission.data.adminPerm = [template.users.admin, template.users.admin2];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [
                {
                  type: 'read',
                  resources: [template.users.admin._id, template.users.admin2._id],
                },
                {
                  type: 'create',
                  resources: [template.users.admin._id, template.users.admin2._id],
                },
                {
                  type: 'update',
                  resources: [template.users.admin._id, template.users.admin2._id],
                },
                {
                  type: 'delete',
                  resources: [template.users.admin._id, template.users.admin2._id],
                },
              ];

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        // FA-892
        it('An update to resource access, with null access, will not be saved (single)', (done) => {
          tempSubmission.data.readPerm = [null];
          tempSubmission.data.writePerm = [null];
          tempSubmission.data.adminPerm = [null];

          request(app)
            .put(
              hook.alter('url', `/form/${tempForm._id}/submission/${tempSubmission._id}`, template),
            )
            .set('x-jwt-token', template.users.admin.token)
            .send(tempSubmission)
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              const expected = _.clone(tempSubmission);
              expected.access = [];

              assert.deepEqual(_.omit(response, 'modified'), _.omit(expected, 'modified'));
              tempSubmission = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Form Normalization', () => {
        it('Delete the manager resource', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${managerResource._id}`, template))
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

        it('Delete the manager register form', (done) => {
          request(app)
            .delete(hook.alter('url', `/form/${managerRegister._id}`, template))
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

        it('Delete the manager role', (done) => {
          request(app)
            .delete(hook.alter('url', `/role/${managerRole._id}`, template))
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

        it('Delete the form', (done) => {
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
      });
    });

    describe('Submission Resource Access', () => {
      // Create the temp form for testing.
      let tempForm = {
        title: 'Submission resource access check',
        name: 'resourceaccess',
        path: 'resourceaccess',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            submissionAccess: [
              {
                type: 'read',
                roles: [],
              },
              {
                type: 'create',
                roles: ['role1', 'role2'],
              },
              {
                type: 'update',
                roles: ['role1', 'role2'],
              },
              {
                type: 'delete',
                roles: [],
              },
            ],
            type: 'select',
            multiple: true,
            dataSrc: 'url',
            data: {
              url: 'http://myfake.com/nothing',
            },
            key: 'perm1',
            label: 'Perm Field 1',
            input: true,
          },
          {
            submissionAccess: [
              {
                type: 'read',
                roles: ['role'],
              },
            ],
            type: 'select',
            multiple: true,
            dataSrc: 'url',
            data: {
              url: 'http://myfake.com/nothing',
            },
            key: 'perm2',
            label: 'Perm Field 2',
            input: true,
          },
          {
            type: 'textfield',
            key: 'value',
            label: 'value',
            input: true,
          },
        ],
      };

      // Setup hoisted to hooks: sibling describes consume this state and mocha does not run a sibling suite's hooks.
      before('Create the form', (done) => {
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
            assert(
              response.hasOwnProperty('modified'),
              'The response should contain a `modified` timestamp.',
            );
            assert(
              response.hasOwnProperty('created'),
              'The response should contain a `created` timestamp.',
            );
            assert(
              response.hasOwnProperty('access'),
              'The response should contain an the `access`.',
            );
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
            assert.deepEqual(response.submissionAccess, tempForm.submissionAccess);
            assert.deepEqual(response.components, tempForm.components);
            tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      describe('Access Setup', () => {
        it('Submission should have appropriate access', (done) => {
          const submission = {
            data: {
              perm1: [template.users.admin],
              perm2: [template.users.admin2],
              value: 'test',
            },
          };

          request(app)
            .post(hook.alter('url', `/form/${tempForm._id}/submission`, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.clone(submission))
            .expect(201)
            .expect('Content-Type', /json/)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              assert(
                response.hasOwnProperty('modified'),
                'The response should contain a `modified` timestamp.',
              );
              assert(
                response.hasOwnProperty('created'),
                'The response should contain a `created` timestamp.',
              );
              assert(
                response.hasOwnProperty('data'),
                'The response should contain a submission `data` object.',
              );
              assert(
                response.data.hasOwnProperty('value'),
                'The submission `data` should contain the `value`.',
              );
              assert.equal(response.data.value, submission.data.value);
              assert(response.hasOwnProperty('form'), 'The response should contain the `form` id.');
              assert.equal(response.form, tempForm._id);
              assert(
                response.hasOwnProperty('roles'),
                'The response should contain the resource `roles`.',
              );
              assert.deepEqual(response.roles, []);
              assert(
                response.hasOwnProperty('owner'),
                'The response should contain the resource `owner`.',
              );
              assert.deepEqual(response.owner, template.users.admin._id);
              assert(
                res.headers.hasOwnProperty('x-jwt-token'),
                'The response should contain a `x-jwt-token` header.',
              );
              assert(
                response.hasOwnProperty('access'),
                'The response should contain the resource `access`.',
              );
              assert.deepEqual(response.access, [
                {
                  type: 'read',
                  resources: [template.users.admin._id, `${template.users.admin2._id}:role`],
                },
                {
                  type: 'create',
                  resources: [
                    `${template.users.admin._id}:role1`,
                    `${template.users.admin._id}:role2`,
                  ],
                },
                {
                  type: 'update',
                  resources: [
                    `${template.users.admin._id}:role1`,
                    `${template.users.admin._id}:role2`,
                  ],
                },
                {
                  type: 'delete',
                  resources: [template.users.admin._id],
                },
              ]);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Form Normalization', () => {
        it('Delete the form', (done) => {
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
      });
    });

    describe('Submission Resource Access - Multiple Users', () => {
      var helper = null;
      var submission = null;
      before('Should create a project with multiple resource users', (done) => {
        var owner = app.hasProjects || docker ? template.formio.owner : template.users.admin;
        helper = new Helper(owner);
        helper
          .project()
          .resource('client', [
            {
              type: 'email',
              label: 'Email',
              key: 'email',
            },
            {
              type: 'password',
              label: 'Password',
              key: 'password',
            },
          ])
          .form(
            'clientLogin',
            [
              {
                type: 'email',
                label: 'Email',
                key: 'email',
              },
              {
                type: 'password',
                label: 'Password',
                key: 'password',
              },
            ],
            {
              submissionAccess: [
                {
                  type: 'create_own',
                  roles: ['anonymous'],
                },
              ],
            },
          )
          .removeAction('clientLogin', {
            title: 'Save Submission',
          })
          .action('clientLogin', {
            title: 'Client Login',
            name: 'login',
            handler: ['before'],
            method: ['create'],
            priority: 0,
            settings: {
              resources: ['client'],
              username: 'email',
              password: 'password',
            },
          })
          .resource('manager', [
            {
              type: 'email',
              label: 'Email',
              key: 'email',
            },
            {
              type: 'password',
              label: 'Password',
              key: 'password',
            },
          ])
          .form(
            'managerLogin',
            [
              {
                type: 'email',
                label: 'Email',
                key: 'email',
              },
              {
                type: 'password',
                label: 'Password',
                key: 'password',
              },
            ],
            {
              submissionAccess: [
                {
                  type: 'create_own',
                  roles: ['anonymous'],
                },
              ],
            },
          )
          .removeAction('managerLogin', {
            title: 'Save Submission',
          })
          .action('managerLogin', {
            title: 'Manager Login',
            name: 'login',
            handler: ['before'],
            method: ['create'],
            priority: 0,
            settings: {
              resources: ['manager'],
              username: 'email',
              password: 'password',
            },
          })
          .form('clientreg', [
            {
              type: 'resource',
              label: 'User',
              key: 'user',
              resource: 'user',
              template: '<span>{{ item.data.email }}</span>',
              defaultPermission: 'read',
            },
            {
              type: 'resource',
              label: 'Client',
              key: 'client',
              resource: 'client',
              template: '<span>{{ item.data.email }}</span>',
              defaultPermission: 'read',
            },
            {
              type: 'resource',
              label: 'Manager',
              key: 'manager',
              resource: 'manager',
              template: '<span>{{ item.data.email }}</span>',
              submissionAccess: [
                {
                  type: 'read',
                  roles: [],
                },
                {
                  type: 'create',
                  roles: [],
                },
                {
                  type: 'update',
                  roles: [],
                },
                {
                  type: 'delete',
                  roles: [],
                },
              ],
            },
          ])
          .user('user', 'clientuser')
          .user('client', 'client')
          .user('manager', 'manager')
          .execute(done);
      });

      it('Should NOT allow an anonymous user to create a submission', (done) => {
        helper.createSubmission(
          'clientreg',
          {
            data: {
              user: helper.template.users.clientuser,
              client: helper.template.users.client,
              manager: helper.template.users.manager,
            },
          },
          null,
          [/text\/plain/, 401],
          done,
        );
      });

      it('Should NOT allow a clientuser to create a submission', (done) => {
        helper.createSubmission(
          'clientreg',
          {
            data: {
              user: helper.template.users.clientuser,
              client: helper.template.users.client,
              manager: helper.template.users.manager,
            },
          },
          'clientuser',
          [/text\/plain/, 401],
          done,
        );
      });

      it('Should NOT allow a client to create a submission', (done) => {
        helper.createSubmission(
          'clientreg',
          {
            data: {
              user: helper.template.users.clientuser,
              client: helper.template.users.client,
              manager: helper.template.users.manager,
            },
          },
          'client',
          [/text\/plain/, 401],
          done,
        );
      });

      it('Should allow a manager user to create a submission', (done) => {
        helper.createSubmission(
          'clientreg',
          {
            data: {
              user: helper.template.users.clientuser,
              client: helper.template.users.client,
              manager: helper.template.users.manager,
            },
          },
          'manager',
          [/json/, 201],
          done,
        );
      });

      // Pattern E: every test below reads the registration submission created by the test above
      // them. Guarded, so in file order that test still creates it and later calls are no-ops.
      // Consumers that set `data.testing` clone first — the cached object is shared.
      function ensureRegistrationSubmission(cb) {
        if (submission) {
          return cb(null, submission);
        }
        helper.createSubmission(
          'clientreg',
          {
            data: {
              user: helper.template.users.clientuser,
              client: helper.template.users.client,
              manager: helper.template.users.manager,
            },
          },
          (err, response) => {
            if (err) {
              return cb(err);
            }
            submission = response;
            cb(null, submission);
          },
        );
      }

      const withTesting = (created) => {
        const update = _.cloneDeep(created);
        update.data.testing = 'hello';
        return update;
      };

      it('Should allow admin to create a registration submission with the client and manager set', (done) => {
        ensureRegistrationSubmission((err) => done(err));
      });

      it('Should NOT allow an anonymous user to see the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.getSubmission('clientreg', created._id, null, [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow an anonymous user to update the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.updateSubmission(created, null, [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow an anonymous user to delete the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.deleteSubmission(created, null, [/text\/plain/, 401], done);
        });
      });

      it('Should allow the clientuser to see this submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.getSubmission('clientreg', created._id, 'clientuser', [/json/, 200], done);
        });
      });

      it('Should NOT allow the clientuser to update the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.updateSubmission(withTesting(created), 'clientuser', [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow the clientuser to delete the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.deleteSubmission(created, 'clientuser', [/text\/plain/, 401], done);
        });
      });

      it('Should allow the client to see this submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.getSubmission('clientreg', created._id, 'client', [/json/, 200], done);
        });
      });

      it('Should NOT allow the client to update the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.updateSubmission(withTesting(created), 'client', [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow the client to delete the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.deleteSubmission(created, 'client', [/text\/plain/, 401], done);
        });
      });

      it('Should allow the manager to see this submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.getSubmission('clientreg', created._id, 'manager', [/json/, 200], done);
        });
      });

      it('Should allow allow the manager to update the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.updateSubmission(withTesting(created), 'manager', [/json/, 200], done);
        });
      });

      it('Should allow the manager to delete the submission', (done) => {
        ensureRegistrationSubmission((err, created) => {
          if (err) {
            return done(err);
          }
          helper.deleteSubmission(created, 'manager', [/json/, 200], done);
        });
      });
    });

    describe('Mix and Match Permissions', () => {
      var helper = null;
      before('Create the project with a new users.', (done) => {
        var owner = app.hasProjects || docker ? template.formio.owner : template.users.admin;
        helper = new Helper(owner);
        helper
          .project()
          .user('admin', 'admin1')
          .user('admin', 'admin2')
          .user('user', 'user1')
          .user('user', 'user2')
          .execute(done);
      });

      const components = [
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
      ];

      before('Create the resources', function (done) {
        const components = [
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
        ];
        helper
          .resource('mixmatcha', components, {
            submissionAccess: helper.perms({
              create_own: ['authenticated'],
              read_own: ['authenticated'],
              update_own: ['authenticated'],
            }),
          })
          .resource('mixmatchb', components, {
            submissionAccess: helper.perms({
              create_own: ['anonymous'],
              read_own: ['anonymous'],
              update_own: ['anonymous'],
              delete_own: ['anonymous'],
            }),
          })
          .resource('mixmatchc', components, {
            submissionAccess: helper.perms({
              create_all: ['anonymous'],
              create_own: ['authenticated', 'anonymous'],
              read_own: ['authenticated'],
              update_own: ['authenticated'],
              delete_own: ['authenticated'],
            }),
          })
          .resource('mixmatchd', components, {
            submissionAccess: helper.perms({
              create_all: ['authenticated'],
              read_all: ['anonymous'],
              read_own: ['authenticated', 'anonymous'],
              update_own: ['authenticated'],
              delete_all: ['anonymous'],
            }),
          })
          .execute(done);
      });

      // Pattern E, applied to a whole suite. This describe was one 40-test chain: every test read
      // the submission the *previous* test left in `helper.lastSubmission`. Alone, that field holds
      // whatever the `before` hooks created last (user2's user-resource record), so the positive
      // tests failed and — worse — the `expect 401` tests passed for the wrong reason, denying
      // access to an id that was never in the resource under test.
      //
      // Each fixture is now built once by a guarded builder and referenced by name. Whole-file
      // ordering is byte-identical: in file order the creating test still makes it and every later
      // call is a no-op. Consumers that mutate a fixture must clone it first — the cached object is
      // shared, and the tests below deliberately re-send altered data.
      const FIXTURES = {
        aUser1: { form: 'mixmatcha', user: 'user1', data: { a: 'test', b: 'test2', c: 'test3' } },
        aOwnedByUser2: {
          form: 'mixmatcha',
          user: 'admin1',
          data: {
            data: { a: 'test', b: 'test2', c: 'test3' },
            owner: () => helper.template.users.user2._id.toString(),
          },
        },
        bAnonymous: {
          form: 'mixmatchb',
          user: null,
          data: { a: 'testing', b: 'one', c: 'two' },
        },
        cOwnedByUser1: {
          form: 'mixmatchc',
          user: null,
          data: {
            data: { a: 'hello', b: 'there', c: 'admin2' },
            owner: () => helper.template.users.user1._id.toString(),
          },
        },
        dUser2: { form: 'mixmatchd', user: 'user2', data: { a: 'a', b: 'b', c: 'c' } },
        dOwnedByUser1: {
          form: 'mixmatchd',
          user: 'user2',
          data: {
            data: { a: 'a', b: 'b', c: 'c' },
            owner: () => helper.template.users.user1._id.toString(),
          },
        },
      };

      const built = {};

      function ensureFixture(key, cb) {
        if (built[key]) {
          return cb(null, built[key]);
        }

        const spec = FIXTURES[key];
        // `owner` is a thunk because the user ids only exist once the project `before` has run.
        const payload = _.mapValues(spec.data, (value) =>
          typeof value === 'function' ? value() : value,
        );

        helper.createSubmission(spec.form, payload, spec.user, (err, submission) => {
          if (err) {
            return cb(err);
          }
          built[key] = submission;
          cb(null, submission);
        });
      }

      it('Should not allow anonymous to create a record in mixmatcha', (done) => {
        helper
          .submission(
            'mixmatcha',
            {
              a: 'test',
              b: 'test2',
              c: 'test3',
            },
            null,
            [/text\/plain/, 401],
          )
          .execute(done);
      });

      it('Should allow authenticated to create a record in mixmatcha', (done) => {
        ensureFixture('aUser1', (err) => done(err));
      });

      it('Should not allow user2 to see user1 submission', (done) => {
        ensureFixture('aUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatcha', submission._id, 'user2', [/text\/plain/, 401], done);
        });
      });

      it('Should allow user1 to see their own submission', (done) => {
        ensureFixture('aUser1', (err, created) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatcha', created._id, 'user1', (err, submission) => {
            if (err) {
              return done(err);
            }

            assert.deepEqual(submission.data, created.data);
            done();
          });
        });
      });

      it('Should allow admin users to see user1 submission', (done) => {
        ensureFixture('aUser1', (err, created) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatcha', created._id, 'admin1', (err, submission) => {
            if (err) {
              return done(err);
            }

            assert.deepEqual(submission.data, created.data);
            done();
          });
        });
      });

      it('Should not allow user1 to change the owner of the submission in mixmatcha', (done) => {
        helper
          .submission(
            'mixmatcha',
            {
              data: {
                a: 'test',
                b: 'test2',
                c: 'test3',
              },
              owner: helper.template.users.user2._id.toString(),
            },
            'user1',
          )
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.lastSubmission;
            assert.equal(submission.owner.toString(), helper.template.users.user1._id.toString());
            assert(
              submission.owner.toString() !== helper.template.users.user2._id.toString(),
              'Owner should not be user2',
            );
            done();
          });
      });

      it('Should allow admins to change the owner of the submission in mixmatcha', (done) => {
        ensureFixture('aOwnedByUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          assert.equal(submission.owner.toString(), helper.template.users.user2._id.toString());
          done();
        });
      });

      it('Should not allow user1 to see that submission now.', (done) => {
        ensureFixture('aOwnedByUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatcha', submission._id, 'user1', [/text\/plain/, 401], done);
        });
      });

      it('Should allow user2 to see the submission now.', (done) => {
        ensureFixture('aOwnedByUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatcha', submission._id, 'user2', done);
        });
      });

      it('Should not allow user1 to delete the submission.', (done) => {
        ensureFixture('aOwnedByUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'user1', [/text\/plain/, 401], done);
        });
      });

      it('Should not allow user2 to delete the submission.', (done) => {
        ensureFixture('aOwnedByUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'user2', [/text\/plain/, 401], done);
        });
      });

      it('Should allow an administrator to delete the submission.', (done) => {
        ensureFixture('aOwnedByUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'admin2', done);
        });
      });

      it('Should not allow authenticated to create a submission in mixmatchb', (done) => {
        helper.createSubmission(
          'mixmatchb',
          {
            a: 'testing',
            b: 'one',
            c: 'two',
          },
          'user1',
          [/text\/plain/, 401],
          done,
        );
      });

      it('Should allow admins to create a submisison in mixmatchb', (done) => {
        helper.createSubmission(
          'mixmatchb',
          {
            a: 'testing',
            b: 'one',
            c: 'two',
          },
          'admin2',
          (err, submission) => {
            if (err) {
              return done(err);
            }

            assert.deepEqual(submission.data, {
              a: 'testing',
              b: 'one',
              c: 'two',
            });
            assert.equal(submission.owner, helper.template.users.admin2._id.toString());
            done();
          },
        );
      });

      it('Should also allow for anonymous users to create a submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          assert.deepEqual(submission.data, {
            a: 'testing',
            b: 'one',
            c: 'two',
          });
          assert.equal(submission.owner, null);
          done();
        });
      });

      it('Should NOT allow anonymous user to update the submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          const update = _.cloneDeep(submission);
          update.data = {
            a: 'test2',
            b: 'test3',
            c: 'test4',
          };
          helper.updateSubmission(update, null, [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow anonymous user to delete the submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, null, [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow anonymous to view the submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchb', submission._id, null, [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow user1 to view the submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchb', submission._id, 'user1', [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow user1 to delete the submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'user1', [/text\/plain/, 401], done);
        });
      });

      it('Should allow admin1 to get the submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchb', submission._id, 'admin1', done);
        });
      });

      it('Should allow admin2 to delete the submission in mixmatchb', (done) => {
        ensureFixture('bAnonymous', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'admin2', done);
        });
      });

      it('Should allow an admin to assign owner on create', (done) => {
        helper.createSubmission(
          'mixmatchb',
          {
            owner: helper.template.users.admin2._id.toString(),
            data: {
              a: 'hello',
              b: 'there',
              c: 'admin2',
            },
          },
          'admin1',
          (err, submission) => {
            if (err) {
              return done(err);
            }

            assert.equal(submission.owner, helper.template.users.admin2._id.toString());
            done();
          },
        );
      });

      it('Should NOT allow anonymous to assign owner on create', (done) => {
        helper.createSubmission(
          'mixmatchb',
          {
            owner: helper.template.users.admin2._id.toString(),
            data: {
              a: 'hello',
              b: 'there',
              c: 'admin2',
            },
          },
          null,
          (err, submission) => {
            if (err) {
              return done(err);
            }

            assert.equal(submission.owner, null);
            done();
          },
        );
      });

      it('Should allow anonymous to create submission and change owner in mixmatchc', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          assert.equal(submission.owner, helper.template.users.user1._id.toString());
          done();
        });
      });

      it('Should allow user1 to get that submission that was created on behalf of that user', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchc', submission._id, 'user1', done);
        });
      });

      it('Should NOT allow user2 to get that submission that was created on behalf of that user', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchc', submission._id, 'user2', [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow anonymous to read the created submission either.', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchc', submission._id, null, [/text\/plain/, 401], done);
        });
      });

      it('Should allow an admin to read the submission', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchc', submission._id, 'admin2', done);
        });
      });

      it('Should NOT allow user2 to update the created submission', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          const update = _.cloneDeep(submission);
          update.data = {
            a: 'test2',
            b: 'test3',
            c: 'test4',
          };
          helper.updateSubmission(update, 'user2', [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow anonymous to update the created submission', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          const update = _.cloneDeep(submission);
          update.data = {
            a: 'test2',
            b: 'test3',
            c: 'test4',
          };
          helper.updateSubmission(update, null, [/text\/plain/, 401], done);
        });
      });

      it('Should allow user1 to update their submission.', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          const update = _.cloneDeep(submission);
          update.data = {
            a: 'test345',
            b: 'test234234',
            c: 'test567567',
          };
          helper.updateSubmission(update, 'user1', (err, updated) => {
            if (err) {
              return done(err);
            }

            assert.deepEqual(updated.data, {
              a: 'test345',
              b: 'test234234',
              c: 'test567567',
            });
            done();
          });
        });
      });

      it('Should also allow an admin to update the submission', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          const update = _.cloneDeep(submission);
          update.data = {
            a: 'a',
            b: 'b',
            c: 'c',
          };
          helper.updateSubmission(update, 'admin1', (err, updated) => {
            if (err) {
              return done(err);
            }

            assert.deepEqual(updated.data, {
              a: 'a',
              b: 'b',
              c: 'c',
            });
            done();
          });
        });
      });

      it('Should not allow user2 to delete the submission.', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'user2', [/text\/plain/, 401], done);
        });
      });

      it('Should not allow anonymous to delete the submission.', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, null, [/text\/plain/, 401], done);
        });
      });

      it('Should allow user1 to delete their own submission.', (done) => {
        ensureFixture('cOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'user1', done);
        });
      });

      it('Should NOT allow anonymous users to create submissions in mixmatchd', (done) => {
        helper.createSubmission(
          'mixmatchd',
          {
            a: 'a',
            b: 'b',
            c: 'c',
          },
          null,
          [/text\/plain/, 401],
          done,
        );
      });

      it('Should allow user2 to create a submission in mixmatchd', (done) => {
        ensureFixture('dUser2', (err) => done(err));
      });

      it('Should allow anonymous to read the created submission.', (done) => {
        ensureFixture('dUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchd', submission._id, null, done);
        });
      });

      it('Should also allow user2 to read the created submission.', (done) => {
        ensureFixture('dUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchd', submission._id, 'user2', done);
        });
      });

      it('Should also allow admin1 to read the created submission.', (done) => {
        ensureFixture('dUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchd', submission._id, 'admin1', done);
        });
      });

      it('Should NOT allow user1 to read the created submission', (done) => {
        ensureFixture('dUser2', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchd', submission._id, 'user1', [/text\/plain/, 401], done);
        });
      });

      it('Should allow user2 to create a submission and assign it to user1', (done) => {
        ensureFixture('dOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          assert.equal(submission.owner, helper.template.users.user1._id.toString());
          done();
        });
      });

      it('Should not allow user2 to read the created submission.', (done) => {
        ensureFixture('dOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchd', submission._id, 'user2', [/text\/plain/, 401], done);
        });
      });

      it('Should allow user1 to read the created submission.', (done) => {
        ensureFixture('dOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchd', submission._id, 'user1', done);
        });
      });

      it('Should allow anonymous user to read the created submission.', (done) => {
        ensureFixture('dOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.getSubmission('mixmatchd', submission._id, null, done);
        });
      });

      it('Should NOT allow user1 to delete the submission.', (done) => {
        ensureFixture('dOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'user1', [/text\/plain/, 401], done);
        });
      });

      it('Should NOT allow user2 to delete the submission.', (done) => {
        ensureFixture('dOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, 'user2', [/text\/plain/, 401], done);
        });
      });

      it('Should allow an anonymous user to delete the submission.', (done) => {
        ensureFixture('dOwnedByUser1', (err, submission) => {
          if (err) {
            return done(err);
          }

          helper.deleteSubmission(submission, null, done);
        });
      });
    });

    // FA-993
    describe('Submission Export Permissions', function () {
      var tempForm = {
        title: 'Exportform test',
        name: 'exportform',
        path: 'exportform',
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
            placeholder: 'value',
            key: 'value',
            label: 'value',
            inputMask: '',
            inputType: 'text',
            input: true,
          },
        ],
      };
      var adminValues = ['test1', 'test2', 'test3', 'test4', 'other7', 'other8'];
      var userValues = ['test5', 'test6', 'test7', 'test8'];

      before(function () {
        tempForm.access = [
          {
            type: 'read_all',
            roles: [
              template.roles.authenticated._id.toString(),
              template.roles.anonymous._id.toString(),
            ],
          },
        ];
        tempForm.submissionAccess = [
          {
            type: 'create_own',
            roles: [
              template.roles.authenticated._id.toString(),
              template.roles.anonymous._id.toString(),
            ],
          },
          {
            type: 'read_own',
            roles: [
              template.roles.authenticated._id.toString(),
              template.roles.anonymous._id.toString(),
            ],
          },
        ];
      });

      before('Bootstrap the form', function (done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(
              response.hasOwnProperty('modified'),
              'The response should contain a `modified` timestamp.',
            );
            assert(
              response.hasOwnProperty('created'),
              'The response should contain a `created` timestamp.',
            );
            assert(
              response.hasOwnProperty('access'),
              'The response should contain an the `access`.',
            );
            assert.equal(response.title, tempForm.title);
            assert.equal(response.name, tempForm.name);
            assert.equal(response.path, tempForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 2);
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
              -1,
            );
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
              -1,
            );

            // Build a temp list to compare access without mongo id's.
            var tempSubmissionAccess = [];
            response.submissionAccess.forEach(function (role) {
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

      before('Bootstrap the admin submissions', function (done) {
        async.each(
          adminValues,
          function (value, cb) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send({
                data: {
                  value: value,
                },
              })
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                cb();
              });
          },
          function (err) {
            if (err) {
              return done(err);
            }

            done();
          },
        );
      });

      before('Bootstrap the user submissions', function (done) {
        async.each(
          userValues,
          function (value, cb) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send({
                data: {
                  value: value,
                },
              })
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                cb();
              });
          },
          function (err) {
            if (err) {
              return done(err);
            }

            done();
          },
        );
      });

      it('An Admin should see all submissions', function (done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, adminValues.length + userValues.length);
            assert(response instanceof Array);

            var values = [].concat(adminValues, userValues);
            async.each(
              response,
              function (value, cb) {
                assert(value.hasOwnProperty('data'));
                assert(value.data.hasOwnProperty('value'));
                assert.notEqual(values.indexOf(value.data.value), -1);
                cb();
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              },
            );
          });
      });

      it('An admin should be able to export with filters', (done) => {
        request(app)
          .get(
            hook.alter(
              'url',
              '/form/' + tempForm._id + '/export?data.value__regex=/^other/i',
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
            assert.equal(response.length, 2);
            assert(response instanceof Array);
            assert(['other7', 'other8'].indexOf(response[0].data.value) !== -1, 'Value not found');
            assert(['other7', 'other8'].indexOf(response[1].data.value) !== -1, 'Value not found');
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('An admin should be able to export with filters', (done) => {
        request(app)
          .get(
            hook.alter(
              'url',
              '/form/' + tempForm._id + '/export?data.value__regex=/7$/i',
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
            assert.equal(response.length, 2);
            assert(response instanceof Array);
            assert(['other7', 'test7'].indexOf(response[0].data.value) !== -1, 'Value not found');
            assert(['other7', 'test7'].indexOf(response[1].data.value) !== -1, 'Value not found');
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('A user should only be able to see their submissions', function (done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, userValues.length);
            assert(response instanceof Array);

            async.each(
              response,
              function (value, cb) {
                assert(value.hasOwnProperty('data'));
                assert(value.data.hasOwnProperty('value'));
                assert.notEqual(userValues.indexOf(value.data.value), -1);
                assert.equal(adminValues.indexOf(value.data.value), -1);

                cb();
              },
              function (err) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                done();
              },
            );
          });
      });

      it('A user should be able to export with filters', (done) => {
        request(app)
          .get(
            hook.alter(
              'url',
              '/form/' + tempForm._id + '/export?data.value__regex=/^other/i',
              template,
            ),
          )
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 0);
            assert(response instanceof Array);
            template.users.user1.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('An admin should be able to export with filters', (done) => {
        request(app)
          .get(
            hook.alter(
              'url',
              '/form/' + tempForm._id + '/export?data.value__regex=/7$/i',
              template,
            ),
          )
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1);
            assert(response instanceof Array);
            assert.equal(response[0].data.value, 'test7');
            template.users.user1.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('A user without submissions will not see results', function (done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
          .set('x-jwt-token', template.users.user2.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 0);
            assert(response instanceof Array);

            // Store the JWT for future API calls.
            template.users.user2.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An anonymous user will not be able to export', function (done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
          .expect('Content-Type', /text/)
          .expect(400)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            done();
          });
      });

      // Pattern E: the three tests after this one only pass because it widens `read_all` to every
      // role. The guard keys on the widened permission actually being on the form, so it is applied
      // once and never re-applied — and the tests *before* it still see the narrow permissions.
      function ensureExportPermissions(cb) {
        const widened = (tempForm.submissionAccess || []).some(
          (access) =>
            access.type === 'read_all' &&
            access.roles.indexOf(template.roles.authenticated._id.toString()) !== -1 &&
            access.roles.indexOf(template.roles.anonymous._id.toString()) !== -1,
        );
        if (widened) {
          return cb();
        }

        request(app)
          .put(hook.alter('url', '/form/' + tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            submissionAccess: [
              {
                type: 'read_all',
                roles: [
                  template.roles.authenticated._id.toString(),
                  template.roles.anonymous._id.toString(),
                ],
              },
            ],
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return cb(err);
            }

            tempForm = res.body;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            cb();
          });
      }

      // Runs the permission widening, then the test body verbatim.
      const withExportPermissions = (body) =>
        function (done) {
          ensureExportPermissions((err) => (err ? done(err) : body.call(this, done)));
        };

      it('Update the form permissions to allow all users to export data', function (done) {
        ensureExportPermissions(done);
      });

      it(
        'An Admin should see all submissions',
        withExportPermissions(function (done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, adminValues.length + userValues.length);
              assert(response instanceof Array);

              var values = [].concat(adminValues, userValues);
              async.each(
                response,
                function (value, cb) {
                  assert(value.hasOwnProperty('data'));
                  assert(value.data.hasOwnProperty('value'));
                  assert.notEqual(values.indexOf(value.data.value), -1);
                  cb();
                },
                function (err) {
                  if (err) {
                    return done(err);
                  }

                  // Store the JWT for future API calls.
                  template.users.admin.token = res.headers['x-jwt-token'];

                  done();
                },
              );
            });
        }),
      );

      it(
        'A user should be able to see all submissions',
        withExportPermissions(function (done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
            .set('x-jwt-token', template.users.user1.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, adminValues.length + userValues.length);
              assert(response instanceof Array);

              var values = [].concat(adminValues, userValues);
              async.each(
                response,
                function (value, cb) {
                  assert(value.hasOwnProperty('data'));
                  assert(value.data.hasOwnProperty('value'));
                  assert.notEqual(values.indexOf(value.data.value), -1);
                  cb();
                },
                function (err) {
                  if (err) {
                    return done(err);
                  }

                  // Store the JWT for future API calls.
                  template.users.user1.token = res.headers['x-jwt-token'];

                  done();
                },
              );
            });
        }),
      );

      it(
        'A user without submissions will not see results',
        withExportPermissions(function (done) {
          request(app)
            .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
            .set('x-jwt-token', template.users.user2.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.length, adminValues.length + userValues.length);
              assert(response instanceof Array);

              var values = [].concat(adminValues, userValues);
              async.each(
                response,
                function (value, cb) {
                  assert(value.hasOwnProperty('data'));
                  assert(value.data.hasOwnProperty('value'));
                  assert.notEqual(values.indexOf(value.data.value), -1);
                  cb();
                },
                function (err) {
                  if (err) {
                    return done(err);
                  }

                  // Store the JWT for future API calls.
                  template.users.user2.token = res.headers['x-jwt-token'];

                  done();
                },
              );
            });
        }),
      );

      it('An anonymous user will not be able to export', function (done) {
        request(app)
          .get(hook.alter('url', '/form/' + tempForm._id + '/export', template))
          .expect('Content-Type', /text/)
          .expect(400)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            done();
          });
      });
    });

    describe('_', function () {
      const submissionData = {
        data: {
          textField: '1',
          submit: true,
        },
        created: '2025-03-19T14:13:10.069Z',
        modified: '2025-03-19T14:13:10.070Z',
      };

      var tempForm = {
        title: 'overrideTestForm',
        name: 'overrideTestForm',
        path: 'overridetestform',
        type: 'form',
        access: [],
        submissionAccess: [],
        components: [
          {
            label: 'Text Field',
            key: 'textField',
            type: 'textfield',
            input: true,
          },
        ],
      };
      var adminValues = ['test1', 'test2', 'test3', 'test4', 'other7', 'other8'];
      var userValues = ['test5', 'test6', 'test7', 'test8'];

      before(function () {
        tempForm.access = [
          {
            type: 'read_all',
            roles: [
              template.roles.authenticated._id.toString(),
              template.roles.anonymous._id.toString(),
            ],
          },
        ];
        tempForm.submissionAccess = [
          {
            type: 'create_own',
            roles: [
              template.roles.authenticated._id.toString(),
              template.roles.anonymous._id.toString(),
            ],
          },
          {
            type: 'read_own',
            roles: [
              template.roles.authenticated._id.toString(),
              template.roles.anonymous._id.toString(),
            ],
          },
        ];
      });

      before('Bootstrap the form', function (done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert(
              response.hasOwnProperty('modified'),
              'The response should contain a `modified` timestamp.',
            );
            assert(
              response.hasOwnProperty('created'),
              'The response should contain a `created` timestamp.',
            );
            assert(
              response.hasOwnProperty('access'),
              'The response should contain an the `access`.',
            );
            assert.equal(response.title, tempForm.title);
            assert.equal(response.name, tempForm.name);
            assert.equal(response.path, tempForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 2);
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.anonymous._id.toString()),
              -1,
            );
            assert.notEqual(
              response.access[0].roles.indexOf(template.roles.authenticated._id.toString()),
              -1,
            );

            // Build a temp list to compare access without mongo id's.
            var tempSubmissionAccess = [];
            response.submissionAccess.forEach(function (role) {
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

      it('Bootstrap the admin submissions', function (done) {
        async.each(
          adminValues,
          function (value, cb) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.admin.token)
              .send({
                data: {
                  value: value,
                },
              })
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                cb();
              });
          },
          function (err) {
            if (err) {
              return done(err);
            }

            done();
          },
        );
      });

      it('Bootstrap the user submissions', function (done) {
        async.each(
          userValues,
          function (value, cb) {
            request(app)
              .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
              .set('x-jwt-token', template.users.user1.token)
              .send({
                data: {
                  value: value,
                },
              })
              .expect('Content-Type', /json/)
              .expect(201)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                // Store the JWT for future API calls.
                template.users.user1.token = res.headers['x-jwt-token'];

                cb();
              });
          },
          function (err) {
            if (err) {
              return done(err);
            }

            done();
          },
        );
      });

      it('Should not set the modified date based on request data if the x-allow-override-timestamps header is not present and the user is an admin', (done) => {
        request(app)
          .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(submissionData)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const submission = res._body;
            assert.notEqual(submission.modified, submissionData.modified);

            done();
          });
      });

      it('Should set the modified date based on request data if the x-allow-override-timestamps header is present and the user is an admin', (done) => {
        request(app)
          .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
          .set('x-jwt-token', template.users.admin.token)
          .set('x-allow-override-timestamps', true)
          .send(submissionData)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const submission = res._body;
            assert.equal(submission.modified, submissionData.modified);

            done();
          });
      });

      it('Should not set the modified date based on request data if the x-allow-override-timestamps header is present and the user is not an admin', (done) => {
        request(app)
          .post(hook.alter('url', '/form/' + tempForm._id + '/submission', template))
          .set('x-jwt-token', template.users.user1.token)
          .set('x-allow-override-timestamps', true)
          .send(submissionData)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const submission = res._body;
            assert.notEqual(submission.modified, submissionData.modified);

            done();
          });
      });
    });
  });
};
