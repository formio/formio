module.exports = {
  type: "form",
  components: [
    {
      label: "Upload",
      tableView: false,
      storage: "base64",
      fileNameTemplate: "myFilePrefix-{{fileName}}",
      webcam: false,
      fileTypes: [
        {
          label: "",
          value: ""
        }
      ],
      multiple: true,
      key: "file",
      type: "file",
      input: true
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
  title: "FIO-2834",
  display: "form",
  name: "fio2834",
};
