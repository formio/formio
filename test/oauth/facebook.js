/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var Q = require('q');
var sinon = require('sinon');
var util = require('../../src/util/util');

module.exports = function(app, template, hook) {
  // Cannot run these tests without access to formio instance
  if (!app.formio) {
    return;
  }

  describe('Facebook', function() {
    var oauthSettings;

    describe('Bootstrap', function() {
      // Only need a Register form because we can test both registration and
      // login with it. Everything else is covered by the general oauth tests.

      // Also reusing the oauthUserResource from the general oauth tests

      it('Create a Register Form for OAuth Action tests', function(done) {
        var facebookOauthRegisterForm = {
          title: 'Facebook OAuth Register Form',
          name: 'facebookOauthRegisterForm',
          path: 'facebookoauthregisterform',
          type: 'form',
          access: [],
          submissionAccess: [],
          components: [
            {
              input: true,
              type: 'button',
              theme: 'primary',
              disableOnInvalid: 'false',
              action: 'oauth',
              key: 'facebookSignup',
              label: 'Sign-Up with Facebook'
            }
          ]
        };

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(facebookOauthRegisterForm)
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
            assert.equal(response.title, facebookOauthRegisterForm.title);
            assert.equal(response.name, facebookOauthRegisterForm.name);
            assert.equal(response.path, facebookOauthRegisterForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, facebookOauthRegisterForm.components);
            template.forms.facebookOauthRegisterForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Set up submission create_own access for Anonymous users for Register Form', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.facebookOauthRegisterForm._id, template))
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
            template.forms.facebookOauthRegisterForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create OAuthAction for Facebook provider for Register Form', function(done) {
        var facebookOauthRegisterAction = {
          title: 'OAuth',
          name: 'oauth',
          handler: ['after', 'before'],
          method: ['form', 'create'],
          priority: 20,
          settings: {
            provider: 'facebook',
            association: 'new',
            resource: template.forms.oauthUserResource.name,
            role: template.roles.authenticated._id.toString(),
            button: 'facebookSignup',
            'autofill-facebook-email': 'oauthUser.email'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.facebookOauthRegisterForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(facebookOauthRegisterAction)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, facebookOauthRegisterAction.title);
            assert.equal(response.name, facebookOauthRegisterAction.name);
            assert.deepEqual(response.handler, facebookOauthRegisterAction.handler);
            assert.deepEqual(response.method, facebookOauthRegisterAction.method);
            assert.equal(response.priority, facebookOauthRegisterAction.priority);
            assert.deepEqual(response.settings, facebookOauthRegisterAction.settings);
            assert.equal(response.form, template.forms.facebookOauthRegisterForm._id);
            facebookOauthRegisterAction = response;

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
          assert(oauthSettings.facebook);
          assert(oauthSettings.facebook.clientId);
          assert(oauthSettings.facebook.clientSecret);
          done();
        });
      });
    });

    describe('After Form Handler', function() {
      it('Should modify a Form Read with ?live=1', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.facebookOauthRegisterForm._id + '?live=1', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            response.components = util.flattenComponents(response.components);
            var flattenedComponents = util.flattenComponents(template.forms.facebookOauthRegisterForm.components);
            _.each(response.components, function(component, i) {
              if (component.action === 'oauth') {
                assert.equal(component.oauth.provider, app.formio.oauth.providers.facebook.name);
                assert.equal(component.oauth.clientId, oauthSettings.facebook.clientId);
                assert.equal(component.oauth.authURI, app.formio.oauth.providers.facebook.authURI);
                assert.equal(component.oauth.scope, app.formio.oauth.providers.facebook.scope);
                assert.equal(component.oauth.display, app.formio.oauth.providers.facebook.display);
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

    describe('Facebook OAuth Submission Handler', function() {
      var TEST_AUTH_CODE = 'TESTAUTHCODE';
      var TEST_ACCESS_TOKEN = 'TESTACCESSTOKEN';
      var TEST_REDIRECT_URI = 'http://testuri.com';
      var TEST_USER = { //id,name,email,first_name,last_name,middle_name
        id: 123456,
        name: 'Rahat Ahmed',
        email: 'rahatarmanahmed@gmail.com',
        first_name: 'Rahat',
        last_name: 'Ahmed'
      };

      beforeEach(function() {
        // Make the code and token unique for each test
        TEST_AUTH_CODE = 'TESTAUTHCODE' + Date.now();
        TEST_ACCESS_TOKEN = 'TESTACCESSTOKEN' + Date.now();

        sinon.stub(util, 'request')
          .throws(new Error('Request made with unexpected arguments'))

          .withArgs(sinon.match({
            url: 'https://graph.facebook.com/v2.3/oauth/access_token',
            body: sinon.match({
              client_id: oauthSettings.facebook.clientId,
              client_secret: oauthSettings.facebook.clientSecret,
              code: TEST_AUTH_CODE
            })
          }))
          .returns(Q([
            {
              headers: {
                date: new Date()
              }
            },
            {
              access_token: TEST_ACCESS_TOKEN,
              expires_in: 86400
            }
          ]))

          .withArgs(sinon.match({
            url: 'https://graph.facebook.com/v2.3/me',
            qs: sinon.match({
              access_token: TEST_ACCESS_TOKEN
            })
          }))
          .returns(Q([{}, TEST_USER]))
      });

      afterEach(function() {
        util.request.restore();
      });

      it('An anonymous user should be able to register with OAuth provider Facebook', function(done) {
        var submission = {
          data: {},
          oauth: {
            facebook: {
              code: TEST_AUTH_CODE,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI
            }
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.facebookOauthRegisterForm._id + '/submission', template))
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
            assert.equal(response.data.email, TEST_USER.email, 'The OAuth Action should autofill the email field.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role added to it.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.facebook.name, 'The externalId should be for facebook oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER.id, 'The externalId should match test user 1\'s id.');
            assert(!response.hasOwnProperty('externalTokens'), 'The response should not contain `externalTokens`');
            assert(!response.hasOwnProperty('deleted'), 'The response should not contain `deleted`');
            assert(!response.hasOwnProperty('__v'), 'The response should not contain `__v`');
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
            assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
            assert.notEqual(response.owner, null);
            assert.equal(response.owner, response._id);

            // Save user for later tests
            template.users.facebookOauthUser = response;
            template.users.facebookOauthUser.token = res.headers['x-jwt-token'];
            done();
        });
      });

      it('An anonymous user should be logged in when registering with a previously registered OAuth provider Facebook account', function(done) {
        var submission = {
          data: {},
          oauth: {
            facebook: {
              code: TEST_AUTH_CODE,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI
            }
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.facebookOauthRegisterForm._id + '/submission', template))
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
            assert.equal(response.data.email, TEST_USER.email, 'The OAuth Action should return a user with the right email.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.facebook.name, 'The externalId should be for facebook oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER.id, 'The externalId should match test user 1\'s id.');
            assert(!response.hasOwnProperty('externalTokens'), 'The response should not contain `externalTokens`');
            assert(!response.hasOwnProperty('deleted'), 'The response should not contain `deleted`');
            assert(!response.hasOwnProperty('__v'), 'The response should not contain `__v`');
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
            assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
            assert.notEqual(response.owner, null);
            assert.equal(response.owner, response._id);

            done();
          });
      });
    });
  });
};
