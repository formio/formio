
module.exports = {
  components: [
    {
      "input": true,
      "tableView": true,
      "inputType": "text",
      "inputMask": "",
      "label": "Text Field",
      "key": "textField3",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "multiple": true,
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
        "show": null,
        "when": null,
        "eq": ""
      },
      "type": "textfield"
    },
    {
      "input": true,
      "tableView": true,
      "inputType": "number",
      "label": "Number",
      "key": "number3",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "defaultValue": 0,
      "protected": false,
      "persistent": true,
      "multiple": true,
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
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "input": true,
      "tableView": true,
      "label": "Text Area",
      "key": "textArea3",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "rows": 3,
      "multiple": true,
      "defaultValue": "",
      "protected": false,
      "persistent": true,
      "wysiwyg": false,
      "validate": {
        "required": false,
        "minLength": "",
        "maxLength": "",
        "pattern": "",
        "custom": ""
      },
      "type": "textarea",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "input": true,
      "tableView": true,
      "label": "Select",
      "key": "select3",
      "placeholder": "",
      "data": {
        "values": [
          {
            "value": "one",
            "label": "One"
          },
          {
            "value": "two",
            "label": "Two"
          },
          {
            "value": "three",
            "label": "Three"
          }
        ],
        "json": "",
        "url": "",
        "resource": ""
      },
      "dataSrc": "values",
      "valueProperty": "",
      "defaultValue": "",
      "refreshOn": "",
      "filter": "",
      "authenticate": false,
      "template": "<span>{{ item.label }}</span>",
      "multiple": true,
      "protected": false,
      "unique": false,
      "persistent": true,
      "validate": {
        "required": false
      },
      "type": "select",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "input": true,
      "tableView": true,
      "inputType": "email",
      "label": "Email",
      "key": "email3",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "defaultValue": "",
      "protected": false,
      "unique": false,
      "multiple": true,
      "persistent": true,
      "type": "email",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "input": true,
      "tableView": true,
      "inputMask": "(999) 999-9999",
      "label": "Phone Number",
      "key": "phoneNumber3",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "multiple": true,
      "protected": false,
      "unique": false,
      "persistent": true,
      "defaultValue": "",
      "validate": {
        "required": false
      },
      "type": "phoneNumber",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "conditional": {
        "eq": "",
        "when": null,
        "show": null
      },
      "type": "address",
      "validate": {
        "required": false
      },
      "persistent": true,
      "unique": false,
      "protected": false,
      "multiple": true,
      "placeholder": "",
      "key": "address3",
      "label": "Address",
      "tableView": true,
      "input": true
    },
    {
      "type": "currency",
      "conditional": {
        "eq": "",
        "when": null,
        "show": null
      },
      "validate": {
        "custom": "",
        "multiple": "",
        "required": false
      },
      "persistent": true,
      "protected": false,
      "defaultValue": "",
      "suffix": "",
      "prefix": "",
      "placeholder": "",
      "key": "currency3",
      "label": "Currency",
      "inputMask": "",
      "inputType": "text",
      "tableView": true,
      "multiple": true,
      "input": true
    },
    {
      "input": true,
      "tableView": true,
      "label": "Resource",
      "key": "resource3",
      "placeholder": "",
      "resource": "5692b920d1028f01000407e7",
      "project": "5692b91fd1028f01000407e3",
      "defaultValue": "",
      "template": "<span>{{ item.data }}</span>",
      "selectFields": "",
      "searchFields": "",
      "multiple": true,
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false
      },
      "defaultPermission": "",
      "type": "resource",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "conditional": {
        "eq": "",
        "when": null,
        "show": null
      },
      "type": "file",
      "protected": false,
      "defaultValue": "",
      "multiple": true,
      "placeholder": "",
      "key": "file3",
      "label": "File",
      "tableView": true,
      "input": true
    }
  ],
  submission: {
    textField3: ['test value', 'anther value'],
    number3: [300, 400, 500],
    textArea3: ['This is the contents', 'more Contents'],
    select3: ['one', 'three'],
    email3: ['none@example.com', 'test@example.com'],
    phoneNumber3: ['(030) 303-0304', '(209) 473-9403'],
    address3: [{
      "mode": "autocomplete",
      "address": [
        {
          "address_components": [
            {
              "long_name": "123",
              "short_name": "123",
              "types": [
                "street_number"
              ]
            },
            {
              "long_name": "Fake Drive",
              "short_name": "Fake Dr",
              "types": [
                "route"
              ]
            },
            {
              "long_name": "Luray",
              "short_name": "Luray",
              "types": [
                "locality",
                "political"
              ]
            },
            {
              "long_name": "1, West Luray",
              "short_name": "1, West Luray",
              "types": [
                "administrative_area_level_3",
                "political"
              ]
            },
            {
              "long_name": "Page County",
              "short_name": "Page County",
              "types": [
                "administrative_area_level_2",
                "political"
              ]
            },
            {
              "long_name": "Virginia",
              "short_name": "VA",
              "types": [
                "administrative_area_level_1",
                "political"
              ]
            },
            {
              "long_name": "United States",
              "short_name": "US",
              "types": [
                "country",
                "political"
              ]
            },
            {
              "long_name": "22835",
              "short_name": "22835",
              "types": [
                "postal_code"
              ]
            },
            {
              "long_name": "2722",
              "short_name": "2722",
              "types": [
                "postal_code_suffix"
              ]
            }
          ],
          "formatted_address": "123 Fake Dr, Luray, VA 22835, USA",
          "geometry": {
            "bounds": {
              "northeast": {
                "lat": 38.7062041,
                "lng": -78.5065
              },
              "southwest": {
                "lat": 38.70619,
                "lng": -78.5065048
              }
            },
            "location": {
              "lat": 38.7062041,
              "lng": -78.5065
            },
            "location_type": "RANGE_INTERPOLATED",
            "viewport": {
              "northeast": {
                "lat": 38.7075460302915,
                "lng": -78.50515341970849
              },
              "southwest": {
                "lat": 38.7048480697085,
                "lng": -78.50785138029151
              }
            }
          },
          "partial_match": true,
          "place_id": "EiExMjMgRmFrZSBEciwgTHVyYXksIFZBIDIyODM1LCBVU0E",
          "types": [
            "street_address"
          ]
        }
      ]
    }],
    currency3: ['3,000', '500', '1,000,000'],
    resource3: [{}, {}],
    file3: [
      {
        storage: 's3',
        url: 'http://google.com'
      },
      {
        storage: 's3',
        url: 'http://google.com/another'
      }
    ]
  }
}
