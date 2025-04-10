module.exports = {
  _id: "677801142628e5aad5e7b1c3",
  title: "nestedEditGridForm",
  name: "nestedEditGridForm",
  path: "nestedEditGridForm",
  type: "form",
  access: [],
  submissionAccess: [],
  components: [
    {
      label: "Outer Edit Grid",
      rowDrafts: false,
      key: "outerEditGrid",
      type: "editgrid",
      displayAsTable: false,
      input: true,
      components: [
        {
          label: "Outer Text Field",
          key: "outerTextField",
          type: "textfield",
          input: true,
        },
        {
          label: "Inner Edit Grid",
          rowDrafts: false,
          key: "innerEditGrid",
          type: "editgrid",
          displayAsTable: false,
          input: true,
          components: [
            {
              label: "Inner Text Field",
              key: "innerTextField",
              type: "textfield",
              input: true,
            },
          ],
        },
      ],
    },
  ],
};
