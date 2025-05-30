module.exports = {
  formJson: {
    _id: "683828be5cc1c96260b8d2a9",
    title: "Select Boxes",
    name: "selectBoxes",
    path: "selectboxes",
    type: "form",
    display: "form",
    tags: [],
    access: [],
    owner: "683828c75cc1c96260b8d356",
    components: [
      {
        label: "13 - Select Boxes URL",
        optionsLabelPosition: "right",
        inline: true,
        tableView: true,
        dataSrc: "url",
        defaultValue: {},
        values: [
          {
            label: "",
            value: "",
            shortcut: ""
          }
        ],
        valueProperty: "abbreviation",
        validateWhenHidden: false,
        key: "selectBoxes1",
        logic: [],
        type: "selectboxes",
        data: {
          url: "https://gis.com/mshafrir/2646763/raw/states_titlecase.json",
          headers: [
            {
              key: "",
              value: ""
            }
          ]
        },
        template: "<span>{{ item.name }}</span>",
        input: true,
        inputType: "checkbox"
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
    pdfComponents: [],
    settings: {},
    properties: {},
    machineName: "dsdd:selectBoxes",
    project: "6835b7eb902ec6104ee76d8c",
    controller: "",
    revisions: "",
    submissionRevisions: "",
    _vid: 0,
    esign: {},
    created: "2025-05-29T09:28:30.846Z",
    modified: "2025-05-29T09:28:39.311Z"
  },
  submissionJson: {
    data: {
      selectBoxes1: { AK: true, AL: true }
    },
  }
};
