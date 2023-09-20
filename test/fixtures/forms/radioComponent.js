module.exports = {
  form1: {
    title: "Test radio",
    name: "testRadio",
    path: "testradio",
    type: "form",
    display: "form",
    owner: "62e1332c98da5d30a9ea6510",
    components: [
      {
        label: "Radio1",
        optionsLabelPosition: "right",
        inline: false,
        tableView: true,
        values: [
          {
            label: "Yes",
            value: "true",
            shortcut: "",
          },
          {
            label: "No",
            value: "false",
            shortcut: "",
          },
        ],
        key: "radio",
        type: "radio",
        input: true,
      },
      {
        type: "button",
        label: "Submit",
        key: "submit",
        disableOnInvalid: true,
        input: true,
        tableView: false,
      },
    ],
  },
  form2: {
    title: "FIO-7161",
    name: "fio7161",
    path: "fio7161",
    type: "form",
    display: "form",
    owner: "62e1332c98da5d30a9ea6510",
    components: [
      {
        label: "Select",
        widget: "choicesjs",
        tableView: true,
        multiple: true,
        data: {
          values: [
            {
              label: "select1",
              value: "1",
            },
            {
              label: "select2",
              value: "2",
            }
          ]
        },
        key: "select",
        type: "select",
        input: true,
      },
      {
        label: "Radio",
        optionsLabelPosition: "right",
        inline: false,
        tableView: true,
        values: [
          {
            label: "one",
            value: "1",
            shortcut: "",
          },
          {
            label: "two",
            value: "2",
            shortcut: "",
          }
        ],
        key: "radio",
        conditional: {
          show: true,
          conjunction: "all",
          conditions: [
            {
              component: "select",
              operator: "isEqual",
              value: "1"
            }
          ]
        },
        type: "radio",
        input: true,
      },
      {
        type: "button",
        label: "Submit",
        key: "submit",
        disableOnInvalid: true,
        input: true,
        tableView: false,
      },
    ],
  }
};
