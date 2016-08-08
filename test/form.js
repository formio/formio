/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var chance = new (require('chance'))();
var formioUtils = require('formio-utils');
var async = require('async');
var docker = process.env.DOCKER;

module.exports = function(app, template, hook) {
  describe('Forms', function() {
    // Store the temp form for this test suite.
    var tempForm = {
      title: 'Temp Form',
      name: 'tempForm',
      path: 'temp/tempform',
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

    describe('Permissions - Form Level - Project Owner', function() {
      it('A normal user should NOT be able to create a form', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.user1.token)
          .send(tempForm)
          .expect(401)
          .end(done);
      });

      it('Should not be able to create a form with a reserved name', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'Bad Form',
            name: 'tempForm',
            path: 'access',
            type: 'form',
            access: [],
            submissionAccess: [],
            components: []
          })
          .expect(400)
          .end(done);
      });

      it('Should not be able to create a form with a reserved name', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'Bad Form',
            name: 'tempForm',
            path: 'access/test',
            type: 'form',
            access: [],
            submissionAccess: [],
            components: []
          })
          .expect(400)
          .end(done);
      });

      it('Form components with invalid keys, are filtered', function(done) {
        var temp = {
          title: chance.word(),
          name: chance.word(),
          path: chance.word(),
          components: [{
            inputType: 'text',
            type: 'textfield',
            key: 'bad[key]',
            input: true
          }, {
            inputType: 'text',
            type: 'textfield',
            input: false,
            key: 'another[something]'
          }, {
            inputType: 'text',
            type: 'textfield',
            key: 'invalid[true]'
          }, {
            type: 'container',
            key: 'container',
            input: true,
            components: [
              {
                inputType: 'text',
                type: 'textfield',
                key: 'nestedBad[key]',
                input: true
              },
              {
                inputType: 'text',
                type: 'textfield',
                key: 'nest[true]',
                input: false
              }, {
                inputType: 'text',
                type: 'textfield',
                key: 'nested[something]'
              }
            ]
          }]
        };

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(temp)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var badCharacters = /^[^A-Za-z]+|[^A-Za-z0-9\-\.]+/g;
            formioUtils.eachComponent(res.body.components, function(component) {
              if (component.hasOwnProperty('key')) {
                assert.equal(badCharacters.test(component.key), false);
              }
            }, true);

            // Delete this temp form.
            request(app)
              .delete(hook.alter('url', '/form/' + res.body._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .expect('Content-Type', /text/)
              .expect(200)
              .end(function(err) {
                if (err) {
                  return done(err);
                }

                done();
              });
          });
      });

      it('An administrator should be able to Create a Form', function(done) {
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
            assert.notEqual(response.access, []);
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, tempForm.components);
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An administrator should not be able to Create a duplicate Form', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(tempForm)
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

      it('An administrator should be able to Read their Form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.forms.tempForm);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should be able to read the form', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.forms.tempForm);

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An administrator should be able to Update their Form', function(done) {
        var updatedForm = _.cloneDeep(template.forms.tempForm);
        updatedForm.title = 'Updated';

        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({title: updatedForm.title})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // Update the modified timestamp, before comparison.
            updatedForm.modified = response.modified;

            assert.deepEqual(response, updatedForm);

            // Save this form for later use.
            template.forms.tempForm = updatedForm;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should NOT be able to Update the Form', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.user1.token)
          .send({title: 'SHOULD NOT WORK!!!'})
          .expect(401)
          .end(done);
      });

      it('Should have the correct form title.', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.notEqual(response.title, 'SHOULD NOT WORK!!!');
            assert.equal(response.title, 'Updated');

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Read their Index of Forms', function(done) {
        request(app)
          .get(hook.alter('url', '/form?type=form', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var ids = function(item) { return item._id.toString(); };
            assert.equal(res.body.length, _.size(template.forms));
            assert.equal(_.difference(_.map(res.body, ids), _.map(template.forms, ids)).length, 0);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Read their Index of Resources', function(done) {
        request(app)
          .get(hook.alter('url', '/form?type=resource', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var ids = function(item) { return item._id.toString(); };
            assert.equal(res.body.length, _.size(template.resources));
            assert.equal(_.difference(_.map(res.body, ids), _.map(template.resources, ids)).length, 0);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Read all forms and resources', function(done) {
        request(app)
          .get(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var ids = function(item) { return item._id.toString(); };
            assert.equal(res.body.length, _.size(template.resources) + _.size(template.forms));
            assert.equal(_.difference(
              _.map(res.body, ids),
              _.map(template.forms, ids),
              _.map(template.resources, ids)
            ).length, 0);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should NOT be able to Read all forms and resources', function(done) {
        request(app)
          .get(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect(401)
          .end(done);
      });

      it('An administrator should be able to Read their Form using an alias', function(done) {
        request(app)
          .get(hook.alter('url', '/' + template.forms.tempForm.path, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.forms.tempForm);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An administrator should be able to Update their Form using an alias', function(done) {
        var updatedForm = _.cloneDeep(template.forms.tempForm);
        updatedForm.title = 'Updated2';

        request(app)
          .put(hook.alter('url', '/' + template.forms.tempForm.path, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({title: updatedForm.title})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            // Update the modified timestamp, before comparison.
            updatedForm.modified = response.modified;
            assert.deepEqual(response, updatedForm);

            // Save this form for later use.
            template.forms.tempForm = updatedForm;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should NOT be able to Update their Form using an alias', function(done) {
        request(app)
          .put(hook.alter('url', '/' + template.forms.tempForm.path, template))
          .set('x-jwt-token', template.users.user1.token)
          .send({title: 'SHOULD NOT WORK!!!'})
          .expect(401)
          .end(done);
      });

      it('Should not have updated the form', function(done) {
        request(app)
          .get(hook.alter('url', '/' + template.forms.tempForm.path, template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(res.body.title, 'Updated2');

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An administrator should not be able to Create a Form without a name', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({})
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

      it('An administrator should not be able to Create a Form without a path', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(_.omit(tempForm, 'path'))
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

      it('Cant access a Form without a valid Form ID', function(done) {
        request(app)
          .get(hook.alter('url', '/form/💩', template))
          .set('x-jwt-token', template.users.admin.token)
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

      it('Cant make a Form with invalid Form component keys', function(done) {
        async.each([
          '', 'è', 'é', 'ê', 'ë', 'ē', 'ė', 'ę', 'ÿ', 'û',
          'ü', 'ù', 'ú', 'ū', 'î', 'ï', 'í', 'ī', 'į', 'ì',
          'ô', 'ö', 'ò', 'ó', 'œ', 'ø', 'ō', 'õ', 'à', 'á',
          'â', 'ä', 'æ', 'ã', 'å', 'ā', 'ß', 'ś', 'š', 'ł',
          'ž', 'ź', 'ż', 'ç', 'ć', 'č', 'ñ', 'ń', ' '
        ], function(_bad, callback) {
          var temp = _.cloneDeep(tempForm);
          temp.name = chance.word({length: 15});
          temp.path = chance.word({length: 15});
          temp.components[0].key = _bad;

          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(temp)
            .expect(400)
            .end(function(err, res) {
              if (err) {
                return callback(err);
              }

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];
              callback();
            });
        }, function(err) {
          if (err) {
            return done(err);
          }

          done();
        });
      });

      it('Invalid Form component keys are filtered', function(done) {
        async.each([
          // Will be filtered
          'a ', '1a', '.a',

          // Disallowed characters
          '[a', ']a', '\'a', '!a', ',a', '/a', '?a', '<a', '>a', '~a', '`a', '@a', '#a', '$a', '%a', '^a', '&a',
          'a[', 'a]', 'a\'', 'a!', 'a,', 'a/', 'a?', 'a<', 'a>', 'a~', 'a`', 'a@', 'a#', 'a$', 'a%', 'a^', 'a&',
          '*a', '(a', ')a', '-a', '_a', '=a', '+a', '|a', '\\a', '{a', '}a', ';a', ':a',
          'a*', 'a(', 'a)',       'a_', 'a=', 'a+', 'a|', 'a\\', 'a{', 'a}', 'a;', 'a:'

        ], function(_bad, callback) {
          var temp = _.cloneDeep(tempForm);
          temp.name = chance.word({length: 15});
          temp.path = chance.word({length: 15});
          temp.components[0].key = _bad;

          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(temp)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return callback(err);
              }

              formioUtils.eachComponent(res.body.components, function(component) {
                if (component.hasOwnProperty('key')) {
                  assert.notEqual(component.key, _bad);
                }
              }, true);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];
              callback();
            });
        }, function(err) {
          if (err) {
            return done(err);
          }

          done();
        });
      });
    });

    describe('Permissions - Form Level - Anonymous User', function() {
      it('An Anonymous user should not be able to Create a Form for a User-Created Project', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .send(template.forms.tempForm)
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should be able to Read a Form for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.forms.tempForm);
            done();
          });
      });

      it('An Anonymous user should not be able to Update a Form for a User-Created Project', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .send({title: 'Updated'})
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read the Index of Forms for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/form', template))
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read the Index of Forms for a User-Created Project with the Form filter', function(done) {
        request(app)
          .get(hook.alter('url', '/form?type=form', template))
          .expect(401)
          .end(done);
      });

      it('An Anonymous user should not be able to Read a Form for a User-Created Project using it alias', function(done) {
        request(app)
          .get(hook.alter('url', '/' + template.forms.tempForm.path, template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.forms.tempForm);

            done();
          });
      });

      it('An Anonymous user should not be able to Update a Form for a User-Created Project using it alias', function(done) {
        request(app)
          .put(hook.alter('url', '/' + template.forms.tempForm.path, template))
          .send({title: 'Updated2'})
          .expect('Content-Type', /text\/plain/)
          .expect(401)
          .end(done);
      });
    });

    describe('Form Normalization', function() {
      it('Updating a Form with duplicate access permission types will condense the access permissions', function(done) {
        var roleAccess = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({access: [
            {
              type: 'read_all',
              roles: roleAccess
            },
            {
              type: 'read_all',
              roles: roleAccess
            }
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 2);
            assert.deepEqual(response.access[0].roles, roleAccess);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Updating a Form with duplicate access permission roles will condense the access permissions', function(done) {
        var roleAccess = [
          template.roles.authenticated._id.toString(),
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];
        var expected = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({access: [
            {
              type: 'read_all',
              roles: roleAccess
            }
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 2);
            assert.deepEqual(response.access[0].roles, expected);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // FA-892
      it('Updating a Form with a malformed access permission type will condense the access permissions', function(done) {
        var roleAccess = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({access: [
            {
              type: 'read_all',
              roles: roleAccess
            },
            null,
            {},
            undefined,
            'null',
            '{}',
            'undefined',
            {type: null},
            {type: {}},
            {type: undefined},
            {roles: null},
            {roles: {}},
            {roles: undefined}
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 2);
            assert.deepEqual(response.access[0].roles, roleAccess);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // FA-892
      it('Updating a Form with a malformed access permission role will condense the access permissions', function(done) {
        var roleAccess = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString(),
          null,
          {},
          undefined,
          'null',
          '{}',
          'undefined'
        ];
        var expected = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({access: [
            {
              type: 'read_all',
              roles: roleAccess
            }
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 2);
            assert.deepEqual(response.access[0].roles, expected);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Updating a Form with duplicate submissionAccess permission types will condense the submissionAccess permissions', function(done) {
        var updatedSubmissionAccess  = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];

        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({submissionAccess: [
            {
              type: 'read_all',
              roles: updatedSubmissionAccess
            },
            {
              type: 'read_all',
              roles: updatedSubmissionAccess
            }
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.submissionAccess[0].type, 'read_all');
            assert.equal(response.submissionAccess[0].roles.length, 2);
            assert.deepEqual(response.submissionAccess[0].roles, updatedSubmissionAccess);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Updating a Form with duplicate submissionAccess permission roles will condense the submissionAccess permissions', function(done) {
        var updatedSubmissionAccess  = [
          template.roles.authenticated._id.toString(),
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];
        var expected = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];

        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({submissionAccess: [
            {
              type: 'read_all',
              roles: updatedSubmissionAccess
            }
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.submissionAccess[0].type, 'read_all');
            assert.equal(response.submissionAccess[0].roles.length, 2);
            assert.deepEqual(response.submissionAccess[0].roles, expected);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // FA-892
      it('Updating a Form with a malformed submissionAccess permission type will condense the submissionAccess permissions', function(done) {
        var updatedSubmissionAccess  = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];

        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({submissionAccess: [
            {
              type: 'read_all',
              roles: updatedSubmissionAccess
            },
            null,
            {},
            undefined,
            'null',
            '{}',
            'undefined',
            {type: null},
            {type: {}},
            {type: undefined},
            {roles: null},
            {roles: {}},
            {roles: undefined}
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.submissionAccess.length, 1);
            assert.equal(response.submissionAccess[0].type, 'read_all');
            assert.equal(response.submissionAccess[0].roles.length, 2);
            assert.deepEqual(response.submissionAccess[0].roles, updatedSubmissionAccess);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // FA-892
      it('Updating a Form with a malformed submissionAccess permission role will condense the submissionAccess permissions', function(done) {
        var updatedSubmissionAccess  = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString(),
          null,
          {},
          undefined,
          'null',
          '{}',
          'undefined'
        ];
        var expected = [
          template.roles.authenticated._id.toString(),
          template.roles.anonymous._id.toString()
        ];

        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({submissionAccess: [
            {
              type: 'read_all',
              roles: updatedSubmissionAccess
            }
          ]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.submissionAccess[0].type, 'read_all');
            assert.equal(response.submissionAccess[0].roles.length, 2);
            assert.deepEqual(response.submissionAccess[0].roles, expected);

            // Save this form for later use.
            template.forms.tempForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Delete their Form', function(done) {
        request(app)
          .delete(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
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
      it('A deleted Form should remain in the database', function(done) {
        var formio = hook.alter('formio', app.formio);
        formio.resources.form.model.findOne({_id: template.forms.tempForm._id})
          .exec(function(err, form) {
            if (err) {
              return done(err);
            }
            if (!form) {
              return done('No Form w/ _id: ' + template.forms.tempForm._id + ' found, expected 1.');
            }

            form = form.toObject();
            assert.notEqual(form.deleted, null);
            done();
          });
      });

      it('An administrator should be able to Create a Register Form', function(done) {
        template.forms.userRegister2 = {
          title: 'User Register 2',
          name: 'userRegister2',
          path: 'user/register2',
          type: 'form',
          access: [
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]}
          ],
          submissionAccess: [
            {type: 'create_own', roles: [template.roles.anonymous._id.toString()]}
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
          .send(template.forms.userRegister2)
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
            assert.equal(response.title, template.forms.userRegister2.title);
            assert.equal(response.name, template.forms.userRegister2.name);
            assert.equal(response.path, template.forms.userRegister2.path);
            assert.equal(response.type, 'form');
            assert.equal(response.submissionAccess[0].type, 'create_own');
            assert.equal(response.submissionAccess[0].roles[0], template.roles.anonymous._id.toString());
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.components, template.forms.userRegister2.components);
            template.forms.userRegister2 = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A Project Owner should be able to Create a Login Form', function(done) {
        template.forms.userLogin2 = {
          title: 'User Login 2',
          name: 'userLogin2',
          path: 'user/login2',
          type: 'form',
          access: [
            {type: 'read_all', roles: [template.roles.anonymous._id.toString()]}
          ],
          submissionAccess: [
            {type: 'create_own', roles: [template.roles.anonymous._id.toString()]}
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
          .send(template.forms.userLogin2)
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
            assert.equal(response.title, template.forms.userLogin2.title);
            assert.equal(response.name, template.forms.userLogin2.name);
            assert.equal(response.path, template.forms.userLogin2.path);
            assert.equal(response.type, 'form');
            assert.equal(response.submissionAccess[0].type, 'create_own');
            assert.equal(response.submissionAccess[0].roles[0], template.roles.anonymous._id.toString());
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.components, template.forms.userLogin2.components);
            template.forms.userLogin2 = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Form Components Endpoint', function() {
      it('Bootstrap', function(done) {
        var testComponentForm = {
          title: 'Test Component Form',
          name: 'testComponentForm',
          path: 'temp/testcomponentform',
          type: 'form',
          access: [{
            type: 'read_all',
            roles: [
              template.roles.administrator._id.toString()
            ]
          }],
          submissionAccess: [],
          components: [
            {
              input: true,
              inputType: 'email',
              label: 'Email',
              key: 'email',
              protected: false,
              persistent: true,
              type: 'email'
            },
            {
              input: true,
              inputType: 'password',
              label: 'Password',
              key: 'password',
              protected: true,
              persistent: true,
              type: 'password'
            },
            {
              input: true,
              inputType: 'number',
              label: 'Number',
              key: 'number',
              protected: false,
              persistent: false,
              type: 'number',
              validate: {
                step: 23
              }
            }
          ]
        };
        // Create the test form
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(testComponentForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert(res.body.hasOwnProperty('_id'), 'The response should contain an `_id`.');

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];


            // Update the access rights to only let admins read_all
            request(app)
              .put(hook.alter('url', '/form/' + res.body._id , template))
              .set('x-jwt-token', template.users.admin.token)
              .send({access: [{
                type: 'read_all',
                roles: [template.roles.administrator._id.toString()]
              }]})
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if(err) {
                  return done(err);
                }

                var response = res.body;
                assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
                assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
                assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
                assert(response.hasOwnProperty('access'), 'The response should contain an the `access`.');
                assert.equal(response.title, testComponentForm.title);
                assert.equal(response.name, testComponentForm.name);
                assert.equal(response.path, testComponentForm.path);
                assert.equal(response.type, 'form');
                assert.notEqual(response.access, []);
                assert.equal(response.access.length, 1);
                assert.equal(response.access[0].type, 'read_all');
                assert.equal(response.access[0].roles.length, 1);
                assert.equal(response.access[0].roles[0], template.roles.administrator._id.toString());
                assert.deepEqual(response.submissionAccess, []);
                assert.deepEqual(response.components, testComponentForm.components);
                template.forms.testComponentForm = response;
                done();

              });
          });
      });

      it('An Anonymous user should not be able to Read their Form\'s components', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components', template))
          .expect(401)
          .end(done);
      });

      it('An Administrator should be able to Read their Form\'s components', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.forms.testComponentForm.components);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Administrator should be able to Read and filter their Form\'s components with a string', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?type=email', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1, 'Response should only return one component');
            assert.deepEqual(response[0], _.find(template.forms.testComponentForm.components, {type: 'email'}));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Administrator should be able to Read and filter their Form\'s components by existence', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?validate.step', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1, 'Response should only return one component');
            assert.deepEqual(response[0], _.find(template.forms.testComponentForm.components, {validate: {step: 23}}));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Administrator should be able to Read and filter their Form\'s components with a number', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?validate.step=23', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1, 'Response should only return one component');
            assert.deepEqual(response[0], _.find(template.forms.testComponentForm.components, {validate: {step: 23}}));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Administrator should be able to Read and filter their Form\'s components with the boolean `true`', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?protected=true', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1, 'Response should only return one component');
            assert.deepEqual(response[0], _.find(template.forms.testComponentForm.components, {protected: true}));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Administrator should be able to Read and filter their Form\'s components with the boolean `false`', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?protected=false', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 2, 'Response should only return two components');
            assert.deepEqual(response[0], _.find(template.forms.testComponentForm.components, {protected: false}));
            assert.deepEqual(response[1], _.findLast(template.forms.testComponentForm.components, {protected: false}));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Administrator should be able to Read and filter their Form\'s components with multiple criteria', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?protected=false&validate.step=23&type=number', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.length, 1, 'Response should only return one component');
            assert.deepEqual(response[0], _.find(template.forms.testComponentForm.components, {protected: false, type: 'number', validate: {step: 23}}));

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An Administrator should receive empty array when Reading their Form with filter that has no results', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?type=💩', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, [], 'Response should return empty array.');

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

    });

    describe('Form Validation', function() {
      // FA-566
      describe('Negative Min Length', function() {
        var form = _.cloneDeep(tempForm);
        form.title = 'validationform';
        form.name = 'validationform';
        form.path = 'validationform';
        form.components[0].validate.minLength = -1;

        it('Bootstrap', function(done) {
          // Create the test form
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(form)
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
              assert.equal(response.title, form.title);
              assert.equal(response.name, form.name);
              assert.equal(response.path, form.path);
              assert.equal(response.type, 'form');
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, form.components);

              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Negative Min Length validation wont crash the server on submission', function(done) {
          var submission = {
            data: {
              foo: 'bar'
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + form._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(submission)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.data, submission.data);
              done();
            });
        });

        it('Form cleanup', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
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

      // FA-566
      describe('Negative Max Length', function() {
        var form = _.cloneDeep(tempForm);
        form.title = 'validationform';
        form.name = 'validationform';
        form.path = 'validationform';
        form.components[0].validate.maxLength = -1;

        it('Bootstrap', function(done) {
          // Create the test form
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(form)
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
              assert.equal(response.title, form.title);
              assert.equal(response.name, form.name);
              assert.equal(response.path, form.path);
              assert.equal(response.type, 'form');
              assert.deepEqual(response.submissionAccess, []);
              assert.deepEqual(response.components, form.components);

              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Negative Max Length validation wont crash the server on submission', function(done) {
          var submission = {
            data: {
              foo: 'bar'
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + form._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(submission)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.data, submission.data);
              done();
            });
        });

        it('Form cleanup', function(done) {
          request(app)
            .delete(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
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
    });

    describe('Access Information', function() {
      it('Should be able to see the access for the forms and roles.', function(done) {
        request(app)
          .get(hook.alter('url', '/access', template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(Object.keys(res.body.roles).length, 3);
            assert(Object.keys(res.body.forms).length > 3);
            done();
          });
      });
    });
  });
};
