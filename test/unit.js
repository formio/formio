/* eslint-env mocha */
'use strict';

const mongoose = require('mongoose');
const assert = require('assert');
const fs = require('fs');
const docker = process.env.DOCKER;
const { sanitizeMongoConnectionString, redactConfig } = require('../src/db/util');

module.exports = function (app, template, hook) {
  // let Thread = require('formio-workers/Thread');

  /**
   * Unit tests for various parts of the platform.
   */
  describe('Nunjucks Rendering', function () {
    return;
    it('Should render a string with tokens', function (done) {
      new Thread('nunjucks')
        .start({
          render: '{{ data.firstName }} {{ data.lastName }}',
          context: {
            data: {
              firstName: 'Travis',
              lastName: 'Tidwell',
            },
          },
          filters: {
            test: function (string, param) {
              var retVal = this.env.params.form + ' : ' + string;
              if (param) {
                retVal += ' : ' + param;
              }
              return retVal;
            },
          },
        })
        .then((test) => {
          assert.equal(test, 'Travis Tidwell');
          done();
        })
        .catch(done);
    });
  });

  describe('Email Template Rendering', function () {
    if (docker) {
      return;
    }

    var formio = hook.alter('formio', app.formio);
    var email = require('../src/util/email')({ formio });
    var sendMessage = function (to, from, message, content, cb, attachFiles = false) {
      var dirName = 'fixtures/email/' + message + '/';
      var submission = require('./' + dirName + 'submission.json');
      var form = require('./' + dirName + 'form.json');
      var res = {
        token: '098098098098',
        resource: {
          item: submission,
        },
      };
      var req = {
        params: {
          formId: form._id,
        },
        query: {
          test: 1,
        },
        user: {
          _id: '123123123',
          data: {
            email: 'test@example.com',
            fullName: 'Joe Smith',
          },
        },
      };
      var messageText = fs.readFileSync(__dirname + '/' + dirName + 'message.html').toString();
      var message = {
        transport: 'test',
        from: from,
        emails: to,
        sendEach: false,
        subject: 'New submission for {{ form.title }}.',
        template: '',
        message: messageText,
        attachFiles,
      };

      email
        .getParams(req, res, form, submission)
        .then((params) => {
          params.content = content;
          email
            .send(req, res, message, params)
            .then((response) => cb(null, response))
            .catch(cb);
        })
        .catch(cb);
    };

    var getProp = function (type, name, message) {
      var regExp = new RegExp('---' + name + type + ':(.*?)---');
      var matches = message.match(regExp);
      if (matches.length > 1) {
        return matches[1];
      }
      return '';
    };

    var getValue = function (name, message) {
      return getProp('Value', name, message);
    };

    var getLabel = function (name, message) {
      return getProp('Label', name, message);
    };

    it('Should render an email with all the form and submission variables.', function (done) {
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

        assert.equal(
          getValue('vehicles', email.html),
          '<table border="1" style="width:100%"><tr><th style="padding: 5px 10px;">Make</th><th style="padding: 5px 10px;">Model</th><th style="padding: 5px 10px;">Year</th></tr><tr><td style="padding:5px 10px;">Chevy</td><td style="padding:5px 10px;">Suburban</td><td style="padding:5px 10px;">2014</td></tr><tr><td style="padding:5px 10px;">Chevy</td><td style="padding:5px 10px;">Tahoe</td><td style="padding:5px 10px;">2014</td></tr><tr><td style="padding:5px 10px;">Ford</td><td style="padding:5px 10px;">F150</td><td style="padding:5px 10px;">2011</td></tr></table>',
        );

        assert.equal(
          getValue('house', email.html),
          '<table border="1" style="width:100%"><tr><th style="text-align:right;padding: 5px 10px;">Area</th><td style="width:100%;padding:5px 10px;">2500</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Single Family</th><td style="width:100%;padding:5px 10px;">true</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Rooms</th><td style="width:100%;padding:5px 10px;">Master, Bedroom, Full Bath, Half Bath, Kitchen, Dining, Living, Garage</td></tr><tr><th style="text-align:right;padding: 5px 10px;">Address</th><td style="width:100%;padding:5px 10px;">1234 Main, Hampton, AR 71744, USA</td></tr></table>',
        );
        done();
      });
    });

    it('Should render an email with content within the email.', function (done) {
      template.hooks.reset();
      sendMessage(
        ['test@example.com'],
        'me@example.com',
        'test2',
        '<p>Hello {{ data.firstName }} {{ data.lastName }}</p>',
        (err, emails) => {
          if (err) {
            return done(err);
          }

          let email = emails[0];
          assert.equal(email.subject, 'New submission for Test Form.');
          assert(
            email.html.indexOf('<div><p>Hello Joe Smith</p></div>') !== -1,
            'Email content rendering failed.',
          );
          done();
        },
      );
    });

    // Disable until we can resolve test failurs.
    if (false) {
      it('Should render an email with attached files inside containers and editFrids.', function (done) {
        template.hooks.reset();
        sendMessage(
          ['test@example.com'],
          'me@example.com',
          'test3',
          '<p>Hello</p>',
          (err, emails) => {
            if (err) {
              return done(err);
            }

            const email = emails[0];
            assert.equal(email.subject, 'New submission for Test Form.');

            assert(email.attachments.length === 4, 'Email should have all attachments');

            done();
          },
          true,
        );
      });
    }
  });

  describe('ObjectId transform', function () {
    it("Should transform a document's _id property to a string when calling toObject", function (done) {
      const schema = new mongoose.Schema({
        name: { type: String },
      });
      const Model = mongoose.model('Foo', schema);
      const doc = new Model({ name: 'Test' });
      const obj = doc.toObject();
      assert.equal(typeof obj._id, 'string');
      done();
    });

    it("Should not transform a document's _id property to a string when calling toObject with transform option set to false", function (done) {
      const ObjectId = mongoose.Types.ObjectId;
      const schema = new mongoose.Schema({
        name: { type: String },
      });
      const Model = mongoose.model('Bar', schema);
      const doc = new Model({ name: 'Test' });
      const obj = doc.toObject({ transform: false });
      assert.equal(obj._id instanceof ObjectId, true);
      done();
    });
  });

  describe('Sanitize db url', function () {
    it('Should sanitize a db url with a password', function () {
      const url = 'mongodb://user:password@localhost:27017/db';
      const sanitized = sanitizeMongoConnectionString(url);
      assert.equal(sanitized, 'mongodb://user:***@localhost:27017/db');
    });

    it('Should sanitize a db url without a password', function () {
      const url = 'mongodb://user@localhost:27017/db';
      const sanitized = sanitizeMongoConnectionString(url);
      assert.equal(sanitized, 'mongodb://user@localhost:27017/db');
    });

    it('Should sanitize a db url with a password and +srv', function () {
      const url = 'mongodb+srv://user:password@localhost:27017/db';
      const sanitized = sanitizeMongoConnectionString(url);
      assert.equal(sanitized, 'mongodb+srv://user:***@localhost:27017/db');
    });

    it('Should sanitize a db url without a password and +srv', function () {
      const url = 'mongodb+srv://user@localhost:27017/db';
      const sanitized = sanitizeMongoConnectionString(url);
      assert.equal(sanitized, 'mongodb+srv://user@localhost:27017/db');
    });

    it('Should not be affected by query string params', function () {
      const url = 'mongodb://user:password@localhost:27017/db?authSource=admin';
      const sanitized = sanitizeMongoConnectionString(url);
      assert.equal(sanitized, 'mongodb://user:***@localhost:27017/db?authSource=admin');
    });
  });

  describe('Redact db config', function () {
    it('Should redact sensitive nested config values without mutating the source', function () {
      const config = {
        domain: 'http://localhost:3001',
        port: 3001,
        mongo: 'mongodb://user:password@localhost:27017/db?authSource=admin',
        mongoConfig: '{"auth":{"password":"mongo-config-pass"}}',
        mongoSecret: 'db-secret',
        mongoSecretOld: 'old-db-secret',
        mongoSA: 'mongo-sa',
        mongoCA: 'mongo-ca',
        mongoSSL: 'mongo-ssl',
        mongoSSLValidate: true,
        mongoSSLPassword: 'ssl-password',
        sslEnabled: true,
        sslKey: 'ssl-key',
        sslCert: 'ssl-cert',
        licenseKey: 'license-key',
        pdfProjectApiKey: 'pdf-api-key',
        esignPrivateKeyPath: 'esign-private-key-path',
        remoteSecret: 'remote-secret',
        userAPIKey: 'fortis-api-key',
        jwt: {
          secret: 'jwt-secret',
          expireTime: 240,
        },
        email: {
          username: 'sendgrid-user',
          password: 'sendgrid-password',
        },
        dropbox: {
          clientId: 'dropbox-client-id',
          clientSecret: 'dropbox-client-secret',
        },
        nested: [
          {
            token: 'nested-token',
            apiKey: 'nested-api-key',
            privateKey: 'nested-private-key',
            uri: 'mongodb+srv://nested:nested-password@localhost/db',
            visible: 'visible-value',
          },
        ],
      };

      const redacted = redactConfig(config);
      const serialized = JSON.stringify(redacted);

      assert.equal(redacted.domain, config.domain);
      assert.equal(redacted.port, config.port);
      assert.equal(redacted.sslEnabled, config.sslEnabled);
      assert.equal(redacted.mongoSSLValidate, config.mongoSSLValidate);
      assert.equal(redacted.mongo, 'mongodb://user:***@localhost:27017/db?authSource=admin');
      assert.equal(redacted.jwt.expireTime, config.jwt.expireTime);
      assert.equal(redacted.dropbox.clientId, config.dropbox.clientId);
      assert.equal(redacted.nested[0].token, config.nested[0].token);
      assert.equal(redacted.nested[0].uri, 'mongodb+srv://nested:***@localhost/db');
      assert.equal(redacted.nested[0].visible, config.nested[0].visible);

      [
        'mongo-config-pass',
        'db-secret',
        'old-db-secret',
        'mongo-sa',
        'mongo-ca',
        'mongo-ssl',
        'ssl-password',
        'ssl-key',
        'ssl-cert',
        'license-key',
        'pdf-api-key',
        'esign-private-key-path',
        'remote-secret',
        'fortis-api-key',
        'jwt-secret',
        'sendgrid-password',
        'dropbox-client-secret',
        'nested-api-key',
        'nested-private-key',
        'nested-password',
      ].forEach((secret) => {
        assert.equal(serialized.includes(secret), false);
      });

      assert.equal(config.mongoSecret, 'db-secret');
      assert.equal(config.jwt.secret, 'jwt-secret');
      assert.equal(config.dropbox.clientSecret, 'dropbox-client-secret');
    });
  });

  describe('countCustomJsComponents', function () {
    const util = require('../src/util/util');

    it('Should count every component carrying custom JavaScript, recursing into nested components', function () {
      const form = {
        components: [
          { type: 'textfield', key: 'a', customConditional: 'show = true;' },
          { type: 'textfield', key: 'b', calculateValue: 'value = 1;' },
          { type: 'textfield', key: 'c', validate: { custom: 'valid = true;' } },
          { type: 'textfield', key: 'd', customDefaultValue: 'value = 2;' },
          { type: 'textfield', key: 'e', logic: [{ name: 'l', trigger: {}, actions: [] }] },
          { type: 'textfield', key: 'plain' },
          { type: 'textfield', key: 'emptyLogic', logic: [] },
          {
            type: 'container',
            key: 'cont',
            components: [{ type: 'textfield', key: 'nested', customConditional: 'show = false;' }],
          },
        ],
      };
      assert.equal(util.countCustomJsComponents(form), 6);
    });
  });

  describe('isNextgenValidatorEnabled', function () {
    const util = require('../src/util/util');
    // Unregistered hook (standalone OSS): hook.alter returns the value it was given (the key string).
    const unregisteredHook = { alter: (name, value) => value };
    const resolvedHook = (result) => ({ alter: () => result });

    afterEach(function () {
      delete process.env.USE_NEXTGEN_VALIDATOR;
    });

    it('Should use the boolean the isFeatureEnabled hook resolves (enterprise path)', function () {
      assert.equal(util.isNextgenValidatorEnabled(resolvedHook(true)), true);
      assert.equal(util.isNextgenValidatorEnabled(resolvedHook(false)), false);
    });

    it('Should fall back to the env var when the hook is unregistered, defaulting off', function () {
      assert.equal(util.isNextgenValidatorEnabled(unregisteredHook), false);
      process.env.USE_NEXTGEN_VALIDATOR = '1';
      assert.equal(util.isNextgenValidatorEnabled(unregisteredHook), true);
      process.env.USE_NEXTGEN_VALIDATOR = '0';
      assert.equal(util.isNextgenValidatorEnabled(unregisteredHook), false);
    });
  });

  // FIO-12058: DocumentDB/Cosmos reject $lookup.let / pipeline. Reference index hydration
  // must emit equality-match $lookup only; access control is applied after the join.
  describe('Reference $lookup DocumentDB compatibility (FIO-12058)', function () {
    it('beforeIndex $lookup stages must use equality-match form without let or pipeline', async function () {
      const formId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const mockRouter = {
        formio: {
          cache: {
            loadForm: async () => ({
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
  describe('ensureIds', function () {
    const util = require('../src/util/util');
    const ObjectId = mongoose.Types.ObjectId;
    const embeddedIds = {
      _id: '507f1f77bcf86cd799439011',
      form: '5692b920d1028f01000407e7',
      owner: '5692b920d1028f01000407e8',
      project: '5692b920d1028f01000407e9',
    };

    it('Should leave a root-level `project` textfield value as a string', function () {
      const data = {
        project: '58e44a71412603008b727506',
        id: '58e44a72412603008b72750d',
        path: 'pdf',
        status: 'active',
      };
      util.ensureIds(data);
      assert.equal(typeof data.project, 'string');
      assert.equal(data.project, '58e44a71412603008b727506');
    });

    it('Should leave id-shaped strings in a plain data row as strings', function () {
      const data = {
        grid: [
          {
            project: '5692b920d1028f01000407e9',
            owner: '5692b920d1028f01000407e8',
            form: '5692b920d1028f01000407e7',
          },
        ],
      };
      util.ensureIds(data);
      const row = data.grid[0];
      assert.equal(typeof row.project, 'string');
      assert.equal(typeof row.owner, 'string');
      assert.equal(typeof row.form, 'string');
    });

    it('Should coerce the ids of an embedded submission to ObjectIds', function () {
      const data = {
        embedded: [{ ...embeddedIds, data: { name: 'Apple' }, metadata: {} }],
      };
      util.ensureIds(data);
      const item = data.embedded[0];
      Object.keys(embeddedIds).forEach((key) => {
        assert.ok(item[key] instanceof ObjectId, `data.embedded[0].${key} should be an ObjectId`);
        assert.equal(item[key].toString(), embeddedIds[key]);
      });
    });

    it('Should coerce ids for a submission nested inside another submission', function () {
      const data = {
        outer: {
          _id: '507f1f77bcf86cd799439011',
          form: '5692b920d1028f01000407e7',
          data: {
            inner: {
              _id: '507f1f77bcf86cd799439012',
              form: '5692b920d1028f01000407e8',
              data: { name: 'Nested' },
            },
          },
        },
      };
      util.ensureIds(data);
      assert.ok(data.outer._id instanceof ObjectId, 'outer._id should be an ObjectId');
      assert.ok(data.outer.data.inner._id instanceof ObjectId, 'inner._id should be an ObjectId');
      assert.ok(data.outer.data.inner.form instanceof ObjectId, 'inner.form should be an ObjectId');
    });

    // FIO-12058 + FIO-12093: save-as-reference shells are {_id} only. Equality-match $lookup
    // needs ObjectIds; always coerce _id even when `data` is absent (do not coerce form/owner/project).
    it('Should coerce bare reference-shell _id strings to ObjectIds', function () {
      const data = {
        form: { _id: '507f1f77bcf86cd799439011' },
        select: [{ _id: '507f1f77bcf86cd799439012' }],
      };
      util.ensureIds(data);
      assert.ok(data.form._id instanceof ObjectId, 'reference shell _id should be an ObjectId');
      assert.ok(data.select[0]._id instanceof ObjectId, 'multiple reference shell _id should be an ObjectId');
      assert.equal(Object.keys(data.form).join(','), '_id');
    });

    it('Should report whether anything changed', function () {
      assert.equal(util.ensureIds({ project: '58e44a71412603008b727506' }), false);
      assert.equal(util.ensureIds({ embedded: { ...embeddedIds, data: {} } }), true);
    });
  });
};
