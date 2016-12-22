'use strict';

module.exports = [
  {
    "input": true,
    "tableView": true,
    "inputType": "text",
    "inputMask": "",
    "label": "foo",
    "key": "foo",
    "placeholder": "",
    "prefix": "",
    "suffix": "",
    "multiple": false,
    "defaultValue": "",
    "protected": false,
    "unique": false,
    "persistent": true,
    "validate": {
      "required": false,
      "minLength": "",
      "maxLength": "",
      "pattern": "",
      "custom": "",
      "customPrivate": false
    },
    "conditional": {
      "show": "",
      "when": null,
      "eq": ""
    },
    "type": "textfield",
    "tags": []
  }, {
    "input": false,
    "title": "",
    "theme": "default",
    "components": [{
      "input": true,
      "tableView": true,
      "inputType": "text",
      "inputMask": "",
      "label": "bar",
      "key": "bar",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "multiple": false,
      "defaultValue": "",
      "protected": false,
      "unique": false,
      "persistent": true,
      "validate": {
        "required": false,
        "minLength": "",
        "maxLength": "",
        "pattern": "",
        "custom": "",
        "customPrivate": false
      },
      "conditional": {
        "show": "",
        "when": null,
        "eq": ""
      },
      "type": "textfield",
      "tags": []
    }],
    "type": "panel",
    "tags": [],
    "conditional": {
      "show": "",
      "when": null,
      "eq": ""
    }
  }, {
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
];
