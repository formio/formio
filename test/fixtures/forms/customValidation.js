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
            "custom": "valid = {{ data.trigger }}.toString() == 'true'",
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
  },
  number: {
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "number",
          "validate": {
            "custom": "valid = {{ data.trigger }}.toString() == 'true'",
            "multiple": "",
            "integer": "",
            "step": "any",
            "max": "",
            "min": "",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "suffix": "",
          "prefix": "",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "inputType": "number",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: '1'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: '2'
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "number",
          "validate": {
            "custom": "valid = data.trigger === 'true'",
            "multiple": "",
            "integer": "",
            "step": "any",
            "max": "",
            "min": "",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "suffix": "",
          "prefix": "",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "inputType": "number",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 1
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 2
        }
      }
    }
  },
  password: {
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
          "validate": {
            "custom": "valid = {{ data.trigger }}.toString() === 'true'"
          },
          "input": true,
          "tableView": false,
          "inputType": "password",
          "label": "foo",
          "key": "foo",
          "placeholder": "",
          "prefix": "",
          "suffix": "",
          "protected": true,
          "persistent": true,
          "type": "password",
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
          trigger: 'false',
          foo: 'secure'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'secure'
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
          "validate": {
            "custom": "valid = data.trigger === 'true'"
          },
          "input": true,
          "tableView": false,
          "inputType": "password",
          "label": "foo",
          "key": "foo",
          "placeholder": "",
          "prefix": "",
          "suffix": "",
          "protected": true,
          "persistent": true,
          "type": "password",
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
          trigger: 'false',
          foo: 'secure'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'secure'
        }
      }
    }
  },
  textarea: {
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
          "lockKey": true,
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "textarea",
          "validate": {
            "custom": "valid = {{ data.trigger }}.toString() == 'true'",
            "pattern": "",
            "maxLength": "",
            "minLength": "",
            "required": false
          },
          "wysiwyg": false,
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "multiple": false,
          "rows": 3,
          "suffix": "",
          "prefix": "",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
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
          "lockKey": true,
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "textarea",
          "validate": {
            "custom": "valid = data.trigger == 'true'",
            "pattern": "",
            "maxLength": "",
            "minLength": "",
            "required": false
          },
          "wysiwyg": false,
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "multiple": false,
          "rows": 3,
          "suffix": "",
          "prefix": "",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
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
  },
  selectboxes: {
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "type": "selectboxes",
          "validate": {
            "custom": "valid = {{ data.trigger }}.toString() == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "inline": false,
          "values": [{
            "label": "foo",
            "value": "foo"
          }],
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: {
            foo: true
          }
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: {
            foo: true
          }
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "type": "selectboxes",
          "validate": {
            "custom": "valid = data.trigger == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "inline": false,
          "values": [{
            "label": "foo",
            "value": "foo"
          }],
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: {
            foo: true
          }
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: {
            foo: true
          }
        }
      }
    }
  },
  select: {
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
          "input": true,
          "tableView": true,
          "label": "foo",
          "key": "foo",
          "placeholder": "",
          "data": {
            "values": [{
              "value": "test",
              "label": "test"
            }],
            "json": "",
            "url": "",
            "resource": "",
            "custom": ""
          },
          "dataSrc": "values",
          "valueProperty": "",
          "defaultValue": "",
          "refreshOn": "",
          "filter": "",
          "authenticate": false,
          "template": "<span>{{ item.label }}</span>",
          "multiple": false,
          "protected": false,
          "unique": false,
          "persistent": true,
          "validate": {
            "required": false,
            "custom": "valid = {{ data.trigger }}.toString() == 'true'"
          },
          "type": "select",
          "tags": [],
          "conditional": {
            "show": "",
            "when": null,
            "eq": ""
          },
          "lockKey": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'test'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'test'
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
          "input": true,
          "tableView": true,
          "label": "foo",
          "key": "foo",
          "placeholder": "",
          "data": {
            "values": [{
              "value": "test",
              "label": "test"
            }],
            "json": "",
            "url": "",
            "resource": "",
            "custom": ""
          },
          "dataSrc": "values",
          "valueProperty": "",
          "defaultValue": "",
          "refreshOn": "",
          "filter": "",
          "authenticate": false,
          "template": "<span>{{ item.label }}</span>",
          "multiple": false,
          "protected": false,
          "unique": false,
          "persistent": true,
          "validate": {
            "required": false,
            "custom": "valid = data.trigger == 'true'"
          },
          "type": "select",
          "tags": [],
          "conditional": {
            "show": "",
            "when": null,
            "eq": ""
          },
          "lockKey": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'test'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'test'
        }
      }
    }
  },
  radio: {
    old: {
      components: [
        {
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "trigger",
          "key": "trigger",
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "radio",
          "validate": {
            "customPrivate": false,
            "custom": "valid = {{ data.trigger }}.toString() == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "values": [{
            "label": "foo",
            "value": "foo"
          }],
          "key": "foo",
          "label": "foo",
          "inputType": "radio",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'foo'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'foo'
        }
      }
    },
    new: {
      components: [
        {
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "trigger",
          "key": "trigger",
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "radio",
          "validate": {
            "customPrivate": false,
            "custom": "valid = data.trigger == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "values": [{
            "label": "foo",
            "value": "foo"
          }],
          "key": "foo",
          "label": "foo",
          "inputType": "radio",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'foo'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'foo'
        }
      }
    }
  },
  email: {
    old: {
      components: [
        {
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "trigger",
          "key": "trigger",
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
          "lockKey": true,
          "validate": {
            "custom": "valid = {{ data.trigger }}.toString() == 'true'"
          },
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "email",
          "kickbox": {
            "enabled": false
          },
          "persistent": true,
          "unique": false,
          "protected": false,
          "defaultValue": "",
          "suffix": "",
          "prefix": "",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "inputType": "email",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'test@test.test'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'test@test.test'
        }
      }
    },
    new: {
      components: [
        {
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "trigger",
          "key": "trigger",
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
          "lockKey": true,
          "validate": {
            "custom": "valid = data.trigger == 'true'"
          },
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "email",
          "kickbox": {
            "enabled": false
          },
          "persistent": true,
          "unique": false,
          "protected": false,
          "defaultValue": "",
          "suffix": "",
          "prefix": "",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "inputType": "email",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: 'test@test.test'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: 'test@test.test'
        }
      }
    }
  },
  datetime: {
    old: {
      components: [
        {
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "trigger",
          "key": "trigger",
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
          "lockKey": true,
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "datetime",
          "validate": {
            "custom": "valid = {{ data.trigger }}.toString() == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "timePicker": {
            "arrowkeys": true,
            "mousewheel": true,
            "readonlyInput": false,
            "showMeridian": true,
            "minuteStep": 1,
            "hourStep": 1
          },
          "datePicker": {
            "datepickerMode": "day",
            "yearRange": "20",
            "maxMode": "year",
            "minMode": "day",
            "initDate": "",
            "startingDay": 0,
            "showWeeks": true
          },
          "datepickerMode": "day",
          "maxDate": null,
          "minDate": null,
          "defaultDate": "",
          "enableTime": true,
          "enableDate": true,
          "format": "yyyy-MM-dd hh:mm",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: '2016-01-01T00:00:00.000Z'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: '2016-01-01T00:00:00.000Z'
        }
      }
    },
    new: {
      components: [
        {
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "trigger",
          "key": "trigger",
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
          "lockKey": true,
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "datetime",
          "validate": {
            "custom": "valid = data.trigger == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "timePicker": {
            "arrowkeys": true,
            "mousewheel": true,
            "readonlyInput": false,
            "showMeridian": true,
            "minuteStep": 1,
            "hourStep": 1
          },
          "datePicker": {
            "datepickerMode": "day",
            "yearRange": "20",
            "maxMode": "year",
            "minMode": "day",
            "initDate": "",
            "startingDay": 0,
            "showWeeks": true
          },
          "datepickerMode": "day",
          "maxDate": null,
          "minDate": null,
          "defaultDate": "",
          "enableTime": true,
          "enableDate": true,
          "format": "yyyy-MM-dd hh:mm",
          "placeholder": "",
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: '2016-01-01T00:00:00.000Z'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: '2016-01-01T00:00:00.000Z'
        }
      }
    }
  },
  day: {
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
          "lockKey": true,
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "day",
          "validate": {
            "custom": "valid = {{ data.trigger }}.toString() == 'true'"
          },
          "persistent": true,
          "protected": false,
          "dayFirst": false,
          "fields": {
            "year": {
              "required": false,
              "placeholder": "",
              "type": "text"
            },
            "month": {
              "required": false,
              "placeholder": "",
              "type": "select"
            },
            "day": {
              "required": false,
              "placeholder": "",
              "type": "text"
            }
          },
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: '01/01/1990'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: '01/01/1990'
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
          "lockKey": true,
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "day",
          "validate": {
            "custom": "valid = data.trigger == 'true'"
          },
          "persistent": true,
          "protected": false,
          "dayFirst": false,
          "fields": {
            "year": {
              "required": false,
              "placeholder": "",
              "type": "text"
            },
            "month": {
              "required": false,
              "placeholder": "",
              "type": "select"
            },
            "day": {
              "required": false,
              "placeholder": "",
              "type": "text"
            }
          },
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: '01/01/1990'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: '01/01/1990'
        }
      }
    }
  },
  currency: {
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
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "foo",
          "key": "foo",
          "placeholder": "",
          "prefix": "",
          "suffix": "",
          "defaultValue": "",
          "protected": false,
          "persistent": true,
          "validate": {
            "required": false,
            "multiple": "",
            "custom": "valid = {{ data.trigger }}.toString() == 'true'"
          },
          "conditional": {
            "show": "",
            "when": null,
            "eq": ""
          },
          "type": "currency",
          "tags": [],
          "lockKey": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: '1234'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: '1234'
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
          "input": true,
          "tableView": true,
          "inputType": "text",
          "inputMask": "",
          "label": "foo",
          "key": "foo",
          "placeholder": "",
          "prefix": "",
          "suffix": "",
          "defaultValue": "",
          "protected": false,
          "persistent": true,
          "validate": {
            "required": false,
            "multiple": "",
            "custom": "valid = data.trigger == 'true'"
          },
          "conditional": {
            "show": "",
            "when": null,
            "eq": ""
          },
          "type": "currency",
          "tags": [],
          "lockKey": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: '1234'
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: '1234'
        }
      }
    }
  },
  survey: {
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "survey",
          "validate": {
            "customPrivate": false,
            "custom": "valid = {{ data.trigger }}.toString() == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "values": [{
            "label": "foo",
            "value": "foo"
          }],
          "questions": [{
            "label": "foo",
            "value": "foo"
          }],
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: {
            foo: 'foo'
          }
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: {
            foo: 'foo'
          }
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
          "conditional": {
            "eq": "",
            "when": null,
            "show": ""
          },
          "tags": [],
          "type": "survey",
          "validate": {
            "customPrivate": false,
            "custom": "valid = data.trigger == 'true'",
            "required": false
          },
          "persistent": true,
          "protected": false,
          "defaultValue": "",
          "values": [{
            "label": "foo",
            "value": "foo"
          }],
          "questions": [{
            "label": "foo",
            "value": "foo"
          }],
          "key": "foo",
          "label": "foo",
          "tableView": true,
          "input": true
        }
      ],
      fail: {
        data: {
          trigger: 'false',
          foo: {
            foo: 'foo'
          }
        }
      },
      pass: {
        data: {
          trigger: 'true',
          foo: {
            foo: 'foo'
          }
        }
      }
    }
  },
  multipleErrors: {
    text: {
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
            "key": "bar",
            "label": "bar",
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
            foo: 'anything1',
            bar: 'anything2'
          }
        },
        pass: {
          data: {
            trigger: 'true',
            foo: 'anything1',
            bar: 'anything2'
          }
        }
      }
    }
  },
  rowData: {
    datagrid: {
      new: {
        components: [
          {
            "conditional": {
              "eq": "",
              "when": null,
              "show": ""
            },
            "tags": [],
            "type": "datagrid",
            "persistent": true,
            "protected": false,
            "key": "mydg",
            "label": "mydg",
            "tableView": true,
            "components": [{
              "hideLabel": true,
              "isNew": false,
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
              "hideLabel": true,
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
                "custom": "valid = row.trigger === 'true'",
                "customPrivate": false
              },
              "conditional": {
                "show": "",
                "when": null,
                "eq": ""
              },
              "type": "textfield",
              "tags": [],
              "lockKey": true
            }],
            "tree": true,
            "input": true
          }
        ],
        fail: {
          data: {
            mydg: [
              {trigger: 'false', foo: 'anything1'},
              {trigger: 'true', foo: 'anything2'}
            ]
          }
        },
        pass: {
          data: {
            mydg: [
              {trigger: 'true', foo: 'anything1'},
              {trigger: 'true', foo: 'anything2'}
            ]
          }
        }
      }
    }
  },
  valueReplace: {
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
              "custom": "valid = '{{ data.trigger }}' == 'true'",
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
  },
  customPrivate: {
    root: {
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
            "customPrivate": true,
            "custom": "valid = true",
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
        }
      ],
      user: {
        pass: {
          customPrivate: true,
          pattern: "",
          maxLength: "",
          minLength: "",
          required: false
        }
      },
      admin: {
        pass: {
          customPrivate: true,
          custom: "valid = true",
          pattern: "",
          maxLength: "",
          minLength: "",
          required: false
        }
      }
    },
    nested: {
      components: [
        {
          "key": "fieldset1",
          "input": false,
          "tableView": true,
          "legend": "test",
          "components": [
            {
              "tags": [],
              "type": "textfield",
              "conditional": {
                "eq": "",
                "when": null,
                "show": ""
              },
              "validate": {
                "customPrivate": true,
                "custom": "valid = true",
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
            }
          ],
          "type": "fieldset",
          "tags": [],
          "conditional": {
            "show": "",
            "when": null,
            "eq": ""
          }
        }
      ],
      user: {
        pass: {
          customPrivate: true,
          pattern: "",
          maxLength: "",
          minLength: "",
          required: false
        }
      },
      admin: {
        pass: {
          customPrivate: true,
          custom: "valid = true",
          pattern: "",
          maxLength: "",
          minLength: "",
          required: false
        }
      }
    }
  }
};
