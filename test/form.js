/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
var assert = require('assert');
var _ = require('lodash');
var chance = new (require('chance'))();
var formioUtils = require('formiojs/utils').default;
var async = require('async');
var docker = process.env.DOCKER;
var customer = process.env.CUSTOMER;

module.exports = function(app, template, hook) {
  var formio = hook.alter('formio', app.formio);
  var Helper = require('./helper')(app);

  var ignoreFields = ['config', 'plan'];

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
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.forms.tempForm, ignoreFields));

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
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.forms.tempForm, ignoreFields));

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('A user should be able to read the index of forms', function(done) {
        request(app)
          .get(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', template.project ? /text\/plain/ : /json/)
          .expect(template.project ? 401 : 200)
          .end(function(err, res) {
              if (err) {
                  return done(err);
              }

              if (!template.project) {
                var response = res.body;
                assert.equal(response.length, 9);
                template.users.user1.token = res.headers['x-jwt-token'];
              }
              done();
          });
      });

      it('A user should be able to read the index of forms without components', function(done) {
        request(app)
          .get(hook.alter('url', '/form?list=1', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect('Content-Type', template.project ? /text\/plain/ : /json/)
          .expect(template.project ? 401 : 200)
          .end(function(err, res) {
              if (err) {
                  return done(err);
              }

              if (!template.project) {
                var response = res.body;
                assert.equal(response.length, 9);
                response.forEach(form => {
                  assert(!form.hasOwnProperty('components'));
                });
                template.users.user1.token = res.headers['x-jwt-token'];
              }
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

            assert.deepEqual(_.omit(response, ignoreFields), _.omit(updatedForm, ignoreFields));

            // Save this form for later use.
            template.forms.tempForm = updatedForm;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An administrator should not be able to Patch their Form', function(done) {
        request(app)
          .patch(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send([{op: 'replace', path: 'title', value: 'Patched'}])
          // .expect('Content-Type', /json/)
          .expect(405)
          .end(done);
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

      it('A user should be able to Read all forms and resources', function(done) {
        request(app)
          .get(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect(template.project ? 401 : 200)
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
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.forms.tempForm, ignoreFields));

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
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(updatedForm, ignoreFields));

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

      it('An administrator should not be able to set the form id when creating a form', function(done) {
        const form = _.cloneDeep(tempForm);

        form._id = '000000000000000000000000';
        form.path = 'badid';
        form.name = 'badid';

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(form)
          // .expect(400)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            assert.notEqual(res.body._id, form._id);
            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An administrator should not be able to set the form id to null when creating a form', function(done) {
        const form = _.cloneDeep(tempForm);

        form._id = 'null';
        form.path = 'badidnull';
        form.name = 'badidnull';

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(form)
          // .expect(400)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            assert.notEqual(res.body._id, form._id);
            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('An administrator should not be able to set the form id to null when creating a form', function(done) {
        const form = _.cloneDeep(tempForm);

        form._id = null;
        form.path = 'badidnull1';
        form.name = 'badidnull1';

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(form)
          // .expect(400)
          .end(function(err, res) {
            if(err) {
              return done(err);
            }

            assert.notEqual(res.body._id, form._id);
            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Cant access a Form without a valid Form ID', function(done) {
        request(app)
          .get(hook.alter('url', '/form/2342342344234', template))
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
          '*a', '(a', ')a', '-a', '=a', '+a', '|a', '\\a', '{a', '}a', ';a', ':a', 'a*', 'a(', 'a)', 'a=', 'a+',
          'a|', 'a\\', 'a{', 'a}', 'a;', 'a:'

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
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.forms.tempForm, ignoreFields));
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

      it('An Anonymous user should be able to Read the Index of Forms for a User-Created Project', function(done) {
        request(app)
          .get(hook.alter('url', '/form', template))
          .expect(template.project ? 401 : 206)
          .end(done);
      });

      it('An Anonymous user should be able to Read the Index of Forms for a User-Created Project with the Form filter', function(done) {
        request(app)
          .get(hook.alter('url', '/form?type=form', template))
          .expect(template.project ? 401 : 206)
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
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.forms.tempForm, ignoreFields));

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

        it('Delete Anonymous role from Read Form Definition', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            ...tempForm,
            access: [{type: 'read_all', roles: [template.roles.authenticated._id.toString(), template.roles.administrator._id.toString()]}]
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });

      it('An Anonymous user should not be able to Read a Form for a User-Created Project after deleting Anonymous role from Read Form Definition', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .expect(401)
          .end(done);
      });

      it('Add Field Match Based Access for not Anonymous users', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            ...tempForm,
            fieldMatchAccess: {
              read: [{
                  formFieldPath:"data.textField",
                  valueType:"string",
                  value:"test1",
                  operator:"$eq",
                  roles: [template.roles.authenticated._id.toString()]
              }]
            }
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });

      it('An Anonymous user should not be able to Read a Form for a User-Created Project after deleting Anonymous role from Read Form Definition', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .expect(401)
          .end(done);
      });

      it('Add Field Match Based Access for Anonymous users', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            ...tempForm,
            fieldMatchAccess: {
              read: [{
                  formFieldPath:"data.textField",
                  valueType:"string",
                  value:"test1",
                  operator:"$eq",
                  roles: [template.roles.anonymous._id.toString()]
                }]
              }
            })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
             var response = res.body;
            template.forms.tempForm = response;
            done();
          });
      });

      it('An Anonymous user should not be able to Read a Form with Match Based Access for Anonymous users', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.tempForm._id, template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var response = res.body;
            assert.deepEqual(_.omit(response, ignoreFields), _.omit(template.forms.tempForm, ignoreFields));
            done();
          });
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
            assert.equal(response.access[0].roles.length, 1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
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
            assert.equal(response.access[0].roles.length, 1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.deepEqual(response.components, template.forms.userLogin2.components);
            template.forms.userLogin2 = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('Form Settings', function() {
      it('Should be able to create a form with the type=form', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: chance.word(),
            name: chance.word(),
            path: chance.word(),
            type: 'form',
            access: [],
            submissionAccess: [],
            components: []
          })
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            new Helper(template.users.admin, template, hook)
              .deleteForm(res.body)
              .execute(done);
          });
      });

      it('Should be able to create a form with the type=resource', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: chance.word(),
            name: chance.word(),
            path: chance.word(),
            type: 'resource',
            access: [],
            submissionAccess: [],
            components: []
          })
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            new Helper(template.users.admin, template, hook)
              .deleteForm(res.body)
              .execute(done);
          });
      });

      it('Should not be able to create a form with the type=resource', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: chance.word(),
            name: chance.word(),
            path: chance.word(),
            type: '',
            access: [],
            submissionAccess: [],
            components: []
          })
          .expect(400)
          .end(done);
      });

      it('Should default to type=form when not supplied', function(done) {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: chance.word(),
            name: chance.word(),
            path: chance.word(),
            access: [],
            submissionAccess: [],
            components: []
          })
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.type, 'form');
            new Helper(template.users.admin, template, hook)
              .deleteForm(res.body)
              .execute(done);
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
          .get(hook.alter('url', '/form/' + template.forms.testComponentForm._id + '/components?type=2342342344234', template))
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

        it("Negative Min Length validation won't crash the server on submission", function(done) {
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

        it("Negative Max Length validation will correctly reject submission", function(done) {
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
            .expect(400)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.name, 'ValidationError');
              assert.equal(response.details.length, 1);
              assert.equal(response.details[0].message, 'foo must have no more than -1 characters.');
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

      // FOR-272
      describe('Min value', function() {
        var form = _.cloneDeep(tempForm);
        form.title = chance.word();
        form.name = chance.word();
        form.path = chance.word();
        form.components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "number",
            "label": "test",
            "key": "test",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "min": 0,
              "max": "",
              "step": "any",
              "integer": "",
              "multiple": "",
              "custom": ""
            },
            "type": "number",
            "tags": [],
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          }, {
            "input": true,
            "label": "Submit",
            "tableView": false,
            "key": "submit",
            "size": "md",
            "leftIcon": "",
            "rightIcon": "",
            "block": false,
            "action": "submit",
            "disableOnInvalid": false,
            "theme": "primary",
            "type": "button"
          }
        ];

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
              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Min value 0 will correctly stop submissions with a negative value', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + form._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({data: {test: -1}})
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.name, 'ValidationError');
              assert.equal(response.details.length, 1);
              assert.equal(response.details[0].message, 'test cannot be less than 0.');
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

      // FOR-290
      describe('Number Component - Decimal values will not be truncated when step=any', function() {
        var form = _.cloneDeep(tempForm);
        form.title = chance.word();
        form.name = chance.word();
        form.path = chance.word();
        form.components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "number",
            "label": "test",
            "key": "test",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "min": "",
              "max": "",
              "step": "any",
              "integer": "",
              "multiple": "",
              "custom": ""
            },
            "type": "number",
            "tags": [],
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          }
        ];

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
              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Decimal values will correctly persist without validation issues with the default step', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + form._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                test: 1.23
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.data, {test: 1.23});
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

      // FOR-278
      describe('Adding a min value to an existing component will persist the changes', function() {
        var for278 = require('./fixtures/forms/for278');
        var form = _.cloneDeep(tempForm);
        form.title = chance.word();
        form.name = chance.word();
        form.path = chance.word();
        form.components = for278.initial;

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
              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Changing a number components min value', function(done) {
          form.components = for278.update;

          request(app)
            .put(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send(_.omit(form, 'modified'))
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

        it('Min value changes will persist for 0', function(done) {
          form.components = for278.update;

          request(app)
            .get(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(response.components.length, 1);
              assert(response.components[0].validate.min === for278.update[0].validate.min);
              form = response;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Test invalid submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + form._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(for278.fail)
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.equal(_.get(response, 'name'), 'ValidationError');
              assert.equal(response.details.length, 1);
              assert.equal(_.get(response, 'details[0].message'), 'number cannot be less than 0.');

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              done();
            });
        });

        it('Test valid submission', function(done) {
          request(app)
            .post(hook.alter('url', '/form/' + form._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(for278.pass)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              assert.deepEqual(response.data, for278.pass.data);

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

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
            .expect(400)
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

        it('A duplicate submission cannot be made', function(done) {
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
              email: email + 'a'
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
              email: 'a' + email
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

        it('A duplicate submission cannot be made', function(done) {
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

      // FOR-272
      describe('Old layout components without API keys, still submit data for all child components', function() {
        var form = _.cloneDeep(tempForm);
        form.title = chance.word();
        form.name = chance.word();
        form.path = chance.word();
        form.components = require('./fixtures/forms/for272');

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

        it('Child components will be validated and contain data', function(done) {
          var submission = {
            data: {
              foo: '1',
              bar: '2'
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

      // FOR-255
      describe('Custom validation', function() {
        var templates = require('./fixtures/forms/customValidation');
        var form = _.cloneDeep(tempForm);
        form.title = 'customvalidation';
        form.name = 'customvalidation';
        form.path = 'customvalidation';
        form.components = [];

        var updatePrimary = function(done) {
          request(app)
            .put(hook.alter('url', '/form/' + form._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({components: form.components})
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              var response = res.body;
              form = response;
              done();
            });
        };
        var attemptSubmission = function(submission, done) {
          request(app)
            .post(hook.alter('url', '/form/' + form._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(submission)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                var error = res.text;

                try {
                  error = JSON.parse(error);
                }
                catch (e) {
                  error = res.text;
                }

                return done(error);
              }

              var response = res.body;
              done(null, response);
            });
        };
        var getForm = (token, done) => {
          if (typeof token === 'function') {
            done = token;
            token = undefined;
          }

          if (!token) {
            return request(app)
              .get(hook.alter('url', `/form/${form._id}`, template))
              .expect('Content-Type', /json/)
              .expect(200)
              .end(done);
          }

          request(app)
            .get(hook.alter('url', `/form/${form._id}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(done);
        };

        describe('Bootstrap custom validation form', function() {
          it('Create the primary form', function(done) {
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
                done();
              });
          });
        });

        describe('Text component validation (old)', function() {
          before(function(done) {
            form.components = templates.text.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.text.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.text.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.text.old.pass.data);
              return done();
            });
          });
        });

        describe('Text component validation (new)', function() {
          before(function(done) {
            form.components = templates.text.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.text.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.text.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.text.new.pass.data);
              return done();
            });
          });
        });

        describe('Number component validation (old)', function() {
          before(function(done) {
            form.components = templates.number.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.number.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.number.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.number.old.pass.data);
              return done();
            });
          });
        });

        describe('Number component validation (new)', function() {
          before(function(done) {
            form.components = templates.number.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.number.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.number.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.number.new.pass.data);
              return done();
            });
          });
        });

        describe('Password component validation (old)', function() {
          before(function(done) {
            form.components = templates.password.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.password.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.password.old.pass, function(err, result) {
              // Special comparison, because passwords are not returned.
              assert.deepEqual(result.data, {trigger: 'true'});
              return done();
            });
          });
        });

        describe('Password component validation (new)', function() {
          before(function(done) {
            form.components = templates.password.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.password.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.password.new.pass, function(err, result) {
              // Special comparison, because passwords are not returned.
              assert.deepEqual(result.data, {trigger: 'true'});
              return done();
            });
          });
        });

        describe('Text Area component validation (old)', function() {
          before(function(done) {
            form.components = templates.textarea.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.textarea.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.textarea.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.textarea.old.pass.data);
              return done();
            });
          });
        });

        describe('Text Area component validation (new)', function() {
          before(function(done) {
            form.components = templates.textarea.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.textarea.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.textarea.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.textarea.new.pass.data);
              return done();
            });
          });
        });

        describe('Select Boxes component validation (old)', function() {
          before(function(done) {
            form.components = templates.selectboxes.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.selectboxes.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.selectboxes.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.selectboxes.old.pass.data);
              return done();
            });
          });
        });

        describe('Select Boxes component validation (new)', function() {
          before(function(done) {
            form.components = templates.selectboxes.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.selectboxes.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.selectboxes.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.selectboxes.new.pass.data);
              return done();
            });
          });
        });

        describe('Select component validation (old)', function() {
          before(function(done) {
            form.components = templates.select.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.select.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.select.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.select.old.pass.data);
              return done();
            });
          });
        });

        describe('Select component validation (new)', function() {
          before(function(done) {
            form.components = templates.select.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.select.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.select.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.select.new.pass.data);
              return done();
            });
          });
        });

        describe('Radio component validation (old)', function() {
          before(function(done) {
            form.components = templates.radio.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.radio.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.radio.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.radio.old.pass.data);
              return done();
            });
          });
        });

        describe('Radio component validation (new)', function() {
          before(function(done) {
            form.components = templates.radio.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.radio.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.radio.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.radio.new.pass.data);
              return done();
            });
          });
        });

        describe('Email component validation (old)', function() {
          before(function(done) {
            form.components = templates.email.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.email.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.email.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.email.old.pass.data);
              return done();
            });
          });
        });

        describe('Email component validation (new)', function() {
          before(function(done) {
            form.components = templates.email.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.email.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.email.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.email.new.pass.data);
              return done();
            });
          });
        });

        describe('Date Time component validation (old)', function() {
          before(function(done) {
            form.components = templates.datetime.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.datetime.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.datetime.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.datetime.old.pass.data);
              return done();
            });
          });
        });

        describe('Date Time component validation (new)', function() {
          before(function(done) {
            form.components = templates.datetime.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.datetime.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.datetime.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.datetime.new.pass.data);
              return done();
            });
          });
        });

        describe('Day component validation (old)', function() {
          before(function(done) {
            form.components = templates.day.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.day.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.day.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.day.old.pass.data);
              return done();
            });
          });
        });

        describe('Day component validation (new)', function() {
          before(function(done) {
            form.components = templates.day.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.day.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.day.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.day.new.pass.data);
              return done();
            });
          });
        });

        describe('Currency component validation (old)', function() {
          before(function(done) {
            form.components = templates.currency.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.currency.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.currency.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.currency.old.pass.data);
              return done();
            });
          });
        });

        describe('Currency component validation (new)', function() {
          before(function(done) {
            form.components = templates.currency.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.currency.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.currency.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.currency.new.pass.data);
              return done();
            });
          });
        });

        describe('Survey component validation (old)', function() {
          before(function(done) {
            form.components = templates.survey.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.survey.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.survey.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.survey.old.pass.data);
              return done();
            });
          });
        });

        describe('Survey component validation (new)', function() {
          before(function(done) {
            form.components = templates.survey.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.survey.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.survey.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.survey.new.pass.data);
              return done();
            });
          });
        });

        describe('Multiple errors will return at the same time', function() {
          before(function(done) {
            form.components = templates.multipleErrors.text.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.multipleErrors.text.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 2);
              assert.equal(err.details[0].path, 'foo');
              assert.equal(err.details[0].context.validator, 'custom');
              assert.equal(err.details[1].path, 'bar');
              assert.equal(err.details[1].context.validator, 'custom');
              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.multipleErrors.text.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.multipleErrors.text.new.pass.data);
              return done();
            });
          });
        });

        describe('Datagrids will correctly namespace row data for validation', function() {
          before(function(done) {
            form.components = templates.rowData.datagrid.new.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.rowData.datagrid.new.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.deepEqual(err.details[0].path, ['mydg', 0, 'foo']);
              assert.equal(err.details[0].context.validator, 'custom');
              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.rowData.datagrid.new.pass, function(err, result) {
              assert.deepEqual(result.data, templates.rowData.datagrid.new.pass.data);
              return done();
            });
          });
        });

        // FOR-276
        describe('Value replacement will continue to work', function() {
          before(function(done) {
            form.components = templates.valueReplace.text.old.components;
            updatePrimary(done);
          });

          it('Test invalid submission', function(done) {
            attemptSubmission(templates.valueReplace.text.old.fail, function(err) {
              assert.equal(err.name, 'ValidationError');
              assert(err.details instanceof Array);
              assert.equal(err.details.length, 1);
              assert.deepEqual(err.details[0].path, ['foo']);
              assert.equal(err.details[0].context.validator, 'custom');

              return done();
            });
          });

          it('Test valid submission', function(done) {
            attemptSubmission(templates.valueReplace.text.old.pass, function(err, result) {
              assert.deepEqual(result.data, templates.valueReplace.text.old.pass.data);
              return done();
            });
          });
        });

        // FOR-470
        describe('Custom private validations are hidden from users', function() {
          describe('root level components', function() {
            before(function(done) {
              form.components = templates.customPrivate.root.components;
              updatePrimary(done);
            });

            it('Admins should see the custom private validations for a component', function(done) {
              getForm(true, (err, res) => {
                if (err) {
                  return done(err);
                }

                let response = res.body;
                assert(response.hasOwnProperty('components'));
                assert.equal(response.components.length, 1);
                let component = response.components[0];
                assert.deepEqual(component.validate, templates.customPrivate.root.admin.pass);
                return done();
              });
            });

            it('Users should not see the custom private validations for a component', function(done) {
              getForm((err, res) => {
                if (err) {
                  return done(err);
                }

                let response = res.body;
                assert(response.hasOwnProperty('components'));
                assert.equal(response.components.length, 1);
                let component = response.components[0];
                assert.deepEqual(component.validate, templates.customPrivate.root.user.pass);
                return done();
              });
            });
          });

          describe('nested components', function() {
            before(function(done) {
              form.components = templates.customPrivate.nested.components;
              updatePrimary(done);
            });

            it('Admins should see the custom private validations for a component', function(done) {
              getForm(true, (err, res) => {
                if (err) {
                  return done(err);
                }

                let response = res.body;
                assert(response.hasOwnProperty('components'));
                assert.equal(response.components.length, 1);
                assert(response.components[0].hasOwnProperty('components'));
                assert.equal(response.components[0].components.length, 1);
                let component = response.components[0].components[0];
                assert.deepEqual(component.validate, templates.customPrivate.nested.admin.pass);
                return done();
              });
            });

            it('Users should not see the custom private validations for a component', function(done) {
              getForm((err, res) => {
                if (err) {
                  return done(err);
                }

                let response = res.body;
                assert(response.hasOwnProperty('components'));
                assert.equal(response.components.length, 1);
                assert(response.components[0].hasOwnProperty('components'));
                assert.equal(response.components[0].components.length, 1);
                let component = response.components[0].components[0];
                assert.deepEqual(component.validate, templates.customPrivate.nested.user.pass);
                return done();
              });
            });
          });
        });
      });
    });

    describe('Access Information', function() {
      it('Authenticated users have appropriate form/role access visibility', function(done) {
        request(app)
          .get(hook.alter('url', '/access', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(Object.keys(res.body.roles).length, 3);
            assert.notEqual(res.body.forms.testComponentForm, undefined);
            done();
          });
      });

      it('Anonymous users have appropriate form/role access visibility', function(done) {
        request(app)
          .get(hook.alter('url', '/access', template))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            // console.log(JSON.stringify(res.body, null, 4));
            console.log('process.env.FILTER_ACCESS', process.env.FILTER_ACCESS);

            let filter = true;
            let projectFilter = false;

            try {
              filter = require(process.cwd() + '/config').filterAccess;
              projectFilter = true;
            } catch (err) {
              console.log(err);
            }

            console.log('filter', filter);
            console.log('projectFilter', projectFilter);

            if (filter && projectFilter) {
              assert.equal(Object.keys(res.body.forms).length, 0);
            }
            else {
              assert.notEqual(Object.keys(res.body.forms).length, 0);
            }
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

    describe('Form MachineNames', function() {
      var helper;
      before(function() {
        helper = new Helper(template.users.admin, template)
      });

      it('Forms expose their machineNames through the api', function(done) {
        var name = chance.word();
        helper
          .form({name: name})
          .execute(function(err, results) {
            if (err) {
              return done(err);
            }

            var form = results.getForm(name);
            assert(form.hasOwnProperty('machineName'));
            done();
          });
      });

      it('A user can modify their form machineNames', function(done) {
        var name = chance.word();
        var newMachineName = chance.word();

        helper
          .form({name: name})
          .execute(function(err, results) {
            if (err) {
              return done(err);
            }

            var form = results.getForm(name);
            form.machineName = newMachineName;

            helper
              .form(form)
              .execute(function(err, results) {
                if (err) {
                  return done(err);
                }

                var response = results.getForm(name);
                assert(response.hasOwnProperty('machineName'));
                assert.equal(response.machineName, newMachineName);
                done();
              });
          });
      });
    });

    describe('Reference Components', function() {
      var resourceForm = {
        title: chance.word(),
        name: chance.word(),
        path: chance.word(),
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
            type: 'textfield',
            label: 'First Name',
            key: 'firstName',
            persistent: true,
            protected: false
          },
          {
            input: true,
            type: 'textfield',
            label: 'Last Name',
            key: 'lastName',
            persistent: true,
            protected: false
          }
        ]
      };
      it('Should create a new resource', (done) => {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(resourceForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            resourceForm = res.body;
            done();
          });
      });

      var resources = [];
      it('Should create a few resources', (done) => {
        resources = [
          {data: {
            firstName: 'Joe',
            lastName: 'Smith',
            email: chance.email()
          }},
          {data: {
            firstName: 'Joe',
            lastName: 'Thompson',
            email: chance.email()
          }},
          {data: {
            firstName: 'Sally',
            lastName: 'Smith',
            email: chance.email()
          }},
          {data: {
            firstName: 'Susie',
            lastName: 'Johnston',
            email: chance.email()
          }},
          {data: {
            firstName: 'Zack',
            lastName: 'Murray',
            email: chance.email()
          }}
        ];
        async.eachOf(resources, (resource, index, next) => {
          request(app)
            .post(hook.alter('url', '/form/' + resourceForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(resource)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return next(err);
              }
              resources[index] = res.body;
              next();
            });
        }, done);
      });

      var referenceForm = null;
      it('Should create a new form with reference component', function(done) {
        referenceForm = {
          title: chance.word(),
          name: chance.word(),
          path: chance.word(),
          components: [{
            "input": true,
            "tableView": true,
            "reference": true,
            "label": "User",
            "key": "user",
            "placeholder": "",
            "resource": resourceForm._id,
            "project": "",
            "defaultValue": "",
            "template": "<span>{{ item.data }}</span>",
            "selectFields": "",
            "searchFields": "",
            "multiple": false,
            "protected": false,
            "persistent": true,
            "clearOnHide": true,
            "validate": {
              "required": false
            },
            "defaultPermission": "",
            "type": "resource",
            "tags": [

            ],
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          }]
        };
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(referenceForm)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            referenceForm = res.body;
            done();
          });
      });

      var references = [];
      it('Should create a new submission in that form.', (done) => {
        async.eachOfSeries(resources, (resource, index, next) => {
          request(app)
            .post(hook.alter('url', '/form/' + referenceForm._id + '/submission', template))
            .set('x-jwt-token', template.users.admin.token)
            .send({
              data: {
                user: resource
              }
            })
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return next(err);
              }
              references[index] = res.body;
              assert.deepEqual(references[index].data.user.data, resource.data);
              next();
            });
        }, done);
      });

      it('Should be able to filter the list of references', (done) => {
        let url = '/form/' + referenceForm._id + '/submission';
        url += '?data.user.data.firstName=Joe';
        request(app)
          .get(hook.alter('url', url, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(res.body.length, 2);
            _.each(res.body, (item, index) => {
              assert.equal(item.data.user.data.firstName, 'Joe');
            });
            done();
          });
      });

      it('Should be able to filter and sort the list of references', (done) => {
        let url = '/form/' + referenceForm._id + '/submission';
        url += '?data.user.data.firstName=Joe&sort=data.user.data.lastName';
        request(app)
          .get(hook.alter('url', url, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(res.body.length, 2);
            _.each(res.body, (item, index) => {
              assert.equal(item.data.user.data.firstName, 'Joe');
            });
            assert.equal(res.body[0].data.user.data.lastName, 'Smith');
            assert.equal(res.body[1].data.user.data.lastName, 'Thompson');
            done();
          });
      });

      it('Should be able to filter and descend sort the list of references', (done) => {
        let url = '/form/' + referenceForm._id + '/submission';
        url += '?data.user.data.firstName=Joe&sort=-data.user.data.lastName';
        request(app)
          .get(hook.alter('url', url, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(res.body.length, 2);
            _.each(res.body, (item, index) => {
              assert(item.data.user.data.hasOwnProperty('email'), 'Must contain email');
              assert.equal(item.data.user.data.firstName, 'Joe');
            });
            assert.equal(res.body[0].data.user.data.lastName, 'Thompson');
            assert.equal(res.body[1].data.user.data.lastName, 'Smith');
            done();
          });
      });

      it('Should be able to filter and sort and pick certain fields of the list of references', (done) => {
        let url = '/form/' + referenceForm._id + '/submission';
        url += '?data.user.data.firstName=Joe&sort=data.user.data.lastName&select=data.user.data.firstName,data.user.data.lastName';
        request(app)
          .get(hook.alter('url', url, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(res.body.length, 2);
            _.each(res.body, (item, index) => {
              assert(!item.data.user.data.hasOwnProperty('email'), 'Must not contain email');
              assert.equal(item.data.user.data.firstName, 'Joe');
            });
            assert.equal(res.body[0].data.user.data.lastName, 'Smith');
            assert.equal(res.body[1].data.user.data.lastName, 'Thompson');
            done();
          });
      });

      it('Should be able to load the full data when a GET routine is retrieved.', (done) => {
        request(app)
          .get(hook.alter('url', '/form/' + referenceForm._id + '/submission/' + references[0]._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            Helper.assert.propertiesEqual(res.body.data.user, resources[0]);
            Helper.assert.propertiesEqual(references[0].data.user, resources[0]);
            done();
          });
      });

      it('Should be able to alter some of the resources', (done) => {
        async.eachOf(resources, (resource, index, next) => {
          if (index % 2 === 0) {
            request(app)
              .put(hook.alter('url', '/form/' + resourceForm._id + '/submission/' + resource._id, template))
              .send({
                data: {
                  email: chance.email()
                }
              })
              .set('x-jwt-token', template.users.admin.token)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return next(err);
                }
                resources[index] = res.body;
                next();
              });
          }
          else {
            next();
          }
        }, done);
      });

      it('Should be able to refer to the correct resource references', (done) => {
        async.eachOf(references, (reference, index, next) => {
          request(app)
            .get(hook.alter('url', '/form/' + referenceForm._id + '/submission/' + reference._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return next(err);
              }
              Helper.assert.propertiesEqual(res.body.data.user, resources[index]);
              next();
            });
        }, done);
      });

      it('Should pull in the references even with index queries.', (done) => {
        request(app)
          .get(hook.alter('url', '/form/' + referenceForm._id + '/submission', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            _.each(res.body, (item, index) => {
              let reference = _.find(references, {_id: item._id});
              let resource = _.find(resources, {_id: item.data.user._id});
              assert(!!reference, 'No reference found.');
              Helper.assert.propertiesEqual(item.data.user, resource);
            });
            done();
          });
      });
    });

    describe('Form with checkboxes grouped as radio', () => {
      let formId;
      it('Create form with checkboxes grouped as radio', (done) => {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            "title":"test1",
            "display":"form",
            "type":"form",
            "components":[
              {
                "label": "One",
                "inputType": "radio",
                "tableView": false,
                "defaultValue": false,
                "key": "checkbox",
                "type": "checkbox",
                "name": "check",
                "value": "one",
                "input": true
            },
            {
                "label": "Two",
                "inputType": "radio",
                "tableView": false,
                "defaultValue": false,
                "key": "checkbox1",
                "type": "checkbox",
                "name": "check",
                "value": "two",
                "input": true
            },
            {
                "label": "Three",
                "inputType": "radio",
                "tableView": false,
                "defaultValue": false,
                "key": "checkbox2",
                "type": "checkbox",
                "name": "check",
                "value": "three",
                "input": true
            },
            {
              "type":"button",
              "label":"Submit",
              "key":"submit",
              "disableOnInvalid":true,
              "input":true,
              "tableView":false
              }
            ],
            "access":[],
            "submissionAccess":[],
            "controller":"",
            "properties":{},
            "settings":{},
            "builder":false,
            "name":"test1",
            "path":"test1"
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            formId = res.body._id;
            done()
          })
      });

      it('Submit form', (done) => {
        request(app)
        .post(hook.alter('url', '/form/' + formId + '/submission', template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          "data": {
              "submit": true,
              "check": "two"
          },
          "state": "submitted"
      })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done()
        })
      });

      it('Checkboxes data grouped as radio', (done) => {
        request(app)
          .get(hook.alter('url', '/form/' + formId + '/export', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            assert.equal(_.isEqual(res.body[0].data, { check: 'two' }), true)
            done()
          })
      });
    });
  });
};
