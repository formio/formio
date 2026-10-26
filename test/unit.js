/* eslint-env mocha */
'use strict';

const mongoose = require('mongoose');
const assert = require('assert');
const fs = require('fs');
const docker = process.env.DOCKER;

module.exports = function(app, template, hook) {
  // let Thread = require('formio-workers/Thread');

  /**
   * Unit tests for various parts of the platform.
   */
  describe('Nunjucks Rendering', function() {
    return;
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

  describe('Url params', function() {
    const util = require('../src/util/util');

    it('Should parse the url parameters', function() {
      const params = util.getUrlParams('/form/123/submission/456');
      assert.deepEqual(params, {form: '123', submission: '456'});
    });

    it('Should normalize the case of the url parameter keys (CVE-2025-67718)', function() {
      assert.deepEqual(util.getUrlParams('/Form/123/SUBMISSION/456'), {form: '123', submission: '456'});
      assert.deepEqual(util.getUrlParams('/FORM/abc/Role/def'), {form: 'abc', role: 'def'});
    });

    it('Should not alter the case of the url parameter values', function() {
      assert.deepEqual(util.getUrlParams('/form/AbCdEf'), {form: 'AbCdEf'});
    });
  });

  describe('Reference $lookup DocumentDB compatibility (FIO-12058)', function () {
    it('beforeIndex $lookup stages must use equality-match form without let or pipeline', async function () {
      const formId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const mockRouter = {
        formio: {
          cache: {
            // 4.2.x cache.loadForm is callback-style.
            loadForm: (req, type, id, cb) =>
              cb(null, {
                _id: formId,
                components: [],
                settings: {},
                submissionAccess: [{ type: 'read_own', roles: [] }],
              }),
          },
          resources: {
            submission: {
              handlers: {
                beforeIndex: [
                  function (req, res, next) {
                    next();
                  },
                ],
              },
              getFindQuery: function (req) {
                return req.query || {};
              },
            },
          },
        },
      };
      const reference = require('../src/actions/properties/reference')(mockRouter);
      const req = {
        query: {},
        user: { _id: userId },
        accessRoles: [],
        params: {},
        childRequests: 0,
        modelQuery: { pipeline: [] },
        countQuery: {},
      };
      const component = {
        type: 'select',
        key: 'ref',
        reference: true,
        dataSrc: 'resource',
        data: { resource: formId.toString() },
      };

      await reference(component, {}, 'beforeIndex', null, {
        path: 'ref',
        req: req,
        res: {},
      });

      const lookups = (req.modelQuery.pipeline || []).filter(function (stage) {
        return stage && stage.$lookup;
      });
      assert.ok(lookups.length > 0, 'expected at least one $lookup stage');
      lookups.forEach(function (stage, index) {
        assert.equal(
          Object.prototype.hasOwnProperty.call(stage.$lookup, 'let'),
          false,
          '$lookup[' + index + '] must not use let (unsupported on DocumentDB/Cosmos)',
        );
        assert.equal(
          Object.prototype.hasOwnProperty.call(stage.$lookup, 'pipeline'),
          false,
          '$lookup[' + index + '] must not use pipeline (unsupported on DocumentDB/Cosmos)',
        );
        assert.ok(
          stage.$lookup.localField,
          '$lookup[' + index + '] must use localField for equality-match join',
        );
        assert.ok(
          stage.$lookup.foreignField,
          '$lookup[' + index + '] must use foreignField for equality-match join',
        );
      });
    });
  });

  describe('ObjectId transform', function() {
    it('Should transform a document\'s _id property to a string when calling toObject', function(done) {
      const schema = new mongoose.Schema({
        name: {type: String}
      });
      const Model = mongoose.model('Foo', schema);
      const doc = new Model({name: 'Test'});
      const obj = doc.toObject();
      assert.equal(typeof obj._id, 'string');
      done();
    });

    it('Should not transform a document\'s _id property to a string when calling toObject with transform option set to false', function(done) {
      const ObjectId = mongoose.Types.ObjectId;
      const schema = new mongoose.Schema({
        name: {type: String}
      });
      const Model = mongoose.model('Bar', schema);
      const doc = new Model({name: 'Test'});
      const obj = doc.toObject({transform: false});
      assert.equal(obj._id instanceof ObjectId, true);
      done();
    });
  });
};
