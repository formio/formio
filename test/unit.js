/* eslint-env mocha */
'use strict';

let assert = require('assert');
var chance = new (require('chance'))();
let fs = require('fs');
let docker = process.env.DOCKER;
const request = require('./formio-supertest');

module.exports = function(app, template, hook) {
  let Thread = require('formio-workers/Thread');

  /**
   * Unit tests for various parts of the platform.
   */
  describe('Nunjucks Rendering', function() {
    it('Should render a string with tokens', function(done) {
      new Thread('nunjucks').start({
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
  });

  describe('Email Template Rendering', function() {
    if (docker) {
      return;
    }

    var formio = hook.alter('formio', app.formio);
    var email = require('../src/util/email')(formio);
    var sendMessage = function(to, from, message, content, cb, attachFiles = false) {
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
        message: messageText,
        attachFiles
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

    // Disable until we can resolve test failurs.
   if (false) {
    it('Should render an email with attached files inside containers and editFrids.', function(done) {
      template.hooks.reset();
      sendMessage(['test@example.com'], 'me@example.com', 'test3', '<p>Hello</p>', (err, emails) => {
        if (err) {
          return done(err);
        }

        const email = emails[0];
        assert.equal(email.subject, 'New submission for Test Form.');

        assert(email.attachments.length === 4, 'Email should have all attachments');

        done();
      }, true);
    });
   }
  });
};
