/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');
var _ = require('lodash');
var Q = require('q');
var AuthenticationContext = require('adal-node').AuthenticationContext;
var sinon = require('sinon');
var util = require('../../src/util/util');

module.exports = function(app, template, hook) {
  // Cannot run these tests without access to formio instance
  if (!app.formio) {
    return;
  }

  describe('Office 365', function() {
    var office365Settings;

    describe('Bootstrap', function() {
      // Only need a Register form because we can test both registration and
      // login with it. Everything else is covered by the general oauth tests.

      // Also reusing the oauthUserResource from the general oauth tests

      it('Create a Register Form for OAuth Action tests', function(done) {
        var office365OauthRegisterForm = {
          title: 'Office 365 OAuth Register Form',
          name: 'office365OauthRegisterForm',
          path: 'office365oauthregisterform',
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
              key: 'office365Signup',
              label: 'Sign-Up with Office 365'
            }
          ]
        };

        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(office365OauthRegisterForm)
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
            assert.equal(response.title, office365OauthRegisterForm.title);
            assert.equal(response.name, office365OauthRegisterForm.name);
            assert.equal(response.path, office365OauthRegisterForm.path);
            assert.equal(response.type, 'form');
            assert.equal(response.access.length, 1);
            assert.equal(response.access[0].type, 'read_all');
            assert.equal(response.access[0].roles.length, 3);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.anonymous._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.authenticated._id.toString()), -1);
            assert.notEqual(response.access[0].roles.indexOf(template.roles.administrator._id.toString()), -1);
            assert.deepEqual(response.submissionAccess, []);
            assert.deepEqual(response.components, office365OauthRegisterForm.components);
            template.forms.office365OauthRegisterForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Set up submission create_own access for Anonymous users for Register Form', function(done) {
        request(app)
          .put(hook.alter('url', '/form/' + template.forms.office365OauthRegisterForm._id, template))
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
            template.forms.office365OauthRegisterForm = response;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });

      it('Create OAuthAction for Office 365 provider for Register Form', function(done) {
        var office365OauthRegisterAction = {
          title: 'OAuth',
          name: 'oauth',
          handler: ['after', 'before'],
          method: ['form', 'create'],
          priority: 20,
          settings: {
            provider: 'office365',
            association: 'new',
            resource: template.forms.oauthUserResource.name,
            role: template.roles.authenticated._id.toString(),
            button: 'office365Signup',
            'autofill-office365-Id': 'oauthUser.email'
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.office365OauthRegisterForm._id + '/action', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(office365OauthRegisterAction)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
            assert.equal(response.title, office365OauthRegisterAction.title);
            assert.equal(response.name, office365OauthRegisterAction.name);
            assert.deepEqual(response.handler, office365OauthRegisterAction.handler);
            assert.deepEqual(response.method, office365OauthRegisterAction.method);
            assert.equal(response.priority, office365OauthRegisterAction.priority);
            assert.deepEqual(response.settings, office365OauthRegisterAction.settings);
            assert.equal(response.form, template.forms.office365OauthRegisterForm._id);
            office365OauthRegisterAction = response;

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
          office365Settings = settings.office365;
          assert(office365Settings);
          assert(office365Settings.tenant);
          assert(office365Settings.clientId);
          assert(office365Settings.clientSecret);
          done();
        });
      });
    });

    describe('After Form Handler', function() {
      it('Should modify a Form Read with ?live=1', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.forms.office365OauthRegisterForm._id + '?live=1', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            response.components = util.flattenComponents(response.components);
            var flattenedComponents = util.flattenComponents(template.forms.office365OauthRegisterForm.components);
            _.each(response.components, function(component, i) {
              if (component.action === 'oauth') {
                assert.equal(component.oauth.provider, app.formio.oauth.providers.office365.name);
                assert.equal(component.oauth.clientId, office365Settings.clientId);
                assert.equal(component.oauth.authURI, app.formio.oauth.providers.office365.getAuthURI(office365Settings.tenant));
                assert.equal(component.oauth.scope, app.formio.oauth.providers.office365.scope);
                assert.equal(component.oauth.display, app.formio.oauth.providers.office365.display);
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

    describe('Office 365 OAuth Submission Handler', function() {
      var TEST_AUTH_CODE = 'TESTAUTHCODE';
      var TEST_ACCESS_TOKEN = 'TESTACCESSTOKEN';
      var TEST_REFRESH_TOKEN = 'TESTREFRESHTOKEN';
      var TEST_REDIRECT_URI = 'http://testuri.com';
      var TEST_USER = {
        Id: 'rahatarmanahmed@gmail.com',
        DisplayName: 'Rahat Ahmed'
      };

      var TEST_EMAIL_RESPONSE = [
        {
          primary: true,
          verified: true,
          email: 'rahatarmanahmed@gmail.com'
        }
      ];

      beforeEach(function() {
        // Make the code and token unique for each test
        TEST_AUTH_CODE = 'TESTAUTHCODE' + Date.now();
        TEST_ACCESS_TOKEN = 'TESTACCESSTOKEN' + Date.now();
        TEST_REFRESH_TOKEN = 'TESTREFRESHTOKEN' + Date.now();

        sinon.stub(AuthenticationContext.prototype, 'acquireTokenWithAuthorizationCode')
        .withArgs(
          TEST_AUTH_CODE,
          TEST_REDIRECT_URI,
          'https://outlook.office365.com/',
          office365Settings.clientId,
          office365Settings.clientSecret,
          sinon.match.func)
        .yields(null, {
          accessToken: TEST_ACCESS_TOKEN,
          expiresOn: new Date(Date.now() + 3600000),
          refreshToken: TEST_REFRESH_TOKEN
        });

        sinon.stub(util, 'request')
          .throws(new Error('Request made with unexpected arguments'))
          .withArgs(sinon.match({
            url: 'https://outlook.office.com/api/v1.0/me',
            headers: sinon.match({
              Authorization: 'Bearer ' + TEST_ACCESS_TOKEN
            })
          }))
          .returns(Q([{}, TEST_USER]));
      });

      afterEach(function() {
        util.request.restore();
        AuthenticationContext.prototype.acquireTokenWithAuthorizationCode.restore();
      });

      it('An anonymous user should be able to register with OAuth provider Office 365', function(done) {
        var submission = {
          data: {},
          oauth: {
            office365: {
              code: TEST_AUTH_CODE,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI
            }
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.office365OauthRegisterForm._id + '/submission', template))
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
            assert.equal(response.data.email, TEST_USER.Id, 'The OAuth Action should autofill the email field.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role added to it.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.office365.name, 'The externalId should be for office365 oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER.Id, 'The externalId should match test user 1\'s id.');
            assert(!response.hasOwnProperty('externalTokens'), 'The response should not contain `externalTokens`');
            assert(!response.hasOwnProperty('deleted'), 'The response should not contain `deleted`');
            assert(!response.hasOwnProperty('__v'), 'The response should not contain `__v`');
            assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
            assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
            assert.notEqual(response.owner, null);
            assert.equal(response.owner, response._id);

            // Save user for later tests
            template.users.office365OauthUser = response;
            template.users.office365OauthUser.token = res.headers['x-jwt-token'];
            done();
        });
      });

      it('An anonymous user should be logged in when registering with a previously registered OAuth provider Office 365 account', function(done) {
        var submission = {
          data: {},
          oauth: {
            office365: {
              code: TEST_AUTH_CODE,
              state: 'teststate', // Scope only matters for client side validation
              redirectURI: TEST_REDIRECT_URI
            }
          }
        };

        request(app)
          .post(hook.alter('url', '/form/' + template.forms.office365OauthRegisterForm._id + '/submission', template))
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
            assert.equal(response.data.email, TEST_USER.Id, 'The OAuth Action should return a user with the right email.');
            assert.equal(response.form, template.forms.oauthUserResource._id, 'The submission returned should be for the authenticated resource.');
            assert(response.hasOwnProperty('roles'), 'The response should contain the resource `roles`.');
            assert.deepEqual(response.roles, [template.roles.authenticated._id.toString()], 'The submission should have the OAuth Action configured role.');
            assert.equal(response.externalIds.length, 1);
            assert(response.externalIds[0].hasOwnProperty('_id'), 'The externalId should contain an `_id`.');
            assert(response.externalIds[0].hasOwnProperty('modified'), 'The externalId should contain a `modified` timestamp.');
            assert(response.externalIds[0].hasOwnProperty('created'), 'The externalId should contain a `created` timestamp.');
            assert.equal(response.externalIds[0].type, app.formio.oauth.providers.office365.name, 'The externalId should be for office365 oauth.');
            assert.equal(response.externalIds[0].id, TEST_USER.Id, 'The externalId should match test user 1\'s id.');
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
