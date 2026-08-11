/* eslint-disable strict */
/* eslint-disable max-len */
/* eslint-env mocha */
const request = require('./formio-supertest');
var assert = require('assert');
var Chance = require('chance');
var chance = new Chance();
var _ = require('lodash');
var docker = process.env.DOCKER;
const nock = require('nock');
const mongoose = require('mongoose');

module.exports = function (app, template, hook) {
  var Helper = require('./helper')(app);
  var helper = null;

  function updateFormAndGetSubmissions(form, done) {
    helper.updateForm(form, (err) => {
      if (err) {
        return done(err);
      }

      helper.getSubmissions(form.name, (err, formsubs) => {
        if (err) {
          return done(err);
        }
        done(null, formsubs);
      });
    });
  }
  nock('https://random.com')
    .get('/')
    .reply(200, [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

  describe('Form Submissions', function () {
    it('Sets up a default project', function (done) {
      var owner = app.hasProjects || docker ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().user('user', 'user1').execute(done);
    });

    describe('Unnested Submissions', function () {
      it('Saves values for each single value component type1', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Saves values for each single value component type2', function (done) {
        var test = require('./fixtures/forms/singlecomponents2.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            signatureSubmission1 = helper.getLastSubmission();
            assert.deepEqual(test.submission, signatureSubmission1.data);
            done();
          });
      });

      var signatureSubmission1 = null;
      it('Saves submission with a null signature.', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents2.js'));
        test.submission.signature2 = null;
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            signatureSubmission1 = helper.getLastSubmission();
            // Should coerse the value to an empty string.
            test.submission.signature2 = '';
            assert.deepEqual(test.submission, signatureSubmission1.data);
            done();
          });
      });

      it('Updates the submission with a null signature', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents2.js'));
        var updateSub = _.cloneDeep(signatureSubmission1);
        updateSub.data.signature2 = null;
        helper.updateSubmission(updateSub, function (err, updated) {
          // Should coerse the value to an empty string.
          test.submission.signature2 = '';
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      var signatureSubmission = null;
      it('Saves values with required signature', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            signatureSubmission = helper.getLastSubmission();
            assert.deepEqual(test.submission, signatureSubmission.data);
            done();
          });
      });

      it('Updating signatures does not wipe out the signature.', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        var updateSub = _.cloneDeep(signatureSubmission);
        helper.updateSubmission(updateSub, function (err, updated) {
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      it('Saving signatures with Bad string does not wipe out the signature.', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        var updateSub = _.cloneDeep(signatureSubmission);
        updateSub.data.signature2 = 'YES';
        helper.updateSubmission(updateSub, function (err, updated) {
          // Ensure that it does not erase the signature.
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      it('Saving signatures with Any other string does not wipe out the signature.', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        var updateSub = _.cloneDeep(signatureSubmission);
        updateSub.data.signature2 = 'sdfsfsdfsdf';
        helper.updateSubmission(updateSub, function (err, updated) {
          // Ensure that it does not erase the signature.
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      it('Updating signatures with empty string invalidates.', function (done) {
        var updateSub = _.cloneDeep(signatureSubmission);
        updateSub.data.signature2 = '';
        helper.updateSubmission(
          updateSub,
          helper.owner,
          [/application\/json/, 400],
          function (err, updated) {
            // It should fail validation.
            assert.equal(updated.name, 'ValidationError');
            assert.equal(updated.details.length, 1);
            assert.equal(updated.details[0].message, 'Signature is required');
            assert.equal(updated.details[0].path, 'signature2');
            assert.equal(updated.details[0].context.validator, 'required');
            done();
          },
        );
      });

      it('Gives an error with an empty signature.', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        test.submission.signature2 = '';
        helper
          .form('test', test.components)
          .submission(test.submission)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(submission.name, 'ValidationError');
            assert.equal(submission.details.length, 1);
            assert.equal(submission.details[0].message, 'Signature is required');
            assert.equal(submission.details[0].path, 'signature2');
            assert.equal(submission.details[0].context.validator, 'required');
            done();
          });
      });

      it('Gives an error with a signature not present.', function (done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        delete test.submission.signature2;
        helper
          .form('test', test.components)
          .submission(test.submission)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(submission.name, 'ValidationError');
            assert.equal(submission.details.length, 1);
            assert.equal(submission.details[0].message, 'Signature is required');
            assert.equal(submission.details[0].path, 'signature2');
            assert.equal(submission.details[0].context.validator, 'required');
            done();
          });
      });

      it('Throws away extra values', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var values = Object.assign({}, test.submission, {
          extra: true,
          more: 'stuff',
          objectval: {
            other: 'things',
          },
          arrayVal: ['never', 'gonna', 'give', 'you', 'up'],
        });
        helper
          .form('test', test.components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Should validate input mask', function (done) {
        var components = [
          {
            label: 'Text Field',
            inputMask: 'aaa',
            applyMaskOn: 'change',
            tableView: true,
            validateWhenHidden: false,
            key: 'textField',
            type: 'textfield',
            input: true,
          },
        ];

        var values = {
          textField: '123',
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            var submission = helper.getLastSubmission();
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  hasLabel: true,
                  index: 0,
                  key: 'textField',
                  validator: 'mask',
                  label: 'Text Field',
                  path: 'textField',
                  value: '123',
                },
                message: 'Text Field does not match the mask.',
                level: 'error',
                path: ['textField'],
              },
            ]);
            done();
          });
      });

      it('Saves values for each multiple value component', function (done) {
        var test = require('./fixtures/forms/multicomponents.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });
    });

    describe('Submissions with Data Source components', function () {
      const forms = require('./fixtures/forms/dataSourceComponents.js');

      it('Data Source component with Trigger on Server: false should not be triggered on server', function (done) {
        const test = forms.triggerOnServer;

        helper
          .form('test', test.components)
          .submission({ data: test.submission })
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            const submission = helper.getLastSubmission();
            assert.strictEqual(Object.keys(submission.data).length, 1);
            assert('textArea' in submission.data);
            assert.equal(submission.data.textArea, 'should be displayed');
            done();
          });
      });

      it('Data Source component with Trigger on Server: true should be triggered on server', function (done) {
        const test = forms.notTriggerOnServer;
        helper
          .form('test', test.components)
          .submission({ data: test.submission })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            const submission = helper.getLastSubmission();
            assert.strictEqual(Object.keys(submission.data).length, 0);
            done();
          });
      });

      it('Data from None Persistent Data Source component is not saved, even if it was received from client', function (done) {
        const test = forms.nonePersistent;
        helper
          .form('test', test.components)
          .submission({ data: test.submission })
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            const submission = helper.getLastSubmission();
            assert.strictEqual(Object.keys(submission.data).length, 1);
            assert.strictEqual('dataSource' in submission.data, false);
            done();
          });
      });

      it('Data from Server Persistent Data Source component is saved', function (done) {
        const test = forms.persistent;
        helper
          .form('test', test.components)
          .submission({ data: test.submission })
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            const submission = helper.getLastSubmission();
            assert.strictEqual(Object.keys(submission.data).length, 2);
            assert.strictEqual('dataSource' in submission.data, true);
            done();
          });
      });

      it('Data from Client Only Persistent Data Source component is not saved', function (done) {
        const test = forms.clientOnly;
        helper
          .form('test', test.components)
          .submission({ data: test.submission })
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            const submission = helper.getLastSubmission();
            assert.strictEqual(Object.keys(submission.data).length, 1);
            assert.strictEqual('dataSource' in submission.data, false);
            done();
          });
      });
    });

    describe('Server Calculated', function () {
      it('Recalculate value on server', function (done) {
        var test = require('./fixtures/forms/servercalculate.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);

            done();
          });
      });

      it('Fails to recalculate value because of corrupted submission', function (done) {
        var test = require('./fixtures/forms/servercalculate.js');
        helper
          .form('test', test.components)
          .submission(test.falseSubmission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.falseSubmission, submission.data);

            done();
          });
      });
    });

    describe('Fieldset nesting', function () {
      it('Nests single value components in a fieldset', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            key: 'fieldset1',
            input: false,
            tableView: true,
            legend: 'Fieldset',
            components: test.components,
            type: 'fieldset',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a fieldset', function (done) {
        var test = require('./fixtures/forms/multicomponents.js');
        var components = [
          {
            key: 'fieldset1',
            input: false,
            tableView: true,
            legend: 'Fieldset',
            components: test.components,
            type: 'fieldset',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });
    });

    describe('Column nesting', function () {
      it('Nests single value components in a column', function (done) {
        var test1 = require('./fixtures/forms/singlecomponents1.js');
        var test2 = require('./fixtures/forms/singlecomponents2.js');
        var components = [
          {
            key: 'columns1',
            input: false,
            columns: [
              {
                components: test1.components,
              },
              {
                components: test2.components,
              },
            ],
            type: 'columns',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        var combined = Object.assign({}, test1.submission, test2.submission);
        helper
          .form('test', components)
          .submission(combined)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(combined, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a column', function (done) {
        var test1 = require('./fixtures/forms/singlecomponents1.js');
        var test2 = require('./fixtures/forms/multicomponents.js');
        var components = [
          {
            key: 'columns1',
            input: false,
            columns: [
              {
                components: test1.components,
              },
              {
                components: test2.components,
              },
            ],
            type: 'columns',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        var combined = Object.assign({}, test1.submission, test2.submission);
        helper
          .form('test', components)
          .submission(combined)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(combined, submission.data);
            done();
          });
      });
    });

    describe('Panel nesting', function () {
      it('Nests single value components in a panel', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            key: 'panel1',
            input: false,
            title: 'Panel',
            theme: 'default',
            components: test.components,
            type: 'panel',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a panel', function (done) {
        var test = require('./fixtures/forms/multicomponents.js');
        var components = [
          {
            key: 'panel1',
            input: false,
            title: 'Panel',
            theme: 'default',
            components: test.components,
            type: 'panel',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });
    });

    describe('Well nesting', function () {
      it('Nests single value components in a well', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            key: 'well1',
            input: false,
            components: test.components,
            type: 'well',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a well', function (done) {
        var test = require('./fixtures/forms/multicomponents.js');
        var components = [
          {
            key: 'well1',
            input: false,
            components: test.components,
            type: 'well',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });
    });

    describe('Table nesting', function () {
      it('Nests components in a table', function (done) {
        var test1 = require('./fixtures/forms/singlecomponents1.js');
        var test2 = require('./fixtures/forms/singlecomponents2.js');
        var test3 = require('./fixtures/forms/multicomponents.js');
        var components = [
          {
            key: 'table1',
            conditional: {
              eq: '',
              when: null,
              show: null,
            },
            type: 'table',
            condensed: false,
            hover: false,
            bordered: true,
            striped: true,
            caption: '',
            header: [],
            rows: [
              [
                {
                  components: test1.components,
                },
                {
                  components: [],
                },
                {
                  components: [],
                },
              ],
              [
                {
                  components: [],
                },
                {
                  components: test2.components,
                },
                {
                  components: [],
                },
              ],
              [
                {
                  components: [],
                },
                {
                  components: [],
                },
                {
                  components: test3.components,
                },
              ],
            ],
            numCols: 3,
            numRows: 3,
            input: false,
          },
        ];

        var values = Object.assign({}, test1.submission, test2.submission, test3.submission);
        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Custom components', function () {
      it('Saves custom components', function (done) {
        var test = require('./fixtures/forms/custom.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests single value components in a custom component', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            key: 'custom1',
            input: false,
            tableView: true,
            legend: 'Custom',
            components: test.components,
            type: 'mycustomtype',
          },
        ];

        helper
          .form('customform', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      //it('Nests single value components in a custom tree component', function(done) {
      //  var test = require('./fixtures/forms/singlecomponents1.js');
      //  var components = [{
      //    "key": "custom1",
      //    "input": false,
      //    "tableView": true,
      //    "tree": true,
      //    "legend": "Custom",
      //    "components": test.components,
      //    "type": "mycustomtype"
      //  }];
      //
      //  var submissionData = { custom1: test.submission };
      //
      //  helper
      //    .form('customform', components)
      //    .submission(submissionData)
      //    .execute(function(err) {
      //      if (err) {
      //        return done(err);
      //      }
      //
      //      var submission = helper.getLastSubmission();
      //      assert.deepEqual(submissionData, submission.data);
      //      done();
      //    });
      //});
    });

    describe('Container nesting', function () {
      it('Nests single value components in a container', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            input: true,
            tree: true,
            components: test.components,
            tableView: true,
            label: 'Container',
            key: 'container1',
            protected: false,
            persistent: true,
            type: 'container',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        var values = {
          container1: test.submission,
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Removes extra values in a container', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            input: true,
            tree: true,
            components: test.components,
            tableView: true,
            label: 'Container',
            key: 'container1',
            protected: false,
            persistent: true,
            type: 'container',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        var sub = {
          container1: test.submission,
        };
        var values = {
          container1: Object.assign({}, test.submission, {
            extra: true,
            stuff: 'bad',
            never: ['gonna', 'give', 'you', 'up'],
          }),
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(sub, submission.data);
            done();
          });
      });

      it('Nests a container in a container', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            input: true,
            tree: true,
            components: [
              {
                input: true,
                tree: true,
                components: test.components,
                tableView: true,
                label: 'Container',
                key: 'container2',
                protected: false,
                persistent: true,
                type: 'container',
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
              },
            ],
            tableView: true,
            label: 'Container',
            key: 'container1',
            protected: false,
            persistent: true,
            type: 'container',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        var values = {
          container1: {
            container2: test.submission,
          },
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Nests a container in a datagrid', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            conditional: {
              eq: '',
              when: null,
              show: null,
            },
            type: 'datagrid',
            persistent: true,
            protected: false,
            key: 'datagrid1',
            label: 'Datagrid',
            tableView: true,
            tree: true,
            input: true,
            components: [
              {
                input: true,
                tree: true,
                components: test.components,
                tableView: true,
                label: 'Container',
                key: 'container2',
                protected: false,
                persistent: true,
                type: 'container',
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
              },
            ],
          },
        ];

        var values = {
          datagrid1: [
            {
              container2: test.submission,
            },
          ],
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Datagrid nesting', function () {
      it('Nests single value components in a datagrid', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            conditional: {
              eq: '',
              when: null,
              show: null,
            },
            type: 'datagrid',
            persistent: true,
            protected: false,
            key: 'datagrid1',
            label: 'Datagrid',
            tableView: true,
            components: test.components,
            tree: true,
            input: true,
          },
        ];

        var values = {
          datagrid1: [test.submission, test.submission],
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      //it('Removes extra values in a datagrid', function(done) {
      //  var test = require('./fixtures/forms/singlecomponents1.js');
      //  var components = [{
      //    "conditional": {
      //      "eq": "",
      //      "when": null,
      //      "show": null
      //    },
      //    "type": "datagrid",
      //    "persistent": true,
      //    "protected": false,
      //    "key": "datagrid1",
      //    "label": "Datagrid",
      //    "tableView": true,
      //    "components": test.components,
      //    "tree": true,
      //    "input": true
      //  }];
      //
      //  var sub = {
      //    datagrid1: [test.submission, test.submission]
      //  }
      //  var values = {
      //    datagrid1: [Object.assign({}, test.submission, {
      //      extra: true,
      //      stuff: 'bad',
      //      never: ['gonna', 'give', 'you', 'up']
      //    }), test.submission]
      //  };
      //
      //  helper
      //    .form('test', components)
      //    .submission(values)
      //    .execute(function(err) {
      //      if (err) {
      //        return done(err);
      //      }
      //
      //      var submission = helper.getLastSubmission();
      //      assert.deepEqual(sub, submission.data);
      //      done();
      //    });
      //});

      it('Nests a datagrid in a datagrid', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            conditional: {
              eq: '',
              when: null,
              show: null,
            },
            type: 'datagrid',
            persistent: true,
            protected: false,
            key: 'datagrid1',
            label: 'Datagrid',
            tableView: true,
            components: [
              {
                conditional: {
                  eq: '',
                  when: null,
                  show: null,
                },
                type: 'datagrid',
                persistent: true,
                protected: false,
                key: 'datagrid2',
                label: 'Datagrid',
                tableView: true,
                components: test.components,
                tree: true,
                input: true,
              },
            ],
            tree: true,
            input: true,
          },
        ];

        var values = {
          datagrid1: [
            {
              datagrid2: [test.submission],
            },
          ],
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Nests a datagrid in a container', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            input: true,
            tree: true,
            tableView: true,
            label: 'Container',
            key: 'container1',
            protected: false,
            persistent: true,
            type: 'container',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            components: [
              {
                conditional: {
                  eq: '',
                  when: null,
                  show: null,
                },
                type: 'datagrid',
                persistent: true,
                protected: false,
                key: 'datagrid2',
                label: 'Datagrid',
                tableView: true,
                components: test.components,
                tree: true,
                input: true,
              },
            ],
          },
        ];

        var values = {
          container1: {
            datagrid2: [test.submission],
          },
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Deep nesting', function () {
      it('Nests deeply in layout components', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            key: 'fieldset1',
            input: false,
            tableView: true,
            type: 'fieldset',
            legend: 'Fieldset',
            components: [
              {
                key: 'columns1',
                input: false,
                type: 'columns',
                columns: [
                  {
                    components: [
                      {
                        key: 'panel1',
                        input: false,
                        title: 'Panel',
                        type: 'panel',
                        theme: 'default',
                        components: [
                          {
                            key: 'well1',
                            input: false,
                            components: [
                              {
                                key: 'well2',
                                input: false,
                                type: 'well',
                                components: test.components,
                                conditional: {
                                  show: null,
                                  when: null,
                                  eq: '',
                                },
                              },
                            ],
                            type: 'well',
                            conditional: {
                              show: null,
                              when: null,
                              eq: '',
                            },
                          },
                        ],
                        conditional: {
                          show: null,
                          when: null,
                          eq: '',
                        },
                      },
                    ],
                  },
                  {
                    components: [],
                  },
                ],
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
              },
            ],
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests a datagrid deeply in layout components', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            key: 'fieldset1',
            input: false,
            tableView: true,
            type: 'fieldset',
            legend: 'Fieldset',
            components: [
              {
                key: 'columns1',
                input: false,
                type: 'columns',
                columns: [
                  {
                    components: [
                      {
                        key: 'panel1',
                        input: false,
                        title: 'Panel',
                        type: 'panel',
                        theme: 'default',
                        components: [
                          {
                            key: 'well1',
                            input: false,
                            type: 'well',
                            components: [
                              {
                                key: 'well2',
                                input: false,
                                type: 'well',
                                components: [
                                  {
                                    conditional: {
                                      eq: '',
                                      when: null,
                                      show: null,
                                    },
                                    type: 'datagrid',
                                    persistent: true,
                                    protected: false,
                                    key: 'datagrid1',
                                    label: 'Datagrid',
                                    tableView: true,
                                    components: test.components,
                                    tree: true,
                                    input: true,
                                  },
                                ],
                                conditional: {
                                  show: null,
                                  when: null,
                                  eq: '',
                                },
                              },
                            ],
                            conditional: {
                              show: null,
                              when: null,
                              eq: '',
                            },
                          },
                        ],
                        conditional: {
                          show: null,
                          when: null,
                          eq: '',
                        },
                      },
                    ],
                  },
                  {
                    components: [],
                  },
                ],
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
              },
            ],
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        var values = {
          datagrid1: [test.submission],
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Nests a container deeply in layout components', function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [
          {
            key: 'fieldset1',
            input: false,
            tableView: true,
            type: 'fieldset',
            legend: 'Fieldset',
            components: [
              {
                key: 'columns1',
                input: false,
                type: 'columns',
                columns: [
                  {
                    components: [
                      {
                        key: 'panel1',
                        input: false,
                        title: 'Panel',
                        type: 'panel',
                        theme: 'default',
                        components: [
                          {
                            key: 'well1',
                            input: false,
                            components: [
                              {
                                key: 'well2',
                                input: false,
                                type: 'well',
                                components: [
                                  {
                                    input: true,
                                    tree: true,
                                    components: test.components,
                                    tableView: true,
                                    label: 'Container',
                                    key: 'container1',
                                    protected: false,
                                    persistent: true,
                                    type: 'container',
                                    conditional: {
                                      show: null,
                                      when: null,
                                      eq: '',
                                    },
                                  },
                                ],
                                conditional: {
                                  show: null,
                                  when: null,
                                  eq: '',
                                },
                              },
                            ],
                            type: 'well',
                            conditional: {
                              show: null,
                              when: null,
                              eq: '',
                            },
                          },
                        ],
                        conditional: {
                          show: null,
                          when: null,
                          eq: '',
                        },
                      },
                    ],
                  },
                  {
                    components: [],
                  },
                ],
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
              },
            ],
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];

        var values = {
          container1: test.submission,
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Protected fields are protected', function () {
      it('Does not return a protected password field', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Text Field',
            key: 'textField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: false,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            type: 'textfield',
          },
          {
            input: true,
            tableView: false,
            inputType: 'password',
            label: 'Password',
            key: 'password',
            placeholder: '',
            prefix: '',
            suffix: '',
            protected: true,
            persistent: true,
            type: 'password',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];
        var values = {
          textField: 'My Value',
          password: 'password',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var result = { textField: 'My Value' };
            var submission = helper.getLastSubmission();
            assert.deepEqual(result, submission.data);
            done();
          });
      });

      it('Does not return a protected text field', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Text Field',
            key: 'textField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: true,
            unique: false,
            persistent: true,
            validate: {
              required: false,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            type: 'textfield',
          },
          {
            input: true,
            tableView: false,
            inputType: 'password',
            label: 'Password',
            key: 'password',
            placeholder: '',
            prefix: '',
            suffix: '',
            protected: false,
            persistent: true,
            type: 'password',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
          },
        ];
        var values = {
          textField: 'My Value',
          password: 'password',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            // Password is a hash so can't use old value.
            assert(submission.data.hasOwnProperty('password'), 'Should return the password hash');
            done();
          });
      });
    });

    describe('Conditional Fields', function () {
      it('Requires a conditionally visible field', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Required Field',
            key: 'requiredField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: true,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
            type: 'textfield',
          },
        ];

        var values = {
          selector: 'two',
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var result = { textField: 'My Value' };
            var submission = helper.getLastSubmission();
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  hasLabel: true,
                  index: 0,
                  key: 'requiredField',
                  setting: true,
                  validator: 'required',
                  label: 'Required Field',
                  path: 'requiredField',
                },
                message: 'Required Field is required',
                level: 'error',
                path: ['requiredField'],
              },
            ]);
            done();
          });
      });

      it("Doesn't require a conditionally hidden field", function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Required Field',
            key: 'requiredField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: true,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
            type: 'textfield',
          },
        ];

        var values = {
          selector: 'one',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Hidden calculated values are hidden on update of submission', function (done) {
        var components = [
          {
            label: 'Hide 2',
            tableView: false,
            validateWhenHidden: false,
            key: 'hide2',
            type: 'checkbox',
            input: true,
            defaultValue: false,
          },
          {
            label: 'Number1',
            applyMaskOn: 'change',
            mask: false,
            tableView: false,
            delimiter: false,
            requireDecimal: false,
            inputFormat: 'plain',
            truncateMultipleSpaces: false,
            validateWhenHidden: false,
            key: 'number1',
            type: 'number',
            input: true,
          },
          {
            label: 'Number2',
            applyMaskOn: 'change',
            mask: false,
            tableView: false,
            delimiter: false,
            requireDecimal: false,
            inputFormat: 'plain',
            truncateMultipleSpaces: false,
            validateWhenHidden: false,
            key: 'number2',
            type: 'number',
            input: true,
          },
          {
            label: 'Number3 Calculated clear value when hidden = true',
            applyMaskOn: 'change',
            mask: false,
            tableView: true,
            delimiter: false,
            requireDecimal: false,
            inputFormat: 'plain',
            truncateMultipleSpaces: false,
            calculateValue: 'value = data.number1 + data.number2',
            validateWhenHidden: false,
            key: 'number3CalculatedClearValueWhenHiddenTrue',
            conditional: {
              show: false,
              conjunction: 'all',
              conditions: [
                {
                  component: 'hide2',
                  operator: 'isEqual',
                  value: true,
                },
              ],
            },
            type: 'number',
            input: true,
          },
        ];

        var values = {
          hide2: false,
          number1: 100,
          number2: 200,
          number3CalculatedClearValueWhenHiddenTrue: 300,
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);

            var updatedSubmission = _.cloneDeep(submission);
            var updatedData = {
              hide2: true,
              number1: 100,
              number2: 200,
            };
            _.set(updatedSubmission, 'data', updatedData);

            helper.updateSubmission(updatedSubmission, (err) => {
              if (err) {
                return done(err);
              }
              var editedSubmission = helper.getLastSubmission();
              assert.deepEqual(updatedData, editedSubmission.data);
              assert(
                !editedSubmission.data.hasOwnProperty('number3CalculatedClearValueWhenHiddenTrue'),
              );
              done();
            });
          });
      });

      it('Allows a conditionally required field', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Required Field',
            key: 'requiredField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: true,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
            type: 'textfield',
          },
        ];

        var values = {
          selector: 'two',
          requiredField: 'Has a value',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var result = { textField: 'My Value' };
            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Ignores conditionally hidden fields', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Required Field',
            key: 'requiredField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: true,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
            type: 'textfield',
          },
        ];

        var values = {
          selector: 'one',
          requiredField: 'Has a value',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, { selector: 'one' });
            done();
          });
      });

      it('Requires a conditionally visible field in a panel', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: false,
            title: 'Panel',
            theme: 'default',
            components: [
              {
                input: true,
                tableView: true,
                inputType: 'text',
                inputMask: '',
                label: 'Required Field',
                key: 'requiredField',
                placeholder: '',
                prefix: '',
                suffix: '',
                multiple: false,
                defaultValue: '',
                protected: false,
                unique: false,
                persistent: true,
                validate: {
                  required: true,
                  minLength: '',
                  maxLength: '',
                  pattern: '',
                  custom: '',
                  customPrivate: false,
                },
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
                type: 'textfield',
              },
            ],
            type: 'panel',
            key: 'panel',
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
          },
        ];

        var values = {
          selector: 'two',
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var result = { textField: 'My Value' };
            var submission = helper.getLastSubmission();
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  hasLabel: true,
                  index: 0,
                  key: 'requiredField',
                  label: 'Required Field',
                  setting: true,
                  validator: 'required',
                  path: 'requiredField',
                },
                message: 'Required Field is required',
                level: 'error',
                path: ['requiredField'],
              },
            ]);
            done();
          });
      });

      it("Doesn't require a conditionally hidden field in a panel", function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: false,
            title: 'Panel',
            theme: 'default',
            components: [
              {
                input: true,
                tableView: true,
                inputType: 'text',
                inputMask: '',
                label: 'Required Field',
                key: 'requiredField',
                placeholder: '',
                prefix: '',
                suffix: '',
                multiple: false,
                defaultValue: '',
                protected: false,
                unique: false,
                persistent: true,
                validate: {
                  required: true,
                  minLength: '',
                  maxLength: '',
                  pattern: '',
                  custom: '',
                  customPrivate: false,
                },
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
                type: 'textfield',
              },
            ],
            type: 'panel',
            key: 'panel',
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
          },
        ];

        var values = {
          selector: 'one',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var result = { textField: 'My Value' };
            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Allows a conditionally required field in a panel', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: false,
            title: 'Panel',
            theme: 'default',
            components: [
              {
                input: true,
                tableView: true,
                inputType: 'text',
                inputMask: '',
                label: 'Required Field',
                key: 'requiredField',
                placeholder: '',
                prefix: '',
                suffix: '',
                multiple: false,
                defaultValue: '',
                protected: false,
                unique: false,
                persistent: true,
                validate: {
                  required: true,
                  minLength: '',
                  maxLength: '',
                  pattern: '',
                  custom: '',
                  customPrivate: false,
                },
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
                type: 'textfield',
              },
            ],
            type: 'panel',
            key: 'panel',
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
          },
        ];

        var values = {
          selector: 'two',
          requiredField: 'Has a value',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Ignores conditionally hidden fields in a panel', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: false,
            title: 'Panel',
            theme: 'default',
            components: [
              {
                input: true,
                tableView: true,
                inputType: 'text',
                inputMask: '',
                label: 'Required Field',
                key: 'requiredField',
                placeholder: '',
                prefix: '',
                suffix: '',
                multiple: false,
                defaultValue: '',
                protected: false,
                unique: false,
                persistent: true,
                validate: {
                  required: true,
                  minLength: '',
                  maxLength: '',
                  pattern: '',
                  custom: '',
                  customPrivate: false,
                },
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
                type: 'textfield',
              },
            ],
            type: 'panel',
            key: 'panel',
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
          },
        ];

        var values = {
          selector: 'one',
          requiredField: 'Has a value',
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var result = { textField: 'My Value' };
            var submission = helper.getLastSubmission();
            assert.deepEqual({ selector: 'one' }, submission.data);
            done();
          });
      });

      it('Should not clearOnHide when set to false', (done) => {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: false,
            title: 'Panel',
            theme: 'default',
            components: [
              {
                input: true,
                tableView: true,
                inputType: 'text',
                inputMask: '',
                label: 'No Clear Field',
                key: 'noClear',
                placeholder: '',
                prefix: '',
                suffix: '',
                multiple: false,
                defaultValue: '',
                protected: false,
                unique: false,
                persistent: true,
                clearOnHide: false,
                validate: {
                  required: false,
                  minLength: '',
                  maxLength: '',
                  pattern: '',
                  custom: '',
                  customPrivate: false,
                },
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
                type: 'textfield',
              },
            ],
            type: 'panel',
            key: 'panel',
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
          },
        ];

        helper
          .form('test', components)
          .submission({
            selector: 'one',
            noClear: 'testing',
          })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({ selector: 'one', noClear: 'testing' }, submission.data);
            done();
          });
      });

      it('Should clearOnHide when set to true', (done) => {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'radio',
            label: 'Selector',
            key: 'selector',
            values: [
              {
                value: 'one',
                label: 'One',
              },
              {
                value: 'two',
                label: 'Two',
              },
            ],
            defaultValue: '',
            protected: false,
            persistent: true,
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
            },
            type: 'radio',
            conditional: {
              show: '',
              when: null,
              eq: '',
            },
          },
          {
            input: false,
            title: 'Panel',
            theme: 'default',
            components: [
              {
                input: true,
                tableView: true,
                inputType: 'text',
                inputMask: '',
                label: 'Clear Me',
                key: 'clearMe',
                placeholder: '',
                prefix: '',
                suffix: '',
                multiple: false,
                defaultValue: '',
                protected: false,
                unique: false,
                persistent: true,
                clearOnHide: true,
                validate: {
                  required: false,
                  minLength: '',
                  maxLength: '',
                  pattern: '',
                  custom: '',
                  customPrivate: false,
                },
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
                type: 'textfield',
              },
            ],
            type: 'panel',
            key: 'panel',
            conditional: {
              show: 'true',
              when: 'selector',
              eq: 'two',
            },
          },
        ];

        helper
          .form('test', components)
          .submission({
            selector: 'one',
            clearMe: 'Clear Me!!!!',
          })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({ selector: 'one' }, submission.data);
            done();
          });
      });
    });

    describe('Non Persistent fields dont persist', function () {
      it("Doesn't save non-persistent single fields", function (done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        test.components.forEach(function (component) {
          component.persistent = false;
        });

        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({}, submission.data);
            done();
          });
      });

      it("Doesn't save non-persistent multi fields", function (done) {
        var test = require('./fixtures/forms/multicomponents.js');
        test.components.forEach(function (component) {
          component.persistent = false;
        });

        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({}, submission.data);
            done();
          });
      });
    });

    describe('Verify multiple values are multiple', function () {
      it('Forces multi value fields to be an array', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Text Field',
            key: 'textField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: true,
            defaultValue: '',
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: false,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            type: 'textfield',
          },
        ];
        var values = {
          textField: 'My Value',
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, {
              textField: ['My Value'],
            });
            done();
          });
      });

      it('Should remove protected fields from the response.', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Text Field',
            key: 'textField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: true,
            defaultValue: '',
            protected: true,
            unique: false,
            persistent: true,
            validate: {
              required: false,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            type: 'textfield',
          },
        ];
        var values = {
          textField: 'My Value',
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, {});
            done();
          });
      });

      it('Forces single value fields to not be an array', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Text Field',
            key: 'textField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: true,
            unique: false,
            persistent: true,
            validate: {
              required: false,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            type: 'textfield',
          },
        ];
        var values = {
          textField: ['Never', 'gonna', 'give', 'you', 'up'],
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  hasLabel: true,
                  index: 0,
                  key: 'textField',
                  label: 'Text Field',
                  setting: false,
                  path: 'textField',
                  validator: 'nonarray',
                  value: ['Never', 'gonna', 'give', 'you', 'up'],
                },
                message: 'Text Field must not be an array',
                path: ['textField'],
                level: 'error',
              },
            ]);
            done();
          });
      });
    });

    describe('Unique Fields', function () {
      before('Sets up the submissions', function (done) {
        const components = [
          {
            input: true,
            label: 'Email',
            key: 'email',
            unique: true,
            type: 'email',
          },
          {
            input: true,
            label: 'Text Field',
            key: 'textField',
            unique: true,
            type: 'textfield',
            validate: {
              pattern: '[A-Za-z0-9]+',
            },
          },
        ];
        const values = {
          email: 'brendan@form.io',
          textField: 'IAmAUniqueSnowflake',
        };
        helper
          .form('uniqueTest', components)
          .submission(values)
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            return done();
          });
      });

      it('Returns an error when non-unique', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Text Field',
            key: 'textField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: false,
            defaultValue: '',
            protected: false,
            unique: true,
            persistent: true,
            validate: {
              required: false,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            type: 'textfield',
          },
        ];
        var values = {
          textField: 'My Value',
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 1);
            assert.equal(helper.lastResponse.body.details[0].message, 'Text Field must be unique');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['textField']);
            done();
          });
      });

      it('Returns an error for non-unique emails and text fields with pattern [A-Za-z0-9]+', function (done) {
        const components = [
          {
            input: true,
            label: 'Email',
            key: 'email',
            unique: true,
            type: 'email',
          },
          {
            input: true,
            label: 'Text Field',
            key: 'textField',
            unique: true,
            type: 'textfield',
            validate: {
              pattern: '[A-Za-z0-9]+',
            },
          },
        ];
        const values = {
          email: 'brendan@form.io',
          textField: 'IAmAUniqueSnowflake',
        };

        helper
          .form('uniqueTest', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            helper.getLastSubmission();
            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 2);
            assert.equal(helper.lastResponse.body.details[0].message, 'Email must be unique');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['email']);
            assert.equal(helper.lastResponse.body.details[1].message, 'Text Field must be unique');
            assert.deepEqual(helper.lastResponse.body.details[1].path, ['textField']);
            done();
          });
      });
    });

    describe('Required multivalue fields', function () {
      it('Returns an error when required multivalue fields are missing', function (done) {
        var components = [
          {
            input: true,
            tableView: true,
            inputType: 'text',
            inputMask: '',
            label: 'Text Field',
            key: 'textField',
            placeholder: '',
            prefix: '',
            suffix: '',
            multiple: true,
            defaultValue: '',
            protected: false,
            unique: false,
            persistent: true,
            validate: {
              required: true,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            type: 'textfield',
          },
        ];
        var values = {};

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 2);
            assert.equal(
              helper.lastResponse.body.details[0].message,
              'Text Field must be an array',
            );
            assert.equal(helper.lastResponse.body.details[1].message, 'Text Field is required');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['textField']);
            assert.deepEqual(helper.lastResponse.body.details[1].path, ['textField']);
            done();
          });
      });
    });

    describe('Unique Fields with multiple', function () {
      var components = [
        {
          input: true,
          tableView: true,
          inputType: 'text',
          inputMask: '',
          label: 'Text Field',
          key: 'textField',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: true,
          defaultValue: '',
          protected: false,
          unique: true,
          persistent: true,
          validate: {
            required: false,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: '',
            customPrivate: false,
          },
          conditional: {
            show: null,
            when: null,
            eq: '',
          },
          type: 'textfield',
        },
      ];

      it('Unique Arrays should allow unique submissions', function (done) {
        helper
          .form('test', components)
          .submission({
            textField: ['Foo', 'Bar'],
          })
          .submission({
            textField: ['Bar', 'Baz'],
          })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.hasOwnProperty('data'));
            assert.deepEqual(submission.data, {
              textField: ['Bar', 'Baz'],
            });
            done();
          });
      });

      it('Unique Arrays check contents not order', function (done) {
        helper
          .form('test', components)
          .submission({
            textField: ['Bar', 'Foo'],
          })
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 1);
            assert.equal(helper.lastResponse.body.details[0].message, 'Text Field must be unique');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['textField']);
            done();
          });
      });
    });

    describe('Complex form with hidden fields and embedded datagrids', function () {
      it('Saves a complex form correctly', function (done) {
        var test = require('./fixtures/forms/complex.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });
    });

    describe('Conditionally hidden required fields do not trigger validation', function () {
      var test = require('./fixtures/forms/conditional');
      var pass = { show: 'no' };
      var fail = { show: 'yes' };
      var full = { show: 'yes', req: 'foo' };
      var pruned = { show: 'no', req: 'foo' };

      it('A submission without a hidden field should ignore validation', function (done) {
        helper
          .form('cond', test.components)
          .submission(pass)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, pass);
            done();
          });
      });

      it('A submission with a hidden field should not ignore validation', function (done) {
        helper
          .form('cond', test.components)
          .submission(fail)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.name, 'ValidationError');
            var error = submission.details.pop();
            assert.equal(error.message, 'req is required');
            done();
          });
      });

      it('A submission with a hidden field should work with all the required data', function (done) {
        helper
          .form('cond', test.components)
          .submission(full)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, full);
            done();
          });
      });

      it('A submission with a hidden field should prune hidden field data', function (done) {
        helper
          .form('cond', test.components)
          .submission(pruned)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, pass);
            done();
          });
      });
    });

    describe('Address Fields', function () {
      var test = require('./fixtures/forms/for213.js');

      it('A single unique address will submit without issues', function (done) {
        helper
          .form('for213', test.components)
          .submission(test.submission)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, test.submission);
            done();
          });
      });

      it('A duplicate unique address will throw validation issues', function (done) {
        helper
          .form('for213', test.components)
          .submission(test.submission)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 1);
            assert.equal(helper.lastResponse.body.details[0].message, 'address must be unique');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['for213']);
            done();
          });
      });
    });

    describe('Max Words Validation', () => {
      it('Should throw an error if the maximum words has been exceeded', function (done) {
        helper
          .form('maxwords', [
            {
              tags: [],
              type: 'textarea',
              conditional: {
                eq: '',
                when: null,
                show: '',
              },
              validate: {
                customPrivate: false,
                custom: '',
                pattern: '',
                maxLength: '',
                minLength: '',
                maxWords: 30,
                minWords: 5,
                required: false,
              },
              persistent: true,
              unique: true,
              protected: false,
              defaultValue: '',
              multiple: false,
              suffix: '',
              prefix: '',
              placeholder: '',
              key: 'test',
              label: 'test',
              inputMask: '',
              inputType: 'text',
              tableView: true,
              input: true,
            },
            {
              isNew: false,
              input: true,
              label: 'Submit',
              tableView: false,
              key: 'submit',
              size: 'md',
              leftIcon: '',
              rightIcon: '',
              block: false,
              action: 'submit',
              disableOnInvalid: false,
              theme: 'primary',
              type: 'button',
            },
          ])
          .submission({
            data: {
              test: chance.sentence({ words: 31 }),
            },
          })
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(helper.lastResponse.status, 400);
            assert.equal(submission.name, 'ValidationError');
            assert.equal(submission.details[0].context.validator, 'maxWords');
            assert.equal(submission.details[0].message, 'test must have no more than 30 words.');
            done();
          });
      });

      it('Should allow up to the maximum words', (done) => {
        const sentence = chance.sentence({ words: 30 });
        helper
          .submission('maxwords', {
            data: {
              test: sentence,
            },
          })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(helper.lastResponse.status, 201);
            assert(!!submission._id, 'A submission was not created');
            assert.equal(submission.data.test, sentence);
            done();
          });
      });

      it('Should throw an error when minimum words has not been met.', (done) => {
        helper
          .submission('maxwords', {
            data: {
              test: chance.sentence({ words: 3 }),
            },
          })
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(helper.lastResponse.status, 400);
            assert.equal(submission.name, 'ValidationError');
            assert.equal(submission.details[0].context.validator, 'minWords');
            assert.equal(submission.details[0].message, 'test must have at least 5 words.');
            done();
          });
      });

      it('Should allow at the minimum words', (done) => {
        const sentence = chance.sentence({ words: 5 });
        helper
          .submission('maxwords', {
            data: {
              test: sentence,
            },
          })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(helper.lastResponse.status, 201);
            assert(!!submission._id, 'A submission was not created');
            assert.equal(submission.data.test, sentence);
            done();
          });
      });
    });

    describe('Form metadata handling.', () => {
      it('Should allow for submission metadata to be passed to the submission.', (done) => {
        // Create a resource to keep records.
        helper
          .form('metadata', [
            {
              input: true,
              tableView: true,
              inputType: 'text',
              inputMask: '',
              label: 'Name',
              key: 'name',
              placeholder: '',
              prefix: '',
              suffix: '',
              multiple: false,
              defaultValue: '',
              protected: false,
              unique: false,
              persistent: true,
              validate: {
                required: false,
                minLength: '',
                maxLength: '',
                pattern: '',
                custom: '',
                customPrivate: false,
              },
              conditional: {
                show: null,
                when: null,
                eq: '',
              },
              type: 'textfield',
            },
          ])
          .submission('metadata', {
            data: {
              name: 'testing',
            },
            metadata: {
              testing: 'hello',
            },
          })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, { name: 'testing' });
            assert(
              submission.metadata.hasOwnProperty('headers') &&
                !_.isEmpty(submission.metadata.headers),
              'Submission metadata should include post headers',
            );
            assert.deepEqual(_.omit(submission.metadata, ['headers']), { testing: 'hello' });
            done();
          });
      });
    });

    if (!docker)
      describe('Select validation', () => {
        before((done) => {
          // Create a resource to keep records.
          helper
            .form('fruits', [
              {
                input: true,
                tableView: true,
                inputType: 'text',
                inputMask: '',
                label: 'Name',
                key: 'name',
                placeholder: '',
                prefix: '',
                suffix: '',
                multiple: false,
                defaultValue: '',
                protected: false,
                unique: false,
                persistent: true,
                validate: {
                  required: false,
                  minLength: '',
                  maxLength: '',
                  pattern: '',
                  custom: '',
                  customPrivate: false,
                },
                conditional: {
                  show: null,
                  when: null,
                  eq: '',
                },
                type: 'textfield',
              },
            ])
            .submission('fruits', { name: 'Apple' })
            .submission('fruits', { name: 'Pear' })
            .submission('fruits', { name: 'Banana' })
            .submission('fruits', { name: 'Orange' })
            .execute(function (err) {
              if (err) {
                return done(err);
              }

              let apiUrl = 'http://localhost:' + template.config.port;
              apiUrl += hook.alter(
                'url',
                '/form/' + helper.template.forms['fruits']._id + '/submission',
                helper.template,
              );

              helper
                .form('fruitSelect', [
                  {
                    type: 'select',
                    key: 'fruit',
                    label: 'Select a fruit',
                    dataSrc: 'url',
                    searchField: 'data.name',
                    authenticate: true,
                    persistent: true,
                    data: {
                      url: apiUrl,
                    },
                    validate: {
                      select: true,
                    },
                  },
                ])
                .execute((err) => {
                  if (err) {
                    return done(err);
                  }

                  done();
                });
            });
        });

        it('Should perform a backend validation of the selected value', (done) => {
          helper.submission('fruitSelect', { fruit: 'Apple' }).execute((err) => {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({ fruit: 'Apple' }, submission.data);
            done();
          });
        });

        it('Should allow empty values', (done) => {
          helper.submission('fruitSelect', {}).execute((err) => {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({}, submission.data);
            done();
          });
        });

        it('Should throw an error when providing a value that is not available.', (done) => {
          helper
            .submission('fruitSelect', { fruit: 'Foo' })
            .expect(400)
            .execute(() => {
              assert.equal(helper.lastResponse.statusCode, 400);
              assert.equal(helper.lastResponse.body.name, 'ValidationError');
              assert.equal(helper.lastResponse.body.details.length, 1);
              assert.equal(
                helper.lastResponse.body.details[0].message,
                'Select a fruit contains an invalid selection',
              );
              assert.deepEqual(helper.lastResponse.body.details[0].path, ['fruit']);
              done();
            });
        });

        describe('Select components with resource values', () => {
          before('Create a fruit select form that loads a resource', (done) => {
            helper
              .form('fruitSelectResource', [
                {
                  type: 'select',
                  key: 'fruit',
                  label: 'Select a fruit',
                  dataSrc: 'resource',
                  searchField: 'data.name',
                  valueProperty: 'data.name',
                  filter: 'data.name__ne=Orange',
                  authenticate: true,
                  persistent: true,
                  data: {
                    resource: helper.template.forms['fruits']._id,
                  },
                  validate: {
                    select: true,
                  },
                },
              ])
              .execute((err) => {
                if (err) {
                  return done(err);
                }

                done();
              });
          });

          it('Should perform a backend validation of the selected value and reject values not in the referenced resource', (done) => {
            helper
              .submission('fruitSelectResource', { fruit: 'No Fruit Here' })
              .expect(400)
              .execute(() => {
                assert.equal(helper.lastResponse.statusCode, 400);
                assert.equal(helper.lastResponse.body.name, 'ValidationError');
                assert.equal(helper.lastResponse.body.details.length, 1);
                assert.equal(
                  helper.lastResponse.body.details[0].message,
                  'Select a fruit contains an invalid selection',
                );
                assert.deepEqual(helper.lastResponse.body.details[0].path, ['fruit']);
                done();
              });
          });

          it('Should perform a backend validation of the selected value and succeed if the value is in the referenced resource', (done) => {
            helper
              .submission('fruitSelectResource', { fruit: 'Apple' })
              .expect(201)
              .execute((err) => {
                if (err) {
                  return done(err);
                }

                var submission = helper.getLastSubmission();
                assert.deepEqual({ fruit: 'Apple' }, submission.data);
                done();
              });
          });

          it('Should perform a backend validation of the selected value and reject values if the value is in the referenced resource but excluded by the filter', (done) => {
            helper
              .submission('fruitSelectResource', { fruit: 'Orange' })
              .expect(400)
              .execute(() => {
                assert.equal(helper.lastResponse.statusCode, 400);
                assert.equal(helper.lastResponse.body.name, 'ValidationError');
                assert.equal(helper.lastResponse.body.details.length, 1);
                assert.equal(
                  helper.lastResponse.body.details[0].message,
                  'Select a fruit contains an invalid selection',
                );
                assert.deepEqual(helper.lastResponse.body.details[0].path, ['fruit']);
                done();
              });
          });

          it('Should allow saving select resource by reference', (done) => {
            const submission = helper.template.submissions['fruits'][0];
            helper
              .form(
                'myFruit',
                [
                  {
                    input: true,
                    label: 'Fruit',
                    key: 'fruit',
                    data: {
                      resource: helper.template.forms['fruits']._id,
                      project: helper.template.project ? helper.template.project._id : '',
                    },
                    dataSrc: 'resource',
                    reference: true,
                    valueProperty: '',
                    defaultValue: '',
                    template: '<span>{{ item.data.name }}</span>',
                    multiple: false,
                    persistent: true,
                    type: 'select',
                  },
                ],
                {
                  submissionAccess: [
                    {
                      type: 'read_all',
                      roles: [helper.template.roles.authenticated._id.toString()],
                    },
                  ],
                },
              )
              .submission('myFruit', {
                fruit: { _id: submission._id, form: helper.template.forms['fruits']._id },
              })
              .execute((err) => {
                if (err) {
                  return done(err);
                }
                helper.getSubmission('myFruit', helper.lastSubmission._id, (err, fromsub) => {
                  if (err) {
                    return done(err);
                  }
                  assert.equal(submission._id, fromsub.data.fruit._id);
                  assert.equal(submission.data.name, fromsub.data.fruit.data.name);
                  done();
                });
              });
          });

          it('Should allow saving select resource with whole object by reference', (done) => {
            const submission = helper.template.submissions['fruits'][0];
            helper.submission('myFruit', { fruit: submission }).execute((err) => {
              if (err) {
                return done(err);
              }
              helper.getSubmission('myFruit', helper.lastSubmission._id, (err, fromsub) => {
                if (err) {
                  return done(err);
                }
                assert.equal(submission._id, fromsub.data.fruit._id);
                assert.equal(submission.data.name, fromsub.data.fruit.data.name);
                done();
              });
            });
          });

          it('Should check permissions when loading from reference', (done) => {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' +
                    helper.template.forms['myFruit']._id +
                    '/submission/' +
                    helper.lastSubmission._id,
                  helper.template,
                ),
              )
              .set('x-jwt-token', helper.template.users.user1.token)
              .send()
              // .expect(200)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }
                assert(res.body.data.fruit.hasOwnProperty('_id'), 'Must contain the _id.');
                assert.equal(1, Object.keys(res.body.data.fruit).length);
                done();
              });
          });

          it('Should not allow submissions with items that are not in the resource', (done) => {
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' +
                    helper.template.forms['myFruit']._id +
                    '/submission/' +
                    helper.lastSubmission._id,
                  helper.template,
                ),
              )
              .set('x-jwt-token', helper.template.users.user1.token)
              .send()
              // .expect(200)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }
                assert(res.body.data.fruit.hasOwnProperty('_id'), 'Must contain the _id.');
                assert.equal(1, Object.keys(res.body.data.fruit).length);
                done();
              });
          });
        });
      });

    describe('Select resource with reference enabled', () => {
      let referenceSubmissionId = null;
      before((done) => {
        // Create a resource to keep records.
        helper
          .form('resourceForm', [
            {
              label: 'Ref Id',
              applyMaskOn: 'change',
              tableView: true,
              validateWhenHidden: false,
              key: 'refId',
              type: 'textfield',
              input: true,
            },
            {
              label: 'Code',
              applyMaskOn: 'change',
              tableView: true,
              validateWhenHidden: false,
              key: 'code',
              type: 'textfield',
              input: true,
            },
            {
              label: 'Description',
              applyMaskOn: 'change',
              tableView: true,
              validateWhenHidden: false,
              key: 'description',
              type: 'textfield',
              input: true,
            },
            {
              type: 'button',
              label: 'Submit',
              key: 'submit',
              disableOnInvalid: true,
              input: true,
              tableView: false,
            },
          ])
          .submission('resourceForm', { refId: '004', code: 'a', description: 'AAA' })

          .execute(function (err) {
            if (err) {
              return done(err);
            }

            referenceSubmissionId = helper.getLastSubmission()._id;
            helper
              .form('selectRefTestForm', [
                {
                  label: 'Select',
                  widget: 'choicesjs',
                  tableView: true,
                  dataSrc: 'resource',
                  data: {
                    resource: helper.template.forms['resourceForm']._id,
                  },
                  template: '<span>{{ item.data.code }} - {{ item.data.description }}</span>',
                  noRefreshOnScroll: false,
                  addResource: false,
                  reference: true,
                  validate: {
                    required: true,
                  },
                  validateWhenHidden: false,
                  key: 'select',
                  type: 'select',
                  input: true,
                },
                {
                  label: 'Field A',
                  applyMaskOn: 'change',
                  tableView: true,
                  validate: {
                    required: true,
                  },
                  validateWhenHidden: false,
                  key: 'fieldA',
                  conditional: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'select',
                        operator: 'isEqual',
                        value: {
                          data: {
                            code: 'a',
                            description: 'AAA',
                          },
                        },
                      },
                    ],
                  },
                  type: 'textfield',
                  input: true,
                  'widget.type': 'input',
                },
                {
                  type: 'button',
                  label: 'Submit',
                  key: 'submit',
                  disableOnInvalid: true,
                  input: true,
                  tableView: false,
                },
              ])
              .execute((err) => {
                if (err) {
                  return done(err);
                }

                done();
              });
          });
      });

      it('Should return validation error on attempt to submit empty value for conditionally visible required field when correct select reference data is provided', (done) => {
        helper
          .submission('selectRefTestForm', {
            data: {
              select: {
                _id: referenceSubmissionId,
                data: {
                  refId: '004',
                  code: 'a',
                  description: 'AAA',
                },
              },
              fieldA: null,
            },
          })
          .expect(400)
          .execute((err, res) => {
            if (err) {
              return done(err);
            }
            const response = res.lastSubmission;
            assert.equal(response.name, 'ValidationError');
            assert.equal(response.details[0].message, 'Field A is required');

            done();
          });
      });

      it('Should return validation error on attempt to submit empty value for conditionally visible required field when INcorrect select reference data is provided', (done) => {
        helper
          .submission('selectRefTestForm', {
            data: {
              select: {
                _id: referenceSubmissionId,
                data: {
                  refId: '004',
                },
              },
              fieldA: null,
            },
          })
          .expect(400)
          .execute((err, res) => {
            if (err) {
              return done(err);
            }
            const response = res.lastSubmission;
            assert.equal(response.name, 'ValidationError');
            assert.equal(response.details[0].message, 'Field A is required');

            done();
          });
      });

      it('Should create submission when INcorrect select reference data is provided and return correct data', (done) => {
        helper
          .submission('selectRefTestForm', {
            data: {
              select: {
                _id: referenceSubmissionId,
                data: {
                  refId: '004',
                },
              },
              fieldA: 'test',
            },
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }
            const submission = helper.getLastSubmission();
            assert.equal(submission.data.select._id, referenceSubmissionId);
            assert.deepEqual(submission.data.select.data, {
              refId: '004',
              code: 'a',
              description: 'AAA',
            });

            done();
          });
      });
    });

    describe('Data table validation', () => {
      before((done) => {
        // Create a resource to keep records.
        helper
          .form('fruits', [
            {
              input: true,
              tableView: true,
              inputType: 'text',
              inputMask: '',
              label: 'Name',
              key: 'name',
              placeholder: '',
              prefix: '',
              suffix: '',
              multiple: false,
              defaultValue: '',
              protected: false,
              unique: false,
              persistent: true,
              validate: {
                required: false,
                minLength: '',
                maxLength: '',
                pattern: '',
                custom: '',
                customPrivate: false,
              },
              conditional: {
                show: null,
                when: null,
                eq: '',
              },
              type: 'textfield',
            },
          ])
          .submission('fruits', { name: 'Apple' })
          .submission('fruits', { name: 'Pear' })
          .submission('fruits', { name: 'Banana' })
          .submission('fruits', { name: 'Orange' })
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            let apiUrl = 'http://localhost:' + template.config.port;
            apiUrl += hook.alter(
              'url',
              '/form/' + helper.template.forms['fruits']._id + '/submission',
              helper.template,
            );

            helper
              .form('fruitTable', [
                {
                  label: 'Pick Some Fruits',
                  sortable: true,
                  filterable: true,
                  inlineEditing: false,
                  clipCells: false,
                  itemsPerPage: 10,
                  showAddBtn: true,
                  showEditBtn: true,
                  showDeleteBtn: true,
                  showDeleteAllBtn: false,
                  tableView: false,
                  isSubmitData: false,
                  fetch: {
                    enableFetch: true,
                    headers: [{}],
                    components: [
                      {
                        path: 'name',
                        key: 'name',
                      },
                    ],
                    dataSrc: 'resource',
                    sort: {
                      defaultQuery: '',
                    },
                    resource: helper.template.forms['fruits']._id,
                  },
                  key: 'dataTable',
                  type: 'datatable',
                  allowCaching: true,
                  input: true,
                  submitSelectedRows: true,
                  components: [],
                },
              ])
              .execute((err) => {
                if (err) {
                  return done(err);
                }
                done();
              });
          });
      });

      it('Should save the submission of the selected values', (done) => {
        helper
          .submission('fruitTable', {
            dataTable: [{ name: 'Apple' }, { name: 'Pear' }],
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, {
              dataTable: [{ name: 'Apple' }, { name: 'Pear' }],
            });
            done();
          });
      });

      it('Should modify the target resource and the form by adding a required field', (done) => {
        const target = helper.template.forms['fruits'];
        target.components.push({
          input: true,
          tableView: true,
          inputType: 'text',
          inputMask: '',
          label: 'Color',
          key: 'color',
          placeholder: '',
          prefix: '',
          suffix: '',
          multiple: false,
          defaultValue: '',
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: true,
            minLength: '',
            maxLength: '',
            pattern: '',
            custom: '',
            customPrivate: false,
          },
          conditional: {
            show: null,
            when: null,
            eq: '',
          },
          type: 'textfield',
        });
        helper.updateForm(target, (err) => {
          if (err) {
            return done(err);
          }
          const form = helper.template.forms['fruitTable'];
          assert(form.components[0]);
          assert(form.components[0].fetch);
          assert(form.components[0].fetch.components);
          form.components[0].fetch.components.push({ path: 'color', key: 'color' });
          helper.updateForm(form, (err) => {
            if (err) {
              return done(err);
            }
            done();
          });
        });
      });

      it('Should throw an error when the new field is not provided', (done) => {
        helper
          .submission('fruitTable', {
            dataTable: [{ name: 'Apple' }, { name: 'Orange' }],
          })
          .expect(400)
          .execute((err) => {
            if (err) {
              return done(err);
            }
            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 2);
            assert.equal(helper.lastResponse.body.details[0].message, 'Color is required');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['dataTable', 0, 'color']);
            done();
          });
      });
    });

    describe('Advanced Conditions', () => {
      it('Requires a conditionally required field from advanced conditions', function (done) {
        var components = [
          {
            properties: {},
            tags: [],
            labelPosition: 'top',
            hideLabel: false,
            type: 'textfield',
            conditional: {
              eq: '',
              when: null,
              show: '',
            },
            validate: {
              customPrivate: false,
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false,
            },
            clearOnHide: true,
            hidden: false,
            persistent: true,
            unique: false,
            protected: false,
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: '',
            key: 'test',
            label: 'Test',
            inputMask: '',
            inputType: 'text',
            tableView: true,
            input: true,
          },
          {
            properties: {},
            tags: [],
            labelPosition: 'top',
            hideLabel: false,
            type: 'textfield',
            conditional: {
              eq: '',
              when: null,
              show: '',
            },
            validate: {
              customPrivate: false,
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false,
            },
            clearOnHide: true,
            hidden: false,
            persistent: true,
            unique: false,
            protected: false,
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: '',
            key: 'changeme',
            label: 'Change me',
            inputMask: '',
            inputType: 'text',
            tableView: true,
            input: true,
            logic: [
              {
                name: 'Test 2',
                trigger: {
                  javascript: "result = data.test === '2';",
                  type: 'javascript',
                },
                actions: [
                  {
                    name: 'Set Title to Two',
                    type: 'property',
                    property: {
                      label: 'Title',
                      value: 'label',
                      type: 'string',
                    },
                    text: 'Two',
                  },
                  {
                    name: 'Set Required',
                    type: 'property',
                    property: {
                      label: 'Required',
                      value: 'validate.required',
                      type: 'boolean',
                    },
                    state: true,
                  },
                ],
              },
            ],
          },
        ];

        var values = {
          test: '2',
        };

        helper
          .form('advancedCond', components)
          .submission(values)
          .expect(400)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  hasLabel: true,
                  index: 0,
                  key: 'changeme',
                  label: 'Two',
                  setting: true,
                  path: 'changeme',
                  validator: 'required',
                },
                level: 'error',
                message: 'Two is required',
                path: ['changeme'],
              },
            ]);
            done();
          });
      });

      it('Sets a value based on advanced conditions', function (done) {
        var components = [
          {
            properties: {},
            tags: [],
            labelPosition: 'top',
            hideLabel: false,
            type: 'textfield',
            conditional: {
              eq: '',
              when: null,
              show: '',
            },
            validate: {
              customPrivate: false,
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false,
            },
            clearOnHide: true,
            hidden: false,
            persistent: true,
            unique: false,
            protected: false,
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: '',
            key: 'test',
            label: 'Test',
            inputMask: '',
            inputType: 'text',
            tableView: true,
            input: true,
          },
          {
            properties: {},
            tags: [],
            labelPosition: 'top',
            hideLabel: false,
            type: 'textfield',
            conditional: {
              eq: '',
              when: null,
              show: '',
            },
            validate: {
              customPrivate: false,
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              required: false,
            },
            clearOnHide: true,
            hidden: false,
            persistent: true,
            unique: false,
            protected: false,
            defaultValue: '',
            multiple: false,
            suffix: '',
            prefix: '',
            placeholder: '',
            key: 'changeme',
            label: 'Change me',
            inputMask: '',
            inputType: 'text',
            tableView: true,
            input: true,
            logic: [
              {
                name: 'Test 1',
                trigger: {
                  javascript: "result = data.test === '1';",
                  type: 'javascript',
                },
                actions: [
                  {
                    name: 'Set Value',
                    type: 'value',
                    value: "value = 'Foo'",
                  },
                ],
              },
            ],
          },
        ];

        var values = {
          test: '1',
        };

        helper
          .form('advancedCond2', components)
          .submission(values)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(submission.data.test, '1');
            assert.equal(submission.data.changeme, 'Foo');
            done();
          });
      });

      it('Should save submission for Wizard with advanced Conditions', function (done) {
        var wizardForm = require('./fixtures/forms/wizardFormWithAdvancedConditions.js');
        var wizardSubmission = { number: 2, textField: 'Mary', textArea: 'gray' };
        helper.upsertForm(wizardForm, (err) => {
          if (err) {
            return done(err);
          }
          helper
            .submission('wizardTest', wizardSubmission)
            .expect(201)
            .execute(function (err) {
              if (err) {
                return done(err);
              }
              const submission = helper.lastSubmission;
              assert.deepEqual(submission.data, wizardSubmission);
              done();
            });
        });
      });
    });

    describe('Submission patching', () => {
      var submission = {};
      it('Creates a form and submission for testing', function (done) {
        var components = [
          {
            type: 'textfield',
            persistent: true,
            defaultValue: '',
            multiple: false,
            key: 'test',
            label: 'Test',
            inputMask: '',
            inputType: 'text',
            validate: {
              required: true,
              minLength: '',
              maxLength: '',
              pattern: '',
              custom: '',
              customPrivate: false,
            },
            tableView: true,
            input: true,
          },
        ];

        var values = {
          test: 'Original',
        };

        helper
          .form('patchtest', components)
          .submission(values)
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            submission = helper.getLastSubmission();
            done();
          });
      });

      it('Allows updating a submission with the PATCH method', (done) => {
        request(app)
          .patch(
            hook.alter(
              'url',
              '/form/' +
                helper.template.forms['patchtest']._id +
                '/submission/' +
                helper.lastSubmission._id,
              helper.template,
            ),
          )
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'replace',
              path: '/data/test',
              value: 'Updated',
            },
          ])
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body.data.test, 'Updated');
            done();
          });
      });

      it('validates when updating a submission with the PATCH method', (done) => {
        request(app)
          .patch(
            hook.alter(
              'url',
              '/form/' +
                helper.template.forms['patchtest']._id +
                '/submission/' +
                helper.lastSubmission._id,
              helper.template,
            ),
          )
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'remove',
              path: '/data/test',
            },
          ])
          .expect(400)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body.name, 'ValidationError');
            assert.deepEqual(res.body.details, [
              {
                context: {
                  hasLabel: true,
                  index: 0,
                  key: 'test',
                  label: 'Test',
                  setting: true,
                  path: 'test',
                  validator: 'required',
                },
                level: 'error',
                message: 'Test is required',
                path: ['test'],
              },
            ]);
            done();
          });
      });

      it('doesnt allow updating a submission id with the PATCH method', (done) => {
        request(app)
          .patch(
            hook.alter(
              'url',
              '/form/' +
                helper.template.forms['patchtest']._id +
                '/submission/' +
                helper.lastSubmission._id,
              helper.template,
            ),
          )
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'replace',
              path: '/_id',
              value: '000000000000000000000000',
            },
          ])
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body._id, helper.lastSubmission._id);
            done();
          });
      });

      let selectWithResourceSubmission = {};
      it('Create a form with resource and submission for testing', function (done) {
        const components = [
          {
            type: 'textfield',
            label: 'Text Field',
            key: 'text',
            type: 'textfield',
            input: true,
          },
          {
            label: 'Select',
            widget: 'choicesjs',
            tableView: true,
            dataSrc: 'resource',
            data: {
              resource: '5692b920d1028f01000407e7',
            },
            key: 'select',
            type: 'select',
            input: true,
            submissionAccess: [
              {
                type: 'read',
                roles: [],
              },
            ],
          },
        ];

        const values = {
          text: 'Test',
          select: {
            _id: '64afea722fd6bd056a081cc4',
          },
        };

        helper
          .form('patchform', components)
          .submission(values)
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }

            selectWithResourceSubmission = helper.getLastSubmission();
            done();
          });
      });

      it('Allows updating a submission with submission access using PATCH', function (done) {
        request(app)
          .patch(
            hook.alter(
              'url',
              '/form/' +
                helper.template.forms['patchform']._id +
                '/submission/' +
                helper.lastSubmission._id,
              helper.template,
            ),
          )
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'replace',
              path: '/data/text',
              value: 'Patched',
            },
          ])
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body.data.text, 'Patched');
            done();
          });
      });

      it('Create a form with resource and submission with empty select for testing', function (done) {
        const components = [
          {
            type: 'textfield',
            label: 'Text Field',
            key: 'text',
            type: 'textfield',
            input: true,
          },
          {
            label: 'Select',
            widget: 'choicesjs',
            tableView: true,
            dataSrc: 'resource',
            data: {
              resource: '5692b920d1028f01000407e7',
            },
            key: 'select',
            type: 'select',
            input: true,
            submissionAccess: [
              {
                type: 'read',
                roles: [],
              },
            ],
          },
        ];

        const values = {
          text: 'Test',
          select: {},
        };

        helper
          .form('pathWithEmptySelect', components)
          .submission(values)
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            done();
          });
      });

      it('Allows updating a empty select submission with submission access using PATCH', function (done) {
        request(app)
          .patch(
            hook.alter(
              'url',
              '/form/' +
                helper.template.forms['pathWithEmptySelect']._id +
                '/submission/' +
                helper.lastSubmission._id,
              helper.template,
            ),
          )
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'replace',
              path: '/data/text',
              value: 'Patched',
            },
          ])
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body.data.text, 'Patched');
            done();
          });
      });

      it('Allows updating select metadata in nested form submissions', (done) => {
        const patchChildComponents = [
          {
            label: 'Select',
            widget: 'choicesjs',
            tableView: true,
            data: {
              values: [
                {
                  label: '1',
                  value: '1',
                },
                {
                  label: '2',
                  value: '2',
                },
                {
                  label: '3',
                  value: '3',
                },
              ],
            },
            validateWhenHidden: false,
            key: 'select',
            type: 'select',
            input: true,
          },
        ];
        const patchChildSubmission = {
          data: {
            select: 1,
          },
          metadata: {
            selectData: {
              form: {
                data: {
                  select: {
                    label: '1',
                  },
                },
              },
            },
            timezone: 'America/Chicago',
            offset: -300,
            origin: 'http://localhost:3000',
            referrer: '',
            browserName: 'Netscape',
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            pathName: '/',
            onLine: true,
          },
          state: 'submitted',
          _vnote: '',
        };
        helper
          .form('patchChild', patchChildComponents)
          .submission(patchChildSubmission)
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            const childFormId = helper.getForm('patchChild')._id;
            const patchParentComponents = [
              {
                label: 'Form',
                tableView: true,
                form: childFormId,
                useOriginalRevision: false,
                key: 'form',
                type: 'form',
                input: true,
              },
            ];
            const patchParentSubmission = { data: { form: helper.getLastSubmission() } };
            const patchParentUpdate = [
              {
                op: 'replace',
                path: '/data/form/metadata/selectData/form/data/select/label',
                value: '3',
              },
              {
                op: 'replace',
                path: '/data/form/data/select',
                value: 2,
              },
            ];
            helper
              .form('patchParent', patchParentComponents)
              .submission(patchParentSubmission)
              .expect(201)
              .execute(function (err) {
                if (err) {
                  return done(err);
                }
                const lastSubmission = helper.getLastSubmission();
                helper.patchSubmission(lastSubmission, patchParentUpdate, (err, res) => {
                  if (err) {
                    return done(err);
                  }
                  assert.strictEqual(
                    res.data.form.metadata.selectData.form.data.select.label,
                    '3',
                    'select metadata should be 3',
                  );
                  done();
                });
              });
          });
      });

      describe('Filtering submissions', () => {
        it('Should filter submission for Currency Component', function (done) {
          var components = [
            {
              label: 'Currency',
              applyMaskOn: 'change',
              mask: false,
              spellcheck: true,
              currency: 'USD',
              inputFormat: 'plain',
              truncateMultipleSpaces: false,
              key: 'currency',
              type: 'currency',
              input: true,
              delimiter: true,
            },
          ];

          helper
            .form('filterCurrency', components)
            .submission({ currency: 10 })
            .submission({ currency: 20 })
            .expect(201)
            .execute(function (err) {
              if (err) {
                return done(err);
              }
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' +
                      helper.template.forms['filterCurrency']._id +
                      '/submission?data.currency=10',
                    helper.template,
                  ),
                )
                .set('x-jwt-token', helper.owner.token)
                .send()
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }
                  assert.equal(res.body.length, 1);
                  assert.equal(res.body[0].data.currency, 10);
                  done();
                });
            });
        });

        it('Should filter submission for SelectBoxes Component', function (done) {
          var components = [
            {
              label: 'Select Boxes',
              optionsLabelPosition: 'right',
              tableView: true,
              values: [
                {
                  label: 'a',
                  value: 'a',
                },
                {
                  label: 'b',
                  value: 'b',
                },
              ],
              key: 'selectBoxes',
              type: 'selectboxes',
              input: true,
              inputType: 'checkbox',
              defaultValue: {
                a: false,
                b: false,
              },
            },
          ];

          helper
            .form('filterSelectBoxes', components)
            .submission({ selectBoxes: { a: true, b: false } })
            .submission({ selectBoxes: { a: false, b: true } })
            .expect(201)
            .execute(function (err) {
              if (err) {
                return done(err);
              }
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' +
                      helper.template.forms['filterSelectBoxes']._id +
                      '/submission?data.selectBoxes.a=true&data.selectBoxes.b=false',
                    helper.template,
                  ),
                )
                .set('x-jwt-token', helper.owner.token)
                .send()
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }
                  assert.equal(res.body.length, 1);
                  assert.equal(res.body[0].data.selectBoxes.a, true);
                  assert.equal(res.body[0].data.selectBoxes.b, false);
                  done();
                });
            });
        });

        it('Should return an empty array for incorrect filter', function (done) {
          var components = [
            {
              label: 'Currency',
              applyMaskOn: 'change',
              mask: false,
              spellcheck: true,
              currency: 'USD',
              inputFormat: 'plain',
              truncateMultipleSpaces: false,
              key: 'currency',
              type: 'currency',
              input: true,
              delimiter: true,
            },
            {
              label: 'Select Boxes',
              optionsLabelPosition: 'right',
              tableView: true,
              values: [
                {
                  label: 'a',
                  value: 'a',
                },
                {
                  label: 'b',
                  value: 'b',
                },
              ],
              key: 'selectBoxes',
              type: 'selectboxes',
              input: true,
              inputType: 'checkbox',
              defaultValue: {
                a: false,
                b: false,
              },
            },
          ];

          helper
            .form('filter', components)
            .submission({ currency: 10, selectBoxes: { a: true, b: false } })
            .submission({ currency: 20, selectBoxes: { a: false, b: true } })
            .expect(201)
            .execute(function (err) {
              if (err) {
                return done(err);
              }
              request(app)
                .get(
                  hook.alter(
                    'url',
                    '/form/' +
                      helper.template.forms['filter']._id +
                      '/submission?data.currency=20&data.selectBoxes.b=false',
                    helper.template,
                  ),
                )
                .set('x-jwt-token', helper.owner.token)
                .send()
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    return done(err);
                  }
                  assert.equal(res.body.length, 0);
                  assert.deepEqual(res.body, []);
                  done();
                });
            });
        });

        it('Should change modified date when patch submission', function (done) {
          const test = require('./fixtures/forms/singlecomponentsSimple');
          helper
            .form('patchFormMike', test.components)
            .submission(test.submission)
            .execute(function (err) {
              if (err) {
                return done(err);
              }
              const submissionBeforePatch = helper.getLastSubmission();
              const update = [
                {
                  op: 'replace',
                  path: '/data/textField',
                  value: 'PATCH Update',
                },
              ];
              helper.patchSubmission(submissionBeforePatch, update, (err) => {
                if (err) {
                  return done(err);
                }
                const submissionAfterPatch = helper.getLastSubmission();
                assert.notEqual(submissionBeforePatch.modified, submissionAfterPatch.modified);
                done();
              });
            });
        });
      });

      describe('Reference select with VM-evaluated logic action', () => {
        let petSubmissionId = null;
        before('sets up a pets resource and a parent form with a custom logic action', (done) => {
          helper
            .form('pets', [
              {
                label: 'Pet',
                key: 'pet',
                type: 'textfield',
                input: true,
              },
            ])
            .submission('pets', { pet: 'Turtle' })
            .execute((err) => {
              if (err) {
                return done(err);
              }
              petSubmissionId = helper.getLastSubmission()._id;
              helper
                .form('patchReferenceLogic', [
                  {
                    type: 'textfield',
                    label: 'Text Field',
                    key: 'textField',
                    input: true,
                  },
                  {
                    type: 'select',
                    label: 'Pet',
                    key: 'pet',
                    dataSrc: 'resource',
                    data: { resource: helper.template.forms['pets']._id },
                    template: '<span>{{ item.data.pet }}</span>',
                    reference: true,
                    input: true,
                    // The mere presence of a customAction triggers the bug —
                    // the script body itself is irrelevant; what matters is
                    // that args round-trip through the VM's structured clone.
                    logic: [
                      {
                        name: 'noop',
                        trigger: {
                          type: 'javascript',
                          javascript: 'result = data.textField',
                        },
                        actions: [
                          {
                            name: 'console',
                            type: 'customAction',
                            customAction: 'console.log("noop")',
                          },
                        ],
                      },
                    ],
                  },
                ])
                .submission('patchReferenceLogic', {
                  textField: 'initial',
                  pet: { _id: petSubmissionId, form: helper.template.forms['pets']._id },
                })
                .execute(done);
            });
        });

        it('preserves the reference _id as a valid ObjectId hex string after PATCH', (done) => {
          const submission = helper.getLastSubmission();
          helper.patchSubmission(
            submission,
            [{ op: 'replace', path: '/data/textField', value: 'updated' }],
            (err) => {
              if (err) {
                return done(err);
              }
              const patched = helper.getLastSubmission();
              assert.equal(patched.data.textField, 'updated');
              assert.equal(
                typeof patched.data.pet._id,
                'string',
                'pet._id should be a string in the response, not a wrapped {buffer} object',
              );
              assert.match(
                patched.data.pet._id,
                /^[0-9a-f]{24}$/,
                'pet._id should be a 24-character hex ObjectId string',
              );
              assert.equal(patched.data.pet._id, petSubmissionId);
              // GET re-hydrates from the stored reference. If the stored _id
              // were a `{buffer: BinData}` plain doc instead of an ObjectId,
              // the lookup would fail and the response would expose that shape.
              helper.getSubmission('patchReferenceLogic', patched._id, (err, fromGet) => {
                if (err) {
                  return done(err);
                }
                assert.equal(typeof fromGet.data.pet._id, 'string');
                assert.match(fromGet.data.pet._id, /^[0-9a-f]{24}$/);
                assert.equal(fromGet.data.pet._id, petSubmissionId);
                done();
              });
            },
          );
        });
      });

      describe('Multi-select with embedded submission shapes (no save-as-reference)', () => {
        const embeddedFakeIds = {
          _id: '507f1f77bcf86cd799439011',
          form: '5692b920d1028f01000407e7',
          owner: '5692b920d1028f01000407e8',
          project: '5692b920d1028f01000407e9',
        };

        before('sets up a parent form with embedded submission data', (done) => {
          helper
            .form('embeddedParent', [
              {
                type: 'textfield',
                label: 'Text Field',
                key: 'textField',
                input: true,
              },
              {
                type: 'select',
                label: 'Embedded',
                key: 'embedded',
                dataSrc: 'resource',
                data: { resource: '5692b920d1028f01000407e7' },
                template: '<span>{{ item.data.name }}</span>',
                multiple: true,
                input: true,
                persistent: true,
              },
            ])
            .submission('embeddedParent', {
              textField: 'initial',
              embedded: [
                {
                  ...embeddedFakeIds,
                  data: { name: 'Apple' },
                  metadata: {},
                },
              ],
            })
            .execute(done);
        });

        it('keeps _id, form, owner, project as ObjectIds in the DB after PATCH', (done) => {
          const submission = helper.getLastSubmission();
          helper.patchSubmission(
            submission,
            [{ op: 'replace', path: '/data/textField', value: 'patched' }],
            async (err) => {
              if (err) {
                return done(err);
              }
              try {
                const formio = hook.alter('formio', app.formio);
                const stored = await formio.resources.submission.model.collection.findOne({
                  _id: new mongoose.Types.ObjectId(submission._id),
                });
                assert.ok(stored, 'submission should exist in the database');
                assert.ok(
                  Array.isArray(stored.data.embedded) && stored.data.embedded.length === 1,
                  'data.embedded should be a one-element array',
                );
                const item = stored.data.embedded[0];
                ['_id', 'form', 'owner', 'project'].forEach((key) => {
                  assert.ok(
                    item[key] instanceof mongoose.Types.ObjectId,
                    `data.embedded[0].${key} should be a BSON ObjectId, got ${
                      item[key] && item[key].constructor
                        ? item[key].constructor.name
                        : typeof item[key]
                    } (${item[key]})`,
                  );
                  assert.equal(item[key].toString(), embeddedFakeIds[key]);
                });
                done();
              } catch (assertErr) {
                done(assertErr);
              }
            },
          );
        });
      });

      describe('Reference select with multiple values', () => {
        const petSubmissionIds = [];
        before('sets up a multi-reference parent form', (done) => {
          helper
            .form('multipets', [
              {
                label: 'Pet',
                key: 'pet',
                type: 'textfield',
                input: true,
              },
            ])
            .submission('multipets', { pet: 'Turtle' })
            .execute((err) => {
              if (err) {
                return done(err);
              }
              petSubmissionIds.push(helper.getLastSubmission()._id);
              helper.submission('multipets', { pet: 'Hamster' }).execute((err2) => {
                if (err2) {
                  return done(err2);
                }
                petSubmissionIds.push(helper.getLastSubmission()._id);
                helper
                  .form('multiPetReference', [
                    {
                      type: 'textfield',
                      label: 'Text Field',
                      key: 'textField',
                      input: true,
                    },
                    {
                      type: 'select',
                      label: 'Pets',
                      key: 'pets',
                      dataSrc: 'resource',
                      data: { resource: helper.template.forms['multipets']._id },
                      template: '<span>{{ item.data.pet }}</span>',
                      reference: true,
                      multiple: true,
                      input: true,
                    },
                  ])
                  .submission('multiPetReference', {
                    textField: 'initial',
                    pets: petSubmissionIds.map((id) => ({
                      _id: id,
                      form: helper.template.forms['multipets']._id,
                    })),
                  })
                  .execute(done);
              });
            });
        });

        // For multi-reference fields, the existing setResource only fires for
        // single objects (`compValue && compValue._id`), so when component.multiple
        // is true the dereferenced array — full embedded docs with stringified
        // _id/form/owner/project — is what reaches `findOneAndUpdate`. We expect
        // the persisted shape to mirror the single-ref case: an array of
        // `{ _id: ObjectId }` only.
        it('persists data.pets as an array of `{ _id: ObjectId }` after PATCH', (done) => {
          const submission = helper.getLastSubmission();
          helper.patchSubmission(
            submission,
            [{ op: 'replace', path: '/data/textField', value: 'multi-db-check' }],
            async (err) => {
              if (err) {
                return done(err);
              }
              try {
                const formio = hook.alter('formio', app.formio);
                const stored = await formio.resources.submission.model.collection.findOne({
                  _id: new mongoose.Types.ObjectId(submission._id),
                });
                assert.ok(stored, 'submission should exist in the database');
                assert.ok(
                  Array.isArray(stored.data.pets),
                  `data.pets should be an array, got ${typeof stored.data.pets}`,
                );
                assert.equal(stored.data.pets.length, petSubmissionIds.length);
                stored.data.pets.forEach((item, i) => {
                  assert.deepEqual(
                    Object.keys(item).sort(),
                    ['_id'],
                    `data.pets[${i}] should only contain _id, got keys: ${Object.keys(item).join(', ')}`,
                  );
                  assert.ok(
                    item._id instanceof mongoose.Types.ObjectId,
                    `data.pets[${i}]._id should be a BSON ObjectId, got ${
                      item._id && item._id.constructor ? item._id.constructor.name : typeof item._id
                    } (${item._id})`,
                  );
                  assert.equal(item._id.toString(), petSubmissionIds[i]);
                });
                done();
              } catch (assertErr) {
                done(assertErr);
              }
            },
          );
        });
      });

      describe('Textfield keyed `project` holding an id-shaped string', () => {
        const projectIdString = '58e44a71412603008b727506';

        before('sets up a form with a textfield keyed project', (done) => {
          helper
            .form('pdfLikeResource', [
              {
                type: 'textfield',
                label: 'Project',
                key: 'project',
                input: true,
                persistent: true,
              },
              {
                type: 'textfield',
                label: 'ID',
                key: 'id',
                input: true,
                persistent: true,
              },
            ])
            .submission('pdfLikeResource', {
              project: projectIdString,
              id: '58e44a72412603008b72750d',
            })
            .execute(done);
        });

        it('stores data.project as a string, not an ObjectId', (done) => {
          const submission = helper.getLastSubmission();
          const formio = hook.alter('formio', app.formio);
          formio.resources.submission.model.collection
            .findOne({ _id: new mongoose.Types.ObjectId(submission._id) })
            .then((stored) => {
              assert.ok(stored, 'submission should exist in the database');
              assert.equal(
                typeof stored.data.project,
                'string',
                `data.project should be a string, got ${
                  stored.data.project && stored.data.project.constructor
                    ? stored.data.project.constructor.name
                    : typeof stored.data.project
                } (${stored.data.project})`,
              );
              assert.equal(stored.data.project, projectIdString);
              done();
            })
            .catch(done);
        });
      });
    });

    describe('Filtering submissions', () => {
      it('Should filter submission for Select Component', function (done) {
        var components = [
          {
            label: 'Select',
            widget: 'choicesjs',
            tableView: true,
            data: {
              values: [
                {
                  label: 1,
                  value: 1,
                },
                {
                  label: 2,
                  value: 2,
                },
              ],
            },
            key: 'select',
            type: 'select',
            input: true,
          },
        ];

        helper
          .form('filterSelect', components)
          .submission({ select: 2 })
          .submission({ select: 1 })
          .submission({ select: 2 })
          .expect(201)
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            request(app)
              .get(
                hook.alter(
                  'url',
                  '/form/' +
                    helper.template.forms['filterSelect']._id +
                    '/submission?data.select=2',
                  helper.template,
                ),
              )
              .set('x-jwt-token', helper.owner.token)
              .send()
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }
                assert.equal(res.body.length, 2);
                res.body.forEach((item) => {
                  assert.equal(item.data.select, 2);
                });
                done();
              });
          });
      });
    });

    describe('Submission index requests', function () {
      before('Sets up a form and submissions with image or signature data', function (done) {
        const testForm = _.cloneDeep(require('./fixtures/forms/fileComponent'));
        const testSubmission = {
          data: {
            file: [
              {
                storage: 'base64',
                name: 'small_image-9724876b-17d6-4d91-b8b0-c910d2ccb819.png',
                url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAIAAAADnC86AAAACXBIWXMAAAsTAAALEwEAmpwYAAAE9GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4wLWMwMDAgNzkuMTcxYzI3ZmFiLCAyMDIyLzA4LzE2LTIyOjM1OjQxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjMtMDEtMjNUMTE6MDQ6NTUtMDY6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIzLTAxLTIzVDExOjA1OjMxLTA2OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIzLTAxLTIzVDExOjA1OjMxLTA2OjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDplNzIwNDIxYy0xNTI1LTQzMjctYTQwZC02YjE2MmFlNGI5ZDkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ZTcyMDQyMWMtMTUyNS00MzI3LWE0MGQtNmIxNjJhZTRiOWQ5IiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6ZTcyMDQyMWMtMTUyNS00MzI3LWE0MGQtNmIxNjJhZTRiOWQ5Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDplNzIwNDIxYy0xNTI1LTQzMjctYTQwZC02YjE2MmFlNGI5ZDkiIHN0RXZ0OndoZW49IjIwMjMtMDEtMjNUMTE6MDQ6NTUtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyNC4wIChNYWNpbnRvc2gpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlxcqawAAAAySURBVFiF7c0BDQAwCACg+y72M6TBjOHmoACRXW/DX1nFYrFYLBaLxWKxWCwWi8VH4wGAdwGpX8v62wAAAABJRU5ErkJggg==',
                size: 1408,
                type: 'image/png',
                originalName: 'small_image.png',
              },
            ],
            submit: true,
          },
        };
        helper
          .form('base64Test', testForm.components)
          .submission(testSubmission)
          .expect(201)
          .execute(done);
      });

      it('Should not return images or signatures by default', function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              `/form/${helper.template.forms['base64Test']._id}/submission`,
              helper.template,
            ),
          )
          .set('x-jwt-token', helper.owner.token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            }
            const submissionData = res.body[0].data.file[0];
            assert(
              !submissionData.hasOwnProperty('url'),
              'Since we have not specificed full=true, we should not recieve base64 data',
            );
            done();
          });
      });

      it('Should return images or signatures with the query string "full=true"', function (done) {
        request(app)
          .get(
            hook.alter(
              'url',
              `/form/${helper.template.forms['base64Test']._id}/submission?full=true`,
              helper.template,
            ),
          )
          .set('x-jwt-token', helper.owner.token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            }
            const submissionData = res.body[0].data.file[0];
            assert(
              submissionData.hasOwnProperty('url'),
              'Since we have  specificed full=true, we should recieve base64 data',
            );
            done();
          });
      });
    });

    describe('Wizard', () => {
      it('Should save data of suffix/prefix components', (done) => {
        helper
          .form({
            title: 'Wizard Suffix Components',
            name: 'formWiz',
            path: 'formwiz',
            type: 'form',
            display: 'wizard',
            components: [
              {
                label: 'Text Field',
                applyMaskOn: 'change',
                tableView: true,
                key: 'textField',
                type: 'textfield',
                input: true,
              },
              {
                title: 'Page 1',
                collapsible: false,
                key: 'panel',
                type: 'panel',
                label: 'Panel',
                input: false,
                tableView: false,
                components: [
                  {
                    label: 'Page 1 text',
                    applyMaskOn: 'change',
                    tableView: true,
                    key: 'page1Text',
                    type: 'textfield',
                    input: true,
                  },
                ],
              },
              {
                title: 'Page 2',
                collapsible: false,
                key: 'panel1',
                type: 'panel',
                label: 'Panel',
                input: false,
                tableView: false,
                components: [
                  {
                    label: 'Page 2 text',
                    applyMaskOn: 'change',
                    tableView: true,
                    key: 'page2Text',
                    type: 'textfield',
                    input: true,
                  },
                ],
              },
              {
                type: 'button',
                label: 'Submit',
                key: 'submit',
                disableOnInvalid: true,
                input: true,
                tableView: false,
              },
            ],
          })
          .submission({
            textField: 'text',
            page1Text: 't1',
            page2Text: 't2',
          })
          .execute(function (err) {
            if (err) {
              return done(err);
            }
            const submission = helper.getLastSubmission();
            assert.equal(submission.data.textField, 'text');
            done();
          });
      });
    });

    describe('VM Timeouts', () => {
      let restoreEncapsulation;

      before('Create form with a long running validation', (done) => {
        helper
          .form('timeout', [
            {
              type: 'textfield',
              label: 'Test',
              key: 'test',
              validate: {
                custom: "if (input === 'test') { while(true) {} }",
              },
            },
          ])
          .execute(done);
      });

      // The per-expression evaluator swallows a timed-out rule (core's validate wraps each
      // rule in try/catch); only the encapsulated single-VM sweep surfaces the timeout as a
      // failed request. Force encapsulated evaluation for this form so the timeout is enforced.
      before('Force encapsulated evaluation', () => {
        const formioApp = app.formio.formio || app.formio;
        formioApp.hooks = formioApp.hooks || {};
        formioApp.hooks.alter = formioApp.hooks.alter || {};
        const previous = formioApp.hooks.alter.useEncapsulatedEvaluation;
        formioApp.hooks.alter.useEncapsulatedEvaluation = () => true;
        restoreEncapsulation = () => {
          if (previous) {
            formioApp.hooks.alter.useEncapsulatedEvaluation = previous;
          } else {
            delete formioApp.hooks.alter.useEncapsulatedEvaluation;
          }
        };
      });

      after('Restore the default evaluation mode', () => {
        if (restoreEncapsulation) {
          restoreEncapsulation();
        }
      });

      it('Should timeout and throw an error when a validation takes too long', (done) => {
        helper
          .submission('timeout', { test: 'test' })
          .expect(400)
          .execute((err) => {
            if (err) {
              return done(err);
            }
            const response = helper.lastResponse;
            assert.equal(response.text, '"Script execution timed out."');
            done();
          });
      });
    });

    describe('Queries', function(){
      it('should not allow [$operation]', function(done){
        const components = [
          {
            'type': 'email',
            'unique': true,
            'required': true,
            'placeholder': 'Enter your email address',
            'key': 'email',
            'label': 'Email',
            'tableView': true,
            'input': true
          },
          {
            'type': 'password',
            'protected': true,
            'placeholder': 'Enter your password.',
            'key': 'password',
            'label': 'Password',
            'inputType': 'password',
            'tableView': false,
            'input': true
          }
        ];

        const submissionOne = {
          email: 'test@example.com',
          password: 'pass123'
        };
        const submissionTwo = {
          email: 'test2@example.com',
          password: '123pass'
        };

        helper
          .form('adminquery', components)
          .submission(submissionOne)
          .submission(submissionTwo)
          .expect(201)
          .execute(function(err) {
            if (err) {
              done(err);
            }
            request(app)
              .get(hook.alter('url', `/form/${helper.template.forms['adminquery']._id}/submission?data.email[$regex]=^test`, helper.template))
              .set('x-jwt-token', helper.owner.token)
              .expect(200)
              .end(function(err, res){
                if (err) {
                  done(err);
                }
                assert.equal(res.body.length, 0);
                done();
              });
          });
      });
    });
  });

  describe('Bulk submissions, create endpoint', function () {
    let bulkFixture, formDef;

    before(function () {
      bulkFixture = require('./fixtures/forms/bulkCreateForm.js');
      formDef = bulkFixture.form;
    });

    it('Creates a test form for bulk submission create tests', function (done) {
      helper.upsertForm(formDef, function (err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });

    it('Returns 400 for empty payload {}', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const payload = {};

      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 400],
        false,
        function (err, res) {
          assert.equal(
            helper.getLastBulkSubmission().error,
            'Payload must be an array of submission objects.',
          );
          done(err, res);
        },
      );
    });

    it('Returns 400 for missing data field', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const payload = { metadata: { tag: 'missing-data-field' } };

      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 400],
        false,
        function (err, res) {
          assert.equal(
            helper.getLastBulkSubmission().error,
            'Payload must be an array of submission objects.',
          );
          done(err, res);
        },
      );
    });

    it('Returns 400 for empty data array', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const payload = { data: [] };

      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 400],
        false,
        function (err, res) {
          assert.equal(
            helper.getLastBulkSubmission().error,
            'Payload must be an array of submission objects.',
          );
          done(err, res);
        },
      );
    });

    it('Successfully creates multiple submissions in batch (large batch size)', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const batch = Array.from({ length: 2 }, (_, i) => ({
        data: {
          textField1: `item${i + 1}`,
          requiredTextField2: `req${i + 1}`.slice(0, 10),
          uniqueTextField3: `uniq-batch-${i + 1}`,
        },
      }));

      helper.bulkCreateUpsertSubmissions(
        form,
        batch,
        null,
        [/application\/json/, 201],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, batch.length);
          done(err, res);
        },
      );
    });

    it('Returns partial success when some submissions are inserted and some fail', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        {
          data: {
            textField1: 'ok',
            requiredTextField2: 'abc',
            uniqueTextField3: 'uniq-partial-1',
          },
        },
        {
          data: {
            textField1: 'fail',
            uniqueTextField3: 'uniq-partial-2',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 207],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for duplicate values for unique field in batch', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        { data: { textField1: 'a', requiredTextField2: 'abc', uniqueTextField3: 'dupe-batch' } },
        { data: { textField1: 'b', requiredTextField2: 'def', uniqueTextField3: 'dupe-batch' } },
        { data: { textField1: 'b', requiredTextField2: 'def', uniqueTextField3: 'unique-batch' } },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 207],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for duplicate with existing DB record', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        { data: { textField1: 'new', requiredTextField2: 'def', uniqueTextField3: 'dupe-db' } },
        { data: { textField1: 'ok', requiredTextField2: 'ghi', uniqueTextField3: 'unique-batch' } },
      ];

      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 207],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for invalid BSON/schema ', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        { data: { textField1: NaN, requiredTextField2: 'abc', uniqueTextField3: 'uniq-bson' } },
        {
          data: { textField1: Infinity, requiredTextField2: 'abc', uniqueTextField3: 'uniq-bson' },
        },
        { data: { textField1: 'ok', requiredTextField2: 'def', uniqueTextField3: 'uniq-bson2' } },
      ];

      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 207],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for null or missing required fields', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        { data: { textField1: 'ok', requiredTextField2: null, uniqueTextField3: 'uniq-null-1' } },
        { data: { textField1: 'ok2', uniqueTextField3: 'uniq-null-2' } },
        { data: { textField1: 'ok3', requiredTextField2: 'abc', uniqueTextField3: 'uniq-null-3' } },
      ];

      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 207],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure when other (non uniqueness/non required) validations fail', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        {
          data: {
            textField1: 'ok',
            requiredTextField2: '1234567890',
            uniqueTextField3: 'uniq-maxlen-1',
          },
        },
        // requiredTextField2 has a max length of 10, provided input is longer than 10
        {
          data: {
            textField1: 'fail',
            requiredTextField2: '12345678901',
            uniqueTextField3: 'uniq-maxlen-2',
          },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 207],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Successfully creates a submission with extra/unknown fields (which are ignored)', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        {
          data: {
            textField1: 'ok',
            requiredTextField2: 'abc',
            uniqueTextField3: 'uniq-extra',
            extraField: 'shouldBeIgnored',
          },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 201],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Successfully inserts submissions containing mixed data types', function (done) {
      const form = helper.template.forms['bulkEndpointTest'];
      const submissions = [
        { data: { textField1: 123, requiredTextField2: 'abc', uniqueTextField3: 'uniq-type-1' } },
        { data: { textField1: 'ok', requiredTextField2: 456, uniqueTextField3: 'uniq-type-2' } },
        {
          data: { textField1: 'ok2', requiredTextField2: 'abc2', uniqueTextField3: 'uniq-type-3' },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 201],
        false,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().insertedCount, 3);
          done(err, res);
        },
      );
    });
  });

  describe('Bulk Submissions, upsert endpoint', function () {
    let existSubmissionId, bulkFixture, upsertFormName, formDef, insertedSubmissionId;

    before(function () {
      bulkFixture = require('./fixtures/forms/bulkUpsertForm.js');
      upsertFormName = 'bulkEndpointTest-upsert';
      formDef = bulkFixture.form;
      foreignFormDef = bulkFixture.foreignForm;
      existSubmissionId = bulkFixture.existingSubmissionId;
    });

    it('Creates a test form for bulk submission upsert tests', function (done) {
      helper.upsertForm(formDef, function (err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });

    it('Returns 400 for empty payload {}', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = {};

      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 400],
        true,
        function (err, res) {
          assert.equal(
            helper.getLastBulkSubmission().error,
            'Payload must be an array of submission objects.',
          );
          done(err, res);
        },
      );
    });

    it('Returns 400 for missing data field', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = { metadata: { tag: 'missing-data-field' } };

      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 400],
        true,
        function (err, res) {
          assert.equal(
            helper.getLastBulkSubmission().error,
            'Payload must be an array of submission objects.',
          );
          done(err, res);
        },
      );
    });

    it('Returns 400 for empty data array', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = { data: [] };

      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 400],
        true,
        function (err, res) {
          assert.equal(
            helper.getLastBulkSubmission().error,
            'Payload must be an array of submission objects.',
          );
          done(err, res);
        },
      );
    });

    it('Successfully upserts multiple submissions in batch (large batch size)', function (done) {
      const form = helper.template.forms[upsertFormName];
      const batch = Array.from({ length: 200 }, (_, i) => ({
        data: {
          textField1: `item${i + 1}`,
          requiredTextField2: `req${i + 1}`.slice(0, 10),
          uniqueTextField3: `upsert-uniq-batch-${i + 1}`,
        },
      }));
      helper.bulkCreateUpsertSubmissions(
        form,
        batch,
        null,
        [/application\/json/, 200],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 200);
          done(err, res);
        },
      );
    });

    it('Returns partial success when some submissions are inserted and some fail', function (done) {
      const form = helper.template.forms[upsertFormName];
      const submissions = [
        {
          data: {
            textField1: 'ok',
            requiredTextField2: 'abc',
            uniqueTextField3: 'uniq-upsert-partial-1',
          },
        },
        {
          data: {
            textField1: 'fail',
            requiredTextField2: null,
            uniqueTextField3: 'uniq-upsert-partial-2',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        submissions,
        null,
        [/application\/json/, 207],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for duplicate unique field in batch', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = [
        {
          data: {
            textField1: 'a',
            requiredTextField2: 'abc',
            uniqueTextField3: 'upsert-dupe-batch',
          },
        },
        {
          data: {
            textField1: 'b',
            requiredTextField2: 'def',
            uniqueTextField3: 'upsert-dupe-batch',
          },
        },
        {
          data: {
            textField1: 'c',
            requiredTextField2: 'def',
            uniqueTextField3: 'upsert-dupe-batch-1',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 207],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for duplicate with existing DB record', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = [
        {
          data: {
            textField1: 'new',
            requiredTextField2: 'def',
            uniqueTextField3: 'upsert-dupe-batch-1',
          },
        },
        {
          data: {
            textField1: 'ok',
            requiredTextField2: 'ghi',
            uniqueTextField3: 'upsert-unique-db',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 207],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for invalid BSON/schema', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = [
        { data: { textField1: NaN, requiredTextField2: 'abc', uniqueTextField3: 'uniq-bson' } },
        {
          data: { textField1: Infinity, requiredTextField2: 'abc', uniqueTextField3: 'uniq-bson' },
        },
        {
          data: {
            textField1: 'ok',
            requiredTextField2: 'def',
            uniqueTextField3: 'upsert-uniq-bson2',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 207],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure for null or missing required fields', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = [
        {
          data: {
            textField1: 'ok',
            requiredTextField2: null,
            uniqueTextField3: 'upsert-uniq-null-1',
          },
        },
        { data: { textField1: 'ok2', uniqueTextField3: 'upsert-uniq-null-2' } },
        {
          data: {
            textField1: 'ok3',
            requiredTextField2: 'abc',
            uniqueTextField3: 'upsert-uniq-null-3',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 207],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Returns partial failure when other (non uniqueness/non required) validations fail', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = [
        {
          data: {
            textField1: 'ok',
            requiredTextField2: '1234567890',
            uniqueTextField3: 'upsert-uniq-maxlen-1',
          },
        }, // valid
        {
          data: {
            textField1: 'ok2',
            requiredTextField2: '12345678901',
            uniqueTextField3: 'upsert-uniq-maxlen-2',
          },
        }, // too long
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 207],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Successfully upserts submissions containing mixed data types', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = [
        {
          data: {
            textField1: 123,
            requiredTextField2: 'abc',
            uniqueTextField3: 'upsert-uniq-type-1',
          },
        },
        {
          data: {
            textField1: 'ok',
            requiredTextField2: 456,
            uniqueTextField3: 'upsert-uniq-type-2',
          },
        },
        {
          data: {
            textField1: 'ok2',
            requiredTextField2: 'abc2',
            uniqueTextField3: 'upsert-uniq-type-3',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 200],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 3);
          done(err, res);
        },
      );
    });

    it('Successfully upserts a submission with extra/unknown fields (which are ignored)', function (done) {
      const form = helper.template.forms[upsertFormName];
      const payload = [
        {
          data: {
            textField1: 'ok',
            requiredTextField2: 'abc',
            uniqueTextField3: 'upsert-uniq-extra',
            extraField: 'shouldBeIgnored',
          },
        },
      ];
      helper.bulkCreateUpsertSubmissions(
        form,
        payload,
        null,
        [/application\/json/, 200],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);
          done(err, res);
        },
      );
    });

    it('Creates a single submission for upsert testing', function (done) {
      const initial = {
        textField1: 'original',
        requiredTextField2: 'required',
        uniqueTextField3: 'upsert-uniq-orig',
      };
      helper
        .submission(upsertFormName, initial)
        .expect(201)
        .execute(function (err) {
          if (err) {
            return done(err);
          }
          const sub = helper.getLastSubmission();
          insertedSubmissionId = sub._id;
          assert(sub._id, 'Inserted submission should have an _id');
          assert.equal(sub.data.textField1, 'original');
          done();
        });
    });

    it('Bulk upsert operation with an existing id updates the record if it exists in the database', function (done) {
      const upsertForm = helper.template.forms[upsertFormName];
      const updated = {
        textField1: 'updated',
        requiredTextField2: 'required',
        uniqueTextField3: 'upsert-uniq-orig',
      };
      const updatedPayload = [
        {
          _id: insertedSubmissionId,
          data: updated,
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        upsertForm,
        updatedPayload,
        null,
        [/application\/json/, 206],
        true,
        function (err, res) {
          assert.equal(
            helper.getLastBulkSubmission().upsertedCount +
              helper.getLastBulkSubmission().modifiedCount,
            1,
          );
          // Verify submission was updated
          helper.getSubmission(upsertFormName, insertedSubmissionId, function (err, sub) {
            if (err) {
              return done(err);
            }
            const actual = sub.data;

            assert.equal(actual.textField1, updated.textField1);
            assert.equal(actual.requiredTextField2, updated.requiredTextField2);
            assert.equal(actual.uniqueTextField3, updated.uniqueTextField3);
            done();
          });
        },
      );
    });

    it('Bulk upserts with a new id creates a new record', function (done) {
      const newId = new mongoose.Types.ObjectId();
      const upsertForm = helper.template.forms[upsertFormName];
      const newSub = {
        textField1: 'newrecord',
        requiredTextField2: 'required',
        uniqueTextField3: 'upsert-uniq-new',
      };

      const payload = [
        {
          _id: newId,
          data: newSub,
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        upsertForm,
        payload,
        null,
        [/application\/json/, 200],
        true,
        function (err, res) {
          assert.equal(helper.getLastBulkSubmission().upsertedCount, 1);

          // Verify submission was created
          helper.getSubmission(upsertFormName, newId.toString(), function (err, sub) {
            if (err) {
              return done(err);
            }
            assert(sub, 'New upserted submission should exist');
            assert.equal(sub.data.textField1, 'newrecord');
            existSubmissionId = sub._id;
            done();
          });
        },
      );
    });

    it('Bulk upserts response check', function (done) {
      const upsertForm = helper.template.forms[upsertFormName];

      const newSubNoId = {
        data: {
          textField1: 'newrecord',
          requiredTextField2: 'required',
          uniqueTextField3: 'upsert-uniq-new-rec-no-id',
        },
      };

      const newSubWithId1 = {
        _id: new mongoose.Types.ObjectId().toString(),
        data: {
          textField1: 'newrecord',
          requiredTextField2: 'required',
          uniqueTextField3: 'upsert-uniq-new-rec-id-1',
        },
      };

      const newSubWithId2 = {
        _id: new mongoose.Types.ObjectId().toString(),
        data: {
          textField1: 'newrecord',
          requiredTextField2: 'required',
          uniqueTextField3: 'upsert-uniq-new-rec-id-2',
        },
      };

      const existSub = {
        _id: existSubmissionId,
        data: {
          textField1: 'newrecord',
          requiredTextField2: 'required',
          uniqueTextField3: 'upsert-uniq-exist-rec',
        },
      };

      const payload = [newSubWithId1, newSubNoId, existSub, newSubWithId2];

      helper.bulkCreateUpsertSubmissions(
        upsertForm,
        payload,
        null,
        [/application\/json/, 200],
        true,
        function (err, res) {
          assert.equal(res.modifiedCount, 1);
          assert.equal(res.modified[0].submission._id, existSub._id);
          assert.deepEqual(res.modified[0].original.data, existSub.data);

          assert.equal(res.upsertedCount, 3);
          assert.equal(res.upserted.length, 3);
          const respNewSubNoId = res.upserted.find(
            (item) => item.original.data.uniqueTextField3 === newSubNoId.data.uniqueTextField3,
          );
          const respNewSubWithId1 = res.upserted.find(
            (item) => item.submission._id === newSubWithId1._id,
          );
          const respNewSubWithId2 = res.upserted.find(
            (item) => item.submission._id === newSubWithId2._id,
          );
          assert.deepEqual(respNewSubNoId.original.data, newSubNoId.data);
          assert.equal(respNewSubWithId1.submission._id, newSubWithId1._id);
          assert.deepEqual(respNewSubWithId1.original.data, newSubWithId1.data);
          assert.equal(respNewSubWithId2.submission._id, newSubWithId2._id);
          assert.deepEqual(respNewSubWithId2.original.data, newSubWithId2.data);
          done();
        },
      );
    });
  });

  describe('Bulk Submissions bcross-form attack tests', function () {
    let foreignFormDef, foreignFormSubmissionId;
    const upsertFormName = 'bulkEndpointTest-upsert';

    before(function () {
      const bulkFixture = require('./fixtures/forms/bulkUpsertForm.js');
      foreignFormDef = bulkFixture.foreignForm;
    });

    it('Creates a test form for bcross-form attack tests', function (done) {
      helper.upsertForm(foreignFormDef, function (err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });

    it('Creates a submission in the foreign form for cross-form attack tests', function (done) {
      helper
        .submission('foreignForm-upsert', {
          textField1: 'foreign-original',
          requiredTextField2: 'required',
          uniqueTextField3: 'foreign-uniq-1',
        })
        .expect(201)
        .execute(function (err) {
          if (err) {
            return done(err);
          }
          const sub = helper.getLastSubmission();
          foreignFormSubmissionId = sub._id;
          assert(foreignFormSubmissionId, 'Foreign submission should have an _id');
          assert.equal(sub.data.textField1, 'foreign-original');
          done();
        });
    });

    it('PUT with submission _id belonging to another form in the same project returns failure and does not modify the submission', function (done) {
      const payload = [
        {
          _id: foreignFormSubmissionId,
          data: {
            textField1: 'pwned',
            requiredTextField2: 'abc',
            uniqueTextField3: 'upsert-bola-cross-form',
          },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        upsertFormName,
        payload,
        null,
        [/application\/json/, 207],
        true,
        function (err, res) {
          const result = helper.getLastBulkSubmission();

          assert.equal(result.upsertedCount, 0);
          assert.equal(result.modifiedCount, 0);
          assert.equal(result.failures.length, 1);
          assert.equal(result.failures[0].originalIndex, 0);

          // Verify the foreign submission was NOT modified
          helper.getSubmission('foreignForm-upsert', foreignFormSubmissionId, function (err, sub) {
            if (err) {
              return done(err);
            }
            assert.equal(
              sub.data.textField1,
              'foreign-original',
              'Foreign submission must not be modified',
            );
            assert.equal(
              sub.form.toString(),
              helper.template.forms['foreignForm-upsert']._id.toString(),
              'Form must not change',
            );
            done();
          });
        },
      );
    });

    it('PUT with submission _id that does not exist in any form creates a new submission in the target form', function (done) {
      const upsertForm = helper.template.forms[upsertFormName];
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const payload = [
        {
          _id: nonExistentId,
          data: {
            textField1: 'new',
            requiredTextField2: 'abc',
            uniqueTextField3: 'upsert-nonexistent-id',
          },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        upsertFormName,
        payload,
        null,
        [/application\/json/, 200],
        true,
        function (err, res) {
          const result = helper.getLastBulkSubmission();

          assert.equal(result.upsertedCount, 1);
          assert.equal(result.modifiedCount, 0);
          assert.equal(result.failures.length, 0);
          assert.equal(result.upserted[0].submission._id, nonExistentId);

          helper.getSubmission(upsertFormName, nonExistentId, function (err, sub) {
            if (err) {
              return done(err);
            }
            assert(sub, 'New submission should exist');
            assert.equal(sub.data.textField1, 'new');
            assert.equal(
              sub.form.toString(),
              upsertForm._id.toString(),
              'Submission must belong to the target form',
            );
            done();
          });
        },
      );
    });

    it('POST with submission _id belonging to another form does not modify the foreign submission and does not creates a new one', function (done) {
      const payload = [
        {
          _id: foreignFormSubmissionId,
          data: {
            textField1: 'pwned',
            requiredTextField2: 'abc',
            uniqueTextField3: 'post-bola-cross-form',
          },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        'bulkEndpointTest',
        payload,
        null,
        [/application\/json/, 201],
        false,
        function (err, res) {
          const result = helper.getLastBulkSubmission();
          assert.equal(result.insertedCount, 0);
          assert.equal(result.successes.length, 0);
          assert.equal(result.failures.length, 1);

          // Verify the foreign submission was NOT modified
          helper.getSubmission('foreignForm-upsert', foreignFormSubmissionId, function (err, sub) {
            if (err) {
              return done(err);
            }
            assert.equal(
              sub.data.textField1,
              'foreign-original',
              'Foreign submission must not be modified',
            );
            assert.equal(
              sub.form.toString(),
              helper.template.forms['foreignForm-upsert']._id.toString(),
              'Foreign submission form must not change',
            );
            done(err);
          });
        },
      );
    });

    it('Form from payload is ignored, server-controlled value is used for POST request', function (done) {
      const fakeFormId = new mongoose.Types.ObjectId().toString();

      const payload = [
        {
          form: fakeFormId,
          data: {
            textField1: 'ok',
            requiredTextField2: 'abc',
            uniqueTextField3: 'post-protected-fields-check',
          },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        'bulkEndpointTest',
        payload,
        null,
        [/application\/json/, 201],
        false,
        function (err, res) {
          const result = helper.getLastBulkSubmission();
          assert.equal(result.insertedCount, 1);

          const submissionId = result.successes[0].submission._id;

          helper.getSubmission('bulkEndpointTest', submissionId, function (err, submission) {
            if (err) {
              return done(err);
            }

            assert.notEqual(
              submission.form.toString(),
              fakeFormId,
              'form must not be taken from payload',
            );

            done(err);
          });
        },
      );
    });

    it('Form from payload is ignored, server-controlled value is used for PUT request', function (done) {
      const fakeFormId = new mongoose.Types.ObjectId().toString();

      const payload = [
        {
          form: fakeFormId,
          data: {
            textField1: 'ok',
            requiredTextField2: 'abc',
            uniqueTextField3: 'put-protected-fields-check',
          },
        },
      ];

      helper.bulkCreateUpsertSubmissions(
        upsertFormName,
        payload,
        null,
        [/application\/json/, 200],
        true,
        function (err, res) {
          const result = helper.getLastBulkSubmission();
          assert.equal(result.upsertedCount, 1);

          const submissionId = result.upserted[0].submission._id;

          helper.getSubmission(upsertFormName, submissionId, function (err, submission) {
            if (err) {
              return done(err);
            }
            assert.notEqual(
              submission.form.toString(),
              fakeFormId,
              'form must not be taken from payload',
            );

            done(err);
          });
        },
      );
    });
  });

  describe('Bulk Submission permissions', function () {
    // Two forms: one grants every *_all to authenticated, one grants every
    // *_own. user1 (authenticated role) exercises non-admin paths; project
    // owner exercises the admin path. Bulk endpoints are restricted to
    // admin / *_all, so *_own callers must be denied.
    const minimalComponents = [
      { type: 'textfield', label: 'Name', key: 'name', input: true, persistent: true },
    ];

    const buildUrl = (formName, plural) => {
      const formId = helper.template.forms[formName]._id;
      const project = helper.template.project && helper.template.project._id;
      const prefix = project ? `/project/${project}` : '';
      return `${prefix}/form/${formId}/submission${plural ? 's' : ''}`;
    };

    const ownerToken = () => helper.owner.token;
    const user1Token = () => helper.template.users.user1.token;

    const bulkPost = (formName, token, { trailingSlash = false } = {}) =>
      request(app)
        .post(buildUrl(formName, true) + (trailingSlash ? '/' : ''))
        .set('x-jwt-token', token)
        .send([{ data: { name: 'bulk' } }]);

    const bulkPut = (formName, token, { trailingSlash = false } = {}) =>
      request(app)
        .put(buildUrl(formName, true) + (trailingSlash ? '/' : ''))
        .set('x-jwt-token', token)
        .send([{ _id: new mongoose.Types.ObjectId().toString(), data: { name: 'bulk' } }]);

    const bulkDelete = (formName, token, { trailingSlash = false } = {}) =>
      request(app)
        .delete(buildUrl(formName, false) + (trailingSlash ? '/' : ''))
        .set('x-jwt-token', token)
        .set('x-delete-confirm', helper.template.forms[formName]._id);

    before(async function () {
      await new Promise((resolve, reject) => {
        helper
          .form('bulkPermsAll', minimalComponents, {
            submissionAccess: [
              { type: 'create_all', roles: ['authenticated'] },
              { type: 'read_all', roles: ['authenticated'] },
              { type: 'update_all', roles: ['authenticated'] },
              { type: 'delete_all', roles: ['authenticated'] },
            ],
          })
          .form('bulkPermsOwn', minimalComponents, {
            submissionAccess: [
              { type: 'create_own', roles: ['authenticated'] },
              { type: 'read_own', roles: ['authenticated'] },
              { type: 'update_own', roles: ['authenticated'] },
              { type: 'delete_own', roles: ['authenticated'] },
            ],
          })
          .execute((err) => (err ? reject(err) : resolve()));
      });
    });

    describe('Bulk POST', function () {
      it('admin → 201', async function () {
        const res = await bulkPost('bulkPermsAll', ownerToken());
        assert.equal(res.status, 201, 'admin must be allowed to bulk POST');
      });

      it('create_all caller → 201', async function () {
        const res = await bulkPost('bulkPermsAll', user1Token());
        assert.equal(res.status, 201, 'create_all caller must be allowed to bulk POST');
      });

      it('create_own caller → 403 (also verifies trailing slash does not bypass)', async function () {
        const res = await bulkPost('bulkPermsOwn', user1Token());
        assert.equal(
          res.status,
          403,
          'create_own caller must be denied bulk POST (admin/*_all only)',
        );
        assert.match(
          res.body.error || '',
          /admin role or the `create_all` submission permission/,
          'denial body must explain that admin/create_all is required',
        );

        // Express 4 default strict=false matches `/submissions` and
        // `/submissions/` — auth must normalize trailing slashes or a caller
        // with form-level `*_all` could bypass the bulk gate.
        const resSlash = await bulkPost('bulkPermsOwn', user1Token(), { trailingSlash: true });
        assert.equal(resSlash.status, 403, 'trailing slash must not bypass bulk gate');
        assert.match(
          resSlash.body.error || '',
          /admin role or the `create_all` submission permission/,
        );
      });
    });

    describe('Bulk PUT (upsert)', function () {
      it('admin → 200', async function () {
        const res = await bulkPut('bulkPermsAll', ownerToken());
        assert.equal(res.status, 200, 'admin must be allowed to bulk PUT');
      });

      it('update_all caller → 200', async function () {
        const res = await bulkPut('bulkPermsAll', user1Token());
        assert.equal(res.status, 200, 'update_all caller must be allowed to bulk PUT');
      });

      it('update_own caller → 403 (also verifies trailing slash does not bypass)', async function () {
        const res = await bulkPut('bulkPermsOwn', user1Token());
        assert.equal(
          res.status,
          403,
          'update_own caller must be denied bulk PUT (admin/*_all only)',
        );
        assert.match(
          res.body.error || '',
          /admin role or the `update_all` submission permission/,
          'denial body must explain that admin/update_all is required',
        );

        const resSlash = await bulkPut('bulkPermsOwn', user1Token(), { trailingSlash: true });
        assert.equal(resSlash.status, 403, 'trailing slash must not bypass bulk gate');
        assert.match(
          resSlash.body.error || '',
          /admin role or the `update_all` submission permission/,
        );
      });
    });

    describe('Bulk DELETE', function () {
      it('admin → 200', async function () {
        const res = await bulkDelete('bulkPermsAll', ownerToken());
        assert.equal(res.status, 200, 'admin must be allowed to bulk DELETE');
      });

      it('delete_all caller → 200', async function () {
        const res = await bulkDelete('bulkPermsAll', user1Token());
        assert.equal(res.status, 200, 'delete_all caller must be allowed to bulk DELETE');
      });

      it('delete_own caller → 403 (also verifies trailing slash does not bypass)', async function () {
        const res = await bulkDelete('bulkPermsOwn', user1Token());
        assert.equal(
          res.status,
          403,
          'delete_own caller must be denied bulk DELETE (admin/*_all only)',
        );
        assert.match(
          res.body.error || '',
          /admin role or the `delete_all` submission permission/,
          'denial body must explain that admin/delete_all is required',
        );

        const resSlash = await bulkDelete('bulkPermsOwn', user1Token(), { trailingSlash: true });
        assert.equal(resSlash.status, 403, 'trailing slash must not bypass bulk gate');
        assert.match(
          resSlash.body.error || '',
          /admin role or the `delete_all` submission permission/,
        );
      });
    });
  });

  describe('Nested Submissions', function () {
    it('Sets up a default project', function (done) {
      var owner = app.hasProjects || docker ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().execute(done);
    });

    it('Create the Child forms', (done) => {
      helper
        .form('childA', [
          {
            type: 'textfield',
            label: 'A',
            key: 'a',
            validate: {
              required: true,
            },
          },
          {
            type: 'textfield',
            label: 'B',
            key: 'b',
          },
        ])
        .form('childB', [
          {
            type: 'textfield',
            label: 'C',
            key: 'c',
            validate: {
              required: true,
            },
          },
          {
            type: 'textfield',
            label: 'D',
            key: 'd',
          },
        ])
        .form('childC', [
          {
            type: 'textfield',
            label: 'E',
            key: 'e',
            validate: {
              required: true,
            },
          },
          {
            type: 'textfield',
            label: 'F',
            key: 'f',
          },
        ])
        .execute(done);
    });

    it('Create the Parent form', (done) => {
      helper
        .form('parent', [
          {
            type: 'checkbox',
            label: 'Show A',
            key: 'showA',
          },
          {
            type: 'checkbox',
            label: 'Show B',
            key: 'showB',
          },
          {
            type: 'checkbox',
            label: 'Show C',
            key: 'showC',
          },
          {
            type: 'form',
            form: helper.template.forms.childA._id,
            label: 'Child A',
            key: 'childA',
            conditional: {
              show: true,
              when: 'showA',
              eq: true,
            },
          },
          {
            type: 'form',
            form: helper.template.forms.childB._id,
            label: 'Child B',
            key: 'childB',
            conditional: {
              show: true,
              when: 'showB',
              eq: true,
            },
          },
          {
            type: 'form',
            form: helper.template.forms.childC._id,
            label: 'Child C',
            key: 'childC',
            conditional: {
              show: true,
              when: 'showC',
              eq: true,
            },
          },
        ])
        .execute(done);
    });

    it('Should let you create a complete submission', (done) => {
      helper
        .submission('parent', {
          showA: true,
          showB: true,
          showC: true,
          childA: {
            data: {
              a: 'One',
              b: 'Two',
            },
          },
          childB: {
            data: {
              c: 'Three',
              d: 'Four',
            },
          },
          childC: {
            data: {
              e: 'Five',
              f: 'Six',
            },
          },
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const submission = helper.lastSubmission;
          assert.equal(submission.data.showA, true);
          assert.equal(submission.data.showB, true);
          assert.equal(submission.data.showC, true);
          assert(submission.data.childA.hasOwnProperty('_id'), 'The childA form was not submitted');
          assert(submission.data.childB.hasOwnProperty('_id'), 'The childB form was not submitted');
          assert(submission.data.childC.hasOwnProperty('_id'), 'The childC form was not submitted');
          assert.deepEqual(submission.data.childA.data, {
            a: 'One',
            b: 'Two',
          });
          assert.deepEqual(submission.data.childB.data, {
            c: 'Three',
            d: 'Four',
          });
          assert.deepEqual(submission.data.childC.data, {
            e: 'Five',
            f: 'Six',
          });
          done();
        });
    });

    it('Should allow you to update a submission with sub-submissions.', (done) => {
      const existing = _.cloneDeep(helper.lastSubmission);
      existing.data.childA.data.a = 'Seven';
      existing.data.childB.data.c = 'Eight';
      existing.data.childC.data.e = 'Nine';
      helper.updateSubmission(existing, (err) => {
        if (err) {
          return done(err);
        }
        const submission = helper.lastSubmission;
        assert(submission.data.childA.hasOwnProperty('_id'), 'The childA form was not submitted');
        assert(submission.data.childB.hasOwnProperty('_id'), 'The childB form was not submitted');
        assert(submission.data.childC.hasOwnProperty('_id'), 'The childC form was not submitted');
        assert.deepEqual(submission.data.childA.data, {
          a: 'Seven',
          b: 'Two',
        });
        assert.deepEqual(submission.data.childB.data, {
          c: 'Eight',
          d: 'Four',
        });
        assert.deepEqual(submission.data.childC.data, {
          e: 'Nine',
          f: 'Six',
        });
        done();
      });
    });

    it('Should should throw an error if we are missing a child data.', (done) => {
      helper
        .submission('parent', {
          showA: true,
          showB: true,
          showC: true,
          childA: {},
          childB: {
            data: {
              c: 'Three',
              d: 'Four',
            },
          },
          childC: {
            data: {
              e: 'Five',
              f: 'Six',
            },
          },
        })
        .expect(400)
        .execute((err) => {
          if (err) {
            return done(err);
          }

          assert.equal(helper.lastResponse.body.details.length, 1);
          assert.equal(helper.lastResponse.body.details[0].message, 'A is required');
          assert.deepEqual(helper.lastResponse.body.details[0].path, ['childA', 'data', 'a']);
          done();
        });
    });

    it('Should allow the submission to go through if the subform is conditionally hidden', (done) => {
      helper
        .submission('parent', {
          showA: false,
          showB: true,
          showC: true,
          childB: {
            data: {
              c: 'Three',
              d: 'Four',
            },
          },
          childC: {
            data: {
              e: 'Five',
              f: 'Six',
            },
          },
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const submission = helper.lastSubmission;
          assert.equal(submission.data.showA, false);
          assert.equal(submission.data.showB, true);
          assert.equal(submission.data.showC, true);
          assert(
            !submission.data.hasOwnProperty('childA'),
            'The childA form should not be present.',
          );
          assert(submission.data.childB.hasOwnProperty('_id'), 'The childB form was not submitted');
          assert(submission.data.childC.hasOwnProperty('_id'), 'The childC form was not submitted');
          assert.deepEqual(submission.data.childB.data, {
            c: 'Three',
            d: 'Four',
          });
          assert.deepEqual(submission.data.childC.data, {
            e: 'Five',
            f: 'Six',
          });
          done();
        });
    });

    it('Create child Wizard', (done) => {
      helper
        .form('childWizard', [
          {
            type: 'textfield',
            label: 'C',
            key: 'c',
            validate: {
              required: true,
            },
          },
          {
            type: 'textfield',
            label: 'D',
            key: 'd',
          },
        ])
        .execute(done);
    });

    it('Create parent Wizard', (done) => {
      helper
        .form('parentWizard', {
          title: 'Parent Wizard',
          name: 'parentWizard',
          path: 'parentwizard',
          type: 'form',
          display: 'wizard',
          components: [
            {
              label: 'Parent Wizard Page 1',
              title: 'Parent Wizard Page 1',
              breadcrumbClickable: true,
              buttonSettings: {
                previous: true,
                cancel: true,
                next: true,
              },
              navigateOnEnter: false,
              saveOnEnter: false,
              scrollToTop: false,
              collapsible: false,
              key: 'page1',
              type: 'panel',
              input: false,
              tableView: false,
              components: [
                {
                  label: 'Checkbox to show child wizard',
                  tableView: false,
                  validateWhenHidden: false,
                  key: 'checkboxToShowChildWizard',
                  type: 'checkbox',
                  input: true,
                  defaultValue: false,
                },
              ],
            },
            {
              label: 'Parent Wizard Page 2, Child wizard page',
              title: 'Parent Wizard Page 2, Child wizard page',
              breadcrumbClickable: true,
              buttonSettings: {
                previous: true,
                cancel: true,
                next: true,
              },
              navigateOnEnter: false,
              saveOnEnter: false,
              scrollToTop: false,
              collapsible: false,
              key: 'page2',
              conditional: {
                show: true,
                conjunction: 'all',
                conditions: [
                  {
                    component: 'checkboxToShowChildWizard',
                    operator: 'isEqual',
                    value: true,
                  },
                ],
              },
              type: 'panel',
              input: false,
              tableView: false,
              components: [
                {
                  label: 'Form',
                  tableView: true,
                  form: helper.template.forms.childWizard._id,
                  useOriginalRevision: false,
                  key: 'form',
                  type: 'form',
                  input: true,
                },
              ],
            },
            {
              label: 'Parent Wizard Page 3',
              title: 'Parent Wizard Page 3',
              breadcrumbClickable: true,
              buttonSettings: {
                previous: true,
                cancel: true,
                next: true,
              },
              navigateOnEnter: false,
              saveOnEnter: false,
              scrollToTop: false,
              collapsible: false,
              key: 'page3',
              type: 'panel',
              input: false,
              tableView: false,
              components: [
                {
                  label: 'Text Field',
                  applyMaskOn: 'change',
                  tableView: true,
                  validateWhenHidden: false,
                  key: 'textField',
                  type: 'textfield',
                  input: true,
                },
              ],
            },
          ],
        })
        .execute(done);
    });

    it('Should allow the submission to go through if the subform is a conditionally hidden Wizard', (done) => {
      helper
        .submission('parentWizard', {
          checkboxToShowChildWizard: false,
          textField: '',
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const submission = helper.lastSubmission;
          assert.equal(submission.data.checkboxToShowChildWizard, false);
          assert(
            !submission.data.hasOwnProperty('form'),
            'The nexted wizard should not be present.',
          );
          done();
        });
    });

    if (app.hasProjects || docker)
      it('Should allow a draft submission where all sub-submissions are also draft.', (done) => {
        helper
          .submission('parent', {
            state: 'draft',
            data: {
              showA: true,
              showB: true,
              showC: true,
              childA: {
                data: {
                  a: 'One',
                  b: 'Two',
                },
              },
              childB: {
                data: {
                  c: 'Three',
                  d: 'Four',
                },
              },
              childC: {
                data: {
                  e: 'Five',
                  f: 'Six',
                },
              },
            },
          })
          .execute((err) => {
            if (err) {
              return done(err);
            }

            const submission = helper.lastSubmission;
            assert.equal(submission.state, 'draft');
            assert(
              submission.data.childA.hasOwnProperty('_id'),
              'The childA form was not submitted',
            );
            assert(
              submission.data.childB.hasOwnProperty('_id'),
              'The childB form was not submitted',
            );
            assert(
              submission.data.childC.hasOwnProperty('_id'),
              'The childC form was not submitted',
            );
            assert.equal(submission.data.childA.state, 'draft');
            assert.equal(submission.data.childB.state, 'draft');
            assert.equal(submission.data.childC.state, 'draft');
            assert.deepEqual(submission.data.childA.data, {
              a: 'One',
              b: 'Two',
            });
            assert.deepEqual(submission.data.childB.data, {
              c: 'Three',
              d: 'Four',
            });
            assert.deepEqual(submission.data.childC.data, {
              e: 'Five',
              f: 'Six',
            });
            done();
          });
      });

    // if (app.hasProjects || docker)
    // it('Should allow an update to the submission where all sub-submissions are also updated.', (done) => {
    //   const existing = _.cloneDeep(helper.lastSubmission);
    //   existing.state = 'submitted';
    //   existing.data.childA.data.a = 'Seven';
    //   existing.data.childB.data.c = 'Eight';
    //   existing.data.childC.data.e = 'Nine';
    //   helper.updateSubmission(existing, (err) => {
    //     if (err) {
    //       return done(err);
    //     }
    //
    //     const submission = helper.lastSubmission;
    //     assert.equal(submission.state, 'submitted');
    //     assert(submission.data.childA.hasOwnProperty('_id'), 'The childA form was not submitted');
    //     assert(submission.data.childB.hasOwnProperty('_id'), 'The childB form was not submitted');
    //     assert(submission.data.childC.hasOwnProperty('_id'), 'The childC form was not submitted');
    //     assert.equal(submission.data.childA.state, 'submitted');
    //     assert.equal(submission.data.childB.state, 'submitted');
    //     assert.equal(submission.data.childC.state, 'submitted');
    //     assert.deepEqual(submission.data.childA.data, {
    //       a: 'Seven',
    //       b: 'Two'
    //     });
    //     assert.deepEqual(submission.data.childB.data, {
    //       c: 'Eight',
    //       d: 'Four'
    //     });
    //     assert.deepEqual(submission.data.childC.data, {
    //       e: 'Nine',
    //       f: 'Six'
    //     });
    //     done();
    //   });
    // });
  });

  describe('Submissions without Default Values', (done) => {
    before((done) => {
      // Create a resource to keep records.
      helper
        .form('defaultValuesForm', [
          {
            label: 'Text Field',
            tableView: true,
            key: 'textField',
            type: 'textfield',
            input: true,
          },
          {
            label: 'Checkbox',
            tableView: false,
            key: 'checkbox',
            type: 'checkbox',
            input: true,
          },
        ])
        .execute(function (err) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('Should set submission without default value', (done) => {
      helper
        .submission('defaultValuesForm', {
          data: {
            textField: '123',
          },
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const submission = helper.lastSubmission;
          const expectedData = {
            textField: '123',
          };

          assert.equal(JSON.stringify(submission.data), JSON.stringify(expectedData));
          done();
        });
    });
  });

  describe('Conditional Nested Forms Submissions', function () {
    before('Sets up a default project', function (done) {
      var owner = app.hasProjects || docker ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().execute(done);
    });

    before('Create the child form1', (done) => {
      helper
        .form('childForm1', [
          {
            label: 'Text Field form1',
            applyMaskOn: 'change',
            tableView: true,
            validate: {
              required: true,
            },
            validateWhenHidden: false,
            key: 'textFieldForm1',
            type: 'textfield',
            input: true,
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
          },
        ])
        .execute(done);
    });

    before('Create the child form2', (done) => {
      helper
        .form('childForm2', [
          {
            label: 'Text Field - form2',
            applyMaskOn: 'change',
            tableView: true,
            validate: {
              required: true,
            },
            validateWhenHidden: false,
            key: 'textFieldForm2',
            type: 'textfield',
            input: true,
          },
          {
            label: 'Form',
            tableView: true,
            form: helper.template.forms.childForm1._id,
            useOriginalRevision: false,
            key: 'form',
            type: 'form',
            input: true,
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
          },
        ])
        .execute(done);
    });

    before('Create the child form3', (done) => {
      helper
        .form('childForm3', [
          {
            label: 'Text Field - form3',
            applyMaskOn: 'change',
            tableView: true,
            validate: {
              required: true,
            },
            validateWhenHidden: false,
            key: 'textFieldForm3',
            type: 'textfield',
            input: true,
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
          },
        ])
        .execute(done);
    });

    before('Create the parent form', (done) => {
      helper
        .form('parentForm1', [
          {
            label: 'Radio',
            optionsLabelPosition: 'right',
            inline: false,
            tableView: false,
            values: [
              {
                label: 'a',
                value: 'a',
                shortcut: '',
              },
              {
                label: 'b',
                value: 'b',
                shortcut: '',
              },
            ],
            validateWhenHidden: false,
            key: 'radio',
            type: 'radio',
            input: true,
          },
          {
            label: 'Form',
            tableView: true,
            form: helper.template.forms.childForm2._id,
            useOriginalRevision: false,
            key: 'form',
            conditional: {
              show: true,
              conjunction: 'all',
              conditions: [
                {
                  component: 'radio',
                  operator: 'isEqual',
                  value: 'a',
                },
              ],
            },
            type: 'form',
            input: true,
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
          },
        ])
        .execute(done);
    });

    before('Create the parent form 2', (done) => {
      helper
        .form('parentForm2', [
          {
            label: 'Radio',
            optionsLabelPosition: 'right',
            inline: false,
            tableView: false,
            values: [
              {
                label: 'a',
                value: 'a',
                shortcut: '',
              },
              {
                label: 'b',
                value: 'b',
                shortcut: '',
              },
            ],
            validateWhenHidden: false,
            key: 'radio',
            type: 'radio',
            input: true,
          },
          {
            label: 'Form',
            tableView: true,
            form: helper.template.forms.childForm1._id,
            useOriginalRevision: false,
            key: 'form',
            conditional: {
              show: true,
              conjunction: 'all',
              conditions: [
                {
                  component: 'radio',
                  operator: 'isEqual',
                  value: 'a',
                },
              ],
            },
            type: 'form',
            input: true,
          },
          {
            label: 'Form 2',
            tableView: true,
            form: helper.template.forms.childForm3._id,
            useOriginalRevision: false,
            key: 'form2',
            conditional: {
              show: true,
              conjunction: 'all',
              conditions: [
                {
                  component: 'radio',
                  operator: 'isEqual',
                  value: 'b',
                },
              ],
            },
            type: 'form',
            input: true,
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
          },
        ])
        .execute(done);
    });

    let nestedSubmission = null;
    it('Should allow you to submit data into a conditionally visible form if another nested form is conditionally hidden', (done) => {
      helper
        .submission('parentForm2', {
          radio: 'b',
          submit: true,
          form2: {
            data: {
              textFieldForm3: 'Hello',
            },
          },
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          nestedSubmission = helper.lastSubmission;
          assert.equal(nestedSubmission.data.radio, 'b');
          assert.equal(nestedSubmission.data.form2.data.textFieldForm3, 'Hello');
          done();
        });
    });

    it('Should allow you to update data into a conditionally visible form if another nested form is conditionally hidden', (done) => {
      nestedSubmission.data.form2.data.textFieldForm3 = 'Hello Update';
      helper.submission('parentForm2', nestedSubmission).execute((err) => {
        if (err) {
          return done(err);
        }

        nestedSubmission = helper.lastSubmission;
        assert.equal(nestedSubmission.data.radio, 'b');
        assert.equal(nestedSubmission.data.form2.data.textFieldForm3, 'Hello Update');
        done();
      });
    });

    it('Should let you create a submission without errors', (done) => {
      helper
        .submission('parentForm1', {
          radio: 'b',
          submit: true,
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          nestedSubmission = helper.lastSubmission;
          assert.deepEqual(nestedSubmission.data, { radio: 'b', submit: true });
          done();
        });
    });

    it('Should allow you to submit data to the nested form.', (done) => {
      helper
        .submission('parentForm1', {
          radio: 'a',
          form: {
            data: {
              textFieldForm2: 'Foo',
              form: {
                data: {
                  textFieldForm1: 'Bar',
                },
              },
            },
          },
          submit: true,
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          nestedSubmission = helper.lastSubmission;
          assert.equal(nestedSubmission.data.radio, 'a');
          assert.equal(nestedSubmission.data.form.data.textFieldForm2, 'Foo');
          assert.equal(nestedSubmission.data.form.data.form.data.textFieldForm1, 'Bar');
          done();
        });
    });

    it('Should allow you to update data to the nested form.', (done) => {
      nestedSubmission.data.form.data.textFieldForm2 = 'Foo 1';
      nestedSubmission.data.form.data.form.data.textFieldForm1 = 'Bar 1';
      helper.submission('parentForm1', nestedSubmission).execute((err) => {
        if (err) {
          return done(err);
        }

        nestedSubmission = helper.lastSubmission;
        done();
      });
    });

    it('Should have updated the data of the nested forms.', (done) => {
      helper.getSubmission('parentForm1', nestedSubmission._id, function (err, submission) {
        if (err) {
          done(err);
        }
        assert.equal(submission.data.radio, 'a');
        assert.equal(submission.data.form.data.textFieldForm2, 'Foo 1');
        assert.equal(submission.data.form.data.form.data.textFieldForm1, 'Bar 1');
        done();
      });
    });
  });

  describe('Nested Forms and clearOnHide', function () {
    before('Sets up a default project', function (done) {
      var owner = app.hasProjects || docker ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().execute(done);
    });

    before('Create the child form test', (done) => {
      helper
        .form('childFormTest', [
          {
            label: 'Text Field 2 child',
            applyMaskOn: 'change',
            tableView: true,
            validate: {
              required: true,
              custom: '',
              customPrivate: false,
              strictDateValidation: false,
              multiple: false,
              unique: false,
              minLength: '',
              maxLength: '',
              pattern: '',
            },
            validateWhenHidden: false,
            key: 'textField2Child',
            type: 'textfield',
            input: true,
            id: 'eblr8t9',
            placeholder: '',
            prefix: '',
            customClass: '',
            suffix: '',
            multiple: false,
            defaultValue: null,
            protected: false,
            unique: false,
            persistent: true,
            hidden: false,
            clearOnHide: true,
            refreshOn: '',
            redrawOn: '',
            modalEdit: false,
            dataGridLabel: false,
            labelPosition: 'top',
            description: '',
            errorLabel: '',
            tooltip: '',
            hideLabel: false,
            tabindex: '',
            disabled: false,
            autofocus: false,
            dbIndex: false,
            customDefaultValue: '',
            calculateValue: '',
            calculateServer: false,
            widget: {
              type: 'input',
            },
            attributes: {},
            validateOn: 'change',
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            overlay: {
              style: '',
              left: '',
              top: '',
              width: '',
              height: '',
            },
            allowCalculateOverride: false,
            encrypted: false,
            showCharCount: false,
            showWordCount: false,
            properties: {},
            allowMultipleMasks: false,
            addons: [],
            mask: false,
            inputType: 'text',
            inputFormat: 'plain',
            inputMask: '',
            displayMask: '',
            spellcheck: true,
            truncateMultipleSpaces: false,
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
            hidden: true,
            customConditional: 'show = false',
            id: 'exfh9n',
            placeholder: '',
            prefix: '',
            customClass: '',
            suffix: '',
            multiple: false,
            defaultValue: null,
            protected: false,
            unique: false,
            persistent: false,
            clearOnHide: true,
            refreshOn: '',
            redrawOn: '',
            modalEdit: false,
            dataGridLabel: true,
            labelPosition: 'top',
            description: '',
            errorLabel: '',
            tooltip: '',
            hideLabel: false,
            tabindex: '',
            disabled: false,
            autofocus: false,
            dbIndex: false,
            customDefaultValue: '',
            calculateValue: '',
            calculateServer: false,
            widget: {
              type: 'input',
            },
            attributes: {},
            validateOn: 'change',
            validate: {
              required: false,
              custom: '',
              customPrivate: false,
              strictDateValidation: false,
              multiple: false,
              unique: false,
            },
            conditional: {
              show: null,
              when: null,
              eq: '',
            },
            overlay: {
              style: '',
              left: '',
              top: '',
              width: '',
              height: '',
            },
            allowCalculateOverride: false,
            encrypted: false,
            showCharCount: false,
            showWordCount: false,
            properties: {},
            allowMultipleMasks: false,
            addons: [],
            size: 'md',
            leftIcon: '',
            rightIcon: '',
            block: false,
            action: 'submit',
            theme: 'primary',
          },
        ])
        .execute(done);
    });

    before('Create the parent form test', (done) => {
      helper
        .form('parentFormTest', [
          {
            label: 'Text Field parent',
            applyMaskOn: 'change',
            tableView: true,
            validateWhenHidden: false,
            key: 'textFieldParent',
            type: 'textfield',
            input: true,
          },
          {
            label: 'Form',
            hidden: true,
            tableView: true,
            form: helper.template.forms.childFormTest._id,
            useOriginalRevision: false,
            clearOnHide: true,
            key: 'form',
            type: 'form',
            input: true,
          },
          {
            label: 'Submit',
            tableView: false,
            key: 'submit',
            type: 'button',
            input: true,
            saveOnEnter: false,
          },
        ])
        .execute(done);
    });

    it('Should allow you to submit data for the form with hidden nested form with enabled clearOnHide and required field', (done) => {
      helper
        .submission('parentFormTest', {
          textFieldParent: '',
          submit: true,
          form: { data: { textField1Child: '', textField2Child: '', submit: false }, metadata: {} },
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const subm = helper.lastSubmission;
          assert.deepEqual(subm.data, {
            textFieldParent: '',
            form: {
              data: {},
              metadata: {},
            },
            submit: true,
          });
          helper.deleteSubmission(helper.lastSubmission, undefined, undefined, done);
        });
    });

    describe('Submission IDOR Protection', () => {
      let idorForm = null;
      let submissionA = null;
      let submissionB = null;

      it('Should create a form for submission IDOR tests', (done) => {
        request(app)
          .post(hook.alter('url', '/form', template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            title: 'IDOR Submission Form',
            name: 'idorSubmissionForm',
            path: 'idor/submission-form',
            type: 'form',
            access: [
              {
                type: 'read_all',
                roles: [template.roles.authenticated._id.toString()],
              },
            ],
            submissionAccess: [
              {
                type: 'create_own',
                roles: [template.roles.authenticated._id.toString()],
              },
              {
                type: 'read_own',
                roles: [template.roles.authenticated._id.toString()],
              },
              {
                type: 'update_own',
                roles: [template.roles.authenticated._id.toString()],
              },
            ],
            components: [
              {
                type: 'textfield',
                key: 'name',
                label: 'Name',
                input: true,
              },
            ],
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            idorForm = res.body;
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('Should create Submission A', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${idorForm._id}/submission`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              name: 'Submission A',
            },
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            submissionA = res.body;
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('Should create Submission B', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${idorForm._id}/submission`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              name: 'Submission B',
            },
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            submissionB = res.body;
            template.users.admin.token = res.headers['x-jwt-token'];
            done();
          });
      });

      it('Should not allow POST /form/:formId/submission with a spoofed _id to overwrite an existing submission', (done) => {
        request(app)
          .post(hook.alter('url', `/form/${idorForm._id}/submission`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              name: 'Spoofed Submission',
            },
            _id: submissionB._id,
          })
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            if (res.statusCode === 201) {
              assert.notEqual(res.body._id, submissionB._id);
            }
            if (res.headers['x-jwt-token']) {
              template.users.admin.token = res.headers['x-jwt-token'];
            }

            // Verify Submission B was NOT modified.
            request(app)
              .get(
                hook.alter('url', `/form/${idorForm._id}/submission/${submissionB._id}`, template),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect('Content-Type', /json/)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                assert.equal(res.body._id, submissionB._id);
                assert.equal(res.body.data.name, 'Submission B');
                template.users.admin.token = res.headers['x-jwt-token'];
                done();
              });
          });
      });

      it('Should not allow PUT /form/:formId/submission/:subId with a spoofed _id to target a different submission', (done) => {
        request(app)
          .put(hook.alter('url', `/form/${idorForm._id}/submission/${submissionA._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              name: 'IDOR Hijack Attempt',
            },
            _id: submissionB._id,
          })
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            if (res.statusCode === 200) {
              assert.equal(res.body._id, submissionA._id);
            }
            if (res.headers['x-jwt-token']) {
              template.users.admin.token = res.headers['x-jwt-token'];
            }

            // Verify Submission B was NOT modified.
            request(app)
              .get(
                hook.alter('url', `/form/${idorForm._id}/submission/${submissionB._id}`, template),
              )
              .set('x-jwt-token', template.users.admin.token)
              .expect('Content-Type', /json/)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                assert.equal(res.body._id, submissionB._id);
                assert.equal(res.body.data.name, 'Submission B');
                template.users.admin.token = res.headers['x-jwt-token'];
                done();
              });
          });
      });

      it('Should not allow PUT /form/:formId/submission/:subId with a spoofed form to target a different form', (done) => {
        request(app)
          .put(hook.alter('url', `/form/${idorForm._id}/submission/${submissionA._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              name: 'Form Hijack Attempt',
            },
            form: template.forms.adminRegister._id,
          })
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            if (res.statusCode === 200) {
              assert.equal(res.body._id, submissionA._id);
              assert.equal(res.body.form, idorForm._id);
            }
            if (res.headers['x-jwt-token']) {
              template.users.admin.token = res.headers['x-jwt-token'];
            }
            done();
          });
      });

      it('Should not allow PATCH on /form/:formId/submission/:subId', (done) => {
        request(app)
          .patch(hook.alter('url', `/form/${idorForm._id}/submission/${submissionA._id}`, template))
          .set('x-jwt-token', template.users.admin.token)
          .send({
            data: {
              name: 'Patched Name',
            },
          })
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            assert(res.statusCode >= 400, `Expected error status but got ${res.statusCode}`);
            done();
          });
      });
    });
  });

  describe('Reference component $lookup access control (FIO-11566)', function () {
    // Forms / submissions created during setup.
    let refTargetReadOwn = null; // resource whose submissions are read_own
    let refTargetReadAll = null; // resource whose submissions are read_all
    let refTargetResource = null; // resource using submission resource access
    let otherForm = null; // an unrelated form, used to prove cross-form isolation
    let parentReadOwn = null; // single reference -> refTargetReadOwn
    let parentReadAll = null; // single reference -> refTargetReadAll
    let parentMultiple = null; // multiple reference -> refTargetReadOwn
    let parentResource = null; // single reference -> refTargetResource

    let refUser1 = null; // refTargetReadOwn submission owned by user1
    let refUser1b = null; // a second refTargetReadOwn submission owned by user1
    let refUser2 = null; // refTargetReadOwn submission owned by user2
    let refAll = null; // refTargetReadAll submission owned by user1
    let otherSub = null; // otherForm submission (the cross-form leak target)
    let resourceSub = null; // refTargetResource submission owned by user1, read-granted to user2

    const authRole = () => template.roles.authenticated._id.toString();
    const submissionModel = () => hook.alter('formio', app.formio).resources.submission.model;
    const projectFields = () =>
      refTargetReadOwn && refTargetReadOwn.project
        ? { project: new mongoose.Types.ObjectId(refTargetReadOwn.project) }
        : {};
    // Distinct, non-overlapping secrets (no value is a substring of another) so a missing
    // hydration can be asserted structurally rather than by scanning serialized output.
    const SECRET_RO_U1 = 'refReadOwnUserOneSecret';
    const SECRET_RO_U1B = 'refReadOwnUserOneBetaSecret';
    const SECRET_RO_U2 = 'refReadOwnUserTwoSecret';
    const SECRET_ALL = 'refReadAllSecretValue';
    const SECRET_CROSS = 'refCrossFormSecretValue';
    const SECRET_RES = 'refResourceAccessSecretValue';

    const refTargetForm = (name, readType) => ({
      title: name,
      name,
      path: name.toLowerCase(),
      type: 'resource',
      access: [{ type: 'read_all', roles: [authRole()] }],
      submissionAccess: [
        { type: 'create_own', roles: [authRole()] },
        { type: readType, roles: [authRole()] },
        { type: 'update_own', roles: [authRole()] },
      ],
      components: [
        { type: 'textfield', key: 'secret', label: 'Secret', input: true },
        { type: 'button', key: 'submit', label: 'Submit', input: true },
      ],
    });

    const parentForm = (name, resourceId, multiple) => ({
      title: name,
      name,
      path: name.toLowerCase(),
      type: 'form',
      access: [{ type: 'read_all', roles: [authRole()] }],
      submissionAccess: [
        { type: 'create_own', roles: [authRole()] },
        // read_all so any authenticated user can index every parent submission;
        // the access decision under test is on the *referenced* form, not the parent.
        { type: 'read_all', roles: [authRole()] },
      ],
      components: [
        // A stable, non-reference field so each parent submission can be located in the
        // index response regardless of whether its reference hydrated.
        { type: 'textfield', key: 'tag', label: 'Tag', input: true },
        {
          label: 'Ref',
          key: 'ref',
          type: 'select',
          input: true,
          dataSrc: 'resource',
          data: { resource: resourceId },
          reference: true,
          multiple: !!multiple,
          template: '<span>{{ item.data.secret }}</span>',
        },
        { type: 'button', key: 'submit', label: 'Submit', input: true },
      ],
    });

    const createForm = (def, done) => {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send(def)
        .expect(201)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          template.users.admin.token = res.headers['x-jwt-token'];
          done(null, res.body);
        });
    };

    const createSub = (formId, data, user, done) => {
      request(app)
        .post(hook.alter('url', `/form/${formId}/submission`, template))
        .set('x-jwt-token', user.token)
        .send({ data })
        .expect(201)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          user.token = res.headers['x-jwt-token'];
          done(null, res.body);
        });
    };

    const indexSubs = (formId, user, done) => {
      request(app)
        .get(hook.alter('url', `/form/${formId}/submission?limit=100&skip=0`, template))
        .set('x-jwt-token', user.token)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          user.token = res.headers['x-jwt-token'];
          done(null, res.body);
        });
    };

    // Write a parent submission straight to the collection, bypassing the reference
    // component's create-time validation. Used to forge references a user could not
    // create through the API (another form's submission, another user's submission).
    const insertParent = (formId, refValue, owner, tag) =>
      submissionModel().create({
        ...projectFields(),
        form: new mongoose.Types.ObjectId(formId),
        owner: new mongoose.Types.ObjectId(owner._id),
        data: { ref: refValue, tag },
        roles: [],
        access: [],
        deleted: null,
      });

    const findByTag = (list, tag) => list.find((s) => _.get(s, 'data.tag') === tag);

    // True if the parent's reference hydrated to a full submission (carries data), rather
    // than staying an un-hydrated { _id } shell (or being filtered out of the result).
    const refHydrated = (sub) => {
      const ref = _.get(sub, 'data.ref');
      if (!ref) {
        return false;
      }
      return (Array.isArray(ref) ? ref : [ref]).some((r) => r && r.data);
    };

    // Every reference secret hydrated anywhere in an index response.
    const hydratedSecrets = (list) =>
      list.flatMap((sub) => {
        const ref = _.get(sub, 'data.ref');
        if (!ref) {
          return [];
        }
        return (Array.isArray(ref) ? ref : [ref])
          .map((r) => _.get(r, 'data.secret'))
          .filter((v) => v !== undefined);
      });

    // Asserts that a denied/unreadable reference is preserved as a bare { _id } shell
    // rather than being dropped from the response entirely (FIO-11566 regression guard).
    // - single reference: ref must be an object with the expected _id and no data key.
    // - multiple reference: every entry must be a bare { _id } shell with no data key.
    const assertBareRef = (ref, expectedId, msg) => {
      assert.ok(ref, `${msg}: reference field must still be present, not dropped`);
      if (Array.isArray(ref)) {
        ref.forEach((r) => {
          assert.ok(r && r._id, `${msg}: each entry must retain its _id`);
          assert.equal(_.has(r, 'data'), false, `${msg}: entry must not carry hydrated data`);
        });
      } else {
        assert.equal(
          ref._id && ref._id.toString(),
          expectedId && expectedId.toString(),
          `${msg}: must retain the original _id`,
        );
        assert.equal(_.has(ref, 'data'), false, `${msg}: must not carry hydrated data`);
      }
    };

    before('Creates the referenced resources and an unrelated form', (done) => {
      createForm(refTargetForm('refTargetReadOwn', 'read_own'), (err, form) => {
        if (err) {
          return done(err);
        }
        refTargetReadOwn = form;
        createForm(refTargetForm('refTargetReadAll', 'read_all'), (err, form) => {
          if (err) {
            return done(err);
          }
          refTargetReadAll = form;
          createForm(
            {
              title: 'refOtherForm',
              name: 'refOtherForm',
              path: 'refotherform',
              type: 'form',
              access: [{ type: 'read_all', roles: [authRole()] }],
              submissionAccess: [{ type: 'create_own', roles: [authRole()] }],
              components: [
                { type: 'textfield', key: 'secret', label: 'Secret', input: true },
                { type: 'button', key: 'submit', label: 'Submit', input: true },
              ],
            },
            (err, form) => {
              if (err) {
                return done(err);
              }
              otherForm = form;
              createForm(
                {
                  title: 'refTargetResource',
                  name: 'refTargetResource',
                  path: 'reftargetresource',
                  type: 'resource',
                  access: [{ type: 'read_all', roles: [authRole()] }],
                  submissionAccess: [{ type: 'create_own', roles: [authRole()] }],
                  components: [
                    { type: 'textfield', key: 'secret', label: 'Secret', input: true },
                    // defaultPermission flags the form for submission resource access, so
                    // permissionHandler enables submissionResourceAccessFilter on index.
                    {
                      type: 'textfield',
                      key: 'grant',
                      label: 'Grant',
                      input: true,
                      defaultPermission: 'read',
                    },
                    { type: 'button', key: 'submit', label: 'Submit', input: true },
                  ],
                },
                (err, form) => {
                  if (err) {
                    return done(err);
                  }
                  refTargetResource = form;
                  done();
                },
              );
            },
          );
        });
      });
    });

    before('Creates referenced submissions owned by different users', (done) => {
      createSub(
        refTargetReadOwn._id,
        { secret: SECRET_RO_U1 },
        template.users.user1,
        (err, sub) => {
          if (err) {
            return done(err);
          }
          refUser1 = sub;
          createSub(
            refTargetReadOwn._id,
            { secret: SECRET_RO_U1B },
            template.users.user1,
            (err, sub) => {
              if (err) {
                return done(err);
              }
              refUser1b = sub;
              createSub(
                refTargetReadOwn._id,
                { secret: SECRET_RO_U2 },
                template.users.user2,
                (err, sub) => {
                  if (err) {
                    return done(err);
                  }
                  refUser2 = sub;
                  createSub(
                    refTargetReadAll._id,
                    { secret: SECRET_ALL },
                    template.users.user1,
                    (err, sub) => {
                      if (err) {
                        return done(err);
                      }
                      refAll = sub;
                      createSub(
                        otherForm._id,
                        { secret: SECRET_CROSS },
                        template.users.user1,
                        (err, sub) => {
                          if (err) {
                            return done(err);
                          }
                          otherSub = sub;
                          // refTargetResource submission: owned by user1, but read-granted
                          // to user2 via a submission-level resource access entry.
                          submissionModel()
                            .create({
                              ...projectFields(),
                              form: new mongoose.Types.ObjectId(refTargetResource._id),
                              owner: new mongoose.Types.ObjectId(template.users.user1._id),
                              data: { secret: SECRET_RES },
                              access: [
                                {
                                  type: 'read',
                                  resources: [
                                    new mongoose.Types.ObjectId(template.users.user2._id),
                                  ],
                                },
                              ],
                              roles: [],
                              deleted: null,
                            })
                            .then((created) => {
                              resourceSub = created.toObject();
                              done();
                            })
                            .catch(done);
                        },
                      );
                    },
                  );
                },
              );
            },
          );
        },
      );
    });

    before('Creates the parent forms with reference components', (done) => {
      createForm(parentForm('refParentReadOwn', refTargetReadOwn._id, false), (err, form) => {
        if (err) {
          return done(err);
        }
        parentReadOwn = form;
        createForm(parentForm('refParentReadAll', refTargetReadAll._id, false), (err, form) => {
          if (err) {
            return done(err);
          }
          parentReadAll = form;
          createForm(parentForm('refParentMultiple', refTargetReadOwn._id, true), (err, form) => {
            if (err) {
              return done(err);
            }
            parentMultiple = form;
            createForm(
              parentForm('refParentResource', refTargetResource._id, false),
              (err, form) => {
                if (err) {
                  return done(err);
                }
                parentResource = form;
                done();
              },
            );
          });
        });
      });
    });

    before('Creates parent submissions referencing the resources', (done) => {
      // user1 references their own read_own submission.
      createSub(
        parentReadOwn._id,
        { tag: 'ownerUser1', ref: { _id: refUser1._id } },
        template.users.user1,
        (err) => {
          if (err) {
            return done(err);
          }
          // user2 references their own read_own submission.
          createSub(
            parentReadOwn._id,
            { tag: 'ownerUser2', ref: { _id: refUser2._id } },
            template.users.user2,
            (err) => {
              if (err) {
                return done(err);
              }
              // user1 references a read_all submission.
              createSub(
                parentReadAll._id,
                { tag: 'readAll', ref: { _id: refAll._id } },
                template.users.user1,
                (err) => {
                  if (err) {
                    return done(err);
                  }
                  // user1 references two of their own read_own submissions (multiple).
                  createSub(
                    parentMultiple._id,
                    { tag: 'multiple', ref: [{ _id: refUser1._id }, { _id: refUser1b._id }] },
                    template.users.user1,
                    done,
                  );
                },
              );
            },
          );
        },
      );
    });

    before('Forges parent submissions with references the owner could not create', (done) => {
      // A reference into another form (cross-form isolation), owned by admin.
      insertParent(
        parentReadOwn._id,
        { _id: new mongoose.Types.ObjectId(otherSub._id) },
        template.users.admin,
        'crossForm',
      )
        // user2 owns this parent but its reference points at user1's read_own submission.
        .then(() =>
          insertParent(
            parentReadOwn._id,
            { _id: new mongoose.Types.ObjectId(refUser1._id) },
            template.users.user2,
            'spoofedToUser1',
          ),
        )
        // user2 owns this parent; its reference points at a submission user2 can read only
        // via submission resource access (not as owner).
        .then(() =>
          insertParent(
            parentResource._id,
            { _id: new mongoose.Types.ObjectId(resourceSub._id) },
            template.users.user2,
            'resourceAccess',
          ),
        )
        // user1 owns this parent; its multiple reference mixes an entry user1 owns
        // (refUser1) with one user1 does not own (refUser2) — partial-access case.
        .then(() =>
          insertParent(
            parentMultiple._id,
            [
              { _id: new mongoose.Types.ObjectId(refUser1._id) },
              { _id: new mongoose.Types.ObjectId(refUser2._id) },
            ],
            template.users.user1,
            'multiplePartial',
          ),
        )
        .then(() => done())
        .catch(done);
    });

    it('does not hydrate a reference that resolves to a submission in another form', (done) => {
      indexSubs(parentReadOwn._id, template.users.admin, (err, list) => {
        if (err) {
          return done(err);
        }
        const crossForm = findByTag(list, 'crossForm');
        assert.ok(crossForm, 'admin should see the forged cross-form parent submission');
        assert.equal(
          refHydrated(crossForm),
          false,
          'a reference into another form must not hydrate',
        );
        assertBareRef(
          _.get(crossForm, 'data.ref'),
          otherSub._id,
          'cross-form reference must remain a bare {_id} shell, not be dropped',
        );
        assert.equal(
          hydratedSecrets(list).includes(SECRET_CROSS),
          false,
          'cross-form secret must never be exposed through the reference',
        );
        done();
      });
    });

    it('hydrates only references the indexing user owns on a read_own resource', (done) => {
      indexSubs(parentReadOwn._id, template.users.user2, (err, list) => {
        if (err) {
          return done(err);
        }
        const own = findByTag(list, 'ownerUser2');
        const others = findByTag(list, 'ownerUser1');

        assert.ok(own, 'user2 should see the parent referencing their own record');
        assert.equal(_.get(own, 'data.ref._id'), refUser2._id, 'reference _id is preserved');
        assert.equal(
          _.get(own, 'data.ref.data.secret'),
          SECRET_RO_U2,
          'user2 must see the hydrated data for the reference they own',
        );

        assert.ok(others, 'user2 should still see the parent owned by user1 (parent is read_all)');
        assert.equal(
          refHydrated(others),
          false,
          "user1's read_own reference must not hydrate for user2",
        );
        assertBareRef(
          _.get(others, 'data.ref'),
          refUser1._id,
          "user1's unreadable reference must remain a bare {_id} shell for user2",
        );
        assert.equal(
          hydratedSecrets(list).includes(SECRET_RO_U1),
          false,
          "user2 must not see user1's read_own reference data",
        );
        done();
      });
    });

    it('does not hydrate a forged reference to a read_own submission owned by someone else', (done) => {
      // The parent is owned by user2, but its reference points at user1's submission.
      // Owning the parent must not grant access to the referenced submission.
      indexSubs(parentReadOwn._id, template.users.user2, (err, list) => {
        if (err) {
          return done(err);
        }
        const spoofed = findByTag(list, 'spoofedToUser1');
        assert.ok(spoofed, 'user2 should see their own (forged) parent submission');
        assert.equal(_.get(spoofed, 'owner'), template.users.user2._id, 'parent is owned by user2');
        assert.equal(
          refHydrated(spoofed),
          false,
          'a forged reference to a submission owned by another user must not hydrate',
        );
        assertBareRef(
          _.get(spoofed, 'data.ref'),
          refUser1._id,
          'forged reference must remain a bare {_id} shell, not be dropped',
        );
        assert.equal(
          hydratedSecrets(list).includes(SECRET_RO_U1),
          false,
          'forging a reference must not leak the target submission data',
        );
        done();
      });
    });

    it('hydrates a read_all reference for any reader regardless of owner', (done) => {
      // Guards against an owner filter being applied when the caller actually has
      // read_all on the referenced form.
      indexSubs(parentReadAll._id, template.users.user2, (err, list) => {
        if (err) {
          return done(err);
        }
        const parent = findByTag(list, 'readAll');
        assert.ok(parent, 'user2 should see the parent submission');
        assert.equal(_.get(parent, 'data.ref._id'), refAll._id, 'reference _id is preserved');
        assert.equal(
          _.get(parent, 'data.ref.data.secret'),
          SECRET_ALL,
          'read_all reference data must hydrate even though user2 is not the owner',
        );
        done();
      });
    });

    it('hydrates every entry of a multiple reference the user can read', (done) => {
      indexSubs(parentMultiple._id, template.users.user1, (err, list) => {
        if (err) {
          return done(err);
        }
        const parent = findByTag(list, 'multiple');
        assert.ok(parent, 'multiple reference parent should be present');
        assert.ok(Array.isArray(parent.data.ref), 'multiple reference should hydrate to an array');
        const secrets = parent.data.ref.map((r) => _.get(r, 'data.secret')).sort();
        assert.deepEqual(
          secrets,
          [SECRET_RO_U1, SECRET_RO_U1B].sort(),
          'both owned entries of the multiple reference must hydrate',
        );
        done();
      });
    });

    it('does not hydrate a reference the user can only read via submission resource access', (done) => {
      // Positive control: user2 genuinely has read access to resourceSub through submission
      // resource access, so it is returned on a direct index of the referenced form.
      indexSubs(refTargetResource._id, template.users.user2, (err, directList) => {
        if (err) {
          return done(err);
        }
        assert.ok(
          directList.some((s) => s._id === resourceSub._id.toString()),
          'precondition: user2 can read resourceSub directly via resource access',
        );

        // Through a reference, the $lookup restricts to submissions the caller owns, so a
        // submission reachable only via resource access is not hydrated. Submission
        // resource access intentionally does not extend through references.
        indexSubs(parentResource._id, template.users.user2, (err, list) => {
          if (err) {
            return done(err);
          }
          const parent = findByTag(list, 'resourceAccess');
          assert.ok(parent, 'user2 should see their own (forged) parent submission');
          assert.equal(
            refHydrated(parent),
            false,
            'a resource-access-only reference is not hydrated through the $lookup',
          );
          assertBareRef(
            _.get(parent, 'data.ref'),
            resourceSub._id,
            'resource-access-only reference must remain a bare {_id} shell, not be dropped',
          );
          assert.equal(
            hydratedSecrets(list).includes(SECRET_RES),
            false,
            'resource-access reference data must not be exposed through the reference',
          );
          done();
        });
      });
    });

    after('Removes forms and submissions seeded into the shared project', async () => {
      const formio = hook.alter('formio', app.formio);
      const formIds = [
        refTargetReadOwn,
        refTargetReadAll,
        refTargetResource,
        otherForm,
        parentReadOwn,
        parentReadAll,
        parentMultiple,
        parentResource,
      ]
        .filter(Boolean)
        .map((form) => new mongoose.Types.ObjectId(form._id));
      if (!formIds.length) {
        return;
      }
      await formio.resources.submission.model.deleteMany({ form: { $in: formIds } });
      await formio.resources.form.model.deleteMany({ _id: { $in: formIds } });
    });
  });
};
