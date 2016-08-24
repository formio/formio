module.exports = {
  components: [
    {
      "lockKey": true,
      "key": "apparatusFieldset",
      "conditional": {
        "eq": "",
        "when": null,
        "show": ""
      },
      "type": "fieldset",
      "components": [
        {
          "conditional": {
            "eq": "",
            "when": null,
            "show": false
          },
          "type": "checkbox",
          "validate": {
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": false,
          "key": "useApparatus",
          "label": "Use Apparatus",
          "hideLabel": true,
          "tableView": true,
          "inputType": "checkbox",
          "input": true
        },
        {
          "conditional": {
            "eq": "true",
            "when": "useApparatus",
            "show": "true"
          },
          "type": "radio",
          "validate": {
            "customPrivate": false,
            "custom": "",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": "0",
          "values": [
            {
              "label": "No",
              "value": "0"
            },
            {
              "label": "Yes",
              "value": "1"
            }
          ],
          "key": "displayNonVolunteer",
          "label": "Display Non-Volunteer",
          "inputType": "radio",
          "tableView": true,
          "input": true
        },
        {
          "bordered": true,
          "addAnother": "Add Apparatus",
          "input": true,
          "tree": true,
          "components": [
            {
              "hideLabel": true,
              "input": false,
              "tableView": true,
              "legend": "",
              "components": [
                {
                  "searchField": "data.apparatusId",
                  "conditional": {
                    "eq": "",
                    "when": null,
                    "show": ""
                  },
                  "type": "select",
                  "validate": {
                    "required": true
                  },
                  "persistent": true,
                  "unique": false,
                  "protected": false,
                  "multiple": false,
                  "template": "<span>{{ item.value }}</span>",
                  "authenticate": false,
                  "filter": "",
                  "refreshOn": "",
                  "defaultValue": "",
                  "valueProperty": "data.apparatusId",
                  "dataSrc": "values",
                  "data": {
                    "project": "57ae043a78c4691a181d23f0",
                    "resource": "573a5ebe6bea7f0100283442",
                    "url": "",
                    "json": "",
                    "values": [
                      {
                        "label": "One",
                        "value": "one"
                      },
                      {
                        "value": "two",
                        "label": "Two"
                      },
                      {
                        "value": "three",
                        "label": "Three"
                      }
                    ]
                  },
                  "placeholder": "Select the apparatus",
                  "key": "apparatusId",
                  "label": "Apparatus ID",
                  "tableView": true,
                  "input": true,
                  "lockKey": true,
                  "tags": []
                },
                {
                  "input": true,
                  "tree": true,
                  "components": [
                    {
                      "tags": [],
                      "tabindex": "1",
                      "hideLabel": true,
                      "lockKey": true,
                      "input": true,
                      "tableView": true,
                      "label": "Position",
                      "key": "position2",
                      "placeholder": "",
                      "data": {
                        "values": [
                          {
                            "value": "one",
                            "label": "One"
                          },
                          {
                            "label": "Two",
                            "value": "two"
                          },
                          {
                            "label": "Three",
                            "value": "three"
                          }
                        ],
                        "json": "",
                        "url": "",
                        "resource": "57369a252a85250100aef1db",
                        "project": "57ae043a78c4691a181d23f0"
                      },
                      "dataSrc": "values",
                      "valueProperty": "data.shortName",
                      "defaultValue": "",
                      "refreshOn": "",
                      "filter": "",
                      "authenticate": false,
                      "template": "<span>{{ item.value }}</span>",
                      "multiple": false,
                      "protected": false,
                      "unique": false,
                      "persistent": true,
                      "validate": {
                        "required": true
                      },
                      "type": "select",
                      "conditional": {
                        "show": "",
                        "when": null,
                        "eq": ""
                      },
                      "searchField": "data.shortName"
                    },
                    {
                      "tags": [],
                      "hideLabel": true,
                      "input": true,
                      "tableView": true,
                      "label": "Volunteer",
                      "key": "volunteer",
                      "placeholder": "",
                      "data": {
                        "values": [
                          {
                            "value": "one",
                            "label": "One"
                          },
                          {
                            "label": "Two",
                            "value": "two"
                          },
                          {
                            "label": "Three",
                            "value": "three"
                          }
                        ],
                        "json": "",
                        "url": "",
                        "resource": "57427ba554ec330100dad645",
                        "project": "57ae043a78c4691a181d23f0"
                      },
                      "dataSrc": "values",
                      "valueProperty": "data.fullName",
                      "defaultValue": "",
                      "refreshOn": "",
                      "filter": "sort=data.fullName",
                      "authenticate": false,
                      "template": "<span>{{ item.data.fullName }}</span>",
                      "multiple": false,
                      "protected": false,
                      "unique": false,
                      "persistent": true,
                      "validate": {
                        "required": false
                      },
                      "type": "select",
                      "conditional": {
                        "show": "",
                        "when": null,
                        "eq": ""
                      },
                      "searchField": "data.fullName"
                    },
                    {
                      "tabindex": "2",
                      "type": "textfield",
                      "conditional": {
                        "eq": "1",
                        "when": "displayNonVolunteer",
                        "show": "true"
                      },
                      "validate": {
                        "customPrivate": false,
                        "custom": "",
                        "pattern": "",
                        "maxLength": "",
                        "minLength": "",
                        "required": false
                      },
                      "persistent": true,
                      "unique": false,
                      "protected": false,
                      "defaultValue": "",
                      "multiple": false,
                      "suffix": "",
                      "prefix": "",
                      "placeholder": "Non-CFD personnel",
                      "key": "nonVolunteer",
                      "label": "Non-Volunteer",
                      "inputMask": "",
                      "inputType": "text",
                      "tableView": true,
                      "input": true,
                      "hideLabel": true
                    }
                  ],
                  "tableView": true,
                  "label": "Position",
                  "key": "position",
                  "protected": false,
                  "persistent": true,
                  "type": "datagrid",
                  "conditional": {
                    "show": false,
                    "when": null,
                    "eq": ""
                  },
                  "addAnother": "Add Position"
                }
              ],
              "type": "fieldset",
              "conditional": {
                "show": "",
                "when": null,
                "eq": ""
              },
              "key": "apparatusWrapper",
              "lockKey": true
            }
          ],
          "tableView": true,
          "label": "Apparatus",
          "key": "apparatus",
          "protected": false,
          "persistent": true,
          "type": "datagrid",
          "conditional": {
            "show": "true",
            "when": "useApparatus",
            "eq": "true"
          }
        }
      ],
      "legend": "Apparatus",
      "tableView": true,
      "input": false,
      "tags": []
    },
    {
      "input": true,
      "label": "Submit",
      "tableView": false,
      "key": "submit",
      "size": "md",
      "leftIcon": "",
      "rightIcon": "",
      "block": false,
      "action": "submit",
      "disableOnInvalid": true,
      "theme": "primary",
      "type": "button"
    }
  ],
  submission: {
    "useApparatus": true,
    "displayNonVolunteer": "0",
    "apparatus": [{
      "apparatusId": "one",
      "position": [
        {"position2": "one", "volunteer": "two"},
        {"position2": "two", "volunteer": "three"}
      ]
    }]
  }
};