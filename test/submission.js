/* eslint-disable strict */
/* eslint-disable max-len */
/* eslint-env mocha */
const request = require('./formio-supertest');
var assert = require('assert');
var Chance = require('chance');
var chance = new Chance();
var _ = require('lodash');
var docker = process.env.DOCKER;

module.exports = function(app, template, hook) {
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

  describe('Form Submissions', function() {
    it('Sets up a default project', function(done) {
      var owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().user('user', 'user1').execute(done);
    });

    describe('Unnested Submissions', function() {
      it('Saves values for each single value component type1', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Saves values for each single value component type2', function(done) {
        var test = require('./fixtures/forms/singlecomponents2.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            signatureSubmission1 = helper.getLastSubmission();
            assert.deepEqual(test.submission, signatureSubmission1.data);
            done();
          });
      });

      var signatureSubmission1 = null;
      it('Saves submission with a null signature.', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents2.js'));
        test.submission.signature2 = null;
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            signatureSubmission1 = helper.getLastSubmission();
            // Should coerse the value to an empty string.
            test.submission.signature2 = "";
            assert.deepEqual(test.submission, signatureSubmission1.data);
            done();
          });
      });

      it('Updates the submission with a null signature', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents2.js'));
        var updateSub = _.cloneDeep(signatureSubmission1);
        updateSub.data.signature2 = null;
        helper.updateSubmission(updateSub, function(err, updated) {
          // Should coerse the value to an empty string.
          test.submission.signature2 = "";
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      var signatureSubmission2 = null;
      it('Create submission with empty signature', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singleComponents4.js'));
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }
            signatureSubmission2 = helper.getLastSubmission();
            assert.deepEqual(test.submission, signatureSubmission2.data);
            done();
          });
      });

      it('Should not to add emtpy signature value in response if we do not put it in submission data', function(done) {
        var updateSub = _.cloneDeep(signatureSubmission2);
        delete updateSub.data.signature;
        helper.updateSubmission(updateSub, function(err, updated) {
          assert.deepEqual(updateSub.data, updated.data);
          done();
        });
      });

      var signatureSubmission = null;
      it('Saves values with required signature', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            signatureSubmission = helper.getLastSubmission();
            assert.deepEqual(test.submission, signatureSubmission.data);
            done();
          });
      });

      it('Updating signatures does not wipe out the signature.', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        var updateSub = _.cloneDeep(signatureSubmission);
        helper.updateSubmission(updateSub, function(err, updated) {
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      it('Saving signatures with Bad string does not wipe out the signature.', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        var updateSub = _.cloneDeep(signatureSubmission);
        updateSub.data.signature2 = 'YES';
        helper.updateSubmission(updateSub, function(err, updated) {
          // Ensure that it does not erase the signature.
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      it('Saving signatures with Any other string does not wipe out the signature.', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        var updateSub = _.cloneDeep(signatureSubmission);
        updateSub.data.signature2 = 'sdfsfsdfsdf';
        helper.updateSubmission(updateSub, function(err, updated) {
          // Ensure that it does not erase the signature.
          assert.deepEqual(test.submission, updated.data);
          done();
        });
      });

      it('Updating signatures with empty string invalidates.', function(done) {
        var updateSub = _.cloneDeep(signatureSubmission);
        updateSub.data.signature2 = '';
        helper.updateSubmission(updateSub, helper.owner, [/application\/json/, 400], function(err, updated) {
          // It should fail validation.
          assert.equal(updated.name, 'ValidationError');
          assert.equal(updated.details.length, 1);
          assert.equal(updated.details[0].message, 'Signature is required');
          assert.equal(updated.details[0].path, 'signature2');
          assert.equal(updated.details[0].context.validator, 'required');
          done();
        });
      });

      it('Gives an error with an empty signature.', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        test.submission.signature2 = '';
        helper
          .form('test', test.components)
          .submission(test.submission)
          .expect(400)
          .execute(function(err) {
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

      it('Gives an error with a signature not present.', function(done) {
        var test = _.cloneDeep(require('./fixtures/forms/singlecomponents3.js'));
        delete test.submission.signature2;
        helper
          .form('test', test.components)
          .submission(test.submission)
          .expect(400)
          .execute(function(err) {
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

      it('Throws away extra values', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var values = Object.assign({}, test.submission, {
          extra: true,
          more: 'stuff',
          objectval: {
            other: 'things'
          },
          arrayVal: [
            'never', 'gonna', 'give', 'you', 'up'
          ]
        });
        helper
          .form('test', test.components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Should validate input mask', function(done) {
        var components = [
          {
            "label": "Text Field",
            "inputMask": "aaa",
            "applyMaskOn": "change",
            "tableView": true,
            "validateWhenHidden": false,
            "key": "textField",
            "type": "textfield",
            "input": true
          }
        ];

        var values = {
          textField: '123'
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function(err) {
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
                path: ['textField']
              }
            ]);
            done();
          });
      });

      it('Saves values for each multiple value component', function(done) {
        var test = require('./fixtures/forms/multicomponents.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });
    });

    describe('Server Calculated', function() {
          it('Recalculate value on server', function(done) {
              var test = require('./fixtures/forms/servercalculate.js');
              helper
                  .form('test', test.components)
                  .submission(test.submission)
                  .execute(function(err) {
                      if (err) {
                          return done(err);
                      }

                      var submission = helper.getLastSubmission();
                      assert.deepEqual(test.submission, submission.data);

                      done();
                  });
          });

        it('Fails to recalculate value because of corrupted submission', function(done) {
            var test = require('./fixtures/forms/servercalculate.js');
            helper
                .form('test', test.components)
                .submission(test.falseSubmission)
                .execute(function(err) {
                    if (err) {
                        return done(err);
                    }

                    var submission = helper.getLastSubmission();
                    assert.deepEqual(test.falseSubmission, submission.data);

                    done();
                });
        });
    });

    describe('Fieldset nesting', function() {
      it('Nests single value components in a fieldset', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "key": "fieldset1",
          "input": false,
          "tableView": true,
          "legend": "Fieldset",
          "components": test.components,
          "type": "fieldset",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a fieldset', function(done) {
        var test = require('./fixtures/forms/multicomponents.js');
        var components = [{
          "key": "fieldset1",
          "input": false,
          "tableView": true,
          "legend": "Fieldset",
          "components": test.components,
          "type": "fieldset",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      })
    });

    describe('Column nesting', function() {
      it('Nests single value components in a column', function(done) {
        var test1 = require('./fixtures/forms/singlecomponents1.js');
        var test2 = require('./fixtures/forms/singlecomponents2.js');
        var components = [{
          "key": "columns1",
          "input": false,
          "columns": [
            {
              "components": test1.components
            },
            {
              "components": test2.components
            }
          ],
          "type": "columns",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        var combined = Object.assign({}, test1.submission, test2.submission);
        helper
          .form('test', components)
          .submission(combined)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(combined, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a column', function(done) {
        var test1 = require('./fixtures/forms/singlecomponents1.js');
        var test2 = require('./fixtures/forms/multicomponents.js');
        var components = [{
          "key": "columns1",
          "input": false,
          "columns": [
            {
              "components": test1.components
            },
            {
              "components": test2.components
            }
          ],
          "type": "columns",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        var combined = Object.assign({}, test1.submission, test2.submission);
        helper
          .form('test', components)
          .submission(combined)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(combined, submission.data);
            done();
          });
      });
    });

    describe('Panel nesting', function() {
      it('Nests single value components in a panel', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "key": "panel1",
          "input": false,
          "title": "Panel",
          "theme": "default",
          "components": test.components,
          "type": "panel",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a panel', function(done) {
        var test = require('./fixtures/forms/multicomponents.js');
        var components = [{
          "key": "panel1",
          "input": false,
          "title": "Panel",
          "theme": "default",
          "components": test.components,
          "type": "panel",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      })
    });

    describe('Well nesting', function() {
      it('Nests single value components in a well', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "key": "well1",
          "input": false,
          "components": test.components,
          "type": "well",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests multiple value components in a well', function(done) {
        var test = require('./fixtures/forms/multicomponents.js');
        var components = [{
          "key": "well1",
          "input": false,
          "components": test.components,
          "type": "well",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      })
    });

    describe('Table nesting', function() {
      it('Nests components in a table', function(done) {
        var test1 = require('./fixtures/forms/singlecomponents1.js');
        var test2 = require('./fixtures/forms/singlecomponents2.js');
        var test3 = require('./fixtures/forms/multicomponents.js');
        var components = [{
          "key": "table1",
          "conditional": {
            "eq": "",
            "when": null,
            "show": null
          },
          "type": "table",
          "condensed": false,
          "hover": false,
          "bordered": true,
          "striped": true,
          "caption": "",
          "header": [],
          "rows": [
            [
              {
                "components": test1.components
              },
              {
                "components": []
              },
              {
                "components": []
              }
            ],
            [
              {
                "components": []
              },
              {
                "components": test2.components
              },
              {
                "components": []
              }
            ],
            [
              {
                "components": []
              },
              {
                "components": []
              },
              {
                "components": test3.components
              }
            ]
          ],
          "numCols": 3,
          "numRows": 3,
          "input": false
        }];

        var values = Object.assign({}, test1.submission, test2.submission, test3.submission);
        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Custom components', function() {
      it('Saves custom components', function(done) {
        var test = require('./fixtures/forms/custom.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests single value components in a custom component', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "key": "custom1",
          "input": false,
          "tableView": true,
          "legend": "Custom",
          "components": test.components,
          "type": "mycustomtype"
        }];

        helper
          .form('customform', components)
          .submission(test.submission)
          .execute(function(err) {
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

    describe('Container nesting', function() {
      it('Nests single value components in a container', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "input": true,
          "tree": true,
          "components": test.components,
          "tableView": true,
          "label": "Container",
          "key": "container1",
          "protected": false,
          "persistent": true,
          "type": "container",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        var values = {
          container1: test.submission
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Removes extra values in a container', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "input": true,
          "tree": true,
          "components": test.components,
          "tableView": true,
          "label": "Container",
          "key": "container1",
          "protected": false,
          "persistent": true,
          "type": "container",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }

        }];

        var sub = {
          container1: test.submission
        }
        var values = {
          container1: Object.assign({}, test.submission, {
            extra: true,
            stuff: 'bad',
            never: ['gonna', 'give', 'you', 'up']
          })
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(sub, submission.data);
            done();
          });
      });

      it('Nests a container in a container', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "input": true,
          "tree": true,
          "components": [{
            "input": true,
            "tree": true,
            "components": test.components,
            "tableView": true,
            "label": "Container",
            "key": "container2",
            "protected": false,
            "persistent": true,
            "type": "container",
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            }
          }],
          "tableView": true,
          "label": "Container",
          "key": "container1",
          "protected": false,
          "persistent": true,
          "type": "container",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }

        }];

        var values = {
          container1: {
            container2: test.submission
          }
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Nests a container in a datagrid', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "conditional": {
            "eq": "",
            "when": null,
            "show": null
          },
          "type": "datagrid",
          "persistent": true,
          "protected": false,
          "key": "datagrid1",
          "label": "Datagrid",
          "tableView": true,
          "tree": true,
          "input": true,
          "components": [{
            "input": true,
            "tree": true,
            "components": test.components,
            "tableView": true,
            "label": "Container",
            "key": "container2",
            "protected": false,
            "persistent": true,
            "type": "container",
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            }
          }]
        }];

        var values = {
          datagrid1: [{
            container2: test.submission
          }]
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Datagrid nesting', function() {
      it('Nests single value components in a datagrid', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "conditional": {
            "eq": "",
            "when": null,
            "show": null
          },
          "type": "datagrid",
          "persistent": true,
          "protected": false,
          "key": "datagrid1",
          "label": "Datagrid",
          "tableView": true,
          "components": test.components,
          "tree": true,
          "input": true
        }];

        var values = {
          datagrid1: [test.submission, test.submission]
        }

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
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

      it('Nests a datagrid in a datagrid', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "conditional": {
            "eq": "",
            "when": null,
            "show": null
          },
          "type": "datagrid",
          "persistent": true,
          "protected": false,
          "key": "datagrid1",
          "label": "Datagrid",
          "tableView": true,
          "components": [
            {
              "conditional": {
                "eq": "",
                "when": null,
                "show": null
              },
              "type": "datagrid",
              "persistent": true,
              "protected": false,
              "key": "datagrid2",
              "label": "Datagrid",
              "tableView": true,
              "components": test.components,
              "tree": true,
              "input": true
            }
          ],
          "tree": true,
          "input": true
        }];

        var values = {
          datagrid1: [{
            datagrid2: [test.submission]
          }]
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Nests a datagrid in a container', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "input": true,
          "tree": true,
          "tableView": true,
          "label": "Container",
          "key": "container1",
          "protected": false,
          "persistent": true,
          "type": "container",
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          },
          "components": [
            {
              "conditional": {
                "eq": "",
                "when": null,
                "show": null
              },
              "type": "datagrid",
              "persistent": true,
              "protected": false,
              "key": "datagrid2",
              "label": "Datagrid",
              "tableView": true,
              "components": test.components,
              "tree": true,
              "input": true
            }
          ]
        }];

        var values = {
          container1: {
            datagrid2: [test.submission]
          }
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Deep nesting', function() {
      it('Nests deeply in layout components', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "key": "fieldset1",
          "input": false,
          "tableView": true,
          "type": "fieldset",
          "legend": "Fieldset",
          "components": [
            {
              "key": "columns1",
              "input": false,
              "type": "columns",
              "columns": [
                {
                  "components": [
                    {
                      "key": "panel1",
                      "input": false,
                      "title": "Panel",
                      "type": "panel",
                      "theme": "default",
                      "components": [
                        {
                          "key": "well1",
                          "input": false,
                          "components": [
                            {
                              "key": "well2",
                              "input": false,
                              "type": "well",
                              "components": test.components,
                              "conditional": {
                                "show": null,
                                "when": null,
                                "eq": ""
                              }
                            }
                          ],
                          "type": "well",
                          "conditional": {
                            "show": null,
                            "when": null,
                            "eq": ""
                          }
                        }
                      ],
                      "conditional": {
                        "show": null,
                        "when": null,
                        "eq": ""
                      }
                    }
                  ]
                },
                {
                  "components": []
                }
              ],
              "conditional": {
                "show": null,
                "when": null,
                "eq": ""
              }
            }
          ],
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        helper
          .form('test', components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Nests a datagrid deeply in layout components', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "key": "fieldset1",
          "input": false,
          "tableView": true,
          "type": "fieldset",
          "legend": "Fieldset",
          "components": [
            {
              "key": "columns1",
              "input": false,
              "type": "columns",
              "columns": [
                {
                  "components": [
                    {
                      "key": "panel1",
                      "input": false,
                      "title": "Panel",
                      "type": "panel",
                      "theme": "default",
                      "components": [
                        {
                          "key": "well1",
                          "input": false,
                          "type": "well",
                          "components": [
                            {
                              "key": "well2",
                              "input": false,
                              "type": "well",
                              "components": [
                                {
                                  "conditional": {
                                    "eq": "",
                                    "when": null,
                                    "show": null
                                  },
                                  "type": "datagrid",
                                  "persistent": true,
                                  "protected": false,
                                  "key": "datagrid1",
                                  "label": "Datagrid",
                                  "tableView": true,
                                  "components": test.components,
                                  "tree": true,
                                  "input": true
                                }
                              ],
                              "conditional": {
                                "show": null,
                                "when": null,
                                "eq": ""
                              }
                            }
                          ],
                          "conditional": {
                            "show": null,
                            "when": null,
                            "eq": ""
                          }
                        }
                      ],
                      "conditional": {
                        "show": null,
                        "when": null,
                        "eq": ""
                      }
                    }
                  ]
                },
                {
                  "components": []
                }
              ],
              "conditional": {
                "show": null,
                "when": null,
                "eq": ""
              }
            }
          ],
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        var values = {
          datagrid1: [test.submission]
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Nests a container deeply in layout components', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        var components = [{
          "key": "fieldset1",
          "input": false,
          "tableView": true,
          "type": "fieldset",
          "legend": "Fieldset",
          "components": [
            {
              "key": "columns1",
              "input": false,
              "type": "columns",
              "columns": [
                {
                  "components": [
                    {
                      "key": "panel1",
                      "input": false,
                      "title": "Panel",
                      "type": "panel",
                      "theme": "default",
                      "components": [
                        {
                          "key": "well1",
                          "input": false,
                          "components": [
                            {
                              "key": "well2",
                              "input": false,
                              "type": "well",
                              "components": [
                                {
                                  "input": true,
                                  "tree": true,
                                  "components": test.components,
                                  "tableView": true,
                                  "label": "Container",
                                  "key": "container1",
                                  "protected": false,
                                  "persistent": true,
                                  "type": "container",
                                  "conditional": {
                                    "show": null,
                                    "when": null,
                                    "eq": ""
                                  }
                                }
                              ],
                              "conditional": {
                                "show": null,
                                "when": null,
                                "eq": ""
                              }
                            }
                          ],
                          "type": "well",
                          "conditional": {
                            "show": null,
                            "when": null,
                            "eq": ""
                          }
                        }
                      ],
                      "conditional": {
                        "show": null,
                        "when": null,
                        "eq": ""
                      }
                    }
                  ]
                },
                {
                  "components": []
                }
              ],
              "conditional": {
                "show": null,
                "when": null,
                "eq": ""
              }
            }
          ],
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          }
        }];

        var values = {
          container1: test.submission
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });
    });

    describe('Protected fields are protected', function() {
      it('Does not return a protected password field', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Text Field",
            "key": "textField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": false,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": false,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            },
            "type": "textfield"
          },
          {
            "input": true,
            "tableView": false,
            "inputType": "password",
            "label": "Password",
            "key": "password",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "protected": true,
            "persistent": true,
            "type": "password",
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            }
          }
        ];
        var values = {
          textField: 'My Value',
          password: 'password'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert.deepEqual(result, submission.data);
            done();
          });
      });

      it('Does not return a protected text field', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Text Field",
            "key": "textField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": true,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": false,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            },
            "type": "textfield"
          },
          {
            "input": true,
            "tableView": false,
            "inputType": "password",
            "label": "Password",
            "key": "password",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "protected": false,
            "persistent": true,
            "type": "password",
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            }
          }
        ];
        var values = {
          textField: 'My Value',
          password: 'password'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
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

    describe('Conditional Fields', function() {
      it('Requires a conditionally visible field', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Required Field",
            "key": "requiredField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": false,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": true,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            },
            "type": "textfield"
          }
        ];

        var values = {
          selector: 'two'
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
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
                path: ['requiredField']
              }
            ]);
            done();
          });
      });

      it('Doesn\'t require a conditionally hidden field', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Required Field",
            "key": "requiredField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": false,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": true,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            },
            "type": "textfield"
          }
        ];

        var values = {
          selector: 'one'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });
      });

      it('Hidden calculated values are hidden on update of submission', function(done) {
        var components = [
          {
            "label": "Hide 2",
            "tableView": false,
            "validateWhenHidden": false,
            "key": "hide2",
            "type": "checkbox",
            "input": true,
            "defaultValue": false
          },
          {
            "label": "Number1",
            "applyMaskOn": "change",
            "mask": false,
            "tableView": false,
            "delimiter": false,
            "requireDecimal": false,
            "inputFormat": "plain",
            "truncateMultipleSpaces": false,
            "validateWhenHidden": false,
            "key": "number1",
            "type": "number",
            "input": true
          },
          {
            "label": "Number2",
            "applyMaskOn": "change",
            "mask": false,
            "tableView": false,
            "delimiter": false,
            "requireDecimal": false,
            "inputFormat": "plain",
            "truncateMultipleSpaces": false,
            "validateWhenHidden": false,
            "key": "number2",
            "type": "number",
            "input": true
          },
          {
            "label": "Number3 Calculated clear value when hidden = true",
            "applyMaskOn": "change",
            "mask": false,
            "tableView": true,
            "delimiter": false,
            "requireDecimal": false,
            "inputFormat": "plain",
            "truncateMultipleSpaces": false,
            "calculateValue": "value = data.number1 + data.number2",
            "validateWhenHidden": false,
            "key": "number3CalculatedClearValueWhenHiddenTrue",
            "conditional": {
              "show": false,
              "conjunction": "all",
              "conditions": [
                {
                  "component": "hide2",
                  "operator": "isEqual",
                  "value": true
                }
              ]
            },
            "type": "number",
            "input": true
          }
        ];

        var values = {
          hide2: false,
          number1: 100,
          number2: 200,
          number3CalculatedClearValueWhenHiddenTrue: 300,
        }

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);

            var updatedSubmission = _.cloneDeep(submission);
            var updatedData = {
              "hide2": true,
              "number1": 100,
              "number2": 200
            }
            _.set(updatedSubmission, 'data', updatedData);

            helper.updateSubmission(updatedSubmission, (err) => {
              if (err) {
                return done(err);
              }
              var editedSubmission = helper.getLastSubmission();
              assert.deepEqual(updatedData, editedSubmission.data);
              assert(!editedSubmission.data.hasOwnProperty('number3CalculatedClearValueWhenHiddenTrue'));
              done();
            })
          });
      })

      it('Allows a conditionally required field', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Required Field",
            "key": "requiredField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": false,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": true,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            },
            "type": "textfield"
          }
        ];

        var values = {
          selector: 'two',
          requiredField: 'Has a value'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });

      });

      it('Ignores conditionally hidden fields', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Required Field",
            "key": "requiredField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": false,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": true,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            },
            "type": "textfield"
          }
        ];

        var values = {
          selector: 'one',
          requiredField: 'Has a value'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, {selector: 'one'});
            done();
          });
      });

      it('Requires a conditionally visible field in a panel', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": false,
            "title": "Panel",
            "theme": "default",
            "components": [
              {
                "input": true,
                "tableView": true,
                "inputType": "text",
                "inputMask": "",
                "label": "Required Field",
                "key": "requiredField",
                "placeholder": "",
                "prefix": "",
                "suffix": "",
                "multiple": false,
                "defaultValue": "",
                "protected": false,
                "unique": false,
                "persistent": true,
                "validate": {
                  "required": true,
                  "minLength": "",
                  "maxLength": "",
                  "pattern": "",
                  "custom": "",
                  "customPrivate": false
                },
                "conditional": {
                  "show": null,
                  "when": null,
                  "eq": ""
                },
                "type": "textfield"
              }
            ],
            "type": "panel",
            "key": "panel",
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            }
          }
        ];

        var values = {
          selector: 'two'
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
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
                path: ['requiredField']
              }
            ]);
            done();
          });
      });

      it('Doesn\'t require a conditionally hidden field in a panel', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": false,
            "title": "Panel",
            "theme": "default",
            "components": [
              {
                "input": true,
                "tableView": true,
                "inputType": "text",
                "inputMask": "",
                "label": "Required Field",
                "key": "requiredField",
                "placeholder": "",
                "prefix": "",
                "suffix": "",
                "multiple": false,
                "defaultValue": "",
                "protected": false,
                "unique": false,
                "persistent": true,
                "validate": {
                  "required": true,
                  "minLength": "",
                  "maxLength": "",
                  "pattern": "",
                  "custom": "",
                  "customPrivate": false
                },
                "conditional": {
                  "show": null,
                  "when": null,
                  "eq": ""
                },
                "type": "textfield"
              }
            ],
            "type": "panel",
            "key": "panel",
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            }
          }
        ];

        var values = {
          selector: 'one'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });

      });

      it('Allows a conditionally required field in a panel', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": false,
            "title": "Panel",
            "theme": "default",
            "components": [
              {
                "input": true,
                "tableView": true,
                "inputType": "text",
                "inputMask": "",
                "label": "Required Field",
                "key": "requiredField",
                "placeholder": "",
                "prefix": "",
                "suffix": "",
                "multiple": false,
                "defaultValue": "",
                "protected": false,
                "unique": false,
                "persistent": true,
                "validate": {
                  "required": true,
                  "minLength": "",
                  "maxLength": "",
                  "pattern": "",
                  "custom": "",
                  "customPrivate": false
                },
                "conditional": {
                  "show": null,
                  "when": null,
                  "eq": ""
                },
                "type": "textfield"
              }
            ],
            "type": "panel",
            "key": "panel",
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            }
          }
        ];

        var values = {
          selector: 'two',
          requiredField: 'Has a value'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });

      });

      it('Ignores conditionally hidden fields in a panel', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": false,
            "title": "Panel",
            "theme": "default",
            "components": [
              {
                "input": true,
                "tableView": true,
                "inputType": "text",
                "inputMask": "",
                "label": "Required Field",
                "key": "requiredField",
                "placeholder": "",
                "prefix": "",
                "suffix": "",
                "multiple": false,
                "defaultValue": "",
                "protected": false,
                "unique": false,
                "persistent": true,
                "validate": {
                  "required": true,
                  "minLength": "",
                  "maxLength": "",
                  "pattern": "",
                  "custom": "",
                  "customPrivate": false
                },
                "conditional": {
                  "show": null,
                  "when": null,
                  "eq": ""
                },
                "type": "textfield"
              }
            ],
            "type": "panel",
            "key": "panel",
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            }
          }
        ];

        var values = {
          selector: 'one',
          requiredField: 'Has a value'
        };

        helper
          .form('test', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert.deepEqual({selector: 'one'}, submission.data);
            done();
          });
      });

      it('Should not clearOnHide when set to false', (done) => {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": false,
            "title": "Panel",
            "theme": "default",
            "components": [
              {
                "input": true,
                "tableView": true,
                "inputType": "text",
                "inputMask": "",
                "label": "No Clear Field",
                "key": "noClear",
                "placeholder": "",
                "prefix": "",
                "suffix": "",
                "multiple": false,
                "defaultValue": "",
                "protected": false,
                "unique": false,
                "persistent": true,
                "clearOnHide": false,
                "validate": {
                  "required": false,
                  "minLength": "",
                  "maxLength": "",
                  "pattern": "",
                  "custom": "",
                  "customPrivate": false
                },
                "conditional": {
                  "show": null,
                  "when": null,
                  "eq": ""
                },
                "type": "textfield"
              }
            ],
            "type": "panel",
            "key": "panel",
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            }
          }
        ];

        helper
          .form('test', components)
          .submission({
            selector: 'one',
            noClear: 'testing'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({selector: 'one', noClear: 'testing'}, submission.data);
            done();
          });
      });

      it('Should clearOnHide when set to true', (done) => {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "radio",
            "label": "Selector",
            "key": "selector",
            "values": [
              {
                "value": "one",
                "label": "One"
              },
              {
                "value": "two",
                "label": "Two"
              }
            ],
            "defaultValue": "",
            "protected": false,
            "persistent": true,
            "validate": {
              "required": false,
              "custom": "",
              "customPrivate": false
            },
            "type": "radio",
            "conditional": {
              "show": "",
              "when": null,
              "eq": ""
            }
          },
          {
            "input": false,
            "title": "Panel",
            "theme": "default",
            "components": [
              {
                "input": true,
                "tableView": true,
                "inputType": "text",
                "inputMask": "",
                "label": "Clear Me",
                "key": "clearMe",
                "placeholder": "",
                "prefix": "",
                "suffix": "",
                "multiple": false,
                "defaultValue": "",
                "protected": false,
                "unique": false,
                "persistent": true,
                "clearOnHide": true,
                "validate": {
                  "required": false,
                  "minLength": "",
                  "maxLength": "",
                  "pattern": "",
                  "custom": "",
                  "customPrivate": false
                },
                "conditional": {
                  "show": null,
                  "when": null,
                  "eq": ""
                },
                "type": "textfield"
              }
            ],
            "type": "panel",
            "key": "panel",
            "conditional": {
              "show": "true",
              "when": "selector",
              "eq": "two"
            }
          }
        ];

        helper
          .form('test', components)
          .submission({
            selector: 'one',
            clearMe: 'Clear Me!!!!'
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({selector: 'one'}, submission.data);
            done();
          });
      });
    });

    describe('Non Persistent fields dont persist', function() {
      it('Doesn\'t save non-persistent single fields', function(done) {
        var test = require('./fixtures/forms/singlecomponents1.js');
        test.components.forEach(function(component) {
          component.persistent = false;
        });

        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({}, submission.data);
            done();
          });
      });

      it('Doesn\'t save non-persistent multi fields', function(done) {
        var test = require('./fixtures/forms/multicomponents.js');
        test.components.forEach(function(component) {
          component.persistent = false;
        });

        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual({}, submission.data);
            done();
          });
      });
    });

    describe('Verify multiple values are multiple', function() {
      it('Forces multi value fields to be an array', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Text Field",
            "key": "textField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": true,
            "defaultValue": "",
            "protected": false,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": false,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            },
            "type": "textfield"
          }
        ];
        var values = {
          textField: 'My Value'
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(201)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, {
              textField: ['My Value']
            });
            done();
          });
      });

      it('Should remove protected fields from the response.', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Text Field",
            "key": "textField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": true,
            "defaultValue": "",
            "protected": true,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": false,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            },
            "type": "textfield"
          }
        ];
        var values = {
          textField: 'My Value'
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(201)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, {});
            done();
          });
      });

      it('Forces single value fields to not be an array', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Text Field",
            "key": "textField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": true,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": false,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            },
            "type": "textfield"
          }
        ];
        var values = {
          textField: ['Never', 'gonna', 'give', 'you', 'up']
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function(err) {
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
                  value: ['Never', 'gonna', 'give', 'you', 'up']
                },
                message: 'Text Field must not be an array',
                path: ['textField'],
                level: 'error'
              }
            ]);
            done();
          });
      });
    });

    describe('Unique Fields', function() {
      before('Sets up the submissions', function(done) {
        const components = [
            {
              input: true,
              label: 'Email',
              key: 'email',
              unique: true,
              type: 'email'
            },
            {
              input: true,
              label: 'Text Field',
              key: 'textField',
              unique: true,
              type: 'textfield',
              validate: {
                pattern: '[A-Za-z0-9]+'
              }
            }
          ];
        const values = {
          email: 'brendan@form.io',
          textField: 'IAmAUniqueSnowflake'
        }
        helper
          .form('uniqueTest', components)
          .submission(values)
          .expect(201)
          .execute(function(err) {
            if (err) {
              return done(err);
            }
            return done();
          });
      });

      it('Returns an error when non-unique', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Text Field",
            "key": "textField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": false,
            "defaultValue": "",
            "protected": false,
            "unique": true,
            "persistent": true,
            "validate": {
              "required": false,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            },
            "type": "textfield"
          }
        ];
        var values = {
          textField: 'My Value'
        };

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function(err) {
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
          type: 'email'
        },
        {
          input: true,
          label: 'Text Field',
          key: 'textField',
          unique: true,
          type: 'textfield',
          validate: {
            pattern: '[A-Za-z0-9]+'
          }
        }
        ];
        const values = {
          email: 'brendan@form.io',
          textField: 'IAmAUniqueSnowflake'
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

    describe('Required multivalue fields', function() {
      it('Returns an error when required multivalue fields are missing', function(done) {
        var components = [
          {
            "input": true,
            "tableView": true,
            "inputType": "text",
            "inputMask": "",
            "label": "Text Field",
            "key": "textField",
            "placeholder": "",
            "prefix": "",
            "suffix": "",
            "multiple": true,
            "defaultValue": "",
            "protected": false,
            "unique": false,
            "persistent": true,
            "validate": {
              "required": true,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "conditional": {
              "show": null,
              "when": null,
              "eq": ""
            },
            "type": "textfield"
          }
        ];
        var values = {};

        helper
          .form('test', components)
          .submission(values)
          .expect(400)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 2);
            assert.equal(helper.lastResponse.body.details[0].message, 'Text Field must be an array');
            assert.equal(helper.lastResponse.body.details[1].message, 'Text Field is required');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['textField']);
            assert.deepEqual(helper.lastResponse.body.details[1].path, ['textField']);
            done();
          });
      });
    });

    describe('Unique Fields with multiple', function() {
      var components = [
        {
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "Text Field",
          "key": "textField",
          "placeholder": "",
          "prefix": "",
          "suffix": "",
          "multiple": true,
          "defaultValue": "",
          "protected": false,
          "unique": true,
          "persistent": true,
          "validate": {
            "required": false,
            "minLength": "",
            "maxLength": "",
            "pattern": "",
            "custom": "",
            "customPrivate": false
          },
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          },
          "type": "textfield"
        }
      ];

      it('Unique Arrays should allow unique submissions', function(done) {
        helper
          .form('test', components)
          .submission({textField: ['Foo', 'Bar']})
          .submission({textField: ['Bar', 'Baz']})
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.hasOwnProperty('data'));
            assert.deepEqual(submission.data, {textField: ['Bar', 'Baz']});
            done();
          });
      });

      it('Unique Arrays check contents not order', function(done) {
        helper
          .form('test', components)
          .submission({textField: ['Bar', 'Foo']})
          .expect(400)
          .execute(function(err) {
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

    describe('Complex form with hidden fields and embedded datagrids', function() {
      it('Saves a complex form correctly', function(done) {
        var test = require('./fixtures/forms/complex.js');
        helper
          .form('test', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(test.submission, submission.data);
            done();
          });
      });

      it('Does not return a protected password field into tagpad component', function(done) {
        const  components = [
          {
            label: 'Text Field 1',
            applyMaskOn: 'change',
            'tableView': true,
            'validateWhenHidden': false,
            'key': 'textField1',
            'type': 'textfield1',
            'input': true
          },
          {
            label:'Password 1',
            applyMaskOn:'change',
            tableView:false,
            validateWhenHidden:false,
            key:'password1',
            type:'password1',
            input:true,
            protected:true
          },
          {
            label:'Tagpad',
            tableView:false,
            validateWhenHidden:false,
            key:'tagpad',
            type:'tagpad',
            input:true,
            imageUrl: 'https://googlechrome.github.io/samples/picture-element/images/kitten-large.png',

            components:
              [
                {
                  label:'Password',
                  applyMaskOn:'change',
                  tableView:false,
                  validateWhenHidden:false,
                  key:'password',
                  type:'password',
                  input:true,
                  protected:true
                },
                {
                  label: 'Text Field',
                  applyMaskOn: 'change',
                  'tableView': true,
                  'validateWhenHidden': false,
                  'key': 'textField',
                  'type': 'textfield',
                  'input': true
                },
              ]

            }
          ];

        const values = {
          password1: 'password',
          textField1: 'My Value',
          tagpad: [
          {
              coordinate: {
                  x: 198,
                  y: 74,
                  width: 772,
                  height: 339
              },
              data: {
                  password: 'password1',
                  textField: 'My Value 1',
              }
          },
          {
              coordinate: {
                  x: 198,
                  y: 74,
                  width: 772,
                  height: 339
              },
              data: {
                  password: 'password2',
                  textField: 'My Value 2',
              }
            }
          ]
        };

        helper
        .form('test', components)
        .submission(values)
        .execute(function(err, res) {
          if (err) {
            return done(err);
          }
          _.unset(values, 'password1');
          _.unset(values, 'tagpad[0].data.password');
          _.unset(values, 'tagpad[1].data.password');
          const result = values;
          const submission = helper.getLastSubmission();
          assert.equal(result.textField1, submission.data.textField1);
          assert.equal(result.password1, undefined);
          if (submission.data.tagpad.length !== 0) {
            assert.deepEqual(result, submission.data);
          }
          done();
        });
      });
    });

    describe('Conditionally hidden required fields do not trigger validation', function() {
      var test = require('./fixtures/forms/conditional');
      var pass = {show: 'no'};
      var fail = {show: 'yes'};
      var full = {show: 'yes', req: 'foo'};
      var pruned = {show: 'no', req: 'foo'};

      it('A submission without a hidden field should ignore validation', function(done) {
        helper
          .form('cond', test.components)
          .submission(pass)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, pass);
            done();
          });
      });

      it('A submission with a hidden field should not ignore validation', function(done) {
        helper
          .form('cond', test.components)
          .submission(fail)
          .expect(400)
          .execute(function(err) {
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

      it('A submission with a hidden field should work with all the required data', function(done) {
        helper
          .form('cond', test.components)
          .submission(full)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, full);
            done();
          });
      });

      it('A submission with a hidden field should prune hidden field data', function(done) {
        helper
          .form('cond', test.components)
          .submission(pruned)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, pass);
            done();
          });
      });
    });

    describe('Address Fields', function() {
      var test = require('./fixtures/forms/for213.js');

      it('A single unique address will submit without issues', function(done) {
        helper
          .form('for213', test.components)
          .submission(test.submission)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, test.submission);
            done();
          });
      });

      it('A duplicate unique address will throw validation issues', function(done) {
        helper
          .form('for213', test.components)
          .submission(test.submission)
          .expect(400)
          .execute(function(err) {
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
      it('Should throw an error if the maximum words has been exceeded', function(done) {
        helper
          .form('maxwords', [{
            tags: [],
            type: 'textarea',
            conditional: {
              eq: '',
              when: null,
              show: ''
            },
            validate: {
              customPrivate: false,
              custom: '',
              pattern: '',
              maxLength: '',
              minLength: '',
              maxWords: 30,
              minWords: 5,
              required: false
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
            input: true
          }, {
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
            type: 'button'
          }])
          .submission({
            data: {
              test: chance.sentence({words: 31})
            }
          })
          .expect(400)
          .execute(function(err) {
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
        const sentence = chance.sentence({words: 30});
        helper.submission('maxwords', {
            data: {
              test: sentence
            }
          })
          .execute(function(err) {
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
          helper.submission('maxwords', {
            data: {
              test: chance.sentence({words: 3})
            }
          })
          .expect(400)
          .execute(function(err) {
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
        const sentence = chance.sentence({words: 5});
        helper.submission('maxwords', {
          data: {
            test: sentence
          }
        })
          .execute(function(err) {
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
              "input": true,
              "tableView": true,
              "inputType": "text",
              "inputMask": "",
              "label": "Name",
              "key": "name",
              "placeholder": "",
              "prefix": "",
              "suffix": "",
              "multiple": false,
              "defaultValue": "",
              "protected": false,
              "unique": false,
              "persistent": true,
              "validate": {
                "required": false,
                "minLength": "",
                "maxLength": "",
                "pattern": "",
                "custom": "",
                "customPrivate": false
              },
              "conditional": {
                "show": null,
                "when": null,
                "eq": ""
              },
              "type": "textfield"
            }
          ])
          .submission('metadata', {
            data: {
              name: "testing"
            },
            metadata: {
              testing: 'hello'
            }
          })
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.deepEqual(submission.data, {name: 'testing'});
            assert(submission.metadata.hasOwnProperty('headers') && !_.isEmpty(submission.metadata.headers), 'Submission metadata should include post headers');
            assert.deepEqual(_.omit(submission.metadata, ['headers']), {testing: 'hello'});
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
              "input": true,
              "tableView": true,
              "inputType": "text",
              "inputMask": "",
              "label": "Name",
              "key": "name",
              "placeholder": "",
              "prefix": "",
              "suffix": "",
              "multiple": false,
              "defaultValue": "",
              "protected": false,
              "unique": false,
              "persistent": true,
              "validate": {
                "required": false,
                "minLength": "",
                "maxLength": "",
                "pattern": "",
                "custom": "",
                "customPrivate": false
              },
              "conditional": {
                "show": null,
                "when": null,
                "eq": ""
              },
              "type": "textfield"
            }
          ])
          .submission('fruits', {name: 'Apple'})
          .submission('fruits', {name: 'Pear'})
          .submission('fruits', {name: 'Banana'})
          .submission('fruits', {name: 'Orange'})
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            let apiUrl = 'http://localhost:' + template.config.port;
            apiUrl += hook.alter('url', '/form/' + helper.template.forms['fruits']._id + '/submission', helper.template);

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
                    url: apiUrl
                  },
                  validate: {
                    select: true
                  }
                }
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
        helper.submission('fruitSelect', {fruit: 'Apple'}).execute((err) => {
          if (err) {
            return done(err);
          }

          var submission = helper.getLastSubmission();
          assert.deepEqual({fruit: 'Apple'}, submission.data);
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
        helper.submission('fruitSelect', {fruit: 'Foo'}).expect(400).execute(() => {
          assert.equal(helper.lastResponse.statusCode, 400);
          assert.equal(helper.lastResponse.body.name, 'ValidationError');
          assert.equal(helper.lastResponse.body.details.length, 1);
          assert.equal(helper.lastResponse.body.details[0].message, 'Select a fruit contains an invalid selection');
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
                  select: true
                }
              }
            ])
            .execute((err) => {
              if (err) {
                return done(err);
              }

              done();
            });
        });

        it('Should perform a backend validation of the selected value and reject values not in the referenced resource', (done) => {
          helper.submission('fruitSelectResource', {fruit: 'No Fruit Here'}).expect(400).execute(() => {
            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 1);
            assert.equal(helper.lastResponse.body.details[0].message, 'Select a fruit contains an invalid selection');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['fruit']);
            done();
          });
        });

        it('Should perform a backend validation of the selected value and succeed if the value is in the referenced resource', (done) => {
          helper.submission('fruitSelectResource', {fruit: 'Apple'})
            .expect(201)
            .execute((err) => {
              if (err) {
                return done(err);
              }

              var submission = helper.getLastSubmission();
              assert.deepEqual({fruit: 'Apple'}, submission.data);
              done();
            });
        });

        it('Should perform a backend validation of the selected value and reject values if the value is in the referenced resource but excluded by the filter', (done) => {
          helper.submission('fruitSelectResource', {fruit: 'Orange'}).expect(400).execute(() => {
            assert.equal(helper.lastResponse.statusCode, 400);
            assert.equal(helper.lastResponse.body.name, 'ValidationError');
            assert.equal(helper.lastResponse.body.details.length, 1);
            assert.equal(helper.lastResponse.body.details[0].message, 'Select a fruit contains an invalid selection');
            assert.deepEqual(helper.lastResponse.body.details[0].path, ['fruit']);
            done();
          });
        });

        it('Should allow saving select resource by reference', done => {
          const submission = helper.template.submissions['fruits'][0];
          helper
            .form('myFruit', [{
              input: true,
              label: "Fruit",
              key: "fruit",
              data: {
                resource: helper.template.forms['fruits']._id,
                project: helper.template.project ? helper.template.project._id : ''
              },
              dataSrc: "resource",
              reference: true,
              valueProperty: "",
              defaultValue: "",
              template: "<span>{{ item.data.name }}</span>",
              multiple: false,
              persistent: true,
              type: "select"
            }], {
              submissionAccess: [
                {
                  type: 'read_all',
                  roles: [helper.template.roles.authenticated._id.toString()]
                }
              ]
            })
            .submission('myFruit', {fruit: {_id: submission._id, form: helper.template.forms['fruits']._id}})
            .execute(err => {
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

        it('Should allow saving select resource with whole object by reference', done => {
          const submission = helper.template.submissions['fruits'][0];
          helper
            .submission('myFruit', {fruit: submission})
            .execute(err => {
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

        it('Should check permissions when loading from reference', done => {
          request(app)
            .get(hook.alter('url', '/form/' + helper.template.forms['myFruit']._id + '/submission/' + helper.lastSubmission._id, helper.template))
            .set('x-jwt-token', helper.template.users.user1.token)
            .send()
            // .expect(200)
            .end(function(err, res) {
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
          .get(hook.alter('url', '/form/' + helper.template.forms['myFruit']._id + '/submission/' + helper.lastSubmission._id, helper.template))
          .set('x-jwt-token', helper.template.users.user1.token)
          .send()
          // .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert(res.body.data.fruit.hasOwnProperty('_id'), 'Must contain the _id.');
            assert.equal(1, Object.keys(res.body.data.fruit).length);
            done();
          });
        });
      })
    });

    describe('Data table validation', () => {
      before((done) => {
        // Create a resource to keep records.
        helper
          .form('fruits', [
            {
              "input": true,
              "tableView": true,
              "inputType": "text",
              "inputMask": "",
              "label": "Name",
              "key": "name",
              "placeholder": "",
              "prefix": "",
              "suffix": "",
              "multiple": false,
              "defaultValue": "",
              "protected": false,
              "unique": false,
              "persistent": true,
              "validate": {
                "required": false,
                "minLength": "",
                "maxLength": "",
                "pattern": "",
                "custom": "",
                "customPrivate": false
              },
              "conditional": {
                "show": null,
                "when": null,
                "eq": ""
              },
              "type": "textfield"
            },
          ])
          .submission('fruits', {name: 'Apple'})
          .submission('fruits', {name: 'Pear'})
          .submission('fruits', {name: 'Banana'})
          .submission('fruits', {name: 'Orange'})
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            let apiUrl = 'http://localhost:' + template.config.port;
            apiUrl += hook.alter('url', '/form/' + helper.template.forms['fruits']._id + '/submission', helper.template);

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
                }
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
        helper.submission('fruitTable', {dataTable: [{name: 'Apple'}, {name: 'Pear'}]}).execute((err) => {
          if (err) {
            return done(err);
          }

          var submission = helper.getLastSubmission();
          assert.deepEqual(submission.data, {dataTable: [{name: 'Apple'}, {name: 'Pear'}]});
          done();
        });
      });

      it('Should modify the target resource and the form by adding a required field', (done) => {
        const target = helper.template.forms['fruits'];
        target.components.push({
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "Color",
          "key": "color",
          "placeholder": "",
          "prefix": "",
          "suffix": "",
          "multiple": false,
          "defaultValue": "",
          "protected": false,
          "unique": false,
          "persistent": true,
          "validate": {
            "required": true,
            "minLength": "",
            "maxLength": "",
            "pattern": "",
            "custom": "",
            "customPrivate": false
          },
          "conditional": {
            "show": null,
            "when": null,
            "eq": ""
          },
          "type": "textfield"
        });
        helper
          .updateForm(target, (err) => {
            if (err) {
              return done(err);
            }
            const form = helper.template.forms['fruitTable'];
            assert(form.components[0]);
            assert(form.components[0].fetch);
            assert(form.components[0].fetch.components);
            form.components[0].fetch.components.push({path: 'color', key: 'color'});
            helper.updateForm(form, (err) => {
              if (err) {
                return done(err);
              }
              done();
            });
          });
      });

      it('Should throw an error when the new field is not provided', (done) => {
        helper.submission('fruitTable', {dataTable: [{name: 'Apple'}, {name: 'Orange'}]}).expect(400).execute((err) => {
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
      it('Requires a conditionally required field from advanced conditions', function(done) {
        var components = [
          {
            "properties": {},
            "tags": [],
            "labelPosition": "top",
            "hideLabel": false,
            "type": "textfield",
            "conditional": {
              "eq": "",
              "when": null,
              "show": ""
            },
            "validate": {
              "customPrivate": false,
              "custom": "",
              "pattern": "",
              "maxLength": "",
              "minLength": "",
              "required": false
            },
            "clearOnHide": true,
            "hidden": false,
            "persistent": true,
            "unique": false,
            "protected": false,
            "defaultValue": "",
            "multiple": false,
            "suffix": "",
            "prefix": "",
            "placeholder": "",
            "key": "test",
            "label": "Test",
            "inputMask": "",
            "inputType": "text",
            "tableView": true,
            "input": true
          },
          {
            "properties": {},
            "tags": [],
            "labelPosition": "top",
            "hideLabel": false,
            "type": "textfield",
            "conditional": {
              "eq": "",
              "when": null,
              "show": ""
            },
            "validate": {
              "customPrivate": false,
              "custom": "",
              "pattern": "",
              "maxLength": "",
              "minLength": "",
              "required": false
            },
            "clearOnHide": true,
            "hidden": false,
            "persistent": true,
            "unique": false,
            "protected": false,
            "defaultValue": "",
            "multiple": false,
            "suffix": "",
            "prefix": "",
            "placeholder": "",
            "key": "changeme",
            "label": "Change me",
            "inputMask": "",
            "inputType": "text",
            "tableView": true,
            "input": true,
            "logic": [
              {
                "name": "Test 2",
                "trigger": {
                  "javascript": "result = data.test === '2';",
                  "type": "javascript"
                },
                "actions": [
                  {
                    "name": "Set Title to Two",
                    "type": "property",
                    "property": {
                      "label": "Title",
                      "value": "label",
                      "type": "string"
                    },
                    "text": "Two"
                  },
                  {
                    "name": "Set Required",
                    "type": "property",
                    "property": {
                      "label": "Required",
                      "value": "validate.required",
                      "type": "boolean"
                    },
                    "state": true
                  }
                ]
              }
            ]
          }
        ];

        var values = {
          test: '2'
        };

        helper
          .form('advancedCond', components)
          .submission(values)
          .expect(400)
          .execute(function(err) {
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
                path: ['changeme']
              }
            ]);
            done();
          });
      });

      it('Sets a value based on advanced conditions', function(done) {
        var components = [
          {
            "properties": {},
            "tags": [],
            "labelPosition": "top",
            "hideLabel": false,
            "type": "textfield",
            "conditional": {
              "eq": "",
              "when": null,
              "show": ""
            },
            "validate": {
              "customPrivate": false,
              "custom": "",
              "pattern": "",
              "maxLength": "",
              "minLength": "",
              "required": false
            },
            "clearOnHide": true,
            "hidden": false,
            "persistent": true,
            "unique": false,
            "protected": false,
            "defaultValue": "",
            "multiple": false,
            "suffix": "",
            "prefix": "",
            "placeholder": "",
            "key": "test",
            "label": "Test",
            "inputMask": "",
            "inputType": "text",
            "tableView": true,
            "input": true
          },
          {
            "properties": {},
            "tags": [],
            "labelPosition": "top",
            "hideLabel": false,
            "type": "textfield",
            "conditional": {
              "eq": "",
              "when": null,
              "show": ""
            },
            "validate": {
              "customPrivate": false,
              "custom": "",
              "pattern": "",
              "maxLength": "",
              "minLength": "",
              "required": false
            },
            "clearOnHide": true,
            "hidden": false,
            "persistent": true,
            "unique": false,
            "protected": false,
            "defaultValue": "",
            "multiple": false,
            "suffix": "",
            "prefix": "",
            "placeholder": "",
            "key": "changeme",
            "label": "Change me",
            "inputMask": "",
            "inputType": "text",
            "tableView": true,
            "input": true,
            "logic": [
              {
                "name": "Test 1",
                "trigger": {
                  "javascript": "result = data.test === '1';",
                  "type": "javascript"
                },
                "actions": [
                  {
                    "name": "Set Value",
                    "type": "value",
                    "value": "value = 'Foo'"
                  }
                ]
              }
            ]
          }
        ];

        var values = {
          test: '1'
        };

        helper
          .form('advancedCond2', components)
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert.equal(submission.data.test, '1');
            assert.equal(submission.data.changeme, 'Foo');
            done();
          });
      });

      it('Should save submission for Wizard with advanced Conditions', function(done) {
        var wizardForm = require('./fixtures/forms/wizardFormWithAdvancedConditions.js');
        var wizardSubmission = {number: 2, textField: 'Mary', textArea: 'gray'};
        helper
          .upsertForm(wizardForm, (err) => {
            if (err) {
              return done(err);
            }
            helper
              .submission('wizardTest', wizardSubmission)
              .expect(201)
              .execute(function(err) {
                if (err) {
                  return done(err);
                }
                const submission = helper.lastSubmission;
                assert.deepEqual(submission.data, wizardSubmission);
                done()
              })
          })
      });
    });

    describe('Submission patching', () => {
      var submission = {};
      it('Creates a form and submission for testing', function(done) {
        var components = [
          {
            "type": "textfield",
            "persistent": true,
            "defaultValue": "",
            "multiple": false,
            "key": "test",
            "label": "Test",
            "inputMask": "",
            "inputType": "text",
            "validate": {
              "required": true,
              "minLength": "",
              "maxLength": "",
              "pattern": "",
              "custom": "",
              "customPrivate": false
            },
            "tableView": true,
            "input": true
          }
        ];

        var values = {
          test: 'Original'
        };

        helper
          .form('patchtest', components)
          .submission(values)
          .expect(201)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            submission = helper.getLastSubmission();
            done();
          });
      });

      it('Allows updating a submission with the PATCH method', (done) => {
        request(app)
          .patch(hook.alter('url', '/form/' + helper.template.forms['patchtest']._id + '/submission/' + helper.lastSubmission._id, helper.template))
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'replace',
              path: '/data/test',
              value: 'Updated'
            }
          ])
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body.data.test, 'Updated');
            done();
          });
      });

      it('validates when updating a submission with the PATCH method', (done) => {
        request(app)
          .patch(hook.alter('url', '/form/' + helper.template.forms['patchtest']._id + '/submission/' + helper.lastSubmission._id, helper.template))
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'remove',
              path: '/data/test'
            }
          ])
          .expect(400)
          .end(function(err, res) {
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
                path: ['test']
              }
            ]);
            done();
          });
      });

      it('doesnt allow updating a submission id with the PATCH method', (done) => {
        request(app)
          .patch(hook.alter('url', '/form/' + helper.template.forms['patchtest']._id + '/submission/' + helper.lastSubmission._id, helper.template))
          .set('x-jwt-token', helper.owner.token)
          .send([
            {
              op: 'replace',
              path: '/_id',
              value: '000000000000000000000000'
            }
          ])
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body._id, helper.lastSubmission._id);
            done();
          });
      });

      let selectWithResourceSubmission = {};
      it('Create a form with resource and submission for testing', function(done) {
        const components = [{
          type: 'textfield',
          label: 'Text Field',
          'key': 'text',
          'type': 'textfield',
          'input': true,
        }, {
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
          submissionAccess: [{
            type: 'read',
            roles: [],
          }],
        }];

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
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            selectWithResourceSubmission = helper.getLastSubmission();
            done();
          });
      });

      it('Allows updating a submission with submission access using PATCH', function(done) {
        request(app)
          .patch(hook.alter('url', '/form/' + helper.template.forms['patchform']._id + '/submission/' + helper.lastSubmission._id, helper.template))
          .set('x-jwt-token', helper.owner.token)
          .send([{
            op: 'replace',
            path: '/data/text',
            value: 'Patched',
          }])
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body.data.text, 'Patched');
            done();
          });
      });

      it('Create a form with resource and submission with empty select for testing', function(done) {
        const components = [{
          type: 'textfield',
          label: 'Text Field',
          'key': 'text',
          'type': 'textfield',
          'input': true,
        }, {
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
          submissionAccess: [{
            type: 'read',
            roles: [],
          }],
        }];

        const values = {
          text: 'Test',
          select: {},
        };

        helper
          .form('pathWithEmptySelect', components)
          .submission(values)
          .expect(201)
          .execute(function(err) {
            if (err) {
              return done(err);
            }
            done();
          });
      });

      it('Allows updating a empty select submission with submission access using PATCH', function(done) {
        request(app)
          .patch(hook.alter('url', '/form/' + helper.template.forms['pathWithEmptySelect']._id + '/submission/' + helper.lastSubmission._id, helper.template))
          .set('x-jwt-token', helper.owner.token)
          .send([{
            op: 'replace',
            path: '/data/text',
            value: 'Patched',
          }])
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.body.data.text, 'Patched');
            done();
          });
      });

      it('Create a form with nested form and submission for parent form for testing', function(done) {
        const childFormComponents = [
          {
            label: 'Text Field',
            applyMaskOn: 'change',
            tableView: true,
            validateWhenHidden: false,
            key: 'textField',
            type: 'textfield',
            input: true,
          },
          {
            label: 'Number',
            applyMaskOn: 'change',
            mask: false,
            tableView: false,
            delimiter: false,
            requireDecimal: false,
            inputFormat: 'plain',
            truncateMultipleSpaces: false,
            validateWhenHidden: false,
            key: 'number',
            type: 'number',
            input: true,
          },
          {
            label: 'Date / Time',
            tableView: false,
            datePicker: {
              disableWeekends: false,
              disableWeekdays: false,
            },
            enableMinDateInput: false,
            enableMaxDateInput: false,
            validateWhenHidden: false,
            key: 'dateTime',
            type: 'datetime',
            input: true,
            widget: {
              type: 'calendar',
              displayInTimezone: 'viewer',
              locale: 'en',
              useLocaleSettings: false,
              allowInput: true,
              mode: 'single',
              enableTime: true,
              noCalendar: false,
              format: 'yyyy-MM-dd hh:mm a',
              hourIncrement: 1,
              minuteIncrement: 1,
              'time_24hr': false,
              minDate: null,
              disableWeekends: false,
              disableWeekdays: false,
              maxDate: null,
            },
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
          },
        ];

        const parentFormComponents = [
          {
            label: 'Date / Time Parent',
            tableView: false,
            datePicker: {
              disableWeekends: false,
              disableWeekdays: false,
            },
            enableMinDateInput: false,
            enableMaxDateInput: false,
            validateWhenHidden: false,
            key: 'dateTimeParent',
            type: 'datetime',
            input: true,
            widget: {
              type: 'calendar',
              displayInTimezone: 'viewer',
              locale: 'en',
              useLocaleSettings: false,
              allowInput: true,
              mode: 'single',
              enableTime: true,
              noCalendar: false,
              format: 'yyyy-MM-dd hh:mm a',
              hourIncrement: 1,
              minuteIncrement: 1,
              'time_24hr': false,
              minDate: null,
              disableWeekends: false,
              disableWeekdays: false,
              maxDate: null,
            },
          },
          {
            label: 'Form',
            tableView: true,
            form: '686533d135a85f4b9dd34a65',
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
        ];

        const values = {
          dateTimeParent: '2025-07-01T12:00:00+03:00',
          submit: true,
          form: {
            data: {
              textField: 'test',
              number: 1,
              dateTime: '2025-07-02T09:00:00.000Z',
            },
          },
        };

        helper
          .form('childFormWithDateTime', childFormComponents)
          .execute(function(err) {
            if (err) {
              return done(err);
            }
            parentFormComponents[1].form =
              helper.template.forms['childFormWithDateTime']._id;

            helper
              .form('parentFormWithDateTime', parentFormComponents)
              .submission(values)
              .expect(201)
              .execute(function(err) {
                if (err) {
                  return done(err);
                }
                request(app)
                  .patch(
                    hook.alter(
                      'url',
                      // eslint-disable-next-line prefer-template
                      '/form/' + helper.template.forms['parentFormWithDateTime']._id + '/submission/' + helper.lastSubmission._id,
                      helper.template
                    )
                  )
                  .set('x-jwt-token', helper.owner.token)
                  .send([
                    {
                      op: 'replace',
                      path: '/data/dateTimeParent',
                      value: '2020-01-01T07:00:00.000Z',
                    },
                    {
                      op: 'replace',
                      path: '/data/form/data/textField',
                      value: 'new value',
                    },
                    {
                      op: 'replace',
                      path: '/data/form/data/number',
                      value: '100',
                    },
                    {
                      op: 'replace',
                      path: '/data/form/data/dateTime',
                      value: '2020-01-01T10:00:00.000Z',
                    },
                  ])
                  .expect(200)
                  .end(function(err, res) {
                    if (err) {
                      return done(err);
                    }
                    assert.equal(
                      res.body.data.dateTimeParent,
                      '2020-01-01T07:00:00.000Z'
                    );
                    assert.deepEqual(res.body.data.form.data, {
                      textField: 'new value',
                      number: 100,
                      dateTime: '2020-01-01T10:00:00.000Z',
                    });
                    done();
                  });
              });
          });
      });

      describe('Filtering submissions', () => {
        it('Should filter submission for Currency Component', function(done) {
          var components = [
            {
              "label": "Currency",
              "applyMaskOn": "change",
              "mask": false,
              "spellcheck": true,
              "currency": "USD",
              "inputFormat": "plain",
              "truncateMultipleSpaces": false,
              "key": "currency",
              "type": "currency",
              "input": true,
              "delimiter": true
            }
          ];

          helper
            .form('filterCurrency', components)
            .submission({ currency: 10 })
            .submission({ currency: 20 })
            .expect(201)
            .execute(function(err) {
              if (err) {
                return done(err);
              }
              request(app)
              .get(hook.alter('url', '/form/' + helper.template.forms['filterCurrency']._id + '/submission?data.currency=10', helper.template))
              .set('x-jwt-token', helper.owner.token)
              .send()
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }
                assert.equal(res.body.length, 1);
                assert.equal(res.body[0].data.currency, 10);
                done();
              });
            });
        });

        it('Should filter submission for SelectBoxes Component', function(done) {
          var components = [
            {
              "label": "Select Boxes",
              "optionsLabelPosition": "right",
              "tableView": true,
              "values": [
                {
                  "label": "a",
                  "value": "a"
                },
                {
                  "label": "b",
                  "value": "b"
                }
              ],
              "key": "selectBoxes",
              "type": "selectboxes",
              "input": true,
              "inputType": "checkbox",
              "defaultValue": {
                "a": false,
                "b": false
              }
            }
          ];

          helper
            .form('filterSelectBoxes', components)
            .submission({ selectBoxes: {a: true, b: false} })
            .submission({ selectBoxes: {a: false, b: true} })
            .expect(201)
            .execute(function(err) {
              if (err) {
                return done(err);
              }
              request(app)
              .get(hook.alter('url', '/form/' + helper.template.forms['filterSelectBoxes']._id + '/submission?data.selectBoxes.a=true&data.selectBoxes.b=false', helper.template))
              .set('x-jwt-token', helper.owner.token)
              .send()
              .expect(200)
              .end(function(err, res) {
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

        it('Should return an empty array for incorrect filter', function(done) {
          var components = [
            {
              "label": "Currency",
              "applyMaskOn": "change",
              "mask": false,
              "spellcheck": true,
              "currency": "USD",
              "inputFormat": "plain",
              "truncateMultipleSpaces": false,
              "key": "currency",
              "type": "currency",
              "input": true,
              "delimiter": true
            },
            {
              "label": "Select Boxes",
              "optionsLabelPosition": "right",
              "tableView": true,
              "values": [
                {
                  "label": "a",
                  "value": "a"
                },
                {
                  "label": "b",
                  "value": "b"
                }
              ],
              "key": "selectBoxes",
              "type": "selectboxes",
              "input": true,
              "inputType": "checkbox",
              "defaultValue": {
                "a": false,
                "b": false
              }
            }
          ];

          helper
            .form('filter', components)
            .submission({ currency: 10 , selectBoxes: {a: true, b: false}})
            .submission({ currency: 20 , selectBoxes: {a: false, b: true}})
            .expect(201)
            .execute(function(err) {
              if (err) {
                return done(err);
              }
              request(app)
              .get(hook.alter('url', '/form/' + helper.template.forms['filter']._id + '/submission?data.currency=20&data.selectBoxes.b=false', helper.template))
              .set('x-jwt-token', helper.owner.token)
              .send()
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }
                assert.equal(res.body.length, 0);
                assert.deepEqual(res.body, [])
                done();
              });
            });
        });

        it('Should change modified date when patch submission', function (done) {
          const test = require('./fixtures/forms/singlecomponentsSimple.js');
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
                  "op": "replace",
                  "path": "/data/textField",
                  "value": "PATCH Update"
                }
              ]
              helper.patchSubmission(submissionBeforePatch, update, (err) => {
                if (err) {
                  return done(err);
                }
                const submissionAfterPatch = helper.getLastSubmission();
                assert.notEqual(submissionBeforePatch.modified, submissionAfterPatch.modified)
                done();
              })
            })
        });
      });

    });

    describe('Filtering submissions', () => {

      it('Should filter submission for Select Component', function(done) {
        var components = [
          {
            "label": "Select",
            "widget": "choicesjs",
            "tableView": true,
            "data": {
              "values": [
                {
                  "label": 1,
                  "value": 1
                },
                {
                  "label": 2,
                  "value": 2
                }
              ]
            },
            "key": "select",
            "type": "select",
            "input": true
          }
        ];

        helper
          .form('filterSelect', components)
          .submission({ select: 2 })
          .submission({ select: 1 })
          .submission({ select: 2 })
          .expect(201)
          .execute(function(err) {
            if (err) {
              return done(err);
            }
            request(app)
            .get(hook.alter('url', '/form/' + helper.template.forms['filterSelect']._id + '/submission?data.select=2', helper.template))
            .set('x-jwt-token', helper.owner.token)
            .send()
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }
              assert.equal(res.body.length, 2);
              res.body.forEach(item => {
                assert.equal(item.data.select, 2);
              })
              done();
            });
          });
      });
    });

    describe('Submission index requests', function() {
      before('Sets up a form and submissions with image or signature data',function (done) {
        const testForm = _.cloneDeep(require('./fixtures/forms/fileComponent'));
        const testSubmission = {
          data: {
            "file": [
              {
                storage: "base64",
                name: "small_image-9724876b-17d6-4d91-b8b0-c910d2ccb819.png",
                url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAIAAAADnC86AAAACXBIWXMAAAsTAAALEwEAmpwYAAAE9GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4wLWMwMDAgNzkuMTcxYzI3ZmFiLCAyMDIyLzA4LzE2LTIyOjM1OjQxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjMtMDEtMjNUMTE6MDQ6NTUtMDY6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIzLTAxLTIzVDExOjA1OjMxLTA2OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIzLTAxLTIzVDExOjA1OjMxLTA2OjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDplNzIwNDIxYy0xNTI1LTQzMjctYTQwZC02YjE2MmFlNGI5ZDkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ZTcyMDQyMWMtMTUyNS00MzI3LWE0MGQtNmIxNjJhZTRiOWQ5IiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6ZTcyMDQyMWMtMTUyNS00MzI3LWE0MGQtNmIxNjJhZTRiOWQ5Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDplNzIwNDIxYy0xNTI1LTQzMjctYTQwZC02YjE2MmFlNGI5ZDkiIHN0RXZ0OndoZW49IjIwMjMtMDEtMjNUMTE6MDQ6NTUtMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyNC4wIChNYWNpbnRvc2gpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlxcqawAAAAySURBVFiF7c0BDQAwCACg+y72M6TBjOHmoACRXW/DX1nFYrFYLBaLxWKxWCwWi8VH4wGAdwGpX8v62wAAAABJRU5ErkJggg==",
                size: 1408,
                type: "image/png",
                originalName: "small_image.png"
              }
            ],
            "submit": true
          }
        };
        helper
            .form('base64Test',testForm.components)
            .submission(testSubmission)
            .expect(201)
            .execute(done);
      });

      it('Should not return images or signatures by default',function (done) {
        request(app)
            .get(hook.alter('url',`/form/${helper.template.forms['base64Test']._id}/submission`,helper.template))
            .set('x-jwt-token',helper.owner.token)
            .expect(200)
            .end((err,res) => {
              if (err) {
                done(err);
              }
              const submissionData = res.body[0].data.file[0];
              assert(
                  !submissionData.hasOwnProperty('url'),
                  'Since we have not specificed full=true, we should not recieve base64 data'
              );
              done();
            });
      })

      it('Should return images or signatures with the query string "full=true"',function (done) {
        request(app)
            .get(hook.alter('url',
                `/form/${helper.template.forms['base64Test']._id}/submission?full=true`,
                helper.template
            ))
            .set('x-jwt-token',helper.owner.token)
            .expect(200)
            .end((err,res) => {
              if (err) {
                done(err);
              }
              const submissionData = res.body[0].data.file[0];
              assert(
                  submissionData.hasOwnProperty('url'),
                  'Since we have  specificed full=true, we should recieve base64 data'
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
              },{
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
              },{
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
              },{
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
            page2Text: 't2'
          })
          .execute(function(err) {
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
      before('Create form with a long running validation', (done) => {
        helper
          .form('timeout', [
            {
              type: 'textfield',
              label: 'Test',
              key: 'test',
              validate: {
                custom: "if (input === 'test') { while(true) {} }"
              }
            }
          ])
          .execute(done);
      });
      xit('Should timeout and throw an error when a validation takes too long', (done) => {
        helper
          .submission('timeout', { test: 'test' })
          .expect(400)
          .execute((err) => {
            if (err) {
              done(err);
            }
            const response = helper.lastResponse;
            assert.equal(response.text, '"Script execution timed out."');
            done();
          });
      });
    })
  });

  describe('Nested Submissions', function() {
    it('Sets up a default project', function(done) {
      var owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
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
              required: true
            }
          },
          {
            type: 'textfield',
            label: 'B',
            key: 'b'
          }
        ])
        .form('childB', [
          {
            type: 'textfield',
            label: 'C',
            key: 'c',
            validate: {
              required: true
            }
          },
          {
            type: 'textfield',
            label: 'D',
            key: 'd'
          }
        ])
        .form('childC', [
          {
            type: 'textfield',
            label: 'E',
            key: 'e',
            validate: {
              required: true
            }
          },
          {
            type: 'textfield',
            label: 'F',
            key: 'f'
          }
        ])
        .execute(done);
    });

    it('Create the Parent form', (done) => {
      helper
        .form('parent', [
          {
            type: 'checkbox',
            label: 'Show A',
            key: 'showA'
          },
          {
            type: 'checkbox',
            label: 'Show B',
            key: 'showB'
          },
          {
            type: 'checkbox',
            label: 'Show C',
            key: 'showC'
          },
          {
            type: 'form',
            form: helper.template.forms.childA._id,
            label: 'Child A',
            key: 'childA',
            conditional: {
              show: true,
              when: 'showA',
              eq: true
            }
          },
          {
            type: 'form',
            form: helper.template.forms.childB._id,
            label: 'Child B',
            key: 'childB',
            conditional: {
              show: true,
              when: 'showB',
              eq: true
            }
          },
          {
            type: 'form',
            form: helper.template.forms.childC._id,
            label: 'Child C',
            key: 'childC',
            conditional: {
              show: true,
              when: 'showC',
              eq: true
            }
          }
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
              b: 'Two'
            }
          },
          childB: {
            data: {
              c: 'Three',
              d: 'Four'
            }
          },
          childC: {
            data: {
              e: 'Five',
              f: 'Six'
            }
          }
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
            b: 'Two'
          });
          assert.deepEqual(submission.data.childB.data, {
            c: 'Three',
            d: 'Four'
          });
          assert.deepEqual(submission.data.childC.data, {
            e: 'Five',
            f: 'Six'
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
          b: 'Two'
        });
        assert.deepEqual(submission.data.childB.data, {
          c: 'Eight',
          d: 'Four'
        });
        assert.deepEqual(submission.data.childC.data, {
          e: 'Nine',
          f: 'Six'
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
              d: 'Four'
            }
          },
          childC: {
            data: {
              e: 'Five',
              f: 'Six'
            }
          }
        })
        .expect(400)
        .execute((err) => {
          if (err) {
            return done(err);
          }

          assert.equal(helper.lastResponse.body.details.length, 1);
          assert.equal(helper.lastResponse.body.details[0].message, 'A is required');
          assert.deepEqual(helper.lastResponse.body.details[0].path, [
            'childA',
            'data',
            'a'
          ]);
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
              d: 'Four'
            }
          },
          childC: {
            data: {
              e: 'Five',
              f: 'Six'
            }
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const submission = helper.lastSubmission;
          assert.equal(submission.data.showA, false);
          assert.equal(submission.data.showB, true);
          assert.equal(submission.data.showC, true);
          assert(!submission.data.hasOwnProperty('childA'), 'The childA form should not be present.');
          assert(submission.data.childB.hasOwnProperty('_id'), 'The childB form was not submitted');
          assert(submission.data.childC.hasOwnProperty('_id'), 'The childC form was not submitted');
          assert.deepEqual(submission.data.childB.data, {
            c: 'Three',
            d: 'Four'
          });
          assert.deepEqual(submission.data.childC.data, {
            e: 'Five',
            f: 'Six'
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
              required: true
            }
          },
          {
            type: 'textfield',
            label: 'D',
            key: 'd'
          }
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
            }, {
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
            }, {
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
          assert(!submission.data.hasOwnProperty('form'), 'The nexted wizard should not be present.');
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
                b: 'Two'
              }
            },
            childB: {
              data: {
                c: 'Three',
                d: 'Four'
              }
            },
            childC: {
              data: {
                e: 'Five',
                f: 'Six'
              }
            }
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const submission = helper.lastSubmission;
          assert.equal(submission.state, 'draft');
          assert(submission.data.childA.hasOwnProperty('_id'), 'The childA form was not submitted');
          assert(submission.data.childB.hasOwnProperty('_id'), 'The childB form was not submitted');
          assert(submission.data.childC.hasOwnProperty('_id'), 'The childC form was not submitted');
          assert.equal(submission.data.childA.state, 'draft');
          assert.equal(submission.data.childB.state, 'draft');
          assert.equal(submission.data.childC.state, 'draft');
          assert.deepEqual(submission.data.childA.data, {
            a: 'One',
            b: 'Two'
          });
          assert.deepEqual(submission.data.childB.data, {
            c: 'Three',
            d: 'Four'
          });
          assert.deepEqual(submission.data.childC.data, {
            e: 'Five',
            f: 'Six'
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
            "label": "Text Field",
            "tableView": true,
            "key": "textField",
            "type": "textfield",
            "input": true
          },
          {
            "label": "Checkbox",
            "tableView": false,
            "key": "checkbox",
            "type": "checkbox",
            "input": true
          }
        ])
        .execute(function(err) {
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
            textField: '123'
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }

          const submission = helper.lastSubmission;
          const expectedData = {
            textField: '123'
          };

          assert.equal(JSON.stringify(submission.data), JSON.stringify(expectedData));
          done();
        });
    });
  });

  describe('Conditional Nested Forms Submissions', function () {
    before('Sets up a default project', function (done) {
      var owner =
        app.hasProjects || docker ? template.formio.owner : template.users.admin;
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
      helper.submission('parentForm2', {
        radio: 'b',
        submit: true,
        form2: {
          data: {
            textFieldForm3: 'Hello'
          }
        }
      }).execute((err) => {
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
      helper.submission('parentForm1', {
        radio: 'b',
        submit: true
      }).execute((err) => {
        if (err) {
          return done(err);
        }

        nestedSubmission = helper.lastSubmission;
        assert.deepEqual(nestedSubmission.data, { radio: 'b', submit: true });
        done();
      });
    });

    it('Should allow you to submit data to the nested form.', (done) => {
      helper.submission('parentForm1', {
        radio: 'a',
        form: {
          data: {
            textFieldForm2: 'Foo',
            form: {
              data: {
                textFieldForm1: 'Bar'
              }
            }
          }
        },
        submit: true
      }).execute((err) => {
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
      helper.getSubmission('parentForm1', nestedSubmission._id, function(err, submission) {
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
};
