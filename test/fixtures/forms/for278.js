'use strict';

module.exports = {
  initial: [
    {
      "input": true,
      "tableView": true,
      "inputType": "number",
      "label": "number",
      "key": "number",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "defaultValue": "",
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false,
        "min": "",
        "max": "",
        "step": "any",
        "integer": "",
        "multiple": "",
        "custom": ""
      },
      "type": "number",
      "tags": [],
      "conditional": {
        "show": "",
        "when": null,
        "eq": ""
      }
    }
  ],
  update: [
    {
      "input": true,
      "tableView": true,
      "inputType": "number",
      "label": "number",
      "key": "number",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "defaultValue": "",
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false,
        "min": 0,
        "max": "",
        "step": "any",
        "integer": "",
        "multiple": "",
        "custom": ""
      },
      "type": "number",
      "tags": [],
      "conditional": {
        "show": "",
        "when": null,
        "eq": ""
      }
    }
  ],
  fail: {
    data: {
      number: -1
    }
  },
  pass: {
    data: {
      number: 2
    }
  }
};
