/* eslint-env mocha */
'use strict';

let assert = require('assert');
let fs = require('fs');
let docker = process.env.DOCKER;
var request = require('supertest');

module.exports = function(app, template, hook) {
  let Thread = require('formio-workers/Thread');

  /**
   * Unit tests for various parts of the platform.
   */
  describe('Nunjucks Rendering', function() {
    it('Should render a string with tokens', function(done) {
      new Thread(Thread.Tasks.nunjucks).start({
        render: '{{ data.firstName }} {{ data.lastName }}',
        context: {
          data: {
            firstName: 'Travis',
            lastName: 'Tidwell'
          }
        },
        filters: {
          test: function(string, param) {
            var retVal = this.env.params.form + ' : ' + string;
            if (param) {
              retVal += ' : ' + param;
            }
            return retVal;
          }
        }
      })
      .then(test => {
        assert.equal(test, 'Travis Tidwell');
        done();
      })
      .catch(done);
    });

    it('Should timeout if someone puts bad code in the template', function(done) {
      new Thread(Thread.Tasks.nunjucks).start({
        render: '{{ callme() }}',
        context: {
          callme: function() {
            // Loop forever!!!!
            while (true) {}
          }
        }
      })
      .then(test => {
        // FA-857 - No email will be sent if bad code is given.
        assert.equal(test, null);
        done();
      })
      .catch(done);
    });

    it('email template threads wont block eachother', function(done) {
      let request1 = new Promise((resolve, reject) => {
        new Thread(Thread.Tasks.nunjucks).start({
          render: '{{ callme() }}',
          context: {
            callme: function() {
              // Loop forever!!!!
              while (true) {}
            }
          }
        })
        .then(test => {
          // FA-857 - No email will be sent if bad code is given.
          assert.equal(test, null);
          resolve();
        })
        .catch(reject);
      });
      let request2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          new Thread(Thread.Tasks.nunjucks).start({
            render: '{{ callme2() }}',
            context: {
              callme2: function() {
                return `hello world`;
              }
            }
          })
          .then(test => {
            // FA-857 - No email will be sent if bad code is given.
            assert.equal(test, `hello world`);
            resolve();
          })
          .catch(reject);
        }, 5000);
      });

      Promise.all([request1, request2])
      .then(() => {
        return done();
      })
      .catch(done);
    });

    it('email template threads wont block other api requests', function(done) {
      let started = [];
      let finished = [];
      let request1 = new Promise((resolve, reject) => {
        started.push('request1');
        new Thread(Thread.Tasks.nunjucks).start({
          render: '{{ callme() }}',
          context: {
            callme: function() {
              // Loop forever!!!!
              while (true) {}
            }
          }
        })
        .then(test => {
          finished.push('request1');
          // FA-857 - No email will be sent if bad code is given.
          assert.equal(test, null);
          resolve();
        })
        .catch(reject);
      });
      let request2 = new Promise((resolve, reject) => {
        setTimeout(() => {
          started.push('request2');
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
                return reject(err);
              }
              finished.push('request2');

              let response = res.body;
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
              let tempPassword = template.users.admin.data.password;
              template.users.admin = response;
              template.users.admin.data.password = tempPassword;

              // Store the JWT for future API calls.
              template.users.admin.token = res.headers['x-jwt-token'];

              resolve();
            });
        }, 5000);
      });

      Promise.all([request1, request2])
      .then(() => {
        assert.equal(started.length, 2);
        assert.equal(started[0], 'request1');
        assert.equal(started[1], 'request2');
        assert.equal(finished.length, 2);
        assert.equal(finished[0], 'request2');
        assert.equal(finished[1], 'request1');
        return done();
      })
      .catch(done);
    });

    it('Should not allow them to modify parameters in the template', function(done) {
      new Thread(Thread.Tasks.nunjucks).start({
        render: '{% set form = "246" %}{{ form | test1 }} {{ data.firstName }} {{ data.lastName }}',
        context: {
          form: '123',
          data: {
            firstName: 'Travis',
            lastName: 'Tidwell'
          }
        },
        filters: {
          test1: function(string) {
            return this.env.params.form + ' : ' + string;
          }.toString()
        }
      })
      .then(test => {
        assert.equal(test, '123 : 246 Travis Tidwell');
        done();
      })
      .catch(done);
    });

    it('Should not expose private context variables.', function(done) {
      new Thread(Thread.Tasks.nunjucks).start({
        render: '{{ _private.secret }}',
        context: {
          _private: {
            secret: '5678'
          },
          form: '123',
          data: {
            firstName: 'Travis',
            lastName: 'Tidwell'
          }
        },
        filters: {
          test: function(string, param) {
            var retVal = this.env.params.form + ' : ' + string;
            if (param) {
              retVal += ' : ' + param;
            }
            return retVal;
          }
        }
      })
      .then(test => {
        assert.equal(test, '');
        done();
      })
      .catch(done);
    });

    it('Should allow filters to have access to secret variables.', function(done) {
      new Thread(Thread.Tasks.nunjucks).start({
        render: '{{ "test" | secret }}',
        context: {
          _private: {
            secret: '5678'
          },
          form: '123',
          data: {
            firstName: 'Travis',
            lastName: 'Tidwell'
          }
        },
        filters: {
          secret: function(string, param) {
            return this.env.params._private.secret;
          }.toString()
        }
      })
      .then(test => {
        assert.equal(test, '5678');
        done();
      })
      .catch(done);
    });
  });

  describe('Email Template Rendering', function() {
    if (docker) {
      return;
    }

    var formio = hook.alter('formio', app.formio);
    var email = require('../src/util/email')(formio);
    var sendMessage = function(to, from, message, content, cb) {
      var dirName = 'fixtures/email/' + message + '/';
      var submission = require('./' + dirName + 'submission.json');
      var form = require('./' + dirName + 'form.json');
      var res = {
        token: '098098098098',
        resource: {
          item: submission
        }
      };
      var req = {
        params: {
          formId: form._id
        },
        query: {
          test: 1
        },
        user: {
          _id: '123123123',
          data: {
            email: 'test@example.com',
            fullName: 'Joe Smith'
          }
        }
      };
      var messageText = (fs.readFileSync(__dirname + '/' + dirName + 'message.html')).toString();
      var message = {
        transport: 'test',
        from: from,
        emails: to,
        sendEach: false,
        subject: 'New submission for {{ form.title }}.',
        template: '',
        message: messageText
      };

      email.getParams(req, res, form, submission)
      .then(params => {
        params.content = content;
        email.send(req, res, message, params, (err, response) => {
          if (err) {
            return cb(err);
          }

          return cb(null, response);
        });
      })
      .catch(cb)
    };

    var getProp = function(type, name, message) {
      var regExp = new RegExp('---' + name + type + ':(.*?)---');
      var matches = message.match(regExp);
      if (matches.length > 1) {
        return matches[1];
      }
      return '';
    };

    var getValue = function(name, message) {
      return getProp('Value', name, message);
    };

    var getLabel = function(name, message) {
      return getProp('Label', name, message);
    };

    it('Should render an email with all the form and submission variables.', function(done) {
      template.hooks.reset();
      sendMessage(['test@example.com'], 'me@example.com', 'test1', '', (err, emails) => {
        if (err) {
          return done(err);
        }

        let email = emails[0];
        assert.equal(email.subject, 'New submission for Test Form.');
        assert.equal(getLabel('firstName', email.html), 'First Name');
        assert.equal(getValue('firstName', email.html), 'Joe');
        assert.equal(getLabel('lastName', email.html), 'Last Name');
        assert.equal(getValue('lastName', email.html), 'Smith');
        assert.equal(getLabel('birthdate', email.html), 'Birth Date');
        //assert.equal(getValue('birthdate', email.html), '2016-06-17');
        assert.equal(getValue('vehicles', email.html), '<table border="1" style="width:100%"><tr><th style="padding: 5px 10px;">Make</th><th style="padding: 5px 10px;">Model</th><th style="padding: 5px 10px;">Year</th></tr><tr><td style="padding:5px 10px;">Chevy</td><td style="padding:5px 10px;">Suburban</td><td style="padding:5px 10px;">2014</td></tr><tr><td style="padding:5px 10px;">Chevy</td><td style="padding:5px 10px;">Tahoe</td><td style="padding:5px 10px;">2014</td></tr><tr><td style="padding:5px 10px;">Ford</td><td style="padding:5px 10px;">F150</td><td style="padding:5px 10px;">2011</td></tr></table>');
        assert.equal(getValue('house', email.html), '<table border="1" style="width:100%"><tr><th style="text-align:right;padding: 5px 10px;">Area</th><td style="width:100%;padding:5px 10px;">2500</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Single Family</th><td style="width:100%;padding:5px 10px;">true</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Rooms</th><td style="width:100%;padding:5px 10px;">Master, Bedroom, Full Bath, Half Bath, Kitchen, Dining, Living, Garage</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Address</th><td style="width:100%;padding:5px 10px;">1234 Main, Hampton, AR 71744, USA</td></tr></table>');
        done();
      });
    });

    it('Should render an email with content within the email.', function(done) {
      template.hooks.reset();
      sendMessage(['test@example.com'], 'me@example.com', 'test2', '<p>Hello {{ data.firstName }} {{ data.lastName }}</p>', (err, emails) => {
        if (err) {
          return done(err);
        }

        let email = emails[0];
        assert.equal(email.subject, 'New submission for Test Form.');
        assert(email.html.indexOf('<div><p>Hello Joe Smith</p></div>') !== -1, 'Email content rendering failed.');
        done();
      });
    });
  });
};
