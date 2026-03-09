module.exports = {
    triggerOnServer: {
        components: [
            {
              label: 'Data Source',
              persistent: 'client-only',
              trigger: {
                server: false,
                init: false
              },
              dataSrc: 'url',
              fetch: {
                url: 'https://random.com',
                method: 'get',
                headers: [
                  {
                    key: '',
                    value: '',
                  },
                ],
                mapFunction: '',
                forwardHeaders: false,
                authenticate: false,
              },
              allowCaching: true,
              key: 'dataSource',
              type: 'datasource',
              indexeddb: {},
              input: true,
              tableView: false,
            },
            {
              label: 'Text Area',
              applyMaskOn: 'change',
              autoExpand: false,
              tableView: true,
              customDefaultValue: 'value = "should be displayed";',
              validateWhenHidden: false,
              key: 'textArea',
              customConditional:
                'show = true;\nif (data && data.dataSource) {\n  show = false;\n}',
              type: 'textarea',
              input: true,
            }
          ],
          submission: {}
    },
    notTriggerOnServer: {
        components: [
            {
              label: 'Data Source',
              persistent: 'client-only',
              trigger: {
                server: true,
                init: false
              },
              dataSrc: 'url',
              fetch: {
                url:'https://random.com',
                method: 'get',
                headers: [
                  {
                    key: '',
                    value: '',
                  },
                ],
                mapFunction: '',
                forwardHeaders: false,
                authenticate: false,
              },
              allowCaching: true,
              key: 'dataSource',
              type: 'datasource',
              indexeddb: {},
              input: true,
              tableView: false,
            },
            {
              label: 'Text Area',
              applyMaskOn: 'change',
              autoExpand: false,
              tableView: true,
              customDefaultValue: 'value = "should not be displayed";',
              validateWhenHidden: false,
              key: 'textArea',
              customConditional:
                'show = true;\nif (data && data.dataSource) {\n  show = false;\n}',
              type: 'textarea',
              input: true,
            }
          ],
          submission: {}
    },
    nonePersistent: {
        components: [
            {
              label: 'Data Source',
              persistent: false,
              trigger: {
                init: false,
                server: false,
              },
              dataSrc: 'url',
              fetch: {
                url: 'https://random.com',
                method: 'get',
                headers: [
                  {
                    key: '',
                    value: '',
                  },
                ],
                mapFunction: '',
                forwardHeaders: false,
                authenticate: false,
              },
              allowCaching: true,
              key: 'dataSource',
              type: 'datasource',
              indexeddb: {},
              input: true,
              tableView: false,
            },
            {
              label: 'Text Field',
              applyMaskOn: 'change',
              tableView: true,
              calculateValue: 'if (data) {\n  value=data.dataSource[0].id;\n}\nelse value = 1',
              validateWhenHidden: false,
              key: 'textField',
              customConditional: 'show = true;\nif(data && data.dataSource){\n  show = true;\n}',
              type: 'textfield',
              input: true,
            }
        ],
        submission: {
        dataSource: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
        ],
        textField: 'Alice'
        }
    },
    persistent: {
        components: [
        {
            label: 'Data Source',
            trigger: {
            init: false,
            server: false,
            },
            dataSrc: 'url',
            fetch: {
            url: 'https://random.com',
            method: 'get',
            headers: [
                {
                key: '',
                value: '',
                },
            ],
            mapFunction: '',
            forwardHeaders: false,
            authenticate: false,
            },
            allowCaching: true,
            key: 'dataSource',
            type: 'datasource',
            indexeddb: {},
            input: true,
            tableView: false,
        },
        {
            label: 'Text Field',
            applyMaskOn: 'change',
            tableView: true,
            calculateValue: 'if (data) {\n  value=data.dataSource[0].id;\n}\nelse value = 1',
            validateWhenHidden: false,
            key: 'textField',
            customConditional: 'show = true;\nif(data && data.dataSource){\n  show = true;\n}',
            type: 'textfield',
            input: true,
        }
        ],
        submission: {
        dataSource: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
        ],
        textField: 'Alice'
        }
    },
    clientOnly: {
        components: [
        {
            label: 'Data Source',
            persistent: 'client-only',
            trigger: {
            init: false,
            server: false,
            },
            dataSrc: 'url',
            fetch: {
            url: 'https://random.com',
            method: 'get',
            headers: [
                {
                key: '',
                value: '',
                },
            ],
            mapFunction: '',
            forwardHeaders: false,
            authenticate: false,
            },
            allowCaching: true,
            key: 'dataSource',
            type: 'datasource',
            indexeddb: {},
            input: true,
            tableView: false,
        },
        {
            label: 'Text Field',
            applyMaskOn: 'change',
            tableView: true,
            calculateValue: 'if (data) {\n  value=data.dataSource[0].id;\n}\nelse value = 1',
            validateWhenHidden: false,
            key: 'textField',
            customConditional: 'show = true;\nif(data && data.dataSource){\n  show = true;\n}',
            type: 'textfield',
            input: true,
        }
        ],
        submission: {
        textField: 'Alice'
        }
    },






};
