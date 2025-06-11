'use strict';

const request = require('./formio-supertest');
const assert = require('assert');
const Validator = require('../src/resources/Validator');

module.exports = function(app, template, hook) {
  const formio = hook.alter('formio', app.formio);

  describe('Validator tests', function() {
    let testResourceWithFlatComponents;
    let testResourceWithNestedComponents;
    let resourceWithFlatComponentsId;
    let resourceWithNestedComponentsId;
    before(function() {
      testResourceWithFlatComponents = {
        title: 'fields',
        name: 'fields',
        path: 'fields',
        type: 'resource',
        display: 'form',
        access: [],
        submissionAccess: [],
        owner: null,
        components: [
          {
            label: '1 - Text Field',
            placeholder: 'Text Field',
            tableView: true,
            key: 'TextField',
            type: 'textfield',
            input: true
          },
          {
            label: '2 - Email',
            placeholder: 'Email',
            tableView: true,
            key: 'Email',
            type: 'email',
            input: true
          },
          {
            label: '3 - Text Area',
            placeholder: 'Text Area',
            tableView: true,
            key: 'TextArea',
            type: 'textarea',
            input: true
          },
          {
            label: '4 - Checkbox',
            tableView: true,
            key: 'Checkbox',
            type: 'checkbox',
            input: true
          },
        ],
      };
      testResourceWithNestedComponents = {
        title: 'nested fields',
        name: 'nestedFields',
        path: 'nestedFields',
        type: 'resource',
        display: 'form',
        access: [],
        submissionAccess: [],
        owner: null,
        components: [
          {
            label: 'Text Field',
            tableView: true,
            key: 'textField',
            type: 'textfield',
            input: true
          },
          {
            collapsible: false,
            key: 'panel',
            type: 'panel',
            label: 'Panel',
            input: false,
            tableView: false,
            components: [
              {
                label: 'Text Field',
                tableView: true,
                key: 'textField1',
                type: 'textfield',
                input: true
              },
              {
                label: 'Container',
                key: 'container',
                type: 'container',
                input: true,
                components: [
                  {
                    label: 'Text Field',
                    tableView: true,
                    key: 'textField',
                    type: 'textfield',
                    input: true
                  },
                  {
                    "label": "Columns",
                    "columns": [
                      {
                        "components": [
                          {
                            "label": "Text Field",
                            "applyMaskOn": "change",
                            "tableView": true,
                            "validateWhenHidden": false,
                            "key": "textFieldColumn",
                            "type": "textfield",
                            "input": true
                          }
                        ],
                        "width": 6,
                        "offset": 0,
                        "push": 0,
                        "pull": 0,
                        "size": "md",
                        "currentWidth": 6
                      },
                      {
                        "components": [
                          {
                            "label": "Text Area",
                            "applyMaskOn": "change",
                            "autoExpand": false,
                            "tableView": true,
                            "validateWhenHidden": false,
                            "key": "textAreaColumn",
                            "type": "textarea",
                            "input": true
                          }
                        ],
                        "width": 6,
                        "offset": 0,
                        "push": 0,
                        "pull": 0,
                        "size": "md",
                        "currentWidth": 6
                      }
                    ],
                    "key": "columns",
                    "type": "columns",
                    "input": false,
                    "tableView": false
                  },
                  {
                    "label": "Table",
                    "cellAlignment": "left",
                    "key": "table",
                    "type": "table",
                    "input": false,
                    "tableView": false,
                    "rows": [
                      [
                        {
                          "components": [
                            {
                              "label": "A",
                              "applyMaskOn": "change",
                              "mask": false,
                              "tableView": false,
                              "delimiter": false,
                              "requireDecimal": false,
                              "inputFormat": "plain",
                              "truncateMultipleSpaces": false,
                              "validateWhenHidden": false,
                              "key": "a",
                              "type": "number",
                              "input": true
                            }
                          ]
                        },
                        {
                          "components": [
                            {
                              "label": "B",
                              "applyMaskOn": "change",
                              "mask": false,
                              "tableView": false,
                              "delimiter": false,
                              "requireDecimal": false,
                              "inputFormat": "plain",
                              "truncateMultipleSpaces": false,
                              "validateWhenHidden": false,
                              "key": "b",
                              "type": "number",
                              "input": true
                            }
                          ]
                        },
                        {
                          "components": [
                            {
                              "label": "C",
                              "applyMaskOn": "change",
                              "mask": false,
                              "tableView": false,
                              "delimiter": false,
                              "requireDecimal": false,
                              "inputFormat": "plain",
                              "truncateMultipleSpaces": false,
                              "validateWhenHidden": false,
                              "key": "c",
                              "type": "number",
                              "input": true
                            }
                          ]
                        }
                      ],
                      [
                        {
                          "components": [
                            {
                              "label": "D",
                              "applyMaskOn": "change",
                              "mask": false,
                              "tableView": false,
                              "delimiter": false,
                              "requireDecimal": false,
                              "inputFormat": "plain",
                              "truncateMultipleSpaces": false,
                              "validateWhenHidden": false,
                              "key": "d",
                              "type": "number",
                              "input": true
                            }
                          ]
                        },
                        {
                          "components": [
                            {
                              "label": "E",
                              "applyMaskOn": "change",
                              "mask": false,
                              "tableView": false,
                              "delimiter": false,
                              "requireDecimal": false,
                              "inputFormat": "plain",
                              "truncateMultipleSpaces": false,
                              "validateWhenHidden": false,
                              "key": "e",
                              "type": "number",
                              "input": true
                            }
                          ]
                        },
                        {
                          "components": [
                            {
                              "label": "F",
                              "applyMaskOn": "change",
                              "mask": false,
                              "tableView": false,
                              "delimiter": false,
                              "requireDecimal": false,
                              "inputFormat": "plain",
                              "truncateMultipleSpaces": false,
                              "validateWhenHidden": false,
                              "key": "f",
                              "type": "number",
                              "input": true
                            }
                          ]
                        }
                      ]
                    ],
                    "numRows": 2
                  }
                ]
              }
            ]
          },
          {
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false
          }
        ],
      };
    });

    it('Bootstrap', function(done) {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send(testResourceWithFlatComponents)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
          resourceWithFlatComponentsId = response._id;

          request(app)
            .post(hook.alter('url', '/form', template))
            .set('x-jwt-token', template.users.admin.token)
            .send(testResourceWithNestedComponents)
            .expect('Content-Type', /json/)
            .expect(201)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              const response = res.body;
              assert(response.hasOwnProperty('_id'), 'The response should contain an `_id`.');
              resourceWithNestedComponentsId = response._id;

              done();
            });
        });
    });

    it('Should filter resource components based on data table settings', function(done) {
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
        },
        formio,
      );
      const dataTableComponent = {
        type: 'datatable',
        fetch: {
          enableFetch: true,
          components: [
            {
              path: 'TextField',
              key: 'TextField'
            },
            {
              path: 'TextArea',
              key: 'TextArea'
            }
          ],
          dataSrc: 'resource',
          resource: resourceWithFlatComponentsId,
        },
      };
      validator
        .dereferenceDataTableComponent(dataTableComponent)
        .then((components) => {
          assert.deepEqual(components, [
            {
              label: '1 - Text Field',
              placeholder: 'Text Field',
              tableView: true,
              key: 'TextField',
              type: 'textfield',
              input: true
            },
            {
              label: '3 - Text Area',
              placeholder: 'Text Area',
              tableView: true,
              key: 'TextArea',
              type: 'textarea',
              input: true
            },
          ]);

          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it('Should filter nested resource components based on data table settings', function(done) {
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
        },
        formio
      );
      const dataTableComponent = {
        type: 'datatable',
        fetch: {
          enableFetch: true,
          components: [
            {
              path: 'textField',
              key: 'textField'
            },
            {
              path: 'container.textField',
              key: 'container.textField'
            },
            {
              path: 'container.textFieldColumn',
              key: 'container.textFieldColumn'
            },
            {
              path: 'container.a',
              key: 'container.a'
            },
            {
              path: 'container.b',
              key: 'container.b'
            }
          ],
          dataSrc: 'resource',
          resource: resourceWithNestedComponentsId,
        },
      };
      validator
        .dereferenceDataTableComponent(dataTableComponent)
        .then((components) => {
          assert.deepEqual(components, [
            {
              label: 'Text Field',
              tableView: true,
              key: 'textField',
              type: 'textfield',
              input: true
            },
            {
              collapsible: false,
              key: 'panel',
              type: 'panel',
              label: 'Panel',
              input: false,
              tableView: false,
              components: [
                {
                  label: 'Container',
                  key: 'container',
                  type: 'container',
                  input: true,
                  components: [
                    {
                      label: 'Text Field',
                      tableView: true,
                      key: 'textField',
                      type: 'textfield',
                      input: true
                    },
                    {
                      "label": "Columns",
                      "columns": [
                        {
                          "components": [
                            {
                              "label": "Text Field",
                              "applyMaskOn": "change",
                              "tableView": true,
                              "validateWhenHidden": false,
                              "key": "textFieldColumn",
                              "type": "textfield",
                              "input": true
                            }
                          ],
                          "width": 6,
                          "offset": 0,
                          "push": 0,
                          "pull": 0,
                          "size": "md",
                          "currentWidth": 6
                        },
                        {
                          "components": [],
                          "width": 6,
                          "offset": 0,
                          "push": 0,
                          "pull": 0,
                          "size": "md",
                          "currentWidth": 6
                        }
                      ],
                      "key": "columns",
                      "type": "columns",
                      "input": false,
                      "tableView": false
                    },
                    {
                      "label": "Table",
                      "cellAlignment": "left",
                      "key": "table",
                      "type": "table",
                      "input": false,
                      "tableView": false,
                      "rows": [
                        [
                          {
                            "components": [
                              {
                                "label": "A",
                                "applyMaskOn": "change",
                                "mask": false,
                                "tableView": false,
                                "delimiter": false,
                                "requireDecimal": false,
                                "inputFormat": "plain",
                                "truncateMultipleSpaces": false,
                                "validateWhenHidden": false,
                                "key": "a",
                                "type": "number",
                                "input": true
                              }
                            ]
                          },
                          {
                            "components": [
                              {
                                "label": "B",
                                "applyMaskOn": "change",
                                "mask": false,
                                "tableView": false,
                                "delimiter": false,
                                "requireDecimal": false,
                                "inputFormat": "plain",
                                "truncateMultipleSpaces": false,
                                "validateWhenHidden": false,
                                "key": "b",
                                "type": "number",
                                "input": true
                              }
                            ]
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
                            "components": []
                          }
                        ]
                      ],
                      "numRows": 2
                    }
                  ]
                }
              ]
            },
          ]);

          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it('Should be able to leverage instances in custom validation', async function () {
      const form = {
        components: [
          {
            type: 'textfield',
            key: 'a',
            input: true,
            label: "Text Field"
          },
          {
            type: 'textfield',
            key: 'b',
            input: true,
            validate: {
              custom: 'valid = instance.root.getComponent("a")?.component.label === "Oopsie" ? true : "Should have Oopsie Label";'
            }
          }
        ]
      };
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
          currentForm: form,
        },
        formio
      );
      const submission = {
        data: {}
      };
      await validator.validate(submission, (err) => {
        assert(err !== null, "We should have validator errors");
        assert(err.name === 'ValidationError');
        assert(err.details[0]?.message === 'Should have Oopsie Label');
      });
    });

    after(function(done) {
      request(app)
        .delete(hook.alter('url', `/form/${resourceWithFlatComponentsId}`, template))
        .set('x-jwt-token', template.users.admin.token)
        .expect('Content-Type', /text/)
        .expect(200)
        .end(function(err) {
          if (err) {
            return done(err);
          }

          request(app)
            .delete(hook.alter('url', `/form/${resourceWithNestedComponentsId}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /text/)
            .expect(200)
            .end(function(err) {
              if (err) {
                return done(err);
              }

              done();
            });
        });
    });
  });
};
