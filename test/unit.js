/* eslint-env mocha */
'use strict';

var assert = require('assert');
var fs = require('fs');
var docker = process.env.DOCKER;

module.exports = function(app, template, hook) {

  /**
   * Unit tests for various parts of the platform.
   */
  describe('Nunjucks Rendering', function() {
    var nunjucks = require('../src/util/nunjucks');

    nunjucks.environment.addFilter('test', function(string, param) {
      var retVal = this.env.params.form + ' : ' + string;
      if (param) {
        retVal += ' : ' + param;
      }
      return retVal;
    });

    it('Should render a string with tokens', function(done) {
      nunjucks.render('{{ data.firstName }} {{ data.lastName }}', {
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      })
      .then(test => {
        assert.equal(test, 'Travis Tidwell');
        done();
      })
      .catch(done);
    });

    it('Should timeout if someone puts bad code in the template', function(done) {
      var test = nunjucks.render('{{ callme() }}', {
        callme: function() {
          // Loop forever!!!!
          while (true) {};
        }
      })

      // FA-857 - No email will be sent if bad code if given.
      assert.equal(test, null);
      done();
    });

    it('Should not allow them to modify parameters in the template', function(done) {
      var params = {
        form: '123',
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      };

      nunjucks.environment.addFilter('test1', function(string) {
        return this.env.params.form + ' : ' + string;
      });

      var test = nunjucks.render('{% set form = "246" %}{{ form | test1 }} {{ data.firstName }} {{ data.lastName }}', params);
      assert.equal(test, '123 : 246 Travis Tidwell');
      done();
    });

    it('Should not expose private context variables.', function(done) {
      var params = {
        _private: {
          secret: '5678'
        },
        form: '123',
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      };
      var test = nunjucks.render('{{ _private.secret }}', params);
      assert.equal(test, '');
      done();
    });

    it('Should allow filters to have access to secret variables.', function(done) {
      var params = {
        _private: {
          secret: '5678'
        },
        form: '123',
        data: {
          firstName: 'Travis',
          lastName: 'Tidwell'
        }
      };

      nunjucks.environment.addFilter('secret', function(string, param) {
        return this.env.params._private.secret;
      });

      var test = nunjucks.render('{{ "test" | secret }}', params);
      assert.equal(test, '5678');
      done();
    });
  });

  describe('Email Template Rendering', function() {
    if (docker) {
      return;
    }

    var formio = hook.alter('formio', app.formio);
    var email = require('../src/util/email')(formio);
    var macros = require('../src/actions/macros/macros');
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
      var messageText = macros;
      messageText += (fs.readFileSync(__dirname + '/' + dirName + 'message.html')).toString();
      var message = {
        transport: 'test',
        from: from,
        emails: to,
        sendEach: false,
        subject: 'New submission for {{ form.title }}.',
        template: '',
        message: messageText
      };
      email.getParams(res, form, submission).then(params => {
        params.content = content;
        email.send(req, res, message, params, cb);
      });
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
      template.hooks.onEmails(1, function(emails) {
        var email = emails[0];
        assert.equal(email.subject, 'New submission for Test Form.');
        assert.equal(getLabel('firstName', email.html), 'First Name');
        assert.equal(getValue('firstName', email.html), 'Joe');
        assert.equal(getLabel('lastName', email.html), 'Last Name');
        assert.equal(getValue('lastName', email.html), 'Smith');
        assert.equal(getLabel('birthdate', email.html), 'Birth Date');
        assert.equal(getValue('birthdate', email.html), '2016-06-17');
        assert.equal(getValue('vehicles', email.html), '<table border="1" style="width:100%"><tr><th style="padding: 5px 10px;">Make</th><th style="padding: 5px 10px;">Model</th><th style="padding: 5px 10px;">Year</th></tr><tr><td style="padding:5px 10px;">Chevy</td><td style="padding:5px 10px;">Suburban</td><td style="padding:5px 10px;">2014</td></tr><tr><td style="padding:5px 10px;">Chevy</td><td style="padding:5px 10px;">Tahoe</td><td style="padding:5px 10px;">2014</td></tr><tr><td style="padding:5px 10px;">Ford</td><td style="padding:5px 10px;">F150</td><td style="padding:5px 10px;">2011</td></tr></table>');
        assert.equal(getValue('house', email.html), '<table border="1" style="width:100%"><tr><th style="text-align:right;padding: 5px 10px;">Area</th><td style="width:100%;padding:5px 10px;">2500</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Single Family</th><td style="width:100%;padding:5px 10px;">true</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Rooms</th><td style="width:100%;padding:5px 10px;">Master, Bedroom, Full Bath, Half Bath, Kitchen, Dining, Living, Garage</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Address</th><td style="width:100%;padding:5px 10px;">1234 Main, Hampton, AR 71744, USA</td></tr></table>');
        done();
      });
      sendMessage(['test@example.com'], 'me@example.com', 'test1', '');
    });

    it('Should render an email with content within the email.', function(done) {
      template.hooks.onEmails(1, function(emails) {
        var email = emails[0];
        assert.equal(email.subject, 'New submission for Test Form.');
        assert(email.html.indexOf('<div><p>Hello Joe Smith</p></div>') !== -1, 'Email content rendering failed.');
        done();
      });
      sendMessage(['test@example.com'], 'me@example.com', 'test2', '<p>Hello {{ data.firstName }} {{ data.lastName }}</p>');
    });
  });
};
