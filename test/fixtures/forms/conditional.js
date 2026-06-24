module.exports = {
  components: [
    {
      "conditional": {
        "eq": "",
        "when": null,
        "show": ""
      },
      "tags": [],
      "type": "panel",
      "components": [
        {
          "isNew": false,
          "input": true,
          "tableView": true,
          "inputType": "radio",
          "label": "show",
          "key": "show",
          "values": [{
            "value": "yes",
            "label": "yes"
          }, {
            "value": "no",
            "label": "no"
          }],
          "defaultValue": "",
          "protected": false,
          "persistent": true,
          "validate": {
            "required": false,
            "custom": "",
            "customPrivate": false
          },
          "type": "radio",
          "tags": [],
          "conditional": {
            "show": "",
            "when": null,
            "eq": ""
          }
        },
        {
          "isNew": false,
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "req",
          "key": "req",
          "placeholder": "",
          "prefix": "",
          "suffix": "",
          "multiple": false,
          "defaultValue": "",
          "protected": false,
          "unique": false,
          "persistent": true,
          "validate": {
            "required": true,
            "minLength": "",
            "maxLength": "",
            "pattern": "",
            "custom": "",
            "customPrivate": false
          },
          "conditional": {
            "show": "true",
            "when": "show",
            "eq": "yes"
          },
          "type": "textfield",
          "tags": []
        }
      ],
      "theme": "default",
      "title": "panel1",
      "input": false,
      "key": "panel1"
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
      "disableOnInvalid": false,
      "theme": "primary",
      "type": "button"
    }
  ]
};
