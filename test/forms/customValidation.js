'use strict';

// FOR-255
module.exports = {
  text: {
    old: {
      components: [
        {
          "tags": [],
          "type": "textfield",
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
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
          "placeholder": "",
          "key": "trigger",
          "label": "trigger",
          "inputMask": "",
          "inputType": "text",
          "tableView": true,
          "input": true
        }, {
          "tags": [],
          "type": "textfield",
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "validate": {
            "customPrivate": false,
            "custom": "valid = {{ trigger }}.toString() == 'true'",
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
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "inputMask": "",
          "inputType": "text",
          "tableView": true,
          "input": true
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
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'anything'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'anything'
        }
      }
    },
    new: {
      components: [
        {
          "tags": [],
          "type": "textfield",
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
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
          "placeholder": "",
          "key": "trigger",
          "label": "trigger",
          "inputMask": "",
          "inputType": "text",
          "tableView": true,
          "input": true
        }, {
          "tags": [],
          "type": "textfield",
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "validate": {
            "customPrivate": false,
            "custom": "valid = data.trigger === 'true'",
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
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "inputMask": "",
          "inputType": "text",
          "tableView": true,
          "input": true
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
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'anything'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'anything'
        }
      }
    }
  }
};
