'use strict';

const assert = require('assert');
const { IsolateVM } = require('@formio/vm');
const { CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS } = require('../src/vm');
const { getScript } = require('../src/util/email/renderEmail');
const { RootShim } = require('../src/vm/src/RootShim');
const { InstanceShim } = require('../src/vm/src/InstanceShim');

module.exports = function (app, template, hook) {
  describe('VM bundles', function () {
    let isolateVM;

    before('bootstrap the vm', function () {
      isolateVM = new IsolateVM({ env: CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS });
    });

    it('should evaluate simple code with lodash', async () => {
      const result = await isolateVM.evaluate('_.camelCase("hello world")');
      assert.equal(result, 'helloWorld');
    });

    it('should evaluate simple code with moment', async () => {
      const result = await isolateVM.evaluate('moment(0).utc().format("YYYY-MM-DD")');
      assert.equal(result, '1970-01-01');
    });

    it('should evaluate emails messages with nunjucks (which uses core logic inside)', async () => {
      const data = {
        context: {
          form: {
            components: [
              {
                collapsible: false,
                key: 'panel',
                label: 'Panel',
                type: 'panel',
                input: false,
                tableView: false,
                components: [
                  {
                    label: 'Text Field',
                    applyMaskOn: 'change',
                    tableView: true,
                    customDefaultValue: 'HI',
                    validateWhenHidden: false,
                    key: 'textField',
                    type: 'textfield',
                    input: true,
                    compPath: 'textField',
                  },
                ],
              },
            ],
          },
          content: "{{utils.getComponent(form.components, 'panel', true).label}}",
        },
        input: {
          from: 'no-reply@example.com',
          to: 'to@example.com',
          subject: 'New submission for ',
          html: '<!doctype html><html><body><p>{{ content }}</p></body></html>',
          msgTransport: 'smtp',
          transport: 'smtp',
          renderingMethod: 'dynamic',
        },
      };
      const result = await isolateVM.evaluate(getScript(data.input), data);
      const match = result.html.match(/\bPanel\b/g);
      assert.equal(!!match, true);
      assert.equal(match[0], 'Panel');
    });

    it('should evaluate simple code with core', async () => {
      const result = await isolateVM.evaluate(
        'utils.getComponentKey({ key: "textField", type: "textfield", input: true})',
      );
      assert.equal(result, 'textField');
    });

    it('should evaluate code with nunjucks', async () => {
      const result = await isolateVM.evaluate(
        'nunjucks.renderString("Hello {{ name }}", { name: "World" })',
      );
      assert.equal(result, 'Hello World');
    });

    it('componentValue filter prefers the nextgen componentValues map when set', async () => {
      const result = await isolateVM.evaluate(
        `environment.renderString(
          '{{ d | componentValue("firstName", c) }}',
          { d: { firstName: 'raw' }, c: { firstName: { key: 'firstName', type: 'textfield', input: true } } }
        )`,
        { componentValues: { firstName: 'FromNextgen' } },
      );
      assert.equal(result.trim(), 'FromNextgen');
    });

    it('componentLabel filter prefers the nextgen componentLabels map when set', async () => {
      const result = await isolateVM.evaluate(
        `environment.renderString(
          '{{ "firstName" | componentLabel(c) }}',
          { c: { firstName: { key: 'firstName', label: 'Core Label' } } }
        )`,
        { componentLabels: { firstName: 'Nextgen Label' } },
      );
      assert.equal(result.trim(), 'Nextgen Label');
    });

    after('dispose of the vm', function () {
      isolateVM.dispose();
    });
  });

  describe('RootShim/InstanceShim', function () {
    let component1, component2, component3, component4;
    let components, data, dataGrid;
    let root, instanceMap;
    before('bootstrap RootShim/InstanceShim tests', function () {
      component1 = {
        type: 'textfield',
        key: 'firstName',
        customDefaultValue: `value = 'John'`,
      };
      component2 = {
        type: 'textfield',
        key: 'lastName',
        validate: {
          required: true,
        },
      };
      component3 = {
        type: 'textfield',
        key: 'email',
        validate: {
          required: true,
        },
      };
      component4 = {
        type: 'textfield',
        key: 'someText',
      };
      components = [component1, component2, component3, component4];
      data = {
        firstName: 'John',
        lastName: 'Doe',
        email: '',
      };
      dataGrid = {
        label: 'Data Grid',
        reorder: false,
        addAnotherPosition: 'bottom',
        layoutFixed: false,
        enableRowGroups: false,
        initEmpty: false,
        hideLabel: true,
        tableView: false,
        defaultValue: [
          {
            accountName: '',
            accountNumber: '',
            BillNoField: '',
          },
        ],
        validate: {
          maxLength: '15',
        },
        key: 'accountInfo',
        type: 'datagrid',
        defaultOpen: false,
        input: true,
        components: [
          {
            label: 'Using instance.rowIndex',
            applyMaskOn: 'change',
            tableView: true,
            validateOn: 'blur',
            validate: {
              required: true,
              custom:
                'valid = isDup() ? "Duplicate detected" : true;\n\nfunction isDup() {\n    var cRow = instance.rowIndex;\n    if (data.accountInfo.length \u003E 1) {\n        for (var i = 0; i \u003C data.accountInfo.length; i++) {\n            if (i !== cRow && input === data.accountInfo[i].BillNoField) {\n                return true;\n            }\n        }\n        return false;\n    } else {\n        return false;\n    }\n}',
            },
            validateWhenHidden: false,
            key: 'BillNoField',
            type: 'textfield',
            input: true,
          },
          {
            label: 'Using rowIndex',
            applyMaskOn: 'change',
            tableView: true,
            validateOn: 'blur',
            validate: {
              required: true,
              custom:
                'valid = isDup() ? "Duplicate detected" : true;\n\nfunction isDup() {\n    var cRow = rowIndex;\n    if (data.accountInfo.length \u003E 1) {\n        for (var i = 0; i \u003C data.accountInfo.length; i++) {\n            if (i !== cRow && input === data.accountInfo[i].BillNoField1) {\n                return true;\n            }\n        }\n        return false;\n    } else {\n        return false;\n    }\n}',
            },
            key: 'BillNoField1',
            type: 'textfield',
            input: true,
          },
        ],
      };
      root = new RootShim({ components }, { data });
      instanceMap = root.instanceMap;
    });

    it('should create an instance map', () => {
      assert(instanceMap.hasOwnProperty('firstName'));
      assert(instanceMap.hasOwnProperty('lastName'));
      assert(instanceMap.hasOwnProperty('email'));
    });

    it('should get root from instance', () => {
      assert(instanceMap.firstName.root);
      assert(instanceMap.firstName.root.getComponent);
    });

    it('should get component from root', () => {
      // return;
      const lastNameInstance = instanceMap.firstName.root.getComponent('lastName');
      assert.deepEqual(lastNameInstance.component, component2);
    });

    it('should get component not involved in processes', () => {
      const someTextInstance = instanceMap.firstName.root.getComponent('someText');
      assert.deepEqual(someTextInstance.component, component4);
    });

    it('should expose a getCustomDefaultValue method', () => {
      const firstNameInstance = instanceMap.firstName;
      assert.equal(firstNameInstance.getCustomDefaultValue(), 'John');
    });

    it('should add rowIndex property to the nested components', () => {
      const root = new RootShim(
        {
          components: [dataGrid],
        },
        {
          data: {
            accountInfo: [
              {
                BillNoField: 'test',
                BillNoField1: 'test2',
              },
              {
                BillNoField: 'test3',
                BillNoField1: 'test4',
              },
            ],
            submit: true,
          },
        },
      );
      const instanceMap = root.instanceMap;
      const billNoFieldInstanceRow0 = instanceMap['accountInfo[0].BillNoField'];
      const billNoFieldInstanceRow1 = instanceMap['accountInfo[1].BillNoField'];
      assert.equal(billNoFieldInstanceRow0.rowIndex, 0);
      assert.equal(billNoFieldInstanceRow1.rowIndex, 1);
    });

    it('should return a component (InstanceShim) at an exact path if it exists', () => {
      const components = [
        {
          type: 'textfield',
          key: 'textField',
          label: 'Text Field',
          input: true,
        },
      ];
      const root = new RootShim({ components }, { data: {} });
      const component = root.getComponent('textField');
      assert(component instanceof InstanceShim);
      assert.equal(component.component.key, 'textField');
    });

    it('should return a component at an exact nested path if it exists', () => {
      const components = [
        {
          type: 'datagrid',
          key: 'dataGrid',
          components: [
            {
              type: 'textfield',
              key: 'textField',
              label: 'Text Field',
              input: true,
            },
          ],
        },
      ];
      const root = new RootShim(
        { components },
        {
          data: {
            dataGrid: [{ textField: 'hello' }],
          },
        },
      );
      const component = root.getComponent('dataGrid[0].textField');
      assert(component instanceof InstanceShim);
      assert.equal(component.component.key, 'textField');
    });

    it('should return a component at an exact path if it exists and there is no data associated with that component', () => {
      const components = [
        {
          type: 'datagrid',
          key: 'dataGrid',
          components: [
            {
              type: 'textfield',
              key: 'textField',
              label: 'Text Field',
              input: true,
            },
          ],
        },
      ];
      const root = new RootShim({ components }, { data: {} });
      const component = root.getComponent('dataGrid[0].textField');
      assert(component instanceof InstanceShim);
      assert.equal(component.component.key, 'textField');
      assert.equal(component.component.label, 'Text Field');
    });

    it('should return a component (InstanceShim) at a path with the final pathname segment matching the path argument if it exists', () => {
      const components = [
        {
          type: 'datagrid',
          key: 'dataGrid',
          components: [
            {
              type: 'textfield',
              key: 'textField',
              label: 'Text Field',
              input: true,
            },
          ],
        },
      ];
      const root = new RootShim(
        { components },
        {
          data: {
            dataGrid: [{ textField: 'hello' }],
          },
        },
      );
      const component = root.getComponent('textField');
      assert(component instanceof InstanceShim);
      assert.equal(component.component.key, 'textField');
    });

    it('should return a component (InstanceShim) at a path with the final pathname segment matching the path argument if it exists and there is no data associated with the component', () => {
      const components = [
        {
          type: 'datagrid',
          key: 'dataGrid',
          components: [
            {
              type: 'textfield',
              key: 'textField',
              label: 'Text Field',
              input: true,
            },
          ],
        },
      ];
      const root = new RootShim({ components }, { data: {} });
      const component = root.getComponent('textField');
      assert(component instanceof InstanceShim);
      assert.equal(component.component.key, 'textField');
      assert.equal(component.component.label, 'Text Field');
    });
  });

  describe('IsolateVMEvaluator.evaluateProcess', function () {
    const { IsolateVMEvaluator } = require('../src/vm');
    let evaluator;

    before(function () {
      evaluator = new IsolateVMEvaluator({}, hook);
    });

    it('runs the evaluator processors (calculation + custom validation) in a single sweep', async function () {
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
            key: 'c',
            input: true,
            validate: { custom: 'valid = (input === "ok") ? true : "must be ok";' },
          },
        ],
      };
      const submission = { data: { a: 5, c: 'bad' } };

      const { scope, data } = await evaluator.evaluateProcess({
        form,
        submission,
        scope: {},
      });

      assert.equal(data.b, 10);
      assert.ok(scope.errors && scope.errors.length >= 1);
      assert.ok(scope.errors.some((err) => err.context && err.context.path === 'c'));
    });
  });

  describe('NextgenIsolateRenderer.renderProcess', function () {
    const { NextgenIsolateRenderer } = require('../src/vm/nextgen/renderer');
    let renderer;
    // No resources/network are needed for these forms; stub the host callbacks.
    const stubCallbacks = {
      loadForm: async () => {
        throw new Error('loadForm not stubbed');
      },
      loadSubmission: async () => {
        throw new Error('loadSubmission not stubbed');
      },
      loadSubmissions: async () => [],
      checkUnique: async () => true,
      request: async () => null,
      fetch: async () => ({ ok: true, status: 200, headers: {}, body: '[]' }),
    };

    before(function () {
      renderer = new NextgenIsolateRenderer({ memoryLimitMb: 512, timeoutMs: 15000 });
    });

    it('validates a required field entirely inside the isolate', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          {
            type: 'textfield',
            key: 'firstName',
            label: 'First Name',
            input: true,
            validate: { required: true },
          },
        ],
      };
      const result = await renderer.renderProcess({
        form,
        submission: { data: { firstName: '' } },
        applyDefaults: true,
        callbacks: stubCallbacks,
      });
      assert.ok(
        result.details.some(
          (d) => d.context.path === 'firstName' && d.context.validator === 'required',
        ),
        'expected a required-field error for firstName',
      );
    });

    it('runs calculateServer custom JS with lodash and moment in-isolate', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          { type: 'textfield', key: 'firstName', input: true },
          {
            type: 'textfield',
            key: 'srvCalc',
            input: true,
            calculateServer: true,
            calculateValue:
              'value = _.upperCase(data.firstName || "y") + moment("2020-01-02").format("-YYYY");',
          },
        ],
      };
      const result = await renderer.renderProcess({
        form,
        submission: { data: { firstName: 'bob' } },
        applyDefaults: true,
        callbacks: stubCallbacks,
      });
      assert.equal(result.data.srvCalc, 'BOB-2020');
    });

    it('reports conditionally-hidden and protected paths', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          { type: 'textfield', key: 'secret', input: true, protected: true },
          { type: 'textfield', key: 'hiddenOne', input: true, customConditional: 'show = false;' },
        ],
      };
      const result = await renderer.renderProcess({
        form,
        submission: { data: { secret: 'p@ss' } },
        applyDefaults: true,
        callbacks: stubCallbacks,
      });
      assert.deepEqual(result.hiddenPaths, ['hiddenOne']);
      assert.deepEqual(result.protectedPaths, ['secret']);
    });

    it('builds email render data (table html + values/labels) in-isolate', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [{ type: 'textfield', key: 'firstName', label: 'First Name', input: true }],
      };
      const result = await renderer.renderEmail({
        form,
        submission: { data: { firstName: 'Bob' } },
        callbacks: stubCallbacks,
      });
      assert.equal(result.componentValues.firstName, 'Bob');
      assert.equal(result.componentLabels.firstName, 'First Name');
      assert.ok(result.submissionTableHtml.length > 0);
    });

    it('renders a rich component (datagrid) as nested html in its email value', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          {
            type: 'datagrid',
            key: 'grid',
            label: 'Grid',
            input: true,
            components: [{ type: 'textfield', key: 'cell', label: 'Cell', input: true }],
          },
        ],
      };
      const result = await renderer.renderEmail({
        form,
        submission: { data: { grid: [{ cell: 'x1' }, { cell: 'x2' }] } },
        callbacks: stubCallbacks,
      });
      assert.match(result.componentValues.grid, /<table|<tr|<td/i);
      assert.match(result.componentValues.grid, /x1/);
    });

    it('masks protected component values in the email render data', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [{ type: 'textfield', key: 'ssn', label: 'SSN', input: true, protected: true }],
      };
      const result = await renderer.renderEmail({
        form,
        submission: { data: { ssn: '123-45-6789' } },
        callbacks: stubCallbacks,
      });
      assert.doesNotMatch(
        result.componentValues.ssn,
        /123-45-6789/,
        'raw protected value must not leak into the email',
      );
      assert.match(result.componentValues.ssn, /PROTECTED/i);
    });

    it('renders a nested form as html in its email value', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          {
            type: 'form',
            key: 'subForm',
            label: 'Sub Form',
            input: true,
            scope: 'process',
            components: [{ type: 'textfield', key: 'firstName', label: 'First Name', input: true }],
          },
        ],
      };
      const result = await renderer.renderEmail({
        form,
        submission: { data: { subForm: { data: { firstName: 'Bob' } } } },
        callbacks: stubCallbacks,
      });
      assert.doesNotMatch(result.componentValues.subForm, /Complex Data/);
      assert.match(result.componentValues.subForm, /Bob/);
    });

    it('excludes non-value components (buttons) from the submission table', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          { type: 'textfield', key: 'firstName', label: 'First Name', input: true },
          { type: 'button', key: 'submit', label: 'Submit', input: true, action: 'submit' },
        ],
      };
      const result = await renderer.renderEmail({
        form,
        submission: { data: { firstName: 'Bob' } },
        callbacks: stubCallbacks,
      });
      assert.match(result.submissionTableHtml, /First Name/);
      assert.match(result.submissionTableHtml, /Bob/);
      assert.doesNotMatch(result.submissionTableHtml, /<button|type="submit"/i);
    });

    it('does not crash on a reference nested form whose submission cannot be loaded', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          {
            type: 'form',
            key: 'child',
            label: 'Child',
            input: true,
            form: '000000000000000000000002',
          },
        ],
      };
      const result = await renderer.renderEmail({
        form,
        submission: { data: { child: { _id: '000000000000000000000003' } } },
        callbacks: stubCallbacks,
      });
      assert.ok(result.submissionTableHtml);
    });

    it('renders each nested container once in the submission table', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [
          {
            type: 'container',
            key: 'address',
            label: 'Address',
            input: true,
            components: [{ type: 'textfield', key: 'city', label: 'City', input: true }],
          },
        ],
      };
      const result = await renderer.renderEmail({
        form,
        submission: { data: { address: { city: 'NYC' } } },
        callbacks: stubCallbacks,
      });
      const cityMatches = result.submissionTableHtml.match(/NYC/g) || [];
      assert.equal(cityMatches.length, 1, 'nested value must appear once, not duplicated');
    });
  });

  describe('NextgenIsolateEvaluator', function () {
    const { NextgenIsolateEvaluator } = require('../src/vm/nextgen/NextgenIsolateEvaluator');
    let evaluator;

    before(function () {
      evaluator = new NextgenIsolateEvaluator({}, hook);
    });

    it('evaluates an instance-free expression and returns its value', function () {
      const result = evaluator.evaluate(
        'value = data.a + data.b',
        { data: { a: 2, b: 3 } },
        'value',
      );
      assert.equal(result, 5);
    });

    it('runs the expression inside the sandbox, not on the host', function () {
      const result = evaluator.evaluate('value = typeof process', {}, 'value');
      assert.equal(result, 'undefined');
    });

    it('exposes lodash and moment from the env bundle', function () {
      const result = evaluator.evaluate(
        'value = _.upperCase(data.s) + moment("2020-01-02").format("-YYYY");',
        { data: { s: 'bob' } },
        'value',
      );
      assert.equal(result, 'BOB-2020');
    });

    it('returns null without evaluating when noeval is set', function () {
      const noevalEvaluator = new NextgenIsolateEvaluator({ noeval: true }, hook);
      const result = noevalEvaluator.evaluate('value = 1 + 1', {}, 'value');
      assert.strictEqual(result, null);
    });

    it('runs jsonLogic (object func) even under noeval', function () {
      const noevalEvaluator = new NextgenIsolateEvaluator({ noeval: true }, hook);
      const rule = { '+': [{ var: 'data.a' }, { var: 'data.b' }] };
      const result = noevalEvaluator.evaluate(rule, { data: { a: 2, b: 3 } });
      assert.strictEqual(result, 5);
    });

    it('throws when the context carries a live instance (must run in the render)', function () {
      assert.throws(
        () => evaluator.evaluate('value = instance.rowIndex', { instance: {}, data: {} }, 'value'),
        /instance/i,
      );
    });

    it('throws when the context carries self (must run in the render)', function () {
      assert.throws(
        () => evaluator.evaluate('value = self.rowIndex', { self: {}, data: {} }, 'value'),
        /instance/i,
      );
    });

    it('matches the @formio/core evaluator for the same instance-free expression', function () {
      const { DefaultEvaluator } = require('@formio/core');
      const core = new DefaultEvaluator();
      const expr = 'value = (data.a * data.b) + 1';
      const args = { data: { a: 3, b: 4 } };
      assert.equal(evaluator.evaluate(expr, args, 'value'), core.evaluate(expr, args, 'value'));
    });
  });

  describe('registerNextgenEvaluator', function () {
    const { registerNextgenEvaluator } = require('../src/util/nextgenAdapter');
    const { NextgenIsolateEvaluator } = require('../src/vm/nextgen/NextgenIsolateEvaluator');
    const nextgen = require('@formio/nextgen');
    let prevNextgen;

    beforeEach(function () {
      prevNextgen = nextgen.Evaluator;
      nextgen.registerEvaluator(new nextgen.DefaultEvaluator());
    });

    afterEach(function () {
      nextgen.registerEvaluator(prevNextgen);
    });

    it('registers the sandboxed nextgen evaluator as the @formio/nextgen Evaluator', function () {
      registerNextgenEvaluator({ timeoutMs: 500 }, hook);
      assert.ok(nextgen.Evaluator instanceof NextgenIsolateEvaluator);
    });
  });

  describe('renderEmailNextgen', function () {
    const { renderEmailNextgen } = require('../src/util/email/renderEmailNextgen');
    const { NextgenIsolateRenderer } = require('../src/vm/nextgen/renderer');
    const { CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS } = require('../src/vm');
    let renderer, emailVm;

    before(function () {
      renderer = new NextgenIsolateRenderer({ memoryLimitMb: 512, timeoutMs: 15000 });
      emailVm = new IsolateVM({ env: CORE_LODASH_MOMENT_INPUTMASK_NUNJUCKS });
    });

    after(function () {
      emailVm.dispose();
    });

    it('renders an email body using nextgen-produced component values', async function () {
      const form = {
        _id: '000000000000000000000001',
        components: [{ type: 'textfield', key: 'firstName', label: 'First Name', input: true }],
      };
      const context = {
        form,
        data: { firstName: 'Bob' },
        metadata: {},
        components: { firstName: form.components[0] },
      };
      const render = { renderingMethod: 'dynamic', html: 'Name: {{ value("firstName") }}' };
      const result = await renderEmailNextgen({ render, context, vm: emailVm, renderer });
      assert.match(result.html, /Name:\s*Bob/);
    });

    it('matches the @formio/core email render for a simple textfield (parity)', async function () {
      const { renderEmail } = require('../src/util/email/renderEmail');
      const form = {
        _id: '000000000000000000000001',
        components: [{ type: 'textfield', key: 'firstName', label: 'First Name', input: true }],
      };
      const makeContext = () => ({
        form,
        data: { firstName: 'Bob' },
        metadata: {},
        scope: {},
        components: { firstName: form.components[0] },
      });
      const render = { renderingMethod: 'dynamic', html: 'Name: {{ value("firstName") }}' };
      const coreResult = await renderEmail({
        render: { ...render },
        context: makeContext(),
        vm: emailVm,
      });
      const nextgenResult = await renderEmailNextgen({
        render: { ...render },
        context: makeContext(),
        vm: emailVm,
        renderer,
      });
      assert.equal(nextgenResult.html.trim(), coreResult.html.trim());
    });
  });

  describe('nextgen host-callback egress', function () {
    const proxyPath = require.resolve('@formio/node-fetch-http-proxy');
    const adapterPath = require.resolve('../src/util/nextgenAdapter');
    let calls, origProxy, buildNextgenHostCallbacks;

    before(function () {
      calls = [];
      origProxy = require.cache[proxyPath];
      require.cache[proxyPath] = {
        id: proxyPath,
        filename: proxyPath,
        loaded: true,
        exports: async (url, options) => {
          calls.push({ url, options });
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: { get: () => 'application/json', forEach: () => {} },
            json: async () => ({}),
            text: async () => '[]',
          };
        },
      };
      delete require.cache[adapterPath];
      ({ buildNextgenHostCallbacks } = require('../src/util/nextgenAdapter'));
    });

    after(function () {
      if (origProxy) {
        require.cache[proxyPath] = origProxy;
      } else {
        delete require.cache[proxyPath];
      }
      delete require.cache[adapterPath];
      require('../src/util/nextgenAdapter');
    });

    it('routes request() through @formio/node-fetch-http-proxy, not bare fetch', async function () {
      const callbacks = buildNextgenHostCallbacks({ config: {}, token: null });
      await callbacks.request('https://ds.example.com/data', 'GET');
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://ds.example.com/data');
    });

    it('routes fetch() through @formio/node-fetch-http-proxy, not bare fetch', async function () {
      const callbacks = buildNextgenHostCallbacks({ config: {}, token: null });
      await callbacks.fetch('https://ds.example.com/list', { method: 'GET' });
      assert.equal(calls.length, 2);
      assert.equal(calls[1].url, 'https://ds.example.com/list');
    });
  });

  describe('nextgenAdapter.resolveFormReference', function () {
    const { resolveFormReference } = require('../src/util/nextgenAdapter');

    it('returns a 24-hex ObjectId unchanged, without a lookup', async function () {
      let looked = false;
      const store = {
        req: {},
        router: {
          formio: {
            cache: {
              loadFormByAlias: () => {
                looked = true;
              },
            },
          },
        },
      };
      const id = '60114dd32cab36ad94ac4f94';
      assert.equal(await resolveFormReference(store, id), id);
      assert.equal(looked, false);
    });

    it('resolves a form alias (name/path) to its _id via loadFormByAlias', async function () {
      const store = {
        req: {},
        router: {
          formio: {
            cache: {
              loadFormByAlias: async (req, alias) =>
                alias === 'user' ? { _id: '60114dd32cab36ad94ac4f94' } : null,
            },
          },
        },
      };
      assert.equal(await resolveFormReference(store, 'user'), '60114dd32cab36ad94ac4f94');
    });

    it('falls back to the original reference when the alias cannot be resolved', async function () {
      const store = {
        req: {},
        router: {
          formio: {
            cache: {
              loadFormByAlias: async () => {
                throw new Error('Resource not found');
              },
            },
          },
        },
      };
      assert.equal(await resolveFormReference(store, 'unknown'), 'unknown');
    });
  });
};
