'use strict';

const request = require('./formio-supertest');
const assert = require('assert');
const FormioCore = require('@formio/core');
const Validator = require('../src/resources/Validator');

module.exports = function (app, template, hook) {
  const formio = hook.alter('formio', app.formio);

  describe('Validator tests', function () {
    let testResourceWithFlatComponents;
    let testResourceWithNestedComponents;
    let resourceWithFlatComponentsId;
    let resourceWithNestedComponentsId;
    before(function () {
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
            input: true,
          },
          {
            label: '2 - Email',
            placeholder: 'Email',
            tableView: true,
            key: 'Email',
            type: 'email',
            input: true,
          },
          {
            label: '3 - Text Area',
            placeholder: 'Text Area',
            tableView: true,
            key: 'TextArea',
            type: 'textarea',
            input: true,
          },
          {
            label: '4 - Checkbox',
            tableView: true,
            key: 'Checkbox',
            type: 'checkbox',
            input: true,
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
            input: true,
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
                input: true,
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
                    input: true,
                  },
                  {
                    label: 'Columns',
                    columns: [
                      {
                        components: [
                          {
                            label: 'Text Field',
                            applyMaskOn: 'change',
                            tableView: true,
                            validateWhenHidden: false,
                            key: 'textFieldColumn',
                            type: 'textfield',
                            input: true,
                          },
                        ],
                        width: 6,
                        offset: 0,
                        push: 0,
                        pull: 0,
                        size: 'md',
                        currentWidth: 6,
                      },
                      {
                        components: [
                          {
                            label: 'Text Area',
                            applyMaskOn: 'change',
                            autoExpand: false,
                            tableView: true,
                            validateWhenHidden: false,
                            key: 'textAreaColumn',
                            type: 'textarea',
                            input: true,
                          },
                        ],
                        width: 6,
                        offset: 0,
                        push: 0,
                        pull: 0,
                        size: 'md',
                        currentWidth: 6,
                      },
                    ],
                    key: 'columns',
                    type: 'columns',
                    input: false,
                    tableView: false,
                  },
                  {
                    label: 'Table',
                    cellAlignment: 'left',
                    key: 'table',
                    type: 'table',
                    input: false,
                    tableView: false,
                    rows: [
                      [
                        {
                          components: [
                            {
                              label: 'A',
                              applyMaskOn: 'change',
                              mask: false,
                              tableView: false,
                              delimiter: false,
                              requireDecimal: false,
                              inputFormat: 'plain',
                              truncateMultipleSpaces: false,
                              validateWhenHidden: false,
                              key: 'a',
                              type: 'number',
                              input: true,
                            },
                          ],
                        },
                        {
                          components: [
                            {
                              label: 'B',
                              applyMaskOn: 'change',
                              mask: false,
                              tableView: false,
                              delimiter: false,
                              requireDecimal: false,
                              inputFormat: 'plain',
                              truncateMultipleSpaces: false,
                              validateWhenHidden: false,
                              key: 'b',
                              type: 'number',
                              input: true,
                            },
                          ],
                        },
                        {
                          components: [
                            {
                              label: 'C',
                              applyMaskOn: 'change',
                              mask: false,
                              tableView: false,
                              delimiter: false,
                              requireDecimal: false,
                              inputFormat: 'plain',
                              truncateMultipleSpaces: false,
                              validateWhenHidden: false,
                              key: 'c',
                              type: 'number',
                              input: true,
                            },
                          ],
                        },
                      ],
                      [
                        {
                          components: [
                            {
                              label: 'D',
                              applyMaskOn: 'change',
                              mask: false,
                              tableView: false,
                              delimiter: false,
                              requireDecimal: false,
                              inputFormat: 'plain',
                              truncateMultipleSpaces: false,
                              validateWhenHidden: false,
                              key: 'd',
                              type: 'number',
                              input: true,
                            },
                          ],
                        },
                        {
                          components: [
                            {
                              label: 'E',
                              applyMaskOn: 'change',
                              mask: false,
                              tableView: false,
                              delimiter: false,
                              requireDecimal: false,
                              inputFormat: 'plain',
                              truncateMultipleSpaces: false,
                              validateWhenHidden: false,
                              key: 'e',
                              type: 'number',
                              input: true,
                            },
                          ],
                        },
                        {
                          components: [
                            {
                              label: 'F',
                              applyMaskOn: 'change',
                              mask: false,
                              tableView: false,
                              delimiter: false,
                              requireDecimal: false,
                              inputFormat: 'plain',
                              truncateMultipleSpaces: false,
                              validateWhenHidden: false,
                              key: 'f',
                              type: 'number',
                              input: true,
                            },
                          ],
                        },
                      ],
                    ],
                    numRows: 2,
                  },
                ],
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
      };
    });

    it('Bootstrap', function (done) {
      request(app)
        .post(hook.alter('url', '/form', template))
        .set('x-jwt-token', template.users.admin.token)
        .send(testResourceWithFlatComponents)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function (err, res) {
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
            .end(function (err, res) {
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

    it('Should filter resource components based on data table settings', function (done) {
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
        },
        { formio },
      );
      const dataTableComponent = {
        type: 'datatable',
        fetch: {
          enableFetch: true,
          components: [
            {
              path: 'TextField',
              key: 'TextField',
            },
            {
              path: 'TextArea',
              key: 'TextArea',
            },
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
              input: true,
            },
            {
              label: '3 - Text Area',
              placeholder: 'Text Area',
              tableView: true,
              key: 'TextArea',
              type: 'textarea',
              input: true,
            },
          ]);

          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it('Should filter nested resource components based on data table settings', function (done) {
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
        },
        { formio },
      );
      const dataTableComponent = {
        type: 'datatable',
        fetch: {
          enableFetch: true,
          components: [
            {
              path: 'textField',
              key: 'textField',
            },
            {
              path: 'container.textField',
              key: 'container.textField',
            },
            {
              path: 'container.textFieldColumn',
              key: 'container.textFieldColumn',
            },
            {
              path: 'container.a',
              key: 'container.a',
            },
            {
              path: 'container.b',
              key: 'container.b',
            },
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
              input: true,
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
                      input: true,
                    },
                    {
                      label: 'Columns',
                      columns: [
                        {
                          components: [
                            {
                              label: 'Text Field',
                              applyMaskOn: 'change',
                              tableView: true,
                              validateWhenHidden: false,
                              key: 'textFieldColumn',
                              type: 'textfield',
                              input: true,
                            },
                          ],
                          width: 6,
                          offset: 0,
                          push: 0,
                          pull: 0,
                          size: 'md',
                          currentWidth: 6,
                        },
                        {
                          components: [],
                          width: 6,
                          offset: 0,
                          push: 0,
                          pull: 0,
                          size: 'md',
                          currentWidth: 6,
                        },
                      ],
                      key: 'columns',
                      type: 'columns',
                      input: false,
                      tableView: false,
                    },
                    {
                      label: 'Table',
                      cellAlignment: 'left',
                      key: 'table',
                      type: 'table',
                      input: false,
                      tableView: false,
                      rows: [
                        [
                          {
                            components: [
                              {
                                label: 'A',
                                applyMaskOn: 'change',
                                mask: false,
                                tableView: false,
                                delimiter: false,
                                requireDecimal: false,
                                inputFormat: 'plain',
                                truncateMultipleSpaces: false,
                                validateWhenHidden: false,
                                key: 'a',
                                type: 'number',
                                input: true,
                              },
                            ],
                          },
                          {
                            components: [
                              {
                                label: 'B',
                                applyMaskOn: 'change',
                                mask: false,
                                tableView: false,
                                delimiter: false,
                                requireDecimal: false,
                                inputFormat: 'plain',
                                truncateMultipleSpaces: false,
                                validateWhenHidden: false,
                                key: 'b',
                                type: 'number',
                                input: true,
                              },
                            ],
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
                            components: [],
                          },
                        ],
                      ],
                      numRows: 2,
                    },
                  ],
                },
              ],
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
            label: 'Text Field',
          },
          {
            type: 'textfield',
            key: 'b',
            input: true,
            validate: {
              custom:
                'valid = instance.root.getComponent("a")?.component.label === "Oopsie" ? true : "Should have Oopsie Label";',
            },
          },
        ],
      };
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
          currentForm: form,
        },
        { formio },
      );
      const submission = {
        data: {},
      };
      await validator.validate(submission, (err) => {
        assert(err !== null, 'We should have validator errors');
        assert(err.name === 'ValidationError');
        assert(err.details[0]?.message === 'Should have Oopsie Label');
      });
    });

    it('Should run the encapsulated single-sweep path when opted in, matching default results', async function () {
      const form = {
        components: [
          { type: 'number', key: 'a', input: true },
          {
            type: 'number',
            key: 'b',
            input: true,
            calculateValue: 'value = data.a * 2;',
            calculateServer: true,
          },
          {
            type: 'textfield',
            key: 'secret',
            input: true,
            validate: { required: true },
            customConditional: 'show = data.a > 100;',
          },
          {
            type: 'textfield',
            key: 'c',
            input: true,
            validate: { custom: 'valid = (input === "ok") ? true : "must be ok";' },
          },
        ],
      };
      const submission = { data: { a: 5, c: 'bad' } };

      const validator = new Validator({ headers: {}, currentForm: form }, { formio });
      // Force the encapsulated path on for this validation only.
      validator.hook = Object.create(formio.hook);
      validator.hook.alter = (name, value, ...args) =>
        name === 'useEncapsulatedEvaluation' ? true : formio.hook.alter(name, value, ...args);

      // Spy on the single-sweep evaluator entry to prove the encapsulated path was taken.
      const evaluator = FormioCore.Evaluator;
      const originalEvaluateProcess = evaluator.evaluateProcess.bind(evaluator);
      let sweepCalls = 0;
      evaluator.evaluateProcess = (params) => {
        sweepCalls++;
        return originalEvaluateProcess(params);
      };

      try {
        let cbErr;
        await validator.validate(submission, (err) => {
          cbErr = err;
        });
        assert.equal(sweepCalls, 1, 'the encapsulated sweep should run exactly once');
        assert.ok(cbErr, 'custom validation on c should fail');
        assert.equal(cbErr.name, 'ValidationError');
        assert.ok(
          cbErr.details.some((d) => d.message === 'must be ok'),
          'custom validation message should be present',
        );
        assert.ok(
          !cbErr.details.some((d) => d.context && d.context.path === 'secret'),
          'a field hidden by a custom conditional should not raise its required error',
        );
        assert.equal(submission.data.b, 10, 'server calculation should be applied');
      } finally {
        evaluator.evaluateProcess = originalEvaluateProcess;
      }
    });

    it('encapsulated mode does not re-evaluate custom conditionals per-expression during validation', async function () {
      // All custom JS in encapsulated mode runs inside the single sweep (evaluateProcess). Phase 3's
      // server-side validation must reuse the conditionals the sweep already computed, not re-run each
      // custom conditional through the per-expression host evaluator (that regression made big forms
      // take tens of seconds to submit).
      const form = {
        components: [
          { type: 'textfield', key: 'trigger', input: true },
          {
            type: 'textfield',
            key: 'x1',
            input: true,
            customConditional: 'show = data.trigger === "go";',
          },
          {
            type: 'textfield',
            key: 'x2',
            input: true,
            customConditional: 'show = data.trigger === "go";',
          },
          {
            type: 'textfield',
            key: 'x3',
            input: true,
            customConditional: 'show = data.trigger === "go";',
          },
        ],
      };
      const submission = { data: { trigger: 'go' } };

      const validator = new Validator({ headers: {}, currentForm: form }, { formio });
      validator.hook = Object.create(formio.hook);
      validator.hook.alter = (name, value, ...args) =>
        name === 'useEncapsulatedEvaluation' ? true : formio.hook.alter(name, value, ...args);

      // Spy on the per-expression evaluator entry; it must not fire on the host in encapsulated mode.
      const evaluator = FormioCore.Evaluator;
      const originalEvaluate = evaluator.evaluate.bind(evaluator);
      let perExpressionCalls = 0;
      evaluator.evaluate = (...args) => {
        perExpressionCalls++;
        return originalEvaluate(...args);
      };

      try {
        await validator.validate(submission, () => {});
        assert.equal(
          perExpressionCalls,
          0,
          'custom conditionals must not be evaluated per-expression on the host',
        );
      } finally {
        evaluator.evaluate = originalEvaluate;
      }
    });

    it('encapsulated mode yields the same validation result and data as the default path', async function () {
      const form = {
        components: [
          { type: 'number', key: 'a', input: true },
          {
            type: 'number',
            key: 'b',
            input: true,
            calculateValue: 'value = data.a * 2;',
            calculateServer: true,
          },
          { type: 'textfield', key: 'req', input: true, validate: { required: true } },
          {
            type: 'textfield',
            key: 'secret',
            input: true,
            validate: { required: true },
            customConditional: 'show = data.a > 100;',
          },
          {
            type: 'textfield',
            key: 'c',
            input: true,
            validate: { custom: 'valid = (input === "ok") ? true : "must be ok";' },
          },
        ],
      };

      const runValidate = async (encapsulated) => {
        const validator = new Validator({ headers: {}, currentForm: form }, { formio });
        if (encapsulated) {
          validator.hook = Object.create(formio.hook);
          validator.hook.alter = (name, value, ...args) =>
            name === 'useEncapsulatedEvaluation' ? true : formio.hook.alter(name, value, ...args);
        }
        const submission = { data: { a: 5, c: 'bad' } };
        let result;
        await validator.validate(submission, (err) => {
          result = {
            errors: (err?.details || []).map((d) => `${d.context?.path}:${d.message}`).sort(),
            data: submission.data,
          };
        });
        return result;
      };

      const def = await runValidate(false);
      const enc = await runValidate(true);

      assert.deepStrictEqual(enc, def);
      // sanity: the form actually exercised calculation + required + custom validation
      assert.equal(def.data.b, 10);
      assert.ok(def.errors.some((e) => e.startsWith('req:')));
      assert.ok(def.errors.some((e) => e.startsWith('c:')));
      assert.ok(!def.errors.some((e) => e.startsWith('secret:')));
    });

    it('encapsulated mode does not validate phantom rows of an absent data grid in a nested form (matches default)', async function () {
      const form = {
        components: [
          { type: 'textfield', key: 'req', input: true, validate: { required: true } },
          {
            type: 'form',
            key: 'nested',
            input: true,
            components: [
              {
                type: 'datagrid',
                key: 'grid',
                input: true,
                components: [
                  { type: 'textfield', key: 'name', input: true, validate: { required: true } },
                ],
              },
            ],
          },
        ],
      };

      const runValidate = async (encapsulated) => {
        const validator = new Validator({ headers: {}, currentForm: form }, { formio });
        if (encapsulated) {
          validator.hook = Object.create(formio.hook);
          validator.hook.alter = (name, value, ...args) =>
            name === 'useEncapsulatedEvaluation' ? true : formio.hook.alter(name, value, ...args);
        }
        const submission = { data: { nested: { data: {} } } };
        let result;
        await validator.validate(submission, (err) => {
          result = {
            errors: (err?.details || [])
              .map((d) => d.context?.path)
              .filter(Boolean)
              .sort(),
          };
        });
        return result;
      };

      const def = await runValidate(false);
      const enc = await runValidate(true);

      assert.deepStrictEqual(enc, def);
      assert.ok(
        !enc.errors.some((e) => e.includes('grid')),
        'a required child of an absent nested data grid should not be validated',
      );
    });

    it('encapsulated mode exposes the form/project public config and headers to custom logic (matches default)', async function () {
      const form = {
        config: { publicSetting: 'expected' },
        components: [
          {
            type: 'textfield',
            key: 'c',
            input: true,
            validate: {
              custom: 'valid = (config.publicSetting === "expected") ? true : "config missing";',
            },
          },
          {
            type: 'textfield',
            key: 'h',
            input: true,
            validate: {
              custom:
                'valid = (config.headers && config.headers["x-parity"] === "on") ? true : "header missing";',
            },
          },
        ],
      };

      const runValidate = async (encapsulated) => {
        const validator = new Validator(
          { headers: { 'x-parity': 'on' }, currentForm: form },
          { formio },
        );
        if (encapsulated) {
          validator.hook = Object.create(formio.hook);
          validator.hook.alter = (name, value, ...args) =>
            name === 'useEncapsulatedEvaluation' ? true : formio.hook.alter(name, value, ...args);
        }
        const submission = { data: { c: 'x', h: 'y' } };
        let result;
        await validator.validate(submission, (err) => {
          result = {
            errors: (err?.details || []).map((d) => `${d.context?.path}:${d.message}`).sort(),
            data: submission.data,
          };
        });
        return result;
      };

      const def = await runValidate(false);
      const enc = await runValidate(true);

      assert.deepStrictEqual(enc, def);
      // sanity: the default path resolves both config.publicSetting and config.headers
      assert.ok(
        !def.errors.some((e) => e.startsWith('c:') || e.startsWith('h:')),
        'default path should expose config public settings and headers to custom logic',
      );
    });

    it('encapsulated mode fails the request when custom logic exceeds the VM timeout', async function () {
      this.timeout(5000);
      const form = {
        components: [
          {
            type: 'textfield',
            key: 'test',
            input: true,
            validate: { custom: "if (input === 'test') { while (true) {} }" },
          },
        ],
      };
      const validator = new Validator({ headers: {}, currentForm: form }, { formio });
      validator.hook = Object.create(formio.hook);
      validator.hook.alter = (name, value, ...args) =>
        name === 'useEncapsulatedEvaluation' ? true : formio.hook.alter(name, value, ...args);

      let cbErr;
      await validator.validate({ data: { test: 'test' } }, (err) => {
        cbErr = err;
      });

      assert.ok(cbErr, 'a runaway validation should fail the request');
      assert.ok(
        String(cbErr.message || cbErr).includes('Script execution timed out'),
        `expected a timeout error, got: ${JSON.stringify(cbErr)}`,
      );
    });

    it('Should return validation error when t() is used in custom validation logic', async function () {
      const form = {
        components: [
          {
            label: 'Text Field',
            applyMaskOn: 'change',
            tableView: true,
            validate: {
              custom: "valid = (input === 'Joe') ? true : t('joeMsg');",
            },
            validateWhenHidden: false,
            key: 'textField',
            type: 'textfield',
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
        ],
      };
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
          currentForm: form,
        },
        { formio },
      );
      const submission = {
        data: {
          textField: 'test',
        },
      };
      await validator.validate(submission, (err, data) => {
        assert.equal(!!err, true);
        assert.equal(err.details[0].message, 'joeMsg');
      });
    });

    it('Instance should be available in evaluation context for content components', async function () {
      const form = {
        components: [
          {
            label: 'HTML',
            attrs: [
              {
                attr: '',
                value: '',
              },
            ],
            content: 'rewrw',
            refreshOnChange: false,
            key: 'html',
            customConditional: 'show = !instance.component.customConditional;\n',
            type: 'htmlelement',
            input: false,
            tableView: false,
          },
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
            type: 'button',
            label: 'Submit',
            key: 'submit',
            disableOnInvalid: true,
            input: true,
            tableView: false,
          },
        ],
      };
      const validator = new Validator(
        {
          headers: {
            'x-jwt-token': template.users.admin.token,
          },
          currentForm: form,
        },
        { formio },
      );
      const submission = {
        data: { textField: 'test' },
      };
      await validator.validate(submission, (err, data) => {
        assert.equal(submission.scope?.conditionals[0]?.conditionallyHidden, true);
      });
    });

    after(function (done) {
      request(app)
        .delete(hook.alter('url', `/form/${resourceWithFlatComponentsId}`, template))
        .set('x-jwt-token', template.users.admin.token)
        .expect('Content-Type', /text/)
        .expect(200)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          request(app)
            .delete(hook.alter('url', `/form/${resourceWithNestedComponentsId}`, template))
            .set('x-jwt-token', template.users.admin.token)
            .expect('Content-Type', /text/)
            .expect(200)
            .end(function (err) {
              if (err) {
                return done(err);
              }

              done();
            });
        });
    });
  });
};
