/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var chance = new (require('chance'))();
var docker = process.env.DOCKER;
var customer = process.env.CUSTOMER;
const defaultEmail = process.env.DEFAULT_EMAIL_SOURCE || 'no-reply@example.com';
let EventEmitter = require('events');

module.exports = function(app, template, hook) {
  template.hooks.addEmitter(new EventEmitter());

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

    if (template.users.formioAdmin) {
      it('Register a form.io administrator', function(done) {
        request(app)
          .post(hook.alter('url', '/form/' + template.forms.adminRegister._id + '/submission', template))
          .send({
            data: {
              'email': template.users.formioAdmin.data.email,
              'password': template.users.formioAdmin.data.password
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
            assert.equal(response.data.email, template.users.formioAdmin.data.email);
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
            var tempPassword = template.users.formioAdmin.data.password;
            template.users.formioAdmin = response;
            template.users.formioAdmin.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.users.formioAdmin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    }

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
        .expect(401)
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
        .expect(401)
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
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it('Should be able to register an authenticated user', function(done) {
      template.hooks.reset();
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

    if (!docker) {
      it('Should have sent an email to the user with an auth token', function (done) {
        setTimeout(function tryAgain(attempts) {
          attempts = attempts || 0;
          var email = template.hooks.getLastEmail();
          if (attempts < 5 && email.to !== template.users.user1.data.email) {
            setTimeout(() => tryAgain(++attempts), 200);
          }
          else {
            assert.equal(email.from, defaultEmail);
            assert.equal(email.to, template.users.user1.data.email);
            assert.equal(email.subject, 'New user ' + template.users.user1._id.toString() + ' created');
            assert.equal(email.html, 'Email: ' + template.users.user1.data.email);
            done();
          }
        }, 200);
      });
    }

    it('Should be able to validate a request with the validate param.', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userRegister._id + '/submission?dryrun=1', template))
        .send({
          data: {
            'email': template.users.user2.data.email,
            'password': template.users.user2.data.password
          }
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(done);
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

    it('Should be able to register a user with special characters in their email address.', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userRegister._id + '/submission', template))
        .send({
          data: {
            'email': 'test+user@example.com',
            'password': template.users.user2.data.password
          }
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    // Perform a login.
    var login = function(done) {
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
    };

    it('A Form.io User should be able to login as an authenticated user', login);

    it('A Form.io User should not be able to login with bad password', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user1.data.email,
            'password': 'badpassword!!!'
          }
        })
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    var lastAttempt = 0;
    it('A Form.io User should get locked out if they keep trying a bad password', function(done) {
      var count = 0;
      async.whilst(
        function(next) { return next(null, count < 4); },
        function(next) {
          count++;
          lastAttempt = (new Date()).getTime();
          request(app)
            .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
            .send({
              data: {
                'email': template.users.user1.data.email,
                'password': 'badpassword' + count + '!'
              }
            })
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return next(err);
              }

              assert.equal(res.text, count < 4 ? 'User or password was incorrect' : 'Maximum Login attempts. Please wait 4 seconds before trying again.');
              assert.equal(!res.headers['x-jwt-token'], true);
              next();
            });
        },
        function(err) {
          if (err) {
            return done(err);
          }
          done();
        }
      );
    });

    it('Verify that the Form.io user is locked out for 1 seconds even with right password.', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user1.data.email,
            'password': template.users.user1.data.password
          }
        })
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(res.text.indexOf('You must wait'), 0);
          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it('Verify that we can login again after waiting.', function(done) {
      setTimeout(function() {
        login(done);
      }, 4500);
    });

    it('Attempt 4 bad logins to attempt good login after window.', function(done) {
      var count = 0;
      async.whilst(
        function(next) { return next(null, count < 4); },
        function(next) {
          count++;
          lastAttempt = (new Date()).getTime();
          request(app)
            .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
            .send({
              data: {
                'email': template.users.user1.data.email,
                'password': 'badpassword' + count + '!'
              }
            })
            .expect(401)
            .end(function(err, res) {
              if (err) {
                return next(err);
              }

              assert.equal(res.text, 'User or password was incorrect');
              assert.equal(!res.headers['x-jwt-token'], true);
              next();
            });
        },
        function(err) {
          if (err) {
            return done(err);
          }
          done();
        }
      );
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

    it('A user should be able to login using a case insensitive email', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user2.data.email.toUpperCase(),
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

    it('A user should be able to reset their password', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id + '/submission/' + template.users.user2._id, template))
        .set('x-jwt-token', template.users.user2.token)
        .send({
          data: {
            'email': template.users.user2.data.email,
            'password': 'temppass'
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

    it('A user should be able to login with new password', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            'email': template.users.user2.data.email,
            'password': 'temppass'
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

    it('A user should be able to set their password back to normal', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id + '/submission/' + template.users.user2._id, template))
        .set('x-jwt-token', template.users.user2.token)
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

    it('Attempt 5th bad login request, but after the accepted window.', function(done) {
      setTimeout(function() {
        request(app)
          .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
          .send({
            data: {
              'email': template.users.user1.data.email,
              'password': 'badpassword!'
            }
          })
          .expect(401)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(res.text, 'User or password was incorrect');
            assert.equal(!res.headers['x-jwt-token'], true);
            done();
          });
      }, 4500);
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

  if (!customer) {
    describe('Get Temporary Tokens', function() {
      it('A User should not be able to get a temporary token without providing their current one.', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .expect(400)
          .expect('No authentication token provided.')
          .end(done);
      });

      it('A User should not be able to get a temporary token by providing a bad existing token.', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', 'badtoken' + template.users.user1.token.substr(8))
          .expect(400)
          .expect('Bad Token')
          .end(done);
      });

      it('A User should not be able to get a temporary token with an expire time set to beyond main token.', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', template.users.user1.token)
          .set('x-expire', '1000000000000000')
          .expect(400)
          .expect('Cannot generate extended expiring temp token.')
          .end(done);
      });

      var tempToken = null;
      it('Should allow them to create a default temp token with default expiration.', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            tempToken = res.body.token;
            assert(tempToken.length > 10, 'Temporary token was not created');
            done();
          });
      });

      it('Should allow you to authenticate with the temporary token.', function(done) {
        request(app)
          .get(hook.alter('url', '/current', template))
          .set('x-jwt-token', tempToken)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            assert.equal(res.body.data.email, template.users.user1.data.email);
            assert.equal(res.body._id, template.users.user1._id);
            done();
          });
      });

      it('Should not allow you to get a new temp token using the old temp token.', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', tempToken)
          .expect(400)
          .expect('Cannot issue a temporary token using another temporary token.')
          .end(done);
      });

      it('Should allow you to get a token with a different expire time.', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', template.users.user1.token)
          .set('x-expire', 2)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            tempToken = res.body.token;
            assert(tempToken.length > 10, 'Temporary token was not created');
            done();
          });
      });

      it('Should allow you to use that token within the expiration', function(done) {
        request(app)
          .get(hook.alter('url', '/current', template))
          .set('x-jwt-token', tempToken)
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            assert.equal(res.body.data.email, template.users.user1.data.email);
            assert.equal(res.body._id, template.users.user1._id);
            done();
          });
      });

      it('Should not allow you to use the token beyond the expiration', function(done) {
        setTimeout(function() {
          request(app)
            .get(hook.alter('url', '/current', template))
            .set('x-jwt-token', tempToken)
            .expect(440)
            .expect('Token Expired')
            .end(done);
        }, 2000);
      });

      var allowedToken = '';
      it('Should allow you to get a token for a specific path', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', template.users.user1.token)
          .set('x-allow', 'GET:/form/[0-9a-z]+')
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            allowedToken = res.body.token;
            assert(!!allowedToken, 'No allowed token generated');
            return done();
          });
      });

      it('Should not allow you to navigate to certain paths', function(done) {
        request(app)
          .get(hook.alter('url', '/current', template))
          .set('x-jwt-token', allowedToken)
          .expect(401)
          .end(done);
      });

      it('Should not allow you to perform methods on accepted paths', function(done) {
        request(app)
          .post(hook.alter('url', '/form/' + template.resources.user._id, template))
          .set('x-jwt-token', allowedToken)
          .expect(401)
          .end(done);
      });

      it('Should allow you to see the path and method specified in the token', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.resources.user._id, template))
          .set('x-jwt-token', allowedToken)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body._id, template.resources.user._id);
            done();
          });
      });

      it('Should allow generation of tokens with more than one allowed paths.', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', template.users.user1.token)
          .set('x-allow', 'GET:/form/[0-9a-z]+,GET:/current')
          .expect(200)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            allowedToken = res.body.token;
            assert(!!allowedToken, 'No allowed token generated');
            return done();
          });
      });

      it('Should not allow you get a different token', function(done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .set('x-jwt-token', allowedToken)
          .expect(400)
          .end(done);
      });

      it('Should not allow you to perform methods on accepted paths', function(done) {
        request(app)
          .post(hook.alter('url', '/form/' + template.resources.user._id, template))
          .set('x-jwt-token', allowedToken)
          .expect(401)
          .end(done);
      });

      it('Should allow you to see the path and method specified in the token', function(done) {
        request(app)
          .get(hook.alter('url', '/form/' + template.resources.user._id, template))
          .set('x-jwt-token', allowedToken)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body._id, template.resources.user._id);
            done();
          });
      });

      it('Should allow you to see the path and method specified in the token', function(done) {
        request(app)
          .get(hook.alter('url', '/current', template))
          .set('x-jwt-token', allowedToken)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body._id, template.users.user1._id);
            done();
          });
      });
    });
  }

  /**
   * partially authentication tests
   * partially permissions tests
   * partially submissions tests
   */
  describe('Self Access Permissions', function() {
    var dummy = {
      data: {
        email: chance.email(),
        password: chance.word({length: 10})
      }
    };
    var oldAccess = null;
    before('Store the old user resource permissions', function(done) {
      request(app)
        .get(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          oldAccess = {
            access: response.access,
            submissionAccess: response.submissionAccess
          };

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    after('Restore the old user resource permissions', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send(oldAccess)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('Update the user resource to have no submissionAccess', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: []
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.submissionAccess.length, 0);
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('The resource owner can make a user account without permissions', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.resources.user._id + '/submission', template))
        .set('x-jwt-token', template.users.admin.token)
        .send(dummy)
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
          assert(response.data.hasOwnProperty('email'), 'The submission `data` should contain the `email`.');
          assert.equal(response.data.email, dummy.data.email);
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.user._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');
          assert(response.hasOwnProperty('owner'), 'The response should contain the resource `owner`.');
          assert.equal(response.owner, template.users.admin._id);
          assert.equal(response.roles.length, 1);
          assert.equal(response.roles[0].toString(), template.roles.authenticated._id.toString());

          // Update our testProject.owners data.
          var tempPassword = dummy.data.password;
          dummy = response;
          dummy.data.password = tempPassword;

          // Store the JWT for future API calls.
          dummy.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('An anonymous user should not be able to create a user account without permissions', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.resources.user._id + '/submission', template))
        .send({
          data: {
            email: chance.email(),
            password: chance.word({length: 10})
          }
        })
        .expect(401)
        .end(done);
    });

    // FA-923
    it('An anonymous user should be able to access the resource form without submissionAccess permissions', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .expect(200)
        .end(done);
    });

    it('A user (created by an admin) can login to their account', function(done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            'email': dummy.data.email,
            'password': dummy.data.password
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
          assert.equal(response.data.email, dummy.data.email);
          assert(!response.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(!response.data.hasOwnProperty('password'), 'The submission `data` should not contain the `password`.');
          assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
          assert.equal(response.form, template.resources.user._id);
          assert(res.headers.hasOwnProperty('x-jwt-token'), 'The response should contain a `x-jwt-token` header.');

          // Update our dummys data.
          var tempPassword = dummy.data.password;
          dummy = response;
          dummy.data.password = tempPassword;

          // Store the JWT for future API calls.
          dummy.token = res.headers['x-jwt-token'];
          done();
        });
    });

    // FA-923
    it('A user without read submissionAccess permissions and no self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user without read permissions, should not be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without read permissions, should not be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without update permissions, should not be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(401)
        .end(done);
    });

    it('A user without delete permissions, should not be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('Update the user resource to have read_own access', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: [
            {
              type: 'read_own',
              roles: [template.roles.authenticated._id]
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.submissionAccess.length, 1);
          assert.equal(response.submissionAccess[0].type, 'read_own');
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    // FA-923
    it('A user with read submissionAccess permissions and no self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user without read permissions (not the owner), should not be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without read permissions (not the owner), should not be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response instanceof Array);
          assert.equal(response.length, 0);

          // Store the JWT for future API calls.
          dummy.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A user without update permissions (not the owner), should not be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(401)
        .end(done);
    });

    it('A user without delete permissions (not the owner), should not be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('Update the user resource to have update_own access', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: [
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id]
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.submissionAccess.length, 1);
          assert.equal(response.submissionAccess[0].type, 'update_own');
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    // FA-923
    it('A user with update submissionAccess permissions and no self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user without read permissions (not the owner), should not be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without read permissions (not the owner), should not be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without update permissions (not the owner), should not be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(401)
        .end(done);
    });

    it('A user without delete permissions (not the owner), should not be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('Update the user resource to have delete_own access', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: [
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id]
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.submissionAccess.length, 1);
          assert.equal(response.submissionAccess[0].type, 'delete_own');
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    // FA-923
    it('A user with delete submissionAccess permissions and no self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user without read permissions (not the owner), should not be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without read permissions (not the owner), should not be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without update permissions (not the owner), should not be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(401)
        .end(done);
    });

    it('A user without delete permissions (not the owner), should not be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('Update the user resource to have only self access', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: [
            {
              type: 'self'
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.submissionAccess.length, 1);
          assert.equal(response.submissionAccess[0].type, 'self');
          assert(response.submissionAccess[0].roles instanceof Array);
          assert.deepEqual(response.submissionAccess[0].roles, []);
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    // FA-923
    it('A user with no submissionAccess permissions and self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user without read permissions, but self access (not the owner), should not be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without read permissions, but self access (not the owner), should not be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user without update permissions, but self access (not the owner), should not be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(401)
        .end(done);
    });

    it('A user without delete permissions, but self access (not the owner), should not be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('Update the user resource to have read_own and self access', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: [
            {
              type: 'read_own',
              roles: [template.roles.authenticated._id]
            },
            {
              type: 'self'
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          var types = _.map(response.submissionAccess, 'type');
          assert.equal(response.submissionAccess.length, 2);
          assert(types.indexOf('read_own') !== -1);
          assert(types.indexOf('self') !== -1);
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    // FA-923
    it('A user with read submissionAccess permissions and self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user with read_own and self access, not the owner, should be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user with read_own and self access, not the owner, should be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(response instanceof Array);
          assert.equal(response.length, 1);
          assert.equal(response[0]._id, dummy._id);

          // Store the JWT for future API calls.
          dummy.token = res.headers['x-jwt-token'];

          done();
        });
    });

    it('A user with read_own and self access, not the owner, should not be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(401)
        .end(done);
    });

    it('A user with read_own and self access, not the owner, should not be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('Update the user resource to have update_own and self access', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: [
            {
              type: 'update_own',
              roles: [template.roles.authenticated._id]
            },
            {
              type: 'self'
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          var types = _.map(response.submissionAccess, 'type');
          assert.equal(response.submissionAccess.length, 2);
          assert(types.indexOf('update_own') !== -1);
          assert(types.indexOf('self') !== -1);
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    // FA-923
    it('A user with update submissionAccess permissions and self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user with update_own and self access, not the owner, should not be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user with update_own and self access, not the owner, should not be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user with update_own and self access, not the owner, should be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(200)
        .end(done);
    });

    it('A user with update_own and self access, not the owner, should not be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('Update the user resource to have delete_own and self access', function(done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send({
          submissionAccess: [
            {
              type: 'delete_own',
              roles: [template.roles.authenticated._id]
            },
            {
              type: 'self'
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          var types = _.map(response.submissionAccess, 'type');
          assert.equal(response.submissionAccess.length, 2);
          assert(types.indexOf('delete_own') !== -1);
          assert(types.indexOf('self') !== -1);
          template.resources.user = response;

          // Store the JWT for future API calls.
          template.users.admin.token = res.headers['x-jwt-token'];

          done();
        });
    });

    // FA-923
    it('A user with delete submissionAccess permissions and self access, can still read the resource form', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });

    it('A user with delete_own and self access, not the owner, should not be able to read their submission', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user with delete_own and self access, not the owner, should not be able to read their submission, via index', function(done) {
      request(app)
        .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
        .set('x-jwt-token', dummy.token)
        .expect(401)
        .end(done);
    });

    it('A user with delete_own and self access, not the owner, should not be able to update their submission', function(done) {
      request(app)
        .put(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .send({
          data: {
            email: chance.email()
          }
        })
        .expect(401)
        .end(done);
    });

    it('A user with delete_own and self access, not the owner, should be able to delete their submission', function(done) {
      request(app)
        .delete(hook.alter('url', '/' + template.resources.user.path + '/submission/' + dummy._id, template))
        .set('x-jwt-token', dummy.token)
        .expect(200)
        .end(done);
    });
  });

  describe('Template Permissions', function() {
    it('An Anonymous user should not be able to export a project', function(done) {
      request(app)
        .get(hook.alter('url', '/export', template))
        .expect(401)
        .expect('Content-Type', /text/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          let response = res.text;
          assert.equal(response, 'Unauthorized');
          done();
        });
    });

    it('An Admin user should be able to export a project', function(done) {
      request(app)
        .get(hook.alter('url', '/export', template))
        .set('x-jwt-token', template.users.admin.token)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          let response = res.body;
          assert.deepEqual(
            _.difference(
              ['title', 'version', 'description', 'name', 'roles', 'forms', 'actions', 'resources'],
              Object.keys(response)
            ),
            []
          );
          return done();
        });
    });
  });
};
