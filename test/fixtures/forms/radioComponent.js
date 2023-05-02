module.exports = {
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
};
