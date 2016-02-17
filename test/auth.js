/* eslint-env mocha */
'use strict';

var request = require('supertest');
var assert = require('assert');

module.exports = function(app, template, hook) {
  describe('Authentication', function() {
    it('Should be able to register an administrator', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.adminRegister._id + '/submission', template))
        .send({
          data: {
            'email': template.users.admin.data.email,
            'password': template.users.admin.data.password
          }
        })
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
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.admin.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.admin._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
          assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
          assert.notEqual(response.owner, null);
          assert.equal(response.owner, response._id);
          assert.equal(response.roles.length, 1);
          assert.equal(response.roles[0].toString(), template.roles.administrator._id.toString());

          // Update our testProject.owners data.
          var tempPassword = template.users.admin.data.password;
          template.users.admin = response;
          template.users.admin.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Register another administrator', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.adminRegister._id + '/submission', template))
        .send({
          data: {
            'email': template.users.admin2.data.email,
            'password': template.users.admin2.data.password
          }
        })
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
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.admin2.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.admin._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
          assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
          assert.notEqual(response.owner, null);
          assert.equal(response.owner, response._id);
          assert.equal(response.roles.length, 1);
          assert.equal(response.roles[0].toString(), template.roles.administrator._id.toString());

          // Update our testProject.owners data.
          var tempPassword = template.users.admin2.data.password;
          template.users.admin2 = response;
          template.users.admin2.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.admin2.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to login as administrator', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.adminLogin._id + '/submission', template))
        .send({
          data: {
            'email': template.users.admin.data.email,
            'password': template.users.admin.data.password
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.admin.data.email);
          assert(!response.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.admin._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Update our template.users.admins data.
          var tempPassword = template.users.admin.data.password;
          template.users.admin = response;
          template.users.admin.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];
          done();
        });
    });

    it('A Form.io User should not be able to login without credentials', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.adminLogin._id + '/submission', template))
        .send({})
        .expect(500)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it('A Form.io User should not be able to login with empty credentials', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.adminLogin._id + '/submission', template))
        .send({
          data: {
            username: '',
            password: ''
          }
        })
        .expect(500)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it('A Form.io User should be able to login using an Alias', function(done) {
      request(app)
        .post(hook.alter('url', '/' + template.forms.adminLogin.path, template))
        .send({
          data: {
            'email': template.users.admin.data.email,
            'password': template.users.admin.data.password
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.admin.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.admin._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Update our template.users.admins data.
          var tempPassword = template.users.admin.data.password;
          template.users.admin = response;
          template.users.admin.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should not be able to login without credentials using an Alias', function(done) {
      request(app)
        .post(hook.alter('url', '/' + template.forms.adminLogin.path, template))
        .send({})
        .expect(500)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it('Should be able to register an authenticated user', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userRegister._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user1.data.email,
            'password': template.users.user1.data.password
          }
        })
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
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.user1.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.user._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
          assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
          assert.notEqual(response.owner, null);
          assert.equal(response.owner, response._id);
          assert.equal(response.roles.length, 1);
          assert.equal(response.roles[0].toString(), template.roles.authenticated._id.toString());

          // Update our testProject.owners data.
          var tempPassword = template.users.user1.data.password;
          template.users.user1 = response;
          template.users.user1.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.user1.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Should be able to register another authenticated user.', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userRegister._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user2.data.email,
            'password': template.users.user2.data.password
          }
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
          assert.notEqual(response.owner, null);
          assert.equal(response.owner, response._id);

          // Update our testProject.owners data.
          var tempPassword = template.users.user2.data.password;
          template.users.user2 = response;
          template.users.user2.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.user2.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A Form.io User should be able to login as an authenticated user', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user1.data.email,
            'password': template.users.user1.data.password
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.user1.data.email);
          assert(!response.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.user._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Update our template.users.admins data.
          var tempPassword = template.users.user1.data.password;
          template.users.user1 = response;
          template.users.user1.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.user1.token = res.headers['x-jwt-token'];
          done();
        });
    });

    it('A user should be able to login as an authenticated user', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user2.data.email,
            'password': template.users.user2.data.password
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          template.users.user2.token = res.headers['x-jwt-token'];
          done();
        });
    });

    it('An Anonymous user should not be able to access the /current endpoint', function(done) {
      request(app)
        .get(hook.alter('url', '/current', template))
        .expect(401)
        .end(done);
    });

    it('An administrator should be able to see the current User', function(done) {
      request(app)
        .get(hook.alter('url', '/current', template))
        .set('x-jwt-token', template.users.admin.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.admin.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.admin._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Update our template.users.admins data.
          var tempPassword = template.users.admin.data.password;
          template.users.admin = response;
          template.users.admin.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A user should be able to see the current User', function(done) {
       request(app)
        .get(hook.alter('url', '/current', template))
        .set('x-jwt-token', template.users.user1.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.user1.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.user._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Update our template.users.admins data.
          var tempPassword = template.users.user1.data.password;
          template.users.user1 = response;
          template.users.user1.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.user1.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('An Authenticated and Registered User should be able to logout', function(done) {
      var oldToken = null;
      request(app)
        .get(hook.alter('url', '/logout', template))
        .set('x-jwt-token', template.users.user1.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          // Confirm that the token was sent and empty.
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
          assert.equal(res.headers['x-jwt-token'], '');
          done();
        });
    });

    var oldToken = null;
    it('An Authenticated and Registered User should be able to login again', function(done) {
      oldToken = template.users.user1.token;
      request(app)
        .post(hook.alter('url', '/' + template.forms.userLogin.path, template))
        .send({
          data: {
            'email': template.users.user1.data.email,
            'password': template.users.user1.data.password
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.user1.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.user._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Confirm the new token is different than the last.
          assert.notEqual(
            res.headers.hasOwnProperty('x-jwt-token'),
            oldToken,
            'The `x-jwt-token` recieved from re-logging in should be different than previously.'
          );

          // Update our testProject.owners data.
          var tempPassword = template.users.user1.data.password;
          template.users.user1 = response;
          template.users.user1.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.user1.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A User who has re-logged in for a User-Created Project should be able to view the current User', function(done) {
      request(app)
        .get('/current')
        .set('x-jwt-token', template.users.user1.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          assert(response.hasOwnProperty('modified'), 'The response should contain a `modified` timestamp.');
          assert(response.hasOwnProperty('created'), 'The response should contain a `created` timestamp.');
          assert(response.hasOwnProperty('data'), 'The response should contain a submission `data` object.');
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, template.users.user1.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.user._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Update our template.users.user1 data.
          var tempPassword = template.users.user1.data.password;
          template.users.user1 = response;
          template.users.user1.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.user1.token = res.headers['x-jwt-token'];

          done();
        });
    });
  });
};
