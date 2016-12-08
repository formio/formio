/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var chance = new (require('chance'))();
var formioUtils = require('formio-utils');
var async = require('async');
var docker = process.env.DOCKER;
var customer = process.env.CUSTOMER;

module.exports = function(app, template, hook) {
  var formio = hook.alter('formio', app.formio);
  var Helper = require('./helper')(app);
  var helper = null;

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

      // FOR-128
      describe('Duplicate form component keys', function() {
        var form = _.cloneDeep(tempForm);
        form.title = 'componenttest';
        form.name = 'componenttest';
        form.path = 'componenttest';
        form.components = [
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
            key: 'foo',
            label: 'foo',
            inputMask: '',
            inputType: 'text',
            input: true
          },
          {
            type: 'button',
            theme: 'primary',
            disableOnInvalid: false,
            action: 'submit',
            block: false,
            rightIcon: '',
            leftIcon: '',
            size: 'md',
            key: 'submit',
            tableView: false,
            label: 'Submit',
            input: true,
            tags: [],
            conditional: {
              show: '',
              when: null,
              eq: ''
            }
          }
        ];

        it('A form cannot be created with duplicate component api keys', function(done) {
          // Create the test form
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(form)
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var msg = _.get(response, 'errors.components.message');
              assert.equal(msg, 'Component keys must be unique: foo');

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('A form can be created with unique component api keys', function(done) {
          form.components = [
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
              placeholder: 'bar',
              key: 'bar',
              label: 'bar',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              type: 'button',
              theme: 'primary',
              disableOnInvalid: false,
              action: 'submit',
              block: false,
              rightIcon: '',
              leftIcon: '',
              size: 'md',
              key: 'submit',
              tableView: false,
              label: 'Submit',
              input: true,
              tags: [],
              conditional: {
                show: '',
                when: null,
                eq: ''
              }
            }
          ];

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

        it('A form cannot be updated with duplicate component api keys', function(done) {
          var components = [
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
              key: 'foo',
              label: 'foo',
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
              placeholder: 'bar',
              key: 'bar',
              label: 'bar',
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
              placeholder: 'bar',
              key: 'bar',
              label: 'bar',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              type: 'button',
              theme: 'primary',
              disableOnInvalid: false,
              action: 'submit',
              block: false,
              rightIcon: '',
              leftIcon: '',
              size: 'md',
              key: 'submit',
              tableView: false,
              label: 'Submit',
              input: true,
              tags: [],
              conditional: {
                show: '',
                when: null,
                eq: ''
              }
            }
          ];

          // Create the test form
          request(app)
            .put(hook.alter('url', '/form', template) + '/' + form._id)
            .set('x-jwt-token', template.users.admin.token)
            .send({
              components: components
            })
            .expect('Content-Type', /json/)
            .expect(500)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              var msg = _.get(response, 'errors.components.message');
              assert.equal(msg, 'Component keys must be unique: foo, bar');

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

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

      if (!docker && !customer)
      describe('Invalid Form paths', function() {
        var form;
        it('Bootstrap', function(done) {
          form = _.cloneDeep(tempForm);
          form.title = chance.word();
          form.name = chance.word();
          form.path = chance.word();

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
              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        // FOR-155
        it('None of the reserved form names should be allowed as form paths for new forms', function(done) {
          async.each(formio.config.reservedForms, function(path, callback) {
            var form = _.cloneDeep(tempForm);
            form.path = path;

            // Create the test form
            request(app)
              .post(hook.alter('url', '/form', template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /text/)
              .expect(400)
              .end(function(err, res) {
                if (err) {
                  return callback(err);
                }

                var response = res.text;
                assert.equal(response, 'Form path cannot contain one of the following names: ' + formio.config.reservedForms.join(', '));

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                callback();
              });
          }, function(err) {
            if (err) {
              return done(err);
            }

            return done();
          });
        });

        // FOR-156
        it('None of the reserved form names should be allowed as form paths for existing forms', function(done) {
          async.each(formio.config.reservedForms, function(path, callback) {
            // update the test form
            request(app)
              .put(hook.alter('url', '/form', template) + '/' + form._id)
              .set('x-jwt-token', template.users.admin.token)
              .send({
                path: path
              })
              .expect('Content-Type', /text/)
              .expect(400)
              .end(function(err, res) {
                if (err) {
                  return callback(err);
                }

                var response = res.text;
                assert.equal(response, 'Form path cannot contain one of the following names: ' + formio.config.reservedForms.join(', '));

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                callback();
              });
          }, function(err) {
            if (err) {
              return done(err);
            }

            return done();
          });
        });
      });

      // FOR-132 && FOR-182
      describe('Unique fields are case insensitive', function() {
        var testEmailForm;
        var email = chance.email().toLowerCase();

        before(function() {
          testEmailForm = {
            title: 'Test email Form',
            name: 'testEmailForm',
            path: 'temp/testemailform',
            type: 'form',
            access: [],
            submissionAccess: [{
              type: 'create_own',
              roles: [
                template.roles.anonymous._id.toString()
              ]
            }],
            components: [
              {
                input: true,
                tableView: true,
                inputType: 'email',
                label: 'Email',
                key: 'email',
                placeholder: '',
                prefix: '',
                suffix: '',
                defaultValue: '',
                protected: false,
                unique: true,
                persistent: true,
                kickbox: {
                  enabled: false
                },
                type: 'email',
                tags: [],
                conditional: {
                  show: '',
                  when: null,
                  eq: ''
                }
              }
            ]
          };
        });

        it('Bootstrap', function(done) {
          // Create the test form
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(testEmailForm)
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
              assert.equal(response.title, testEmailForm.title);
              assert.equal(response.name, testEmailForm.name);
              assert.equal(response.path, testEmailForm.path);
              assert.equal(response.type, 'form');
              assert.deepEqual(response.submissionAccess, testEmailForm.submissionAccess);
              assert.deepEqual(response.components, testEmailForm.components);

              testEmailForm = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        var sub;
        it('A unique submission can be made', function(done) {
          var submission = {
            data: {
              email: email
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testEmailForm._id + '/submission', template))
            .send(submission)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              sub = response;
              assert.deepEqual(response.data, submission.data);
              done();
            });
        });

        it('A duplicate submission can not be made', function(done) {
          var submission = {
            data: {
              email: email.toString().toUpperCase()
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testEmailForm._id + '/submission', template))
            .send(submission)
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              done();
            });
        });

        // FOR-182
        it('Unique field data is stored in its original submission state', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + testEmailForm._id + '/submission', template) + '/' + sub._id)
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.data.email, email);
              done();
            });
        });

        // FOR-182
        it('Unique field data regex is not triggered by similar submissions (before)', function(done) {
          var submission = {
            data: {
              email: email + '1'
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testEmailForm._id + '/submission', template))
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

        // FOR-182
        it('Unique field data regex is not triggered by similar submissions (after)', function(done) {
          var submission = {
            data: {
              email: '1' + email
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testEmailForm._id + '/submission', template))
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
            .delete(hook.alter('url', '/form/' + testEmailForm._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              testEmailForm = response;
              assert.deepEqual(response, {});
              done();
            });
        });
      });

      // FOR-136 && FOR-182
      describe('Unique fields work inside layout components', function() {
        var testUniqueField;
        var data = chance.word().toUpperCase();

        before(function() {
          testUniqueField = {
            title: 'nested uniques',
            display: 'form',
            type: 'form',
            name: 'nestedUniques',
            path: 'nesteduniques',
            access: [],
            submissionAccess: [{
              type: 'create_own',
              roles: [
                template.roles.anonymous._id.toString()
              ]
            }],
            components: [
              {
                input: true,
                tree: true,
                components: [{
                  input: true,
                  tableView: true,
                  inputType: 'text',
                  inputMask: '',
                  label: 'unique',
                  key: 'unique',
                  placeholder: '',
                  prefix: '',
                  suffix: '',
                  multiple: false,
                  defaultValue: '',
                  protected: false,
                  unique: true,
                  persistent: true,
                  validate: {
                    required: false,
                    minLength: '',
                    maxLength: '',
                    pattern: '',
                    custom: '',
                    customPrivate: false
                  },
                  conditional: {
                    show: '',
                    when: null,
                    eq: ''
                  },
                  type: 'textfield',
                  tags: []
                }],
                tableView: true,
                label: 'container',
                key: 'container1',
                protected: false,
                persistent: true,
                type: 'container',
                tags: [],
                conditional: {
                  show: '',
                  when: null,
                  eq: ''
                }
              }
            ]
          };
        });

        it('Bootstrap', function(done) {
          // Create the test form
          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(testUniqueField)
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
              assert.equal(response.title, testUniqueField.title);
              assert.equal(response.name, testUniqueField.name);
              assert.equal(response.path, testUniqueField.path);
              assert.equal(response.type, 'form');
              assert.deepEqual(response.submissionAccess, testUniqueField.submissionAccess);
              assert.deepEqual(response.components, testUniqueField.components);

              testUniqueField = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        var sub;
        it('A unique submission can be made', function(done) {
          var submission = {
            data: {
              container1: {
                unique: data
              }
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testUniqueField._id + '/submission', template))
            .send(submission)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              sub = response;
              assert.deepEqual(response.data, submission.data);
              done();
            });
        });

        it('A duplicate submission can not be made', function(done) {
          var submission = {
            data: {
              container1: {
                unique: data.toLowerCase()
              }
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testUniqueField._id + '/submission', template))
            .send(submission)
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              done();
            });
        });

        // FOR-182
        it('Unique field data is stored in its original submission state', function(done) {
          request(app)
            .get(hook.alter('url', '/form/' + testUniqueField._id + '/submission', template) + '/' + sub._id)
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.data.container1.unique, data);
              done();
            });
        });

        // FOR-182
        it('Unique field data regex is not triggered by similar submissions (before)', function(done) {
          var submission = {
            data: {
              container1: {
                unique: data + '1'
              }
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testUniqueField._id + '/submission', template))
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

        // FOR-182
        it('Unique field data regex is not triggered by similar submissions (after)', function(done) {
          var submission = {
            data: {
              container1: {
                unique: '1' + data
              }
            }
          };

          request(app)
            .post(hook.alter('url', '/form/' + testUniqueField._id + '/submission', template))
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
            .delete(hook.alter('url', '/form/' + testUniqueField._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              testUniqueField = response;
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

    describe('Form Settings', function() {
      it('Sets additional form settings', function(done) {
        var form = {
          title: 'Settings Form',
          name: 'settingsForm',
          path: 'settingsform',
          type: 'form',
          access: [],
          submissionAccess: [],
          components: [],
          settings: {
            one: 'true',
            two: ['foo', 'bar'],
            three: {
              foo: 'true',
              bar: 'true'
            }
          }
        };
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
            assert.deepEqual(response.settings, form.settings);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Form Merging', function() {
      var form = _.cloneDeep(tempForm);
      form.title = 'form-merge-a';
      form.name = 'form-merge-a';
      form.path = 'form-merge-a';

      describe('Bootstrap', function() {
        it('Create the form merging test form', function(done) {
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
              assert.deepEqual(response.components, form.components);

              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Flat form with components', function() {
        var componentsA = [
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
        ];
        var componentsB = [
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
            placeholder: 'bar',
            key: 'bar',
            label: 'bar',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ];
        var componentsC = [
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
            placeholder: 'baz',
            key: 'baz',
            label: 'baz',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ];
        var componentsD = [
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
            placeholder: 'bar',
            key: 'bar',
            label: 'bar',
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
            placeholder: 'baz',
            key: 'baz',
            label: 'baz',
            inputMask: '',
            inputType: 'text',
            input: true
          }
        ];

        var initialForm;
        it('Update test form', function(done) {
          // Set the initial form components.
          form.components = componentsA;

          request(app)
            .put(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(form)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.components, form.components);

              form = response;
              initialForm = _.cloneDeep(response);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Create the first form component modifications', function(done) {
          form.components = componentsB;

          request(app)
            .put(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(form)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.components, form.components);

              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Form components added to a stale form, will merge with the current stable version of the form', function(done) {
          initialForm.components = componentsC;

          request(app)
            .put(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(initialForm)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.components, componentsD);

              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });
      });

      describe('Single level nested components', function() {
        describe('Form with Panels', function() {
          var componentsA = [
            {
              key: 'foo',
              title: 'foo',
              input: false,
              type: 'panel',
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
                  placeholder: 'apple',
                  key: 'apple',
                  label: 'apple',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
            }
          ];
          var componentsB = [
            {
              key: 'foo',
              title: 'foo',
              input: false,
              type: 'panel',
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
                  placeholder: 'apple',
                  key: 'apple',
                  label: 'apple',
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
                  placeholder: 'orange',
                  key: 'orange',
                  label: 'orange',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
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
              placeholder: 'bar',
              key: 'bar',
              label: 'bar',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              key: 'test',
              title: 'test',
              input: false,
              type: 'panel',
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
                  placeholder: 'coffee',
                  key: 'coffee',
                  label: 'coffee',
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
                  placeholder: 'tea',
                  key: 'tea',
                  label: 'tea',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
            }
          ];
          var componentsC = [
            {
              key: 'foo',
              title: 'foo',
              input: false,
              type: 'panel',
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
                  placeholder: 'apple',
                  key: 'apple',
                  label: 'apple',
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
                  placeholder: 'grape',
                  key: 'grape',
                  label: 'grape',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
            },
            {
              key: 'baz',
              title: 'baz',
              input: false,
              type: 'panel',
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
                  placeholder: 'cat',
                  key: 'cat',
                  label: 'cat',
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
                  placeholder: 'dog',
                  key: 'dog',
                  label: 'dog',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
            }
          ];
          var componentsD = [
            {
              key: 'foo',
              title: 'foo',
              input: false,
              type: 'panel',
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
                  placeholder: 'apple',
                  key: 'apple',
                  label: 'apple',
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
                  placeholder: 'orange',
                  key: 'orange',
                  label: 'orange',
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
                  placeholder: 'grape',
                  key: 'grape',
                  label: 'grape',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
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
              placeholder: 'bar',
              key: 'bar',
              label: 'bar',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              key: 'test',
              title: 'test',
              input: false,
              type: 'panel',
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
                  placeholder: 'coffee',
                  key: 'coffee',
                  label: 'coffee',
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
                  placeholder: 'tea',
                  key: 'tea',
                  label: 'tea',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
            },
            {
              key: 'baz',
              title: 'baz',
              input: false,
              type: 'panel',
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
                  placeholder: 'cat',
                  key: 'cat',
                  label: 'cat',
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
                  placeholder: 'dog',
                  key: 'dog',
                  label: 'dog',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
            }
          ];

          var initialForm;
          it('Update test form', function(done) {
            // Set the initial form components.
            form.components = componentsA;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;
                initialForm = _.cloneDeep(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Create the first form component modifications', function(done) {
            form.components = componentsB;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Panel Form components will merge properly', function(done) {
            initialForm.components = componentsC;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(initialForm)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, componentsD);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Form with Columns', function() {
          var componentsA = [
            {
              input: false,
              key: 'columns1',
              tags: [],
              type: 'columns',
              columns: [
                {
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
                },
                {
                  components: []
                }
              ]
            }
          ];
          var componentsB = [
            {
              input: false,
              key: 'columns1',
              tags: [],
              type: 'columns',
              columns: [
                {
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
                      placeholder: 'bar',
                      key: 'bar',
                      label: 'bar',
                      inputMask: '',
                      inputType: 'text',
                      input: true
                    }
                  ]
                },
                {
                  components: []
                }
              ]
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
              placeholder: 'baz',
              key: 'baz',
              label: 'baz',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ];
          var componentsC = [
            {
              input: false,
              key: 'columns1',
              tags: [],
              type: 'columns',
              columns: [
                {
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
                },
                {
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
                      placeholder: 'testA',
                      key: 'testA',
                      label: 'testA',
                      inputMask: '',
                      inputType: 'text',
                      input: true
                    }
                  ]
                }
              ]
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
              placeholder: 'testB',
              key: 'testB',
              label: 'testB',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ];
          var componentsD = [
            {
              input: false,
              key: 'columns1',
              tags: [],
              type: 'columns',
              columns: [
                {
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
                      placeholder: 'bar',
                      key: 'bar',
                      label: 'bar',
                      inputMask: '',
                      inputType: 'text',
                      input: true
                    }
                  ]
                },
                {
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
                      placeholder: 'testA',
                      key: 'testA',
                      label: 'testA',
                      inputMask: '',
                      inputType: 'text',
                      input: true
                    }
                  ]
                }
              ]
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
              placeholder: 'baz',
              key: 'baz',
              label: 'baz',
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
              placeholder: 'testB',
              key: 'testB',
              label: 'testB',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ];

          var initialForm;
          it('Update test form', function(done) {
            // Set the initial form components.
            form.components = componentsA;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;
                initialForm = _.cloneDeep(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Create the first form component modifications', function(done) {
            form.components = componentsB;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Column Form components will merge properly', function(done) {
            initialForm.components = componentsC;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(initialForm)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, componentsD);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Form with Field Set', function() {
          var componentsA = [
            {
              input: false,
              key: 'fieldset',
              tags: [],
              type: 'fieldset',
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
            }
          ];
          var componentsB = [
            {
              input: false,
              key: 'fieldset',
              tags: [],
              type: 'fieldset',
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
                  placeholder: 'bar',
                  key: 'bar',
                  label: 'bar',
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
                  key: 'foo',
                  label: 'foo',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
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
              placeholder: 'baz',
              key: 'baz',
              label: 'baz',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ];
          var componentsC = [
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
              placeholder: 'testA',
              key: 'testA',
              label: 'testA',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              input: false,
              key: 'fieldset',
              tags: [],
              type: 'fieldset',
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
                  placeholder: 'testB',
                  key: 'testB',
                  label: 'testB',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
            }
          ];
          var componentsD = [
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
              placeholder: 'testA',
              key: 'testA',
              label: 'testA',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              input: false,
              key: 'fieldset',
              tags: [],
              type: 'fieldset',
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
                  placeholder: 'bar',
                  key: 'bar',
                  label: 'bar',
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
                  key: 'foo',
                  label: 'foo',
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
                  placeholder: 'testB',
                  key: 'testB',
                  label: 'testB',
                  inputMask: '',
                  inputType: 'text',
                  input: true
                }
              ]
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
              placeholder: 'baz',
              key: 'baz',
              label: 'baz',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ];

          var initialForm;
          it('Update test form', function(done) {
            // Set the initial form components.
            form.components = componentsA;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;
                initialForm = _.cloneDeep(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Create the first form component modifications', function(done) {
            form.components = componentsB;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Field Set Form components will merge properly', function(done) {
            initialForm.components = componentsC;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(initialForm)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, componentsD);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });

        describe('Form with Table', function() {
          var componentsA = [
            {
              input: false,
              key: 'table',
              tags: [],
              type: 'table',
              rows: [
                [
                  {components: []},
                  {components: []},
                  {components: []}
                ],
                [
                  {components: []},
                  {
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
                  },
                  {components: []}
                ],
                [
                  {components: []},
                  {components: []},
                  {components: []}
                ]
              ]
            }
          ];
          var componentsB = [
            {
              input: false,
              key: 'table',
              tags: [],
              type: 'table',
              rows: [
                [
                  {
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
                        placeholder: 'bar',
                        key: 'bar',
                        label: 'bar',
                        inputMask: '',
                        inputType: 'text',
                        input: true
                      }
                    ]
                  },
                  {components: []},
                  {components: []}
                ],
                [
                  {components: []},
                  {
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
                  },
                  {components: []}
                ],
                [
                  {components: []},
                  {components: []},
                  {components: []}
                ]
              ]
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
              placeholder: 'baz',
              key: 'baz',
              label: 'baz',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ];
          var componentsC = [
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
              placeholder: 'testA',
              key: 'testA',
              label: 'testA',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              input: false,
              key: 'table',
              tags: [],
              type: 'table',
              rows: [
                [
                  {components: []},
                  {components: []},
                  {components: []}
                ],
                [
                  {components: []},
                  {
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
                  },
                  {components: []}
                ],
                [
                  {components: []},
                  {components: []},
                  {
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
                        placeholder: 'testB',
                        key: 'testB',
                        label: 'testB',
                        inputMask: '',
                        inputType: 'text',
                        input: true
                      }
                    ]
                  }
                ]
              ]
            }
          ];
          var componentsD = [
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
              placeholder: 'testA',
              key: 'testA',
              label: 'testA',
              inputMask: '',
              inputType: 'text',
              input: true
            },
            {
              input: false,
              key: 'table',
              tags: [],
              type: 'table',
              rows: [
                [
                  {
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
                        placeholder: 'bar',
                        key: 'bar',
                        label: 'bar',
                        inputMask: '',
                        inputType: 'text',
                        input: true
                      }
                    ]
                  },
                  {components: []},
                  {components: []}
                ],
                [
                  {components: []},
                  {
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
                  },
                  {components: []}
                ],
                [
                  {components: []},
                  {components: []},
                  {
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
                        placeholder: 'testB',
                        key: 'testB',
                        label: 'testB',
                        inputMask: '',
                        inputType: 'text',
                        input: true
                      }
                    ]
                  }
                ]
              ]
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
              placeholder: 'baz',
              key: 'baz',
              label: 'baz',
              inputMask: '',
              inputType: 'text',
              input: true
            }
          ];

          var initialForm;
          it('Update test form', function(done) {
            // Set the initial form components.
            form.components = componentsA;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;
                initialForm = _.cloneDeep(response);

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Create the first form component modifications', function(done) {
            form.components = componentsB;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(form)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, form.components);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });

          it('Table Form components will merge properly', function(done) {
            initialForm.components = componentsC;

            request(app)
              .put(hook.alter('url', '/form/' + form._id, template))
              .set('x-jwt-token', template.users.admin.token)
              .send(initialForm)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }

                var response = res.body;
                assert.deepEqual(response.components, componentsD);

                form = response;

                // Store the JWT for future API calls.
                template.users.admin.token = res.headers['x-jwt-token'];

                done();
              });
          });
        });
      });
    });
  });
};
