
module.exports = {
  components: [
    {
      label: "Text Field",
      applyMaskOn: "change",
      tableView: true,
      validateWhenHidden: false,
      key: "textField",
      type: "textfield",
      input: true
    },
    {
      label: "Signature",
      tableView: true,
      validateWhenHidden: false,
      key: "signature",
      conditional: {
        show: false,
        conjunction: "all",
        conditions: [
          {
            component: "textField",
            operator: "isEmpty"
          }
        ]
      },
      type: "signature",
      input: true
    }

  ],
  submission: {
    signature: "",
    textField: "1"
  }
}
