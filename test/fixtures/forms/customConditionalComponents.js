module.exports = {
    components: [
      {
        title: "Page 1",
        label: "Page 1",
        type: "panel",
        key: "page1",
        components: [
          {
            label: "Stage Data Source",
            persistent: "client-only",
            trigger: {
              init: true,
              server: true
            },
            dataSrc: "url",
            fetch: {
              url: "https://random.com",
              method: "get",
              headers: [
                {
                  key: "",
                  value: ""
                }
              ],
              mapFunction: "",
              forwardHeaders: false,
              authenticate: false
            },
            allowCaching: true,
            key: "stageData",
            type: "datasource",
            indexeddb: {},
            input: true,
            tableView: false
          },
          {
            key: "fieldSet3",
            type: "fieldset",
            label: "Field Set",
            input: false,
            tableView: false,
            components: [
              {
                label: "Show/hide text area",
                tableView: false,
                defaultValue: false,
                key: "aaPocCheckboxStage",
                type: "checkbox",
                input: true
              },
              {
                label: "Text Area Outside",
                applyMaskOn: "change",
                autoExpand: false,
                tableView: true,
                customDefaultValue: "value = \"error\";",
                validateWhenHidden: false,
                key: "textAreaOutside",
                customConditional: "show = true;\nif (data && data.stageData) {\n  show = false;\n}",
                type: "textarea",
                input: true
              },
              {
                key: "fieldSet",
                customConditional: "show = true;\nif (data && data.stageData) {\n  show = false;\n}",
                type: "fieldset",
                label: "Field Set",
                input: false,
                tableView: false,
                components: [
                  {
                    label: "Text Area Inside",
                    applyMaskOn: "change",
                    autoExpand: false,
                    tableView: true,
                    customDefaultValue: "value = \"error\";",
                    validateWhenHidden: false,
                    key: "textAreaInside",
                    customConditional: "show = true;\nif (data && data.stageData) {\n  show = false;\n}",
                    type: "textarea",
                    input: true
                  }
                ]
              }
            ]
          }
        ],
        input: false,
        tableView: false
      },
      {
        title: "Page 2",
        label: "Page 2",
        type: "panel",
        key: "page2",
        input: false,
        tableView: false,
        components: []
      }
    ],
    submission: {
      aaPocCheckboxStage: false
    }
  };