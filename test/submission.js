/* eslint-env mocha */
var request = require('supertest');
var assert = require('assert');
var docker = process.env.DOCKER;

module.exports = function(app, template, hook) {
  var Helper = require('./helper')(app);
  var helper = null;

  describe('Form Submissions', function() {
    it('Sets up a default project', function(done) {
      var owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().execute(done);
    });

    describe('Unnested Submissions', function() {
      it('Saves values for each single value component type1', function(done) {
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents2.js');
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

      it('Throws away extra values', function(done) {
        var test = require('./forms/singlecomponents1.js');
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

      it('Saves values for each multiple value component', function(done) {
        var test = require('./forms/multicomponents.js');
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

    describe('Fieldset nesting', function() {
      it('Nests single value components in a fieldset', function(done) {
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/multicomponents.js');
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
        var test1 = require('./forms/singlecomponents1.js');
        var test2 = require('./forms/singlecomponents2.js');
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
        var test1 = require('./forms/singlecomponents1.js');
        var test2 = require('./forms/multicomponents.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/multicomponents.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/multicomponents.js');
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
        var test1 = require('./forms/singlecomponents1.js');
        var test2 = require('./forms/singlecomponents2.js');
        var test3 = require('./forms/multicomponents.js');
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
        var test = require('./forms/custom.js');
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
        var test = require('./forms/singlecomponents1.js');
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

    });

    describe('Container nesting', function() {
      it('Nests single value components in a container', function(done) {
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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

      it('Removes extra values in a datagrid', function(done) {
        var test = require('./forms/singlecomponents1.js');
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

        var sub = {
          datagrid1: [test.submission, test.submission]
        }
        var values = {
          datagrid1: [Object.assign({}, test.submission, {
            extra: true,
            stuff: 'bad',
            never: ['gonna', 'give', 'you', 'up']
          }), test.submission]
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

      it('Nests a datagrid in a datagrid', function(done) {
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/singlecomponents1.js');
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

    describe('Test various field validations like min, max, regex, etc', function() {

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
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert(submission.isJoi);
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  key: 'requiredField'
                },
                message: '"requiredField" is required',
                path: 'requiredField',
                type: 'any.required'
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

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert.deepEqual(values, submission.data);
            done();
          });

      });

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

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert.deepEqual({selector: 'one'}, submission.data);
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
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert(submission.isJoi);
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  key: 'requiredField'
                },
                message: '"requiredField" is required',
                path: 'requiredField',
                type: 'any.required'
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

            var result = {textField: 'My Value'};
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
    });

    describe('Non Persistent fields dont persist', function() {
      it('Doesn\'t save non-persistent single fields', function(done) {
        var test = require('./forms/singlecomponents1.js');
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
        var test = require('./forms/multicomponents.js');
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
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.isJoi);
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  key: 'textField'
                },
                message: '"textField" must be an array',
                path: 'textField',
                type: 'array.base'
              }
            ]);
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
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var submission = helper.getLastSubmission();
            assert(submission.isJoi);
            assert.equal(submission.name, 'ValidationError');
            assert.deepEqual(submission.details, [
              {
                context: {
                  key: 'textField',
                  value: ['Never', 'gonna', 'give', 'you', 'up']
                },
                message: '"textField" must be a string',
                path: 'textField',
                type: 'string.base'
              }
            ]);
            done();
          });
      });
    });

    describe('Unique Fields', function() {
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
          .submission(values)
          .execute(function(err) {
            if (err) {
              return done(err);
            }

            var result = {textField: 'My Value'};
            var submission = helper.getLastSubmission();
            assert.equal('Text Field must be unique.', submission);
            done();
          });

      });
    });

    describe('Complex form with hidden fields and embedded datagrids', function() {
      it('Saves a complex form correctly', function(done) {
        var test = require('./forms/complex.js');
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
  });
};