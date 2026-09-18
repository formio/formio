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

module.exports = function (app, template, hook) {
  before(function () {
    template.hooks.addEmitter(new EventEmitter());
  });

  // Idempotent fixture builders. The tests in this file form long chains -- one
  // registers a user, a later one logs in with the token it stashed -- so each test
  // asks the builder it needs for its precondition instead of inheriting it from a
  // predecessor. In file order every builder finds the state already there and is a
  // no-op, which keeps the whole-file run behaving exactly as it did.

  var formSubmissionUrl = function (form) {
    return hook.alter('url', '/form/' + form._id + '/submission', template);
  };

  // Run `test` only once `setup` has built the fixtures it needs. Lets a test declare
  // its preconditions without indenting its whole body a level.
  var withFixture = function (setup, test) {
    return function (done) {
      setup(function (err) {
        if (err) {
          return done(err);
        }
        test(done);
      });
    };
  };

  // Same as withFixture, for a builder that hands back a value the test needs.
  var withToken = function (mint, test) {
    return function (done) {
      mint(function (err, token) {
        if (err) {
          return done(err);
        }
        test(token, done);
      });
    };
  };

  // Combine builders into one that runs them in order.
  var allOf = function () {
    var builders = _.toArray(arguments);
    return function (done) {
      async.eachSeries(
        builders,
        function (builder, next) {
          builder(function (err) {
            return next(err);
          });
        },
        done,
      );
    };
  };

  // Register template.users[userKey] against the given registration form. Guarded on
  // the identity of the account: an `_id` plus a token means this user exists and the
  // token belongs to it, not to whoever set up the project.
  var registerUser = function (userKey, formKey, done) {
    var user = template.users[userKey];
    if (user._id && user.token) {
      return done();
    }

    request(app)
      .post(formSubmissionUrl(template.forms[formKey]))
      .send({
        data: {
          email: user.data.email,
          password: user.data.password,
        },
      })
      .expect(200)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        var tempPassword = user.data.password;
        template.users[userKey] = res.body;
        template.users[userKey].data.password = tempPassword;
        template.users[userKey].token = res.headers['x-jwt-token'];
        done();
      });
  };

  var ensureAdmin = function (done) {
    registerUser('admin', 'adminRegister', done);
  };

  var ensureUser1 = function (done) {
    if (template.users.user1._id && template.users.user1.token) {
      return done();
    }

    // Same as the registration test: clear the email hooks first so the
    // "sent an email to the user" assertion reads this registration's message.
    template.hooks.reset();
    registerUser('user1', 'userRegister', done);
  };

  var ensureUser2 = function (done) {
    registerUser('user2', 'userRegister', done);
  };

  // The password the reset-password tests move user2 onto and back off again.
  var user2TempPassword = 'temppass';

  // Put user2 on the temporary password, which is what the "login with new password"
  // test needs to have happened. Unguarded: re-applying the same password is a no-op
  // as far as the account is concerned, so it cannot drift from the state it asserts.
  var ensureUser2TempPassword = function (done) {
    ensureUser2(function (err) {
      if (err) {
        return done(err);
      }

      request(app)
        .put(
          hook.alter(
            'url',
            '/form/' + template.resources.user._id + '/submission/' + template.users.user2._id,
            template,
          ),
        )
        .set('x-jwt-token', template.users.user2.token)
        .send({
          data: {
            email: template.users.user2.data.email,
            password: user2TempPassword,
          },
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          template.users.user2.token = res.headers['x-jwt-token'];
          done();
        });
    });
  };

  // A successful login zeroes the LoginAction's attempt counter on the user record and
  // restamps its window, which is the state the lockout tests below count up from.
  var resetUser1LoginAttempts = function (done) {
    ensureUser1(function (err) {
      if (err) {
        return done(err);
      }

      request(app)
        .post(formSubmissionUrl(template.forms.userLogin))
        .send({
          data: {
            email: template.users.user1.data.email,
            password: template.users.user1.data.password,
          },
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          template.users.user1.token = res.headers['x-jwt-token'];
          done();
        });
    });
  };

  // Spend `attempts` of user1's allowed login attempts (5) on a bad password.
  var failUser1Logins = function (attempts, done) {
    var count = 0;
    async.whilst(
      function (next) {
        return next(null, count < attempts);
      },
      function (next) {
        count++;
        request(app)
          .post(formSubmissionUrl(template.forms.userLogin))
          .send({
            data: {
              email: template.users.user1.data.email,
              password: 'badpassword' + count + '!',
            },
          })
          .expect(401)
          .end(function (err) {
            return next(err);
          });
      },
      done,
    );
  };

  // Leave user1 with `attempts` failures recorded inside a freshly stamped attempt
  // window. Unguarded because it normalizes rather than accumulates: the leading
  // successful login discards whatever the tests before it happened to leave behind.
  var primeUser1LoginAttempts = function (attempts, done) {
    resetUser1LoginAttempts(function (err) {
      if (err) {
        return done(err);
      }
      failUser1Logins(attempts, done);
    });
  };

  // Drive user1 into the locked-out state. Guarded on the effect rather than on a
  // flag: a correct password that is refused is the lock itself, and the LoginAction
  // answers a locked account without touching its metadata, so probing is free.
  var lockOutUser1 = function (done) {
    ensureUser1(function (err) {
      if (err) {
        return done(err);
      }

      request(app)
        .post(formSubmissionUrl(template.forms.userLogin))
        .send({
          data: {
            email: template.users.user1.data.email,
            password: template.users.user1.data.password,
          },
        })
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          if (res.status !== 200) {
            return done();
          }

          template.users.user1.token = res.headers['x-jwt-token'];
          failUser1Logins(5, done);
        });
    });
  };

  // Mint a temporary token for user1. Tokens are cheap, stateless artifacts, so every
  // consumer mints its own rather than sharing one -- a cached token with a 2 second
  // expiry would go stale between tests.
  var createTempToken = function (headers, done) {
    ensureUser1(function (err) {
      if (err) {
        return done(err);
      }

      var req = request(app)
        .get(hook.alter('url', '/token', template))
        .set('x-jwt-token', template.users.user1.token);

      _.each(headers, function (value, name) {
        req.set(name, value);
      });

      req.expect(200).end(function (err, res) {
        if (err) {
          return done(err);
        }
        done(null, res.body.token);
      });
    });
  };

  describe('Authentication', function () {
    it('Should be able to register an administrator', function (done) {
      request(app)
        .post(
          hook.alter('url', '/form/' + template.forms.adminRegister._id + '/submission', template),
        )
        .send({
          data: {
            email: template.users.admin.data.email,
            password: template.users.admin.data.password,
          },
        })
        .expect(200)
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
            response.data.hasOwnProperty('email'),
            'The submission `data` should contain the `email`.',
          );
          assert.equal(response.data.email, template.users.admin.data.email);
          assert(
            !response.data.hasOwnProperty('password'),
            'The submission `data` should not contain the `password`.',
          );
          assert(
            response.hasOwnProperty('form'),
            'The response should contain the resource `form`.',
          );
          assert.equal(response.form, template.resources.admin._id);
          assert(
            res.headers.hasOwnProperty('x-jwt-token'),
            'The response should contain a `x-jwt-token` header.',
          );
          assert(
            response.hasOwnProperty('owner'),
            'The response should contain the resource `owner`.',
          );
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

    it('Register another administrator', function (done) {
      request(app)
        .post(
          hook.alter('url', '/form/' + template.forms.adminRegister._id + '/submission', template),
        )
        .send({
          data: {
            email: template.users.admin2.data.email,
            password: template.users.admin2.data.password,
          },
        })
        .expect(200)
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
            response.data.hasOwnProperty('email'),
            'The submission `data` should contain the `email`.',
          );
          assert.equal(response.data.email, template.users.admin2.data.email);
          assert(
            !response.data.hasOwnProperty('password'),
            'The submission `data` should not contain the `password`.',
          );
          assert(
            response.hasOwnProperty('form'),
            'The response should contain the resource `form`.',
          );
          assert.equal(response.form, template.resources.admin._id);
          assert(
            res.headers.hasOwnProperty('x-jwt-token'),
            'The response should contain a `x-jwt-token` header.',
          );
          assert(
            response.hasOwnProperty('owner'),
            'The response should contain the resource `owner`.',
          );
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
      it('Register a form.io administrator', function (done) {
        request(app)
          .post(
            hook.alter(
              'url',
              '/form/' + template.forms.adminRegister._id + '/submission',
              template,
            ),
          )
          .send({
            data: {
              email: template.users.formioAdmin.data.email,
              password: template.users.formioAdmin.data.password,
            },
          })
          .expect(200)
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
              response.data.hasOwnProperty('email'),
              'The submission `data` should contain the `email`.',
            );
            assert.equal(response.data.email, template.users.formioAdmin.data.email);
            assert(
              !response.data.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              response.hasOwnProperty('form'),
              'The response should contain the resource `form`.',
            );
            assert.equal(response.form, template.resources.admin._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );
            assert(
              response.hasOwnProperty('owner'),
              'The response should contain the resource `owner`.',
            );
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

    it(
      'A Form.io User should be able to login as administrator',
      withFixture(ensureAdmin, function (done) {
        request(app)
          .post(
            hook.alter('url', '/form/' + template.forms.adminLogin._id + '/submission', template),
          )
          .send({
            data: {
              email: template.users.admin.data.email,
              password: template.users.admin.data.password,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
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
              response.data.hasOwnProperty('email'),
              'The submission `data` should contain the `email`.',
            );
            assert.equal(response.data.email, template.users.admin.data.email);
            assert(
              !response.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              !response.data.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              response.hasOwnProperty('form'),
              'The response should contain the resource `form`.',
            );
            assert.equal(response.form, template.resources.admin._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );

            // Update our template.users.admins data.
            var tempPassword = template.users.admin.data.password;
            template.users.admin = response;
            template.users.admin.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      }),
    );

    it('A Form.io User should not be able to login without credentials', function (done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.adminLogin._id + '/submission', template))
        .send({})
        .expect(401)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it('A Form.io User should not be able to login with empty credentials', function (done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.adminLogin._id + '/submission', template))
        .send({
          data: {
            username: '',
            password: '',
          },
        })
        .expect(401)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it(
      'A Form.io User should be able to login using an Alias',
      withFixture(ensureAdmin, function (done) {
        request(app)
          .post(hook.alter('url', '/' + template.forms.adminLogin.path, template))
          .send({
            data: {
              email: template.users.admin.data.email,
              password: template.users.admin.data.password,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
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
              response.data.hasOwnProperty('email'),
              'The submission `data` should contain the `email`.',
            );
            assert.equal(response.data.email, template.users.admin.data.email);
            assert(
              !response.data.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              response.hasOwnProperty('form'),
              'The response should contain the resource `form`.',
            );
            assert.equal(response.form, template.resources.admin._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );

            // Update our template.users.admins data.
            var tempPassword = template.users.admin.data.password;
            template.users.admin = response;
            template.users.admin.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      }),
    );

    it('A Form.io User should not be able to login without credentials using an Alias', function (done) {
      request(app)
        .post(hook.alter('url', '/' + template.forms.adminLogin.path, template))
        .send({})
        .expect(401)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          assert.equal(!res.headers['x-jwt-token'], true);
          done();
        });
    });

    it('Should be able to register an authenticated user', function (done) {
      template.hooks.reset();
      request(app)
        .post(
          hook.alter('url', '/form/' + template.forms.userRegister._id + '/submission', template),
        )
        .send({
          data: {
            email: template.users.user1.data.email,
            password: template.users.user1.data.password,
          },
        })
        .expect(200)
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
            response.data.hasOwnProperty('email'),
            'The submission `data` should contain the `email`.',
          );
          assert.equal(response.data.email, template.users.user1.data.email);
          assert(
            !response.data.hasOwnProperty('password'),
            'The submission `data` should not contain the `password`.',
          );
          assert(
            response.hasOwnProperty('form'),
            'The response should contain the resource `form`.',
          );
          assert.equal(response.form, template.resources.user._id);
          assert(
            res.headers.hasOwnProperty('x-jwt-token'),
            'The response should contain a `x-jwt-token` header.',
          );
          assert(
            response.hasOwnProperty('owner'),
            'The response should contain the resource `owner`.',
          );
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
      it(
        'Should have sent an email to the user with an auth token',
        withFixture(ensureUser1, function (done) {
          setTimeout(function tryAgain(attempts) {
            attempts = attempts || 0;
            var email = template.hooks.getLastEmail();
            if (attempts < 5 && email.to !== template.users.user1.data.email) {
              setTimeout(() => tryAgain(++attempts), 200);
            } else {
              assert.equal(email.from, defaultEmail);
              assert.equal(email.to, template.users.user1.data.email);
              assert.equal(
                email.subject,
                'New user ' + template.users.user1._id.toString() + ' created',
              );
              assert.equal(email.html, 'Email: ' + template.users.user1.data.email);
              done();
            }
          }, 200);
        }),
      );
    }

    it('Should be able to validate a request with the validate param.', function (done) {
      request(app)
        .post(
          hook.alter(
            'url',
            '/form/' + template.forms.userRegister._id + '/submission?dryrun=1',
            template,
          ),
        )
        .send({
          data: {
            email: template.users.user2.data.email,
            password: template.users.user2.data.password,
          },
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(done);
    });

    it('Should be able to register another authenticated user.', function (done) {
      request(app)
        .post(
          hook.alter('url', '/form/' + template.forms.userRegister._id + '/submission', template),
        )
        .send({
          data: {
            email: template.users.user2.data.email,
            password: template.users.user2.data.password,
          },
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert(
            response.hasOwnProperty('owner'),
            'The response should contain the resource `owner`.',
          );
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

    it('Should be able to register a user with special characters in their email address.', function (done) {
      request(app)
        .post(
          hook.alter('url', '/form/' + template.forms.userRegister._id + '/submission', template),
        )
        .send({
          data: {
            email: 'test+user@example.com',
            password: template.users.user2.data.password,
          },
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    // Perform a login.
    var login = withFixture(ensureUser1, function (done) {
      request(app)
        .post(hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template))
        .send({
          data: {
            email: template.users.user1.data.email,
            password: template.users.user1.data.password,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
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
            response.data.hasOwnProperty('email'),
            'The submission `data` should contain the `email`.',
          );
          assert.equal(response.data.email, template.users.user1.data.email);
          assert(
            !response.hasOwnProperty('password'),
            'The submission `data` should not contain the `password`.',
          );
          assert(
            !response.data.hasOwnProperty('password'),
            'The submission `data` should not contain the `password`.',
          );
          assert(
            response.hasOwnProperty('form'),
            'The response should contain the resource `form`.',
          );
          assert.equal(response.form, template.resources.user._id);
          assert(
            res.headers.hasOwnProperty('x-jwt-token'),
            'The response should contain a `x-jwt-token` header.',
          );

          // Update our template.users.admins data.
          var tempPassword = template.users.user1.data.password;
          template.users.user1 = response;
          template.users.user1.data.password = tempPassword;

          // Store the JWT for future API calls.
          template.users.user1.token = res.headers['x-jwt-token'];
          done();
        });
    });

    it('A Form.io User should be able to login as an authenticated user', login);

    it(
      'A Form.io User should not be able to login with bad password',
      withFixture(ensureUser1, function (done) {
        request(app)
          .post(
            hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template),
          )
          .send({
            data: {
              email: template.users.user1.data.email,
              password: 'badpassword!!!',
            },
          })
          .expect(401)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(!res.headers['x-jwt-token'], true);
            done();
          });
      }),
    );

    var lastAttempt = 0;
    it(
      'A Form.io User should get locked out if they keep trying a bad password',
      withFixture(_.partial(primeUser1LoginAttempts, 1), function (done) {
        var count = 0;
        async.whilst(
          function (next) {
            return next(null, count < 4);
          },
          function (next) {
            count++;
            lastAttempt = new Date().getTime();
            request(app)
              .post(
                hook.alter(
                  'url',
                  '/form/' + template.forms.userLogin._id + '/submission',
                  template,
                ),
              )
              .send({
                data: {
                  email: template.users.user1.data.email,
                  password: 'badpassword' + count + '!',
                },
              })
              .expect(401)
              .end(function (err, res) {
                if (err) {
                  return next(err);
                }

                assert.equal(
                  res.text,
                  count < 4
                    ? 'User or password was incorrect'
                    : 'Maximum Login attempts. Please wait 4 seconds before trying again.',
                );
                assert.equal(!res.headers['x-jwt-token'], true);
                next();
              });
          },
          function (err) {
            if (err) {
              return done(err);
            }
            done();
          },
        );
      }),
    );

    it(
      'Verify that the Form.io user is locked out for 1 seconds even with right password.',
      withFixture(lockOutUser1, function (done) {
        request(app)
          .post(
            hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template),
          )
          .send({
            data: {
              email: template.users.user1.data.email,
              password: template.users.user1.data.password,
            },
          })
          .expect(401)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            assert.equal(res.text.indexOf('You must wait'), 0);
            assert.equal(!res.headers['x-jwt-token'], true);
            done();
          });
      }),
    );

    it(
      'Verify that we can login again after waiting.',
      withFixture(lockOutUser1, function (done) {
        setTimeout(function () {
          login(done);
        }, 4500);
      }),
    );

    it(
      'Attempt 4 bad logins to attempt good login after window.',
      withFixture(resetUser1LoginAttempts, function (done) {
        var count = 0;
        async.whilst(
          function (next) {
            return next(null, count < 4);
          },
          function (next) {
            count++;
            lastAttempt = new Date().getTime();
            request(app)
              .post(
                hook.alter(
                  'url',
                  '/form/' + template.forms.userLogin._id + '/submission',
                  template,
                ),
              )
              .send({
                data: {
                  email: template.users.user1.data.email,
                  password: 'badpassword' + count + '!',
                },
              })
              .expect(401)
              .end(function (err, res) {
                if (err) {
                  return next(err);
                }

                assert.equal(res.text, 'User or password was incorrect');
                assert.equal(!res.headers['x-jwt-token'], true);
                next();
              });
          },
          function (err) {
            if (err) {
              return done(err);
            }
            done();
          },
        );
      }),
    );

    it(
      'A user should be able to login as an authenticated user',
      withFixture(ensureUser2, function (done) {
        request(app)
          .post(
            hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template),
          )
          .send({
            data: {
              email: template.users.user2.data.email,
              password: template.users.user2.data.password,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            template.users.user2.token = res.headers['x-jwt-token'];
            done();
          });
      }),
    );

    it(
      'A user should be able to login using a case insensitive email',
      withFixture(ensureUser2, function (done) {
        request(app)
          .post(
            hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template),
          )
          .send({
            data: {
              email: template.users.user2.data.email.toUpperCase(),
              password: template.users.user2.data.password,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            template.users.user2.token = res.headers['x-jwt-token'];
            done();
          });
      }),
    );

    it(
      'A user should be able to reset their password',
      withFixture(ensureUser2, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/form/' + template.resources.user._id + '/submission/' + template.users.user2._id,
              template,
            ),
          )
          .set('x-jwt-token', template.users.user2.token)
          .send({
            data: {
              email: template.users.user2.data.email,
              password: user2TempPassword,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            template.users.user2.token = res.headers['x-jwt-token'];
            done();
          });
      }),
    );

    it(
      'A user should be able to login with new password',
      withFixture(ensureUser2TempPassword, function (done) {
        request(app)
          .post(
            hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template),
          )
          .send({
            data: {
              email: template.users.user2.data.email,
              password: user2TempPassword,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            template.users.user2.token = res.headers['x-jwt-token'];
            done();
          });
      }),
    );

    it(
      'A user should be able to set their password back to normal',
      withFixture(ensureUser2, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/form/' + template.resources.user._id + '/submission/' + template.users.user2._id,
              template,
            ),
          )
          .set('x-jwt-token', template.users.user2.token)
          .send({
            data: {
              email: template.users.user2.data.email,
              password: template.users.user2.data.password,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            template.users.user2.token = res.headers['x-jwt-token'];
            done();
          });
      }),
    );

    it('An Anonymous user should not be able to access the /current endpoint', function (done) {
      request(app)
        .get(hook.alter('url', '/current', template))
        .expect(401)
        .end(done);
    });

    it(
      'An administrator should be able to see the current User',
      withFixture(ensureAdmin, function (done) {
        request(app)
          .get(hook.alter('url', '/current', template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
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
              response.data.hasOwnProperty('email'),
              'The submission `data` should contain the `email`.',
            );
            assert.equal(response.data.email, template.users.admin.data.email);
            assert(
              !response.data.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              response.hasOwnProperty('form'),
              'The response should contain the resource `form`.',
            );
            assert.equal(response.form, template.resources.admin._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );

            // Update our template.users.admins data.
            var tempPassword = template.users.admin.data.password;
            template.users.admin = response;
            template.users.admin.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      }),
    );

    it(
      'A user should be able to see the current User',
      withFixture(ensureUser1, function (done) {
        request(app)
          .get(hook.alter('url', '/current', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect(200)
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
              response.data.hasOwnProperty('email'),
              'The submission `data` should contain the `email`.',
            );
            assert.equal(response.data.email, template.users.user1.data.email);
            assert(
              !response.data.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              response.hasOwnProperty('form'),
              'The response should contain the resource `form`.',
            );
            assert.equal(response.form, template.resources.user._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );

            // Update our template.users.admins data.
            var tempPassword = template.users.user1.data.password;
            template.users.user1 = response;
            template.users.user1.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      }),
    );

    it(
      'An Authenticated and Registered User should be able to logout',
      withFixture(ensureUser1, function (done) {
        var oldToken = null;
        request(app)
          .get(hook.alter('url', '/logout', template))
          .set('x-jwt-token', template.users.user1.token)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            // Confirm that the token was sent and empty.
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );
            assert.equal(res.headers['x-jwt-token'], '');
            done();
          });
      }),
    );

    it(
      'Attempt 5th bad login request, but after the accepted window.',
      withFixture(_.partial(primeUser1LoginAttempts, 4), function (done) {
        setTimeout(function () {
          request(app)
            .post(
              hook.alter('url', '/form/' + template.forms.userLogin._id + '/submission', template),
            )
            .send({
              data: {
                email: template.users.user1.data.email,
                password: 'badpassword!',
              },
            })
            .expect(401)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              assert.equal(res.text, 'User or password was incorrect');
              assert.equal(!res.headers['x-jwt-token'], true);
              done();
            });
        }, 4500);
      }),
    );

    var oldToken = null;
    it(
      'An Authenticated and Registered User should be able to login again',
      withFixture(ensureUser1, function (done) {
        oldToken = template.users.user1.token;
        request(app)
          .post(hook.alter('url', '/' + template.forms.userLogin.path, template))
          .send({
            data: {
              email: template.users.user1.data.email,
              password: template.users.user1.data.password,
            },
          })
          .expect('Content-Type', /json/)
          .expect(200)
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
              response.data.hasOwnProperty('email'),
              'The submission `data` should contain the `email`.',
            );
            assert.equal(response.data.email, template.users.user1.data.email);
            assert(
              !response.data.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              response.hasOwnProperty('form'),
              'The response should contain the resource `form`.',
            );
            assert.equal(response.form, template.resources.user._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );

            // Confirm the new token is different than the last.
            assert.notEqual(
              res.headers.hasOwnProperty('x-jwt-token'),
              oldToken,
              'The `x-jwt-token` recieved from re-logging in should be different than previously.',
            );

            // Update our testProject.owners data.
            var tempPassword = template.users.user1.data.password;
            template.users.user1 = response;
            template.users.user1.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      }),
    );

    it(
      'A User who has re-logged in for a User-Created Project should be able to view the current User',
      withFixture(ensureUser1, function (done) {
        request(app)
          .get('/current')
          .set('x-jwt-token', template.users.user1.token)
          .expect(200)
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
              response.data.hasOwnProperty('email'),
              'The submission `data` should contain the `email`.',
            );
            assert.equal(response.data.email, template.users.user1.data.email);
            assert(
              !response.data.hasOwnProperty('password'),
              'The submission `data` should not contain the `password`.',
            );
            assert(
              response.hasOwnProperty('form'),
              'The response should contain the resource `form`.',
            );
            assert.equal(response.form, template.resources.user._id);
            assert(
              res.headers.hasOwnProperty('x-jwt-token'),
              'The response should contain a `x-jwt-token` header.',
            );

            // Update our template.users.user1 data.
            var tempPassword = template.users.user1.data.password;
            template.users.user1 = response;
            template.users.user1.data.password = tempPassword;

            // Store the JWT for future API calls.
            template.users.user1.token = res.headers['x-jwt-token'];

            done();
          });
      }),
    );

    it(
      'A user who has update form definition permissions should be able to create actions on the form',
      withFixture(allOf(ensureAdmin, ensureUser1), function (done) {
        const adminToken = template.users.admin.token;
        const authenticatedUserRole = template.users.user1.roles[0];
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', adminToken)
          .expect(201)
          .send({
            title: 'createActionTesting',
            display: 'form',
            type: 'form',
            name: 'createActionTesting',
            path: 'createactiontesting',
            access: [
              {
                type: 'update_all',
                roles: [authenticatedUserRole],
              },
            ],
          })
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            const formId = res.body._id;
            const authenticatedUserToken = template.users.user1.token;
            const emailAction = {
              data: {
                priority: 0,
                name: 'email',
                title: 'Email',
                settings: {
                  transport: 'smtp',
                  from: 'no-reply@example.com',
                  replyTo: '',
                  emails: ['test@example.com'],
                  sendEach: false,
                  cc: [''],
                  bcc: [''],
                  subject: 'New submission for {{ form.title }}.',
                  template: 'https://pro.formview.io/assets/email.html',
                  message: '{{ submission(data, form.components) }}',
                  renderingMethod: 'dynamic',
                  attachFiles: false,
                  attachPDF: false,
                },
                handler: ['after'],
                method: ['create'],
                condition: {
                  conjunction: '',
                  conditions: [],
                  custom: '',
                },
                submit: true,
              },
            };
            request(app)
              .post(hook.alter('url', `/form/${formId}/action`, template))
              .set('x-jwt-token', authenticatedUserToken)
              .expect(201)
              .send(emailAction)
              .end((err) => {
                if (err) {
                  return done(err);
                }
                request(app)
                  .delete(hook.alter('url', `/form/${formId}`, template))
                  .set('x-jwt-token', adminToken)
                  .expect(200)
                  .end((err) => {
                    if (err) {
                      return done(err);
                    }
                    done();
                  });
              });
          });
      }),
    );
  });

  if (!customer) {
    describe('Get Temporary Tokens', function () {
      it('A User should not be able to get a temporary token without providing their current one.', function (done) {
        request(app)
          .get(hook.alter('url', '/token', template))
          .expect(400)
          .expect('No authentication token provided.')
          .end(done);
      });

      it(
        'A User should not be able to get a temporary token by providing a bad existing token.',
        withFixture(ensureUser1, function (done) {
          request(app)
            .get(hook.alter('url', '/token', template))
            .set('x-jwt-token', 'badtoken' + template.users.user1.token.substr(8))
            .expect(400)
            .expect('Bad Token')
            .end(done);
        }),
      );

      it(
        'A User should not be able to get a temporary token with an expire time set to beyond main token.',
        withFixture(ensureUser1, function (done) {
          request(app)
            .get(hook.alter('url', '/token', template))
            .set('x-jwt-token', template.users.user1.token)
            .set('x-expire', '1000000000000000')
            .expect(400)
            .expect('Cannot generate extended expiring temp token.')
            .end(done);
        }),
      );

      // Every test below mints the token it needs instead of reading one a
      // predecessor stashed. These are cheap, stateless artifacts, and sharing one is
      // what made the negative tests vacuous: run alone they were sending an empty
      // token, so the 401s they assert had nothing to do with the token's restrictions.
      var defaultTempToken = _.partial(createTempToken, {});
      var shortLivedTempToken = _.partial(createTempToken, { 'x-expire': 2 });
      var formPathToken = _.partial(createTempToken, { 'x-allow': 'GET:/form/[0-9a-z]+' });
      var formAndCurrentPathToken = _.partial(createTempToken, {
        'x-allow': 'GET:/form/[0-9a-z]+,GET:/current',
      });

      it(
        'Should allow them to create a default temp token with default expiration.',
        withToken(defaultTempToken, function (tempToken, done) {
          assert(tempToken.length > 10, 'Temporary token was not created');
          done();
        }),
      );

      it(
        'Should allow you to authenticate with the temporary token.',
        withToken(defaultTempToken, function (tempToken, done) {
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
        }),
      );

      it(
        'Should not allow you to get a new temp token using the old temp token.',
        withToken(defaultTempToken, function (tempToken, done) {
          request(app)
            .get(hook.alter('url', '/token', template))
            .set('x-jwt-token', tempToken)
            .expect(400)
            .expect('Cannot issue a temporary token using another temporary token.')
            .end(done);
        }),
      );

      it(
        'Should allow you to get a token with a different expire time.',
        withToken(shortLivedTempToken, function (tempToken, done) {
          assert(tempToken.length > 10, 'Temporary token was not created');
          done();
        }),
      );

      it(
        'Should allow you to use that token within the expiration',
        withToken(shortLivedTempToken, function (tempToken, done) {
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
        }),
      );

      it(
        'Should not allow you to use the token beyond the expiration',
        withToken(shortLivedTempToken, function (tempToken, done) {
          setTimeout(function () {
            request(app)
              .get(hook.alter('url', '/current', template))
              .set('x-jwt-token', tempToken)
              .expect(440)
              .expect('Token Expired')
              .end(done);
          }, 2000);
        }),
      );

      it(
        'Should allow you to get a token for a specific path',
        withToken(formPathToken, function (allowedToken, done) {
          assert(!!allowedToken, 'No allowed token generated');
          done();
        }),
      );

      it(
        'Should not allow you to navigate to certain paths',
        withToken(formPathToken, function (allowedToken, done) {
          request(app)
            .get(hook.alter('url', '/current', template))
            .set('x-jwt-token', allowedToken)
            .expect(401)
            .end(done);
        }),
      );

      it(
        'Should not allow you to perform methods on accepted paths with a single-path token',
        withToken(formPathToken, function (allowedToken, done) {
          request(app)
            .post(hook.alter('url', '/form/' + template.resources.user._id, template))
            .set('x-jwt-token', allowedToken)
            .expect(401)
            .end(done);
        }),
      );

      it(
        'Should allow you to see the path and method specified in the token (single-path token)',
        withToken(formPathToken, function (allowedToken, done) {
          request(app)
            .get(hook.alter('url', '/form/' + template.resources.user._id, template))
            .set('x-jwt-token', allowedToken)
            .expect(200)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }
              assert.equal(res.body._id, template.resources.user._id);
              done();
            });
        }),
      );

      it(
        'Should allow generation of tokens with more than one allowed paths.',
        withToken(formAndCurrentPathToken, function (allowedToken, done) {
          assert(!!allowedToken, 'No allowed token generated');
          done();
        }),
      );

      it(
        'Should not allow you get a different token',
        withToken(formAndCurrentPathToken, function (allowedToken, done) {
          request(app)
            .get(hook.alter('url', '/token', template))
            .set('x-jwt-token', allowedToken)
            .expect(400)
            .end(done);
        }),
      );

      it(
        'Should not allow you to perform methods on accepted paths with a multi-path token',
        withToken(formAndCurrentPathToken, function (allowedToken, done) {
          request(app)
            .post(hook.alter('url', '/form/' + template.resources.user._id, template))
            .set('x-jwt-token', allowedToken)
            .expect(401)
            .end(done);
        }),
      );

      it(
        'Should allow you to see the path and method specified in the token (multi-path token, form path)',
        withToken(formAndCurrentPathToken, function (allowedToken, done) {
          request(app)
            .get(hook.alter('url', '/form/' + template.resources.user._id, template))
            .set('x-jwt-token', allowedToken)
            .expect(200)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }
              assert.equal(res.body._id, template.resources.user._id);
              done();
            });
        }),
      );

      it(
        'Should allow you to see the path and method specified in the token (multi-path token, current path)',
        withToken(formAndCurrentPathToken, function (allowedToken, done) {
          request(app)
            .get(hook.alter('url', '/current', template))
            .set('x-jwt-token', allowedToken)
            .expect(200)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }
              assert.equal(res.body._id, template.users.user1._id);
              done();
            });
        }),
      );
    });
  }

  /**
   * partially authentication tests
   * partially permissions tests
   * partially submissions tests
   */
  describe('Self Access Permissions', function () {
    var dummy = {
      data: {
        email: chance.email(),
        password: chance.word({ length: 10 }),
      },
    };
    // The email the dummy account is created with. `dummy` is replaced by each server
    // response it takes part in, so the requested address needs its own handle.
    var dummyEmail = dummy.data.email;
    var dummyCreateResponse = null;
    var dummyLoginResponse = null;
    var oldAccess = null;

    // This suite walks the user resource through a series of submissionAccess states,
    // each installed by one `Update the user resource ...` test and read back by the
    // handful of tests after it. Every state is a fixture: install it unless the
    // resource is already in it. The guard is the effect itself -- the access the
    // resource currently grants -- not a record of whether the setter has run.
    var ownAccess = function (type) {
      return { type: type, roles: [template.roles.authenticated._id] };
    };
    var selfAccess = { type: 'self' };

    var comparable = function (submissionAccess) {
      return _.sortBy(
        _.map(submissionAccess, function (entry) {
          return { type: entry.type, roles: _.map(entry.roles || [], String) };
        }),
        'type',
      );
    };

    var accessState = function (entries) {
      return function (done) {
        var submissionAccess = entries();
        if (
          _.isEqual(
            comparable(template.resources.user.submissionAccess),
            comparable(submissionAccess),
          )
        ) {
          return done();
        }

        ensureAdmin(function (err) {
          if (err) {
            return done(err);
          }

          request(app)
            .put(hook.alter('url', '/form/' + template.resources.user._id, template))
            .set('x-jwt-token', template.users.admin.token)
            .send({ submissionAccess: submissionAccess })
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              template.resources.user = res.body;
              template.users.admin.token = res.headers['x-jwt-token'];
              done();
            });
        });
      };
    };

    var access = {
      none: accessState(function () {
        return [];
      }),
      readOwn: accessState(function () {
        return [ownAccess('read_own')];
      }),
      updateOwn: accessState(function () {
        return [ownAccess('update_own')];
      }),
      deleteOwn: accessState(function () {
        return [ownAccess('delete_own')];
      }),
      self: accessState(function () {
        return [selfAccess];
      }),
      readOwnAndSelf: accessState(function () {
        return [ownAccess('read_own'), selfAccess];
      }),
      updateOwnAndSelf: accessState(function () {
        return [ownAccess('update_own'), selfAccess];
      }),
      deleteOwnAndSelf: accessState(function () {
        return [ownAccess('delete_own'), selfAccess];
      }),
    };

    // The account the admin creates for these tests. Created while the resource has no
    // submissionAccess, exactly as the tests below do it in file order.
    var ensureDummy = function (done) {
      if (dummy._id) {
        return done();
      }

      allOf(
        ensureAdmin,
        access.none,
      )(function (err) {
        if (err) {
          return done(err);
        }

        request(app)
          .post(hook.alter('url', '/form/' + template.resources.user._id + '/submission', template))
          .set('x-jwt-token', template.users.admin.token)
          .send(dummy)
          .expect(201)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            // Clone before re-attaching the password: the test that asserts on this
            // response checks that `data` came back without one.
            var tempPassword = dummy.data.password;
            dummy = _.cloneDeep(res.body);
            dummy.data.password = tempPassword;
            dummyCreateResponse = res;
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      });
    };

    // Log the dummy in as itself. Guarded on `dummy.token`, which only this builder
    // ever sets -- the creating request above answers with the *admin's* refreshed
    // token, and every negative test below would pass for the wrong reason if that
    // token were the one they sent.
    var ensureDummyLogin = function (done) {
      if (dummy.token) {
        return done();
      }

      ensureDummy(function (err) {
        if (err) {
          return done(err);
        }

        request(app)
          .post(formSubmissionUrl(template.forms.userLogin))
          .send({
            data: {
              email: dummy.data.email,
              password: dummy.data.password,
            },
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var tempPassword = dummy.data.password;
            dummy = _.cloneDeep(res.body);
            dummy.data.password = tempPassword;
            dummy.token = res.headers['x-jwt-token'];
            dummyLoginResponse = res;
            done();
          });
      });
    };

    // What every self-access test needs: the dummy logged in as itself, then the user
    // resource in the given submissionAccess state. That order matters -- the login has
    // to happen before the resource stops granting the access it needs.
    var withAccess = function (state, test) {
      return withFixture(allOf(ensureDummyLogin, state), test);
    };

    before('Store the old user resource permissions', function (done) {
      ensureAdmin(function (err) {
        if (err) {
          return done(err);
        }

        request(app)
          .get(hook.alter('url', '/form/' + template.resources.user._id, template))
          .set('x-jwt-token', template.users.admin.token)
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            var response = res.body;
            oldAccess = {
              access: response.access,
              submissionAccess: response.submissionAccess,
            };

            // Store the JWT for future API calls.
            template.users.admin.token = res.headers['x-jwt-token'];

            done();
          });
      });
    });

    after('Restore the old user resource permissions', function (done) {
      request(app)
        .put(hook.alter('url', '/form/' + template.resources.user._id, template))
        .set('x-jwt-token', template.users.admin.token)
        .send(oldAccess)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
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

    it(
      'Update the user resource to have no submissionAccess',
      withFixture(access.none, function (done) {
        assert.equal(template.resources.user.submissionAccess.length, 0);
        done();
      }),
    );

    it('The resource owner can make a user account without permissions', function (done) {
      ensureDummy(function (err) {
        if (err) {
          return done(err);
        }

        var res = dummyCreateResponse;
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
          response.data.hasOwnProperty('email'),
          'The submission `data` should contain the `email`.',
        );
        assert.equal(response.data.email, dummyEmail);
        assert(
          !response.data.hasOwnProperty('password'),
          'The submission `data` should not contain the `password`.',
        );
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, template.resources.user._id);
        assert(
          res.headers.hasOwnProperty('x-jwt-token'),
          'The response should contain a `x-jwt-token` header.',
        );
        assert(
          response.hasOwnProperty('owner'),
          'The response should contain the resource `owner`.',
        );
        assert.equal(response.owner, template.users.admin._id);
        assert.equal(response.roles.length, 1);
        assert.equal(response.roles[0].toString(), template.roles.authenticated._id.toString());

        done();
      });
    });

    it(
      'An anonymous user should not be able to create a user account without permissions',
      withFixture(access.none, function (done) {
        request(app)
          .post(hook.alter('url', '/form/' + template.resources.user._id + '/submission', template))
          .send({
            data: {
              email: chance.email(),
              password: chance.word({ length: 10 }),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    // FA-923
    it(
      'An anonymous user should be able to access the resource form without submissionAccess permissions',
      withFixture(access.none, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .expect(200)
          .end(done);
      }),
    );

    it('A user (created by an admin) can login to their account', function (done) {
      ensureDummyLogin(function (err) {
        if (err) {
          return done(err);
        }

        var res = dummyLoginResponse;
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
          response.data.hasOwnProperty('email'),
          'The submission `data` should contain the `email`.',
        );
        assert.equal(response.data.email, dummyEmail);
        assert(
          !response.hasOwnProperty('password'),
          'The submission `data` should not contain the `password`.',
        );
        assert(
          !response.data.hasOwnProperty('password'),
          'The submission `data` should not contain the `password`.',
        );
        assert(response.hasOwnProperty('form'), 'The response should contain the resource `form`.');
        assert.equal(response.form, template.resources.user._id);
        assert(
          res.headers.hasOwnProperty('x-jwt-token'),
          'The response should contain a `x-jwt-token` header.',
        );

        done();
      });
    });

    // FA-923
    it(
      'A user without read submissionAccess permissions and no self access, can still read the resource form',
      withAccess(access.none, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user without read permissions, should not be able to read their submission',
      withAccess(access.none, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without read permissions, should not be able to read their submission, via index',
      withAccess(access.none, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without update permissions, should not be able to update their submission',
      withAccess(access.none, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without delete permissions, should not be able to delete their submission',
      withAccess(access.none, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'Update the user resource to have read_own access',
      withFixture(access.readOwn, function (done) {
        assert.equal(template.resources.user.submissionAccess.length, 1);
        assert.equal(template.resources.user.submissionAccess[0].type, 'read_own');
        done();
      }),
    );

    // FA-923
    it(
      'A user with read submissionAccess permissions and no self access, can still read the resource form',
      withAccess(access.readOwn, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user without read permissions (not the owner), should not be able to read their submission under read_own access',
      withAccess(access.readOwn, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without read permissions (not the owner), should not be able to read their submission, via index, under read_own access',
      withAccess(access.readOwn, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(function (err, res) {
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
      }),
    );

    it(
      'A user without update permissions (not the owner), should not be able to update their submission under read_own access',
      withAccess(access.readOwn, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without delete permissions (not the owner), should not be able to delete their submission under read_own access',
      withAccess(access.readOwn, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'Update the user resource to have update_own access',
      withFixture(access.updateOwn, function (done) {
        assert.equal(template.resources.user.submissionAccess.length, 1);
        assert.equal(template.resources.user.submissionAccess[0].type, 'update_own');
        done();
      }),
    );

    // FA-923
    it(
      'A user with update submissionAccess permissions and no self access, can still read the resource form',
      withAccess(access.updateOwn, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user without read permissions (not the owner), should not be able to read their submission under update_own access',
      withAccess(access.updateOwn, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without read permissions (not the owner), should not be able to read their submission, via index, under update_own access',
      withAccess(access.updateOwn, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without update permissions (not the owner), should not be able to update their submission under update_own access',
      withAccess(access.updateOwn, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without delete permissions (not the owner), should not be able to delete their submission under update_own access',
      withAccess(access.updateOwn, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'Update the user resource to have delete_own access',
      withFixture(access.deleteOwn, function (done) {
        assert.equal(template.resources.user.submissionAccess.length, 1);
        assert.equal(template.resources.user.submissionAccess[0].type, 'delete_own');
        done();
      }),
    );

    // FA-923
    it(
      'A user with delete submissionAccess permissions and no self access, can still read the resource form',
      withAccess(access.deleteOwn, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user without read permissions (not the owner), should not be able to read their submission under delete_own access',
      withAccess(access.deleteOwn, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without read permissions (not the owner), should not be able to read their submission, via index, under delete_own access',
      withAccess(access.deleteOwn, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without update permissions (not the owner), should not be able to update their submission under delete_own access',
      withAccess(access.deleteOwn, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without delete permissions (not the owner), should not be able to delete their submission under delete_own access',
      withAccess(access.deleteOwn, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'Update the user resource to have only self access',
      withFixture(access.self, function (done) {
        var submissionAccess = template.resources.user.submissionAccess;
        assert.equal(submissionAccess.length, 1);
        assert.equal(submissionAccess[0].type, 'self');
        assert(submissionAccess[0].roles instanceof Array);
        assert.deepEqual(submissionAccess[0].roles, []);
        done();
      }),
    );

    // FA-923
    it(
      'A user with no submissionAccess permissions and self access, can still read the resource form',
      withAccess(access.self, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user without read permissions, but self access (not the owner), should not be able to read their submission',
      withAccess(access.self, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without read permissions, but self access (not the owner), should not be able to read their submission, via index',
      withAccess(access.self, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without update permissions, but self access (not the owner), should not be able to update their submission',
      withAccess(access.self, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user without delete permissions, but self access (not the owner), should not be able to delete their submission',
      withAccess(access.self, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'Update the user resource to have read_own and self access',
      withFixture(access.readOwnAndSelf, function (done) {
        var types = _.map(template.resources.user.submissionAccess, 'type');
        assert.equal(template.resources.user.submissionAccess.length, 2);
        assert(types.indexOf('read_own') !== -1);
        assert(types.indexOf('self') !== -1);
        done();
      }),
    );

    // FA-923
    it(
      'A user with read submissionAccess permissions and self access, can still read the resource form',
      withAccess(access.readOwnAndSelf, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user with read_own and self access, not the owner, should be able to read their submission',
      withAccess(access.readOwnAndSelf, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user with read_own and self access, not the owner, should be able to read their submission, via index',
      withAccess(access.readOwnAndSelf, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(function (err, res) {
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
      }),
    );

    it(
      'A user with read_own and self access, not the owner, should not be able to update their submission',
      withAccess(access.readOwnAndSelf, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user with read_own and self access, not the owner, should not be able to delete their submission',
      withAccess(access.readOwnAndSelf, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'Update the user resource to have update_own and self access',
      withFixture(access.updateOwnAndSelf, function (done) {
        var types = _.map(template.resources.user.submissionAccess, 'type');
        assert.equal(template.resources.user.submissionAccess.length, 2);
        assert(types.indexOf('update_own') !== -1);
        assert(types.indexOf('self') !== -1);
        done();
      }),
    );

    // FA-923
    it(
      'A user with update submissionAccess permissions and self access, can still read the resource form',
      withAccess(access.updateOwnAndSelf, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user with update_own and self access, not the owner, should not be able to read their submission',
      withAccess(access.updateOwnAndSelf, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user with update_own and self access, not the owner, should not be able to read their submission, via index',
      withAccess(access.updateOwnAndSelf, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user with update_own and self access, not the owner, should be able to update their submission',
      withAccess(access.updateOwnAndSelf, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user with update_own and self access, not the owner, should not be able to delete their submission',
      withAccess(access.updateOwnAndSelf, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'Update the user resource to have delete_own and self access',
      withFixture(access.deleteOwnAndSelf, function (done) {
        var types = _.map(template.resources.user.submissionAccess, 'type');
        assert.equal(template.resources.user.submissionAccess.length, 2);
        assert(types.indexOf('delete_own') !== -1);
        assert(types.indexOf('self') !== -1);
        done();
      }),
    );

    // FA-923
    it(
      'A user with delete submissionAccess permissions and self access, can still read the resource form',
      withAccess(access.deleteOwnAndSelf, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path, template))
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );

    it(
      'A user with delete_own and self access, not the owner, should not be able to read their submission',
      withAccess(access.deleteOwnAndSelf, function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user with delete_own and self access, not the owner, should not be able to read their submission, via index',
      withAccess(access.deleteOwnAndSelf, function (done) {
        request(app)
          .get(hook.alter('url', '/' + template.resources.user.path + '/submission', template))
          .set('x-jwt-token', dummy.token)
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user with delete_own and self access, not the owner, should not be able to update their submission',
      withAccess(access.deleteOwnAndSelf, function (done) {
        request(app)
          .put(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .send({
            data: {
              email: chance.email(),
            },
          })
          .expect(401)
          .end(done);
      }),
    );

    it(
      'A user with delete_own and self access, not the owner, should be able to delete their submission',
      withAccess(access.deleteOwnAndSelf, function (done) {
        request(app)
          .delete(
            hook.alter(
              'url',
              '/' + template.resources.user.path + '/submission/' + dummy._id,
              template,
            ),
          )
          .set('x-jwt-token', dummy.token)
          .expect(200)
          .end(done);
      }),
    );
  });

  describe('Template Permissions', function () {
    it('An Anonymous user should not be able to export a project', function (done) {
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

    it(
      'An Admin user should be able to export a project',
      withFixture(ensureAdmin, function (done) {
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
                [
                  'title',
                  'version',
                  'description',
                  'name',
                  'roles',
                  'forms',
                  'actions',
                  'resources',
                ],
                Object.keys(response),
              ),
              [],
            );
            return done();
          });
      }),
    );
  });
};
