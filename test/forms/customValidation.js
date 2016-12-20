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
            "custom": "valid = {{ trigger }}.toString() == 'true'",
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
        trigger: 'false',
        foo: 1
      },
      pass: {
        trigger: 'true',
        foo: 2
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
            "custom": "valid = {{ trigger }}.toString() === 'true'"
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
            "custom": "valid = {{ trigger }}.toString() == 'true'",
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
            "custom": "valid = {{ trigger }}.toString() == 'true'",
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
            "custom": "valid = {{ trigger }}.toString() == 'true'"
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
            "custom": "valid = {{ trigger }}.toString() == 'true'",
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
            "custom": "valid = {{ trigger }}.toString() == 'true'"
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
  }
};
