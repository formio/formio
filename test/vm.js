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
        'utils.getComponentKey({ key: "textField", type: "textfield", input: true})'
      );
      assert.equal(result, 'textField');
    });

    it('should evaluate code with nunjucks', async () => {
      const result = await isolateVM.evaluate(
        'nunjucks.renderString("Hello {{ name }}", { name: "World" })'
      );
      assert.equal(result, 'Hello World');
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
        { components: [dataGrid] },
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
        }
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
      const root = new RootShim({ components }, { data: { dataGrid: [{ textField: 'hello' }] } });
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
      const root = new RootShim({ components }, { data: { dataGrid: [{ textField: 'hello' }] } });
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
};
