module.exports = {
  title: "FIO-7302 Complex",
  name: "fio7302Complex",
  type: "form",
  display: "form",
  components: [
    {
      label: "Text Field",
      applyMaskOn: "change",
      tableView: true,
      key: "textField",
      type: "textfield",
      input: true
    },
    {
      label: "Container",
      tableView: false,
      key: "container",
      type: "container",
      input: true,
      components: [
        {
          label: "Text Field",
          applyMaskOn: "change",
          tableView: true,
          key: "textField",
          type: "textfield",
          input: true
        },
        {
          label: "Text Field 2",
          applyMaskOn: "change",
          tableView: true,
          key: "textField2",
          type: "textfield",
          input: true
        },
        {
          label: "Inner",
          tableView: false,
          key: "inner",
          type: "container",
          input: true,
          components: [
            {
              label: "Text Field",
              applyMaskOn: "change",
              tableView: true,
              key: "textField",
              type: "textfield",
              input: true
            },
            {
              label: "Text Field 2",
              applyMaskOn: "change",
              tableView: true,
              key: "textField2",
              type: "textfield",
              input: true
            }
          ]
        }
      ]
    },
    {
      type: "button",
      label: "Submit",
      key: "submit",
      disableOnInvalid: true,
      input: true,
      tableView: false
    }
  ],
  revisions: "current",
  submissionRevisions: "",
};
