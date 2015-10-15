/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var Q = require('q');
var util = require('../src/util/util');

module.exports = function(app, template, hook) {
  describe('OAuth', function() {
    var oauthSettings;

    var TEST_AUTH_CODE_1 = 'TESTAUTHCODE1';
    var TEST_ACCESS_TOKEN_1 = 'TESTACCESSTOKEN1';
    var TEST_REDIRECT_URI_1 = 'http://client1.com';
    var TEST_USER_1 = {
      id: 23,
      email: 'user@test1.com'
    };

    var TEST_AUTH_CODE_2 = 'TESTAUTHCODE2';
    var TEST_ACCESS_TOKEN_2 = 'TESTACCESSTOKEN2';
    var TEST_REDIRECT_URI_2 = 'http://client2.com';
    var TEST_USER_2 = {
      id: 42,
      email: 'user@test2.com'
    };

    // Create a dummy oauth provider
    app.formio.oauth.providers.test1 = {
      name: 'test1',
      title: 'Test1',
      authURI: 'http://test1.com/oauth/authorize',
      scope: 'email',
      display: 'popup',
      autofillFields: [{
        title: 'Email',
        name: 'email'
      }],
      getToken: function(req, code, state, redirectURI, next) {
        assert.equal(code, TEST_AUTH_CODE_1, 'OAuth Action should request access token with expected test code.');
        assert.equal(redirectURI, TEST_REDIRECT_URI_1, 'OAuth Action should request access token with expected redirect uri.');
        return new Q(TEST_ACCESS_TOKEN_1).nodeify(next);
      },
      getUser: function(accessToken, next) {
        assert.equal(accessToken, TEST_ACCESS_TOKEN_1,
          'OAuth Action should request user info with expected test access token.');
        return new Q(TEST_USER_1).nodeify(next);
      },
      getUserId: function(user) {
        assert.deepEqual(user, TEST_USER_1, 'OAuth Action should get ID from expected test user.');
        return user.id;
      }
    };

    // Create another dummy oauth provider
    app.formio.oauth.providers.test2 = {
      name: 'test2',
      title: 'Test2',
      authURI: 'http://test2.com/oauth/authorize',
      scope: 'email',
      autofillFields: [{
        title: 'Email',
        name: 'email'
      }],
      getToken: function(req, code, state, redirectURI, next) {
        assert.equal(code, TEST_AUTH_CODE_2, 'OAuth Action should request access token with expected test code.');
        assert.equal(redirectURI, TEST_REDIRECT_URI_2, 'OAuth Action should request access token with expected redirect uri.');
        return new Q(TEST_ACCESS_TOKEN_2).nodeify(next);
      },
      getUser: function(accessToken, next) {
        assert.equal(accessToken, TEST_ACCESS_TOKEN_2,
          'OAuth Action should request user info with expected test access token.');
        return new Q(TEST_USER_2).nodeify(next);
      },
      getUserId: function(user) {
        assert.deepEqual(user, TEST_USER_2, 'OAuth Action should get ID from expected test user.');
        return user.id;
      }
    };

    describe('Bootstrap', function() {
      it('Create a User Resource for OAuth Action tests', function(done) {
        var oauthUserResource = {
          title: 'Oauth User',
          name: 'oauthUser',
          path: 'oauthuser',
          type: 'resource',
          access: [],
          submissionAccess: [],
          components: [
            {
              input: true,
              inputType: 'email',
              label: 'Email',
              key: 'email',
              type: 'email',
              validate: {
                required: true
              }
            },
            {
              input: true,
              inputType: 'password',
              label: 'password',
              key: 'password',
              type: 'password',
              validate: {
                required: true
              }
            }
          ]
        };

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(oauthUserResource)
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
            assert.equal(response.title, oauthUserResource.title);
            assert.equal(response.name, oauthUserResource.name);
            assert.equal(response.path, oauthUserResource.path);
            assert.equal(response.type, 'resource');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, oauthUserResource.components);
            template.forms.oauthUserResource = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create a Register Form for OAuth Action tests', function(done) {
        var oauthRegisterForm = {
          title: 'OAuth Register Form',
          name: 'oauthRegisterForm',
          path: 'oauthregisterform',
          type: 'form',
          access: [],
          submissionAccess: [],
          components: [
            {
              input: true,
              inputType: 'email',
              label: 'Email',
              key: 'oauthUser.email',
              type: 'email',
              validate: {
                required: true
              }
            },
            {
              input: true,
              inputType: 'password',
              label: 'password',
              key: 'oauthUser.password',
              type: 'password',
              validate: {
                required: true
              }
            },
            {
              input: true,
              type: 'button',
              theme: 'primary',
              disableOnInvalid: 'false',
              action: 'oauth',
              key: 'oauthSignup1',
              label: 'Sign-Up with Test1'
            },
            {
              input: true,
              type: 'button',
              theme: 'primary',
              disableOnInvalid: 'false',
              action: 'oauth',
              key: 'oauthSignup2',
              label: 'Sign-Up with Test2'
            }
          ]
        };

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(oauthRegisterForm)
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
            assert.equal(response.title, oauthRegisterForm.title);
            assert.equal(response.name, oauthRegisterForm.name);
            assert.equal(response.path, oauthRegisterForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, oauthRegisterForm.components);
            template.forms.oauthRegisterForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create a Login Form for OAuth Action tests', function(done) {
        var oauthLoginForm = {
          title: 'OAuth Login Form',
          name: 'oauthLoginForm',
          path: 'oauthloginform',
          type: 'form',
          access: [],
          submissionAccess: [],
          components: [
            {
              input: true,
              inputType: 'email',
              label: 'Email',
              key: 'oauthUser.email',
              type: 'email',
              validate: {
                required: true
              }
            },
            {
              input: true,
              inputType: 'password',
              label: 'password',
              key: 'oauthUser.password',
              type: 'password',
              validate: {
                required: true
              }
            },
            {
              input: true,
              type: 'button',
              theme: 'primary',
              disableOnInvalid: 'false',
              action: 'oauth',
              key: 'oauthSignin1',
              label: 'Sign-In with Test1'
            },
            {
              input: true,
              type: 'button',
              theme: 'primary',
              disableOnInvalid: 'false',
              action: 'oauth',
              key: 'oauthSignin2',
              label: 'Sign-In with Test2'
            }
          ]
        };

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(oauthLoginForm)
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
            assert.equal(response.title, oauthLoginForm.title);
            assert.equal(response.name, oauthLoginForm.name);
            assert.equal(response.path, oauthLoginForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, oauthLoginForm.components);
            template.forms.oauthLoginForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Set up submission create_own access for Anonymous users for Register Form', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({submissionAccess: [{
            type: 'create_own',
            roles: [template.roles.anonymous._id.toString()]
          }]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.submissionAccess[0].type, 'create_own');
            assert.equal(response.submissionAccess[0].roles.length, 1);
            assert.equal(response.submissionAccess[0].roles[0], template.roles.anonymous._id.toString());

            // Save this form for later use.
            template.forms.oauthRegisterForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Set up submission create_own access for Anonymous users for Login Form', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.oauthLoginForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({submissionAccess: [{
            type: 'create_own',
            roles: [template.roles.anonymous._id.toString()]
          }]})
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.equal(response.submissionAccess[0].type, 'create_own');
            assert.equal(response.submissionAccess[0].roles.length, 1);
            assert.equal(response.submissionAccess[0].roles[0], template.roles.anonymous._id.toString());

            // Save this form for later use.
            template.forms.oauthLoginForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      // We attach Auth actions because oauth is supposed to override
      // them and prevent them from returning errors.
      it('Create AuthAction for Register Form', function(done) {
        var authRegisterAction = {
          title: 'Authentication',
          name: 'auth',
          handler: ['before'],
          method: ['create'],
          priority: 0,
          settings: {
            association: 'new',
            role: template.roles.authenticated._id.toString(),
            username: 'oauthUser.email',
            password: 'oauthUser.password'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(authRegisterAction)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, authRegisterAction.title);
            assert.equal(response.name, authRegisterAction.name);
            assert.deepEqual(response.handler, authRegisterAction.handler);
            assert.deepEqual(response.method, authRegisterAction.method);
            assert.equal(response.priority, authRegisterAction.priority);
            assert.deepEqual(response.settings, authRegisterAction.settings);
            assert.equal(response.form, template.forms.oauthRegisterForm._id);
            template.actions.authRegisterAction = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create AuthAction for Login Form', function(done) {
        var authLoginAction = {
          title: 'Authentication',
          name: 'auth',
          handler: ['before'],
          method: ['create'],
          priority: 0,
          settings: {
            association: 'existing',
            username: 'oauthUser.email',
            password: 'oauthUser.password'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthLoginForm._id + '/action', template))
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
            assert.equal(response.form, template.forms.oauthLoginForm._id);
            authLoginAction = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create OAuthAction for test1 provider for Register Form', function(done) {
        var oauthRegisterAction1 = {
          title: 'OAuth',
          name: 'oauth',
          handler: ['after', 'before'],
          method: ['form', 'create'],
          priority: 20,
          settings: {
            provider: 'test1',
            association: 'new',
            resource: template.forms.oauthUserResource._id,
            role: template.roles.authenticated._id.toString(),
            button: 'oauthSignup1',
            'autofill-test1-email': 'oauthUser.email'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(oauthRegisterAction1)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, oauthRegisterAction1.title);
            assert.equal(response.name, oauthRegisterAction1.name);
            assert.deepEqual(response.handler, oauthRegisterAction1.handler);
            assert.deepEqual(response.method, oauthRegisterAction1.method);
            assert.equal(response.priority, oauthRegisterAction1.priority);
            assert.deepEqual(response.settings, oauthRegisterAction1.settings);
            assert.equal(response.form, template.forms.oauthRegisterForm._id);
            oauthRegisterAction1 = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create OAuthAction for test1 provider for Login Form', function(done) {
        var oauthLoginAction1 = {
          title: 'OAuth',
          name: 'oauth',
          handler: ['after', 'before'],
          method: ['form', 'create'],
          priority: 20,
          settings: {
            provider: 'test1',
            association: 'existing',
            resource: template.forms.oauthUserResource._id,
            button: 'oauthSignin1'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthLoginForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(oauthLoginAction1)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, oauthLoginAction1.title);
            assert.equal(response.name, oauthLoginAction1.name);
            assert.deepEqual(response.handler, oauthLoginAction1.handler);
            assert.deepEqual(response.method, oauthLoginAction1.method);
            assert.equal(response.priority, oauthLoginAction1.priority);
            assert.deepEqual(response.settings, oauthLoginAction1.settings);
            assert.equal(response.form, template.forms.oauthLoginForm._id);
            oauthLoginAction1 = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create OAuthAction for test2 provider for Register Form', function(done) {
        var oauthRegisterAction2 = {
          title: 'OAuth',
          name: 'oauth',
          handler: ['after', 'before'],
          method: ['form', 'create'],
          priority: 20,
          settings: {
            provider: 'test2',
            association: 'new',
            resource: template.forms.oauthUserResource._id,
            role: template.roles.authenticated._id.toString(),
            button: 'oauthSignup2',
            'autofill-test2-email': 'oauthUser.email'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(oauthRegisterAction2)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, oauthRegisterAction2.title);
            assert.equal(response.name, oauthRegisterAction2.name);
            assert.deepEqual(response.handler, oauthRegisterAction2.handler);
            assert.deepEqual(response.method, oauthRegisterAction2.method);
            assert.equal(response.priority, oauthRegisterAction2.priority);
            assert.deepEqual(response.settings, oauthRegisterAction2.settings);
            assert.equal(response.form, template.forms.oauthRegisterForm._id);
            oauthRegisterAction2 = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create OAuthAction for test2 provider for Login Form', function(done) {
        var oauthLoginAction2 = {
          title: 'OAuth',
          name: 'oauth',
          handler: ['after', 'before'],
          method: ['form', 'create'],
          priority: 20,
          settings: {
            provider: 'test2',
            association: 'existing',
            resource: template.forms.oauthUserResource._id,
            button: 'oauthSignin2'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthLoginForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(oauthLoginAction2)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, oauthLoginAction2.title);
            assert.equal(response.name, oauthLoginAction2.name);
            assert.deepEqual(response.handler, oauthLoginAction2.handler);
            assert.deepEqual(response.method, oauthLoginAction2.method);
            assert.equal(response.priority, oauthLoginAction2.priority);
            assert.deepEqual(response.settings, oauthLoginAction2.settings);
            assert.equal(response.form, template.forms.oauthLoginForm._id);
            oauthLoginAction2 = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Get OAuth settings', function(done) {
        hook.settings(null, function(err, settings) {
          if (err) {
            return done(err);
          }
          oauthSettings = settings.oauth;
          assert(oauthSettings.test1);
          assert(oauthSettings.test1.clientId);
          assert(oauthSettings.test1.clientSecret);
          assert(oauthSettings.test2);
          assert(oauthSettings.test2.clientId);
          assert(oauthSettings.test2.clientSecret);
          done();
        });
      });

    });

    describe('After Form Handler', function() {
      it('Should not modify a Form Read without ?live=1', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert.deepEqual(response, template.forms.oauthRegisterForm);

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Should modify a Form Read with ?live=1', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id + '?live=1', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            response.components = util.flattenComponents(response.components);
            var flattenedComponents = util.flattenComponents(template.forms.oauthRegisterForm.components);
            _.each(response.components, function(component, i) {
              if (component.action === 'oauth') {
                if (component.key === 'oauthSignup1') {
                  assert.equal(component.oauth.provider, app.formio.oauth.providers.test1.name);
                  assert.equal(component.oauth.clientId, oauthSettings.test1.clientId);
                  assert.equal(component.oauth.authURI, app.formio.oauth.providers.test1.authURI);
                  assert.equal(component.oauth.scope, app.formio.oauth.providers.test1.scope);
                  assert.equal(component.oauth.display, app.formio.oauth.providers.test1.display);
                }
                if (component.key === 'oauthSignup2') {
                  assert.equal(component.oauth.provider, app.formio.oauth.providers.test2.name);
                  assert.equal(component.oauth.clientId, oauthSettings.test2.clientId);
                  assert.equal(component.oauth.authURI, app.formio.oauth.providers.test2.authURI);
                  assert.equal(component.oauth.scope, app.formio.oauth.providers.test2.scope);
                  assert.equal(component.oauth.display, app.formio.oauth.providers.test2.display);
                }
                assert.deepEqual(_.omit(component, 'oauth'), flattenedComponents[i],
                  'OAuth button should only have oauth prop added');
              }
              else {
                assert.deepEqual(component, flattenedComponents[i], 'Non oauth buttons should remain unchanged');
              }
            });

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    describe('OAuth Submission Handler', function() {
      it('An anonymous user should be able to register with OAuth provider test1', function(done) {
        var submission = {
          data: {},
          oauth: {
            test1: {
              code: TEST_AUTH_CODE_1,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI_1
            }
          }
        };
        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id + '/submission', template))
          .send(submission)
          .expect(200)
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
            assert.equal(response.data.email, TEST_USER_1.email, 'The OAuth Action should autofill the email field.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role added to it.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.test1.name, 'The externalId should be for test1 oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER_1.id, 'The externalId should match test user 1\'s id.');
            assert(!response.hasOwnProperty('deleted'), 'The response should not contain `deleted`');
            assert(!response.hasOwnProperty('__v'), 'The response should not contain `__v`');
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

            done();
          });
      });

      it('An anonymous user should be able to register with OAuth provider test2', function(done) {
        var submission = {
          data: {},
          oauth: {
            test2: {
              code: TEST_AUTH_CODE_2,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI_2
            }
          }
        };
        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthRegisterForm._id + '/submission', template))
          .send(submission)
          .expect(200)
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
            assert.equal(response.data.email, TEST_USER_2.email, 'The OAuth Action should autofill the email field.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role added to it.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.test2.name, 'The externalId should be for test2 oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER_2.id, 'The externalId should match test user 2\'s id.');
            assert(!response.hasOwnProperty('deleted'), 'The response should not contain `deleted`');
            assert(!response.hasOwnProperty('__v'), 'The response should not contain `__v`');
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

            done();
          });
      });

      it('An anonymous user should be able to login with OAuth provider test1', function(done) {
        var submission = {
          data: {},
          oauth: {
            test1: {
              code: TEST_AUTH_CODE_1,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI_1
            }
          }
        };
        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthLoginForm._id + '/submission', template))
          .send(submission)
          .expect(200)
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
            assert.equal(response.data.email, TEST_USER_1.email, 'The OAuth Action should return a user with the right email.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.test1.name, 'The externalId should be for test1 oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER_1.id, 'The externalId should match test user 1\'s id.');
            assert(!response.hasOwnProperty('deleted'), 'The response should not contain `deleted`');
            assert(!response.hasOwnProperty('__v'), 'The response should not contain `__v`');
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

            done();
          });
      });

      it('An anonymous user should be able to login with OAuth provider test2', function(done) {
        var submission = {
          data: {},
          oauth: {
            test2: {
              code: TEST_AUTH_CODE_2,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI_2
            }
          }
        };
        request(app)
          .post(hook.alter('url', '/form/' + template.forms.oauthLoginForm._id + '/submission', template))
          .send(submission)
          .expect(200)
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
            assert.equal(response.data.email, TEST_USER_2.email, 'The OAuth Action should return a user with the right email.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.test2.name, 'The externalId should be for test2 oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER_2.id, 'The externalId should match test user 2\'s id.');
            assert(!response.hasOwnProperty('deleted'), 'The response should not contain `deleted`');
            assert(!response.hasOwnProperty('__v'), 'The response should not contain `__v`');
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

            done();
          });
      });
    });
  });
};
