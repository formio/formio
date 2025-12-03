'use strict';
module.exports = {
  formJson: {
    title: 'Select',
    name: 'select',
    path: 'select',
    type: 'form',
    display: 'wizard',
    components: [
      {
        title: 'ChoicesJS + Multiple',
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
        label: 'Page 1',
        components: [
          {
            label: 'Fill in the field:',
            applyMaskOn: 'change',
            tableView: true,
            validateWhenHidden: false,
            key: 'fillInTheField',
            type: 'textfield',
            input: true,
          },
          {
            label: '1 - Select Values - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            data: {
              values: [
                {
                  label: 'One',
                  value: '1',
                },
                {
                  label: 'Two',
                  value: '2',
                },
                {
                  label: 'Three',
                  value: '3',
                },
                {
                  label: 'Four',
                  value: '4',
                },
              ],
            },
            validateWhenHidden: false,
            key: 'selectValues',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = 1',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '2 - Select Values Multiple - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            multiple: true,
            data: {
              values: [
                {
                  label: 'One',
                  value: '1',
                },
                {
                  label: 'Two',
                  value: '2',
                },
                {
                  label: 'Three',
                  value: '3',
                },
                {
                  label: 'Four',
                  value: '4',
                },
              ],
            },
            validateWhenHidden: false,
            key: 'selectValues1',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = [\n            1,\n            2\n        ]',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '3 - Select Resource - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            dataSrc: 'resource',
            data: {
              resource: '688cbd7bb2f11bf690e0cce5',
            },
            valueProperty: 'data.valueProperty',
            template: '<span>{{ item.data.label }}</span>',
            validate: {
              select: false,
            },
            validateWhenHidden: false,
            key: 'selectResource',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "ap"',
                  },
                ],
              },
            ],
            searchField: 'data.valueProperty__regex',
            noRefreshOnScroll: false,
            addResource: false,
            reference: false,
            type: 'select',
            input: true,
          },
          {
            label: '4 - Select Resource Multiple  - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            multiple: true,
            dataSrc: 'resource',
            data: {
              resource: '688cbd7bb2f11bf690e0cce5',
            },
            valueProperty: 'data.valueProperty',
            template: '<span>{{ item.data.label }}</span>',
            validate: {
              select: false,
            },
            validateWhenHidden: false,
            key: 'selectResource1',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = [\n            "ap",\n            "ba"\n        ]',
                  },
                ],
              },
            ],
            searchField: 'data.valueProperty__regex',
            noRefreshOnScroll: false,
            addResource: false,
            reference: false,
            type: 'select',
            input: true,
          },
          {
            label: '5 - Select URL - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            dataSrc: 'url',
            data: {
              url: 'https://gists.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
              headers: [
                {
                  key: '',
                  value: '',
                },
              ],
            },
            valueProperty: 'abbreviation',
            template: '<span>{{ item.name }}</span>',
            validateWhenHidden: false,
            key: 'selectUrl',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "AL"',
                  },
                ],
              },
            ],
            disableLimit: false,
            noRefreshOnScroll: false,
            type: 'select',
            input: true,
          },
          {
            label: '6 - Select URL Multiple  - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            multiple: true,
            dataSrc: 'url',
            data: {
              url: 'https://gists.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
              headers: [
                {
                  key: '',
                  value: '',
                },
              ],
            },
            valueProperty: 'abbreviation',
            template: '<span>{{ item.name }}</span>',
            unique: true,
            validateWhenHidden: false,
            key: 'selectUrl1',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value:
                      'value = [\n            "AL",\n            "AK",\n            "AS"\n        ]',
                  },
                ],
              },
            ],
            type: 'select',
            disableLimit: false,
            noRefreshOnScroll: false,
            input: true,
          },
          {
            label: '7 - Select Raw JSON - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            dataSrc: 'json',
            data: {
              json: [
                {
                  name: 'John',
                  email: 'john.doe@test.com',
                },
                {
                  name: 'Jane',
                  email: 'jane.doe@test.com',
                },
              ],
            },
            valueProperty: 'name',
            template: '<span>{{ item.email }}</span>',
            validateWhenHidden: false,
            key: 'selectRawJson',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "John"',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '8 - Select Raw JSON Multiple  - ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            multiple: true,
            dataSrc: 'json',
            data: {
              json: [
                {
                  name: 'John',
                  email: 'john.doe@test.com',
                },
                {
                  name: 'Jane',
                  email: 'jane.doe@test.com',
                },
              ],
            },
            valueProperty: 'name',
            template: '<span>{{ item.email }}</span>',
            validateWhenHidden: false,
            key: 'selectRawJson1',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = [\n            "John",\n            "Jane"\n        ]',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
        ],
        input: false,
        tableView: false,
      },
      {
        title: 'HTML5',
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
        type: 'panel',
        label: 'Page 1',
        components: [
          {
            label: '9 - Select Values - HTML 5',
            widget: 'html5',
            tableView: true,
            data: {
              values: [
                {
                  label: 'One',
                  value: '1',
                },
                {
                  label: 'Two',
                  value: '2',
                },
                {
                  label: 'Three',
                  value: '3',
                },
                {
                  label: 'Four',
                  value: '4',
                },
              ],
            },
            validateWhenHidden: false,
            key: 'selectValues2',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = 1',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '10 - Select Resource - HTML 5',
            widget: 'html5',
            tableView: true,
            dataSrc: 'resource',
            data: {
              resource: '688cbd7bb2f11bf690e0cce5',
            },
            valueProperty: 'data.valueProperty',
            template: '<span>{{ item.data.label }}</span>',
            validate: {
              select: false,
            },
            validateWhenHidden: false,
            key: 'selectResource2',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: "value = 'ap'",
                  },
                ],
              },
            ],
            searchField: 'data.valueProperty__regex',
            noRefreshOnScroll: false,
            addResource: false,
            reference: false,
            type: 'select',
            input: true,
          },
          {
            label: '11 - Select URL - HTML 5',
            widget: 'html5',
            tableView: true,
            dataSrc: 'url',
            data: {
              url: 'https://gists.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
              headers: [
                {
                  key: '',
                  value: '',
                },
              ],
            },
            valueProperty: 'abbreviation',
            template: '<span>{{ item.name }}</span>',
            validateWhenHidden: false,
            key: 'selectUrl2',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "AL"',
                  },
                ],
              },
            ],
            disableLimit: false,
            noRefreshOnScroll: false,
            type: 'select',
            input: true,
          },
          {
            label: '12 - Select Raw JSON - HTML 5',
            widget: 'html5',
            tableView: true,
            dataSrc: 'json',
            data: {
              json: [
                {
                  name: 'John',
                  email: 'john.doe@test.com',
                },
                {
                  name: 'Jane',
                  email: 'jane.doe@test.com',
                },
              ],
            },
            valueProperty: 'name',
            template: '<span>{{ item.email }}</span>',
            validateWhenHidden: false,
            key: 'selectRawJson2',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "John"',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
        ],
        input: false,
        tableView: false,
      },
      {
        title: 'Storage Type',
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
        label: 'Page 1',
        components: [
          {
            label: '13 - Select Values - ChoicesJS - String',
            widget: 'choicesjs',
            tableView: true,
            data: {
              values: [
                {
                  label: 'One',
                  value: '1',
                },
                {
                  label: 'Two',
                  value: '2',
                },
                {
                  label: 'Three',
                  value: '3',
                },
                {
                  label: 'Four',
                  value: '4',
                },
              ],
            },
            dataType: 'string',
            validateWhenHidden: false,
            key: 'selectValues3',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "1"',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '14 - Select Values - HTML 5 - String',
            widget: 'html5',
            tableView: true,
            data: {
              values: [
                {
                  label: 'One',
                  value: '1',
                },
                {
                  label: 'Two',
                  value: '2',
                },
                {
                  label: 'Three',
                  value: '3',
                },
                {
                  label: 'Four',
                  value: '4',
                },
              ],
            },
            dataType: 'string',
            validateWhenHidden: false,
            key: 'selectValues5',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "1"',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '15 - Select Values Multiple - ChoicesJS - Number',
            widget: 'choicesjs',
            tableView: true,
            multiple: true,
            data: {
              values: [
                {
                  label: 'One',
                  value: '1',
                },
                {
                  label: 'Two',
                  value: '2',
                },
                {
                  label: 'Three',
                  value: '3',
                },
                {
                  label: 'Four',
                  value: '4',
                },
              ],
            },
            dataType: 'number',
            validateWhenHidden: false,
            key: 'selectValues4',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = [\n            1,\n            2,\n            3\n        ]',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '16 - Select Resource - HTML 5 - Autotype',
            widget: 'html5',
            tableView: true,
            dataSrc: 'resource',
            data: {
              resource: '688cbd7bb2f11bf690e0cce5',
            },
            valueProperty: 'data.valueProperty',
            dataType: 'auto',
            template: '<span>{{ item.data.label }}</span>',
            validate: {
              select: false,
            },
            validateWhenHidden: false,
            key: 'selectResource3',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = "ap"',
                  },
                ],
              },
            ],
            searchField: 'data.valueProperty__regex',
            noRefreshOnScroll: false,
            addResource: false,
            reference: false,
            type: 'select',
            input: true,
          },
          {
            label: '17 - Select URL - ChoicesJS - Object',
            widget: 'choicesjs',
            tableView: true,
            multiple: true,
            dataSrc: 'url',
            data: {
              url: 'https://gists.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
              headers: [
                {
                  key: '',
                  value: '',
                },
              ],
            },
            dataType: 'object',
            valueProperty: 'abbreviation',
            template: '<span>{{ item.name }}</span>',
            unique: true,
            validateWhenHidden: false,
            key: 'selectUrl3',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value:
                      'value = [\n            "AL",\n            "AK",\n            "AS"\n        ]',
                  },
                ],
              },
            ],
            type: 'select',
            disableLimit: false,
            noRefreshOnScroll: false,
            input: true,
          },
          {
            label: '18 - Select Raw JSON - ChoicesJS - Number',
            widget: 'choicesjs',
            tableView: true,
            dataSrc: 'json',
            data: {
              json: [
                {
                  name: 'John',
                  age: 20,
                },
                {
                  name: 'Jane',
                  age: 25,
                },
              ],
            },
            valueProperty: 'age',
            dataType: 'number',
            template: '<span>{{ item.name }}</span>',
            validateWhenHidden: false,
            key: 'selectRawJson3',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value: 'value = 20',
                  },
                ],
              },
            ],
            type: 'select',
            input: true,
          },
          {
            label: '19 - Select - Entire Object ChoicesJS',
            widget: 'choicesjs',
            tableView: true,
            dataSrc: 'resource',
            data: {
              resource: '688cbd7bb2f11bf690e0cce5',
            },
            valueProperty: 'data',
            template: '<span>{{ item.data }}</span>',
            validate: {
              select: false,
            },
            validateWhenHidden: false,
            key: 'selectEntireObjectChoicesJs',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value:
                      'value = {\n            "label": "Apple",\n            "valueProperty": "ap"\n        }',
                  },
                ],
              },
            ],
            searchField: 'data__regex',
            noRefreshOnScroll: false,
            addResource: false,
            reference: false,
            type: 'select',
            input: true,
          },
          {
            label: '20 - Select - Entire Object ChoicesJS Multiple',
            widget: 'choicesjs',
            tableView: true,
            multiple: true,
            dataSrc: 'resource',
            data: {
              resource: '688cbd7bb2f11bf690e0cce5',
            },
            valueProperty: 'data',
            template: '<span>{{ item.data }}</span>',
            validate: {
              select: false,
            },
            validateWhenHidden: false,
            key: 'selectEntireObjectChoicesJs1',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value:
                      'value = [\n            {\n                "label": "Apple",\n                "valueProperty": "ap"\n            },\n            {\n                "label": "Banana",\n                "valueProperty": "ba"\n            }\n        ]',
                  },
                ],
              },
            ],
            searchField: 'data__regex',
            noRefreshOnScroll: false,
            addResource: false,
            reference: false,
            type: 'select',
            input: true,
          },
          {
            label: '21 - Select - Entire Object HTML 5',
            widget: 'html5',
            tableView: true,
            dataSrc: 'resource',
            data: {
              resource: '688cbd7bb2f11bf690e0cce5',
            },
            valueProperty: 'data',
            template: '<span>{{ item.data }}</span>',
            validate: {
              select: false,
            },
            validateWhenHidden: false,
            key: 'selectEntireObjectChoicesJs2',
            logic: [
              {
                name: '1',
                trigger: {
                  type: 'simple',
                  simple: {
                    show: true,
                    conjunction: 'all',
                    conditions: [
                      {
                        component: 'fillInTheField',
                        operator: 'isEqual',
                        value: 'Unique',
                      },
                    ],
                  },
                },
                actions: [
                  {
                    name: '1',
                    type: 'value',
                    value:
                      'value = {\n            "label": "Banana",\n            "valueProperty": "ba"\n        }',
                  },
                ],
              },
            ],
            searchField: 'data__regex',
            noRefreshOnScroll: false,
            addResource: false,
            reference: false,
            type: 'select',
            input: true,
          },
        ],
        input: false,
        tableView: false,
      },
      {
        title: 'Page 4',
        label: 'Page 4',
        type: 'panel',
        key: 'page4',
        components: [
          {
            label: 'Container',
            tableView: false,
            validateWhenHidden: false,
            key: 'container',
            type: 'container',
            input: true,
            components: [
              {
                label: 'Select - URL',
                widget: 'choicesjs',
                tableView: true,
                dataSrc: 'url',
                data: {
                  url: 'https://cdn.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
                  headers: [
                    {
                      key: '',
                      value: '',
                    },
                  ],
                },
                template: '<span>{{ item.name }}</span>',
                key: 'selectUrl',
                type: 'select',
                disableLimit: false,
                input: true,
              },
              {
                label: 'Select - URL mult',
                widget: 'choicesjs',
                tableView: true,
                multiple: true,
                dataSrc: 'url',
                data: {
                  url: 'https://cdn.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
                  headers: [
                    {
                      key: '',
                      value: '',
                    },
                  ],
                },
                template: '<span>{{ item.name }}</span>',
                validateWhenHidden: false,
                key: 'selectUrlmult',
                disableLimit: false,
                noRefreshOnScroll: false,
                type: 'select',
                input: true,
              },
              {
                label: 'Select - Raw JSON',
                widget: 'choicesjs',
                tableView: true,
                dataSrc: 'json',
                data: {
                  json: [
                    {
                      label: 'Apples',
                      value: 'apples',
                    },
                    {
                      label: 'Banana',
                      value: 'banana',
                    },
                    {
                      label: 'Orange',
                      value: 'orange',
                    },
                    {
                      label: 'Peach',
                      value: 'peach',
                    },
                    {
                      label: 'Pineapple',
                      value: 'pineapple',
                    },
                    {
                      label: 'Mango',
                      value: 'mango',
                    },
                    {
                      label: 'Pear',
                      value: 'pear',
                    },
                    {
                      label: 'Tangerine',
                      value: 'tangerine',
                    },
                    {
                      label: 'Avocado',
                      value: 'avocado',
                    },
                    {
                      label: 'Watermelon',
                      value: 'watermelon',
                    },
                    {
                      label: 'Berries',
                      value: 'berries',
                    },
                    {
                      label: 'Cherries',
                      value: 'cherries',
                    },
                    {
                      label: 'Melon',
                      value: 'melon',
                    },
                    {
                      label: 'Lemon',
                      value: 'lemon',
                    },
                    {
                      label: 'Strawberry',
                      value: 'strawberry',
                    },
                    {
                      label: 'Grapes',
                      value: 'grapes',
                    },
                    {
                      label: 'Coconut',
                      value: 'coconut',
                    },
                    {
                      label: 'Fig',
                      value: 'fig',
                    },
                    {
                      label: 'Plum',
                      value: 'plum',
                    },
                    {
                      label: 'Kiwifruit',
                      value: 'kiwifruit',
                    },
                  ],
                },
                validateWhenHidden: false,
                key: 'selectRawJson',
                type: 'select',
                input: true,
              },
              {
                label: 'Select - Raw JSON mult',
                widget: 'choicesjs',
                tableView: true,
                multiple: true,
                dataSrc: 'json',
                data: {
                  json: [
                    {
                      label: 'Apples',
                      value: 'apples',
                    },
                    {
                      label: 'Banana',
                      value: 'banana',
                    },
                    {
                      label: 'Orange',
                      value: 'orange',
                    },
                    {
                      label: 'Peach',
                      value: 'peach',
                    },
                    {
                      label: 'Pineapple',
                      value: 'pineapple',
                    },
                    {
                      label: 'Mango',
                      value: 'mango',
                    },
                    {
                      label: 'Pear',
                      value: 'pear',
                    },
                    {
                      label: 'Tangerine',
                      value: 'tangerine',
                    },
                    {
                      label: 'Avocado',
                      value: 'avocado',
                    },
                    {
                      label: 'Watermelon',
                      value: 'watermelon',
                    },
                    {
                      label: 'Berries',
                      value: 'berries',
                    },
                    {
                      label: 'Cherries',
                      value: 'cherries',
                    },
                    {
                      label: 'Melon',
                      value: 'melon',
                    },
                    {
                      label: 'Lemon',
                      value: 'lemon',
                    },
                    {
                      label: 'Strawberry',
                      value: 'strawberry',
                    },
                    {
                      label: 'Grapes',
                      value: 'grapes',
                    },
                    {
                      label: 'Coconut',
                      value: 'coconut',
                    },
                    {
                      label: 'Fig',
                      value: 'fig',
                    },
                    {
                      label: 'Plum',
                      value: 'plum',
                    },
                    {
                      label: 'Kiwifruit',
                      value: 'kiwifruit',
                    },
                  ],
                },
                validateWhenHidden: false,
                key: 'selectRawJsonMult',
                type: 'select',
                input: true,
              },
              {
                label: 'Select - Values',
                widget: 'choicesjs',
                tableView: true,
                data: {
                  values: [
                    {
                      label: 'Roberts, Bogisich and King',
                      value: 'robertsBogisichAndKing',
                    },
                    {
                      label: 'Block, Hermiston and Mayer',
                      value: 'blockHermistonAndMayer',
                    },
                    {
                      label: 'Corkery - Schinner',
                      value: 'corkerySchinner',
                    },
                    {
                      label: 'Hansen - Schulist',
                      value: 'hansenSchulist',
                    },
                  ],
                },
                key: 'select1',
                type: 'select',
                input: true,
              },
              {
                label: 'Select - Values Mult',
                widget: 'choicesjs',
                tableView: true,
                multiple: true,
                data: {
                  values: [
                    {
                      label: 'Roberts, Bogisich and King',
                      value: 'robertsBogisichAndKing',
                    },
                    {
                      label: 'Block, Hermiston and Mayer',
                      value: 'blockHermistonAndMayer',
                    },
                    {
                      label: 'Corkery - Schinner',
                      value: 'corkerySchinner',
                    },
                    {
                      label: 'Hansen - Schulist',
                      value: 'hansenSchulist',
                    },
                  ],
                },
                validateWhenHidden: false,
                key: 'selectMult',
                type: 'select',
                input: true,
              },
              {
                label: 'Radio',
                optionsLabelPosition: 'right',
                inline: false,
                tableView: false,
                values: [
                  {
                    label: 'Chief Functionality Technician',
                    value: 'chiefFunctionalityTechnician',
                    shortcut: '',
                  },
                  {
                    label: 'Legacy Web Engineer',
                    value: 'legacyWebEngineer',
                    shortcut: '',
                  },
                  {
                    label: 'District Tactics Specialist',
                    value: 'districtTacticsSpecialist',
                    shortcut: '',
                  },
                  {
                    label: 'North Dakota',
                    value: 'northDakota',
                    shortcut: '',
                  },
                ],
                key: 'radio1',
                type: 'radio',
                input: true,
              },
            ],
          },
        ],
        input: false,
        tableView: false,
      },
    ],
  },
  submissionJson: {
    data: {
      fillInTheField: 'test',
      selectValues: 3,
      selectValues1: [
        1,
        2,
      ],
      selectResource: 'ch',
      selectResource1: [
        'ap',
        'ba',
      ],
      selectUrl: 'AK',
      selectUrl1: [
        'AZ',
        'CO',
      ],
      selectRawJson: 'Jane',
      selectRawJson1: [
        'John',
        'Jane',
      ],
      selectValues2: 2,
      selectResource2: 'ch',
      selectUrl2: 'GU',
      selectRawJson2: 'John',
      selectValues3: '2',
      selectValues5: '1',
      selectValues4: [
        3,
        4,
      ],
      selectResource3: 'st',
      selectUrl3: [
        'AK',
        'CO',
      ],
      selectRawJson3: 25,
      selectEntireObjectChoicesJs: {
        label: 'Strawberry',
        valueProperty: 'st',
      },
      selectEntireObjectChoicesJs1: [
        {
          label: 'Cherry',
          valueProperty: 'ch',
        },
        {
          label: 'Apple',
          valueProperty: 'ap',
        },
      ],
      selectEntireObjectChoicesJs2: {
        label: 'Banana',
        valueProperty: 'ba',
      },
      container: {
        selectUrl: {
          name: 'Alabama',
          abbreviation: 'AL',
        },
        selectUrlmult: [
          {
            name: 'Arizona',
            abbreviation: 'AZ',
          },
          {
            name: 'Indiana',
            abbreviation: 'IN',
          },
        ],
        selectRawJson: {
          label: 'Banana',
          value: 'banana',
        },
        selectRawJsonMult: [
          {
            label: 'Mango',
            value: 'mango',
          },
          {
            label: 'Orange',
            value: 'orange',
          },
        ],
        select1: 'hansenSchulist',
        selectMult: [
          'blockHermistonAndMayer',
          'corkerySchinner',
        ],
        radio1: 'legacyWebEngineer',
      },
    },
    metadata: {
      selectData: {
        selectValues: {
          label: 'Three',
        },
        selectValues1: {
          1: {
            label: 'One',
          },
          2: {
            label: 'Two',
          },
        },
        selectResource: {
          data: {
            label: 'Cherry',
          },
        },
        selectResource1: {
          ap: {
            data: {
              label: 'Apple',
            },
          },
          ba: {
            data: {
              label: 'Banana',
            },
          },
        },
        selectUrl: {
          name: 'Alaska',
        },
        selectUrl1: {
          AZ: {
            name: 'Arizona',
          },
          CO: {
            name: 'Colorado',
          },
        },
        selectRawJson: {
          email: 'jane.doe@test.com',
        },
        selectRawJson1: {
          John: {
            email: 'john.doe@test.com',
          },
          Jane: {
            email: 'jane.doe@test.com',
          },
        },
        selectValues2: {
          label: 'Two',
        },
        selectResource2: {
          data: {
            label: 'Cherry',
          },
        },
        selectUrl2: {
          name: 'Guam',
        },
        selectRawJson2: {
          email: 'john.doe@test.com',
        },
        selectValues3: {
          label: 'Two',
        },
        selectValues5: {
          label: 'One',
        },
        selectValues4: {
          3: {
            label: 'Three',
          },
          4: {
            label: 'Four',
          },
        },
        selectResource3: {
          data: {
            label: 'Strawberry',
          },
        },
        selectUrl3: {
          AK: {
            name: 'Alaska',
          },
          CO: {
            name: 'Colorado',
          },
        },
        selectRawJson3: {
          name: 'Jane',
        },
        container: {
          select1: {
            label: 'Hansen - Schulist',
          },
          selectMult: {
            blockHermistonAndMayer: {
              label: 'Block, Hermiston and Mayer',
            },
            corkerySchinner: {
              label: 'Corkery - Schinner',
            },
          },
        },
      },
    },
    state: 'submitted',
  },
};
