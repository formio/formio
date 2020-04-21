
module.exports = {
  components: [
    {
      "input": true,
      "tableView": true,
      "inputType": "text",
      "inputMask": "",
      "label": "Text Field",
      "key": "textField1",
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
      "key": "number1",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "defaultValue": 0,
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
      "key": "textArea1",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "rows": 3,
      "multiple": false,
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
      "inputType": "checkbox",
      "tableView": true,
      "hideLabel": true,
      "label": "Checkbox",
      "key": "checkbox1",
      "defaultValue": false,
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false
      },
      "type": "checkbox",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "input": true,
      "tableView": true,
      "label": "SelectBoxes",
      "key": "selectBoxes1",
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
      "inline": false,
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false
      },
      "type": "selectboxes",
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
      "key": "select1",
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
      "multiple": false,
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
      "inputType": "radio",
      "label": "Radio",
      "key": "radio1",
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
      "defaultValue": "",
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false,
        "custom": "",
        "customPrivate": false
      },
      "type": "radio",
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
      "key": "email1",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "defaultValue": "",
      "protected": false,
      "unique": false,
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
      "key": "phoneNumber1",
      "placeholder": "",
      "prefix": "",
      "suffix": "",
      "multiple": false,
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
      "multiple": false,
      "placeholder": "",
      "key": "address1",
      "label": "Address",
      "tableView": true,
      "input": true
    },
    {
      "input": true,
      "tableView": true,
      "label": "Date / Time",
      "key": "dateTime1",
      "placeholder": "",
      "format": "yyyy-MM-dd HH:mm",
      "enableDate": true,
      "enableTime": true,
      "datepickerMode": "day",
      "datePicker": {
        "showWeeks": true,
        "startingDay": 0,
        "initDate": "",
        "minMode": "day",
        "maxMode": "year",
        "yearRange": "20",
        "datepickerMode": "day"
      },
      "timePicker": {
        "hourStep": 1,
        "minuteStep": 1,
        "showMeridian": true,
        "readonlyInput": false,
        "mousewheel": true,
        "arrowkeys": true
      },
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false,
        "custom": ""
      },
      "type": "datetime",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
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
      "key": "currency1",
      "label": "Currency",
      "inputMask": "",
      "inputType": "text",
      "tableView": true,
      "input": true
    },
    {
      "input": true,
      "tableView": true,
      "key": "hidden1",
      "label": "Hidden",
      "protected": false,
      "unique": false,
      "persistent": true,
      "type": "hidden",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    },
    {
      "input": true,
      "tableView": true,
      "label": "Resource",
      "key": "resource1",
      "placeholder": "",
      "resource": "5692b920d1028f01000407e7",
      "project": "5692b91fd1028f01000407e3",
      "defaultValue": "",
      "template": "<span>{{ item.data }}</span>",
      "selectFields": "",
      "searchFields": "",
      "multiple": false,
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
      "multiple": false,
      "placeholder": "",
      "key": "file1",
      "label": "File",
      "tableView": true,
      "input": true
    },
    {
      "conditional": {
        "eq": "",
        "when": null,
        "show": null
      },
      "hideLabel": true,
      "type": "signature",
      "validate": {
        "required": false
      },
      "persistent": true,
      "protected": false,
      "maxWidth": "2.5",
      "minWidth": "0.5",
      "backgroundColor": "rgb(245,245,235)",
      "penColor": "black",
      "height": "150px",
      "width": "100%",
      "footer": "Sign above",
      "placeholder": "",
      "key": "signature1",
      "label": "Signature",
      "tableView": true,
      "input": true
    },
    {
      "input": true,
      "tableView": true,
      "label": "Survey",
      "key": "survey1",
      "questions": [
        {
          "value": "one",
          "label": "One"
        },
        {
          "value": "two",
          "label": "Two"
        }
      ],
      "values": [
        {
          "value": "alpha",
          "label": "Alpha"
        },
        {
          "value": "bet",
          "label": "Bet"
        }
      ],
      "defaultValue": "",
      "protected": false,
      "persistent": true,
      "validate": {
        "required": false,
        "custom": "",
        "customPrivate": false
      },
      "type": "survey",
      "conditional": {
        "show": null,
        "when": null,
        "eq": ""
      }
    }
  ],
  submission: {
    textField1: 'test value',
    number1: 100,
    textArea1: 'This is the contents',
    checkbox1: false,
    selectBoxes1: {
      one: true,
      two: false,
      three: true
    },
    select1: 'one',
    radio1: 'two',
    email1: 'none@example.com',
    phoneNumber1: '(030) 303-0304',
    address1: {
      "mode": "autocomplete",
      "address": {
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
    },
    dateTime1: '2016-08-22T21:46:10.225Z',
    currency1: '1,000',
    hidden1: 'Im hidden!',
    resource1: {},
    file1: [{
      storage: 's3',
      url: 'http://google.com'
    }],
    signature1: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABQEAAACWCAYAAABuIU4wAAAW3klEQVR4Xu3dT4xV1R0H8DO7upnB1D+p0WHTagjMkNS40cCykSpplzRql0gidjkkokljhARZCiawa4UIuzZEcWeFUFk1cUTqyoYx6qIbZhJjFybT/O71DNdxkHfmn+/c97nJ5L2ZOe/ecz6/M4+8L+feO/b11/9dTDYCBAgQIECAAAECBAgQIECAAAECBHorMCYE7G1tDYwAAQIECBAgQIAAAQIECBAgQIBAIyAENBEIECBAgAABAgQIECBAgAABAgQI9FxACNjzAhseAQIECBAgQIAAAQIECBAgQIAAASGgOUCAAAECBAgQIECAAAECBAgQIECg5wJCwJ4X2PAIECBAgAABAgQIECBAgAABAgQICAHNAQIECBAgQIAAAQIECBAgQIAAAQI9FxAC9rzAhkeAAAECBAgQIECAAAECBAgQIEBACGgOECBAgAABAgQIECBAgAABAgQIEOi5gBCw5wU2PAIECBAgQIAAAQIECBAgQIAAAQJCQHOAAAECBAgQIECAAAECBAgQIECAQM8FhIA9L7DhESBAgAABAgQIECBAgAABAgQIEBACmgMECBAgQIAAAQIECBAgQIAAAQIEei4gBOx5gQ2PAAECBAgQIECAAAECBAgQIECAgBDQHCBAgAABAgQIECBAgAABAgQIECDQcwEhYM8LbHgECBAgQIAAAQIECBAgQIAAAQIEhIDmAAECBAgQIECAAAECBAgQIECAAIGeCwgBe15gwyNAgAABAgQIECBAgAABAgQIECAgBDQHCBAgQIAAAQIECBAgQIAAAQIECPRcQAjY8wIbHgECBAgQIECAAAECBAgQIECAAAEhoDlAgAABAgQIECBAgAABAgQIECBAoOcCQsCeF9jwCBAgQIAAAQIECBAgQIAAAQIECAgBzQECBAgQIECAAAECBAgQIECAAAECPRcQAva8wIZHgAABAgQIECBAgAABAgQIECBAQAhoDhAgQIAAAQIECBAgQIAAAQIECBDouYAQsOcFNjwCBAgQIECAAAECBAgQIECAAAECQkBzgAABAgQIECBAgAABAgQIECBAgEDPBYSAPS+w4REgQIAAAQIECBAgQIAAAQIECBAQApoDBAgQIECAAAECBAgQIECAAAECBHouIATseYENjwABAgQIECBAgAABAgQIECBAgIAQ0BwgQIAAAQIECBAgQIAAAQIECBAg0HMBIWDPC2x4BAgQIECAAAECBAgQIECAAAECBISA5gABAgQIECBAgAABAgQIECBAgACBngsIAXteYMMjQIAAAQIECBAgQIAAAQIECBAgIAQ0BwgQIECAAAECBAgQIECAAAECBAj0XEAI2PMCGx4BAgQIECBAgAABAgQIECBAgAABIaA5QIAAAQIECBAgQIAAAQIECBAgQKDnAkLAnhfY8AgQIECAAAECBAgQIECAAAECBAgIAc0BAgQIECBAgAABAgQIECBAgAABAj0XEAL2vMCGR4AAAQIECBAgQIAAAQIECBAgQEAIaA4QIECAAAECBAgQIECAAAECBAgQ6LmAELDnBTY8AgQIECBAgMBqBC5ceDcdOvRKmp7ekc6d+8tqduE1BAgQIECAAAECQyQgBByiYugKAQIECBAgQGAYBObn59O2bY+meIzt4sW/pd27nxiGrukDAQIECBAgQIDAKgWEgKuE8zICBAgQIECAQF8FZmYOp5MnTy8N7/r1f6WtWx/q63CNiwABAgQIECAwEgJCwJEos0ESIECAAAECBAYTuHTpStqz5/dLjY8dey0dPPj8YC/WigABAgQIECBAYGgFhIBDWxodI0CAAAECBAhsvsC2bb9Oc3OfNweemtqerl79x+Z3whEJECBAgAABAgTWXUAIuO6kdkiAAAECBAgQqFNg//4X09mz55Y6/+GH7zc3BrERIECAAAECBAjULyAErL+GRkCAAAECBAgQWLPAkSOvp6NHjy/tx2nAaya1AwIECBAgQIDAUAkIAYeqHDpDgAABAgQIENh8gRMnTqXDh/+cvv322+bgzzyzL50+/cbmd8QRCRAgQIAAAQIENkxACLhhtHZMgAABAgQIEBh+gQgADx16eamju3Y9nt577+/D33E9JECAAAECBAgQKBIQAhZxaUyAAAECBAgQ6IfA/Px8mpl5JZ058/bSgJ5+ek86f/6v/RigURAgQIAAAQIECHxPQAhoQhAgQIAAAQIERkzgxo3P0759f0yzs9eWRu4U4BGbBIZLgAABAgQIjJyAEHDkSm7ABAgQIECAwCgLXLp0JR048Kd048ZcwzA5+VA6deqNtHv3E6PMYuwECBAgQIAAgd4LCAF7X2IDJECAAAECBAi0AmfOnEszMy+n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',
    survey1: {
      one: "alpha",
      two: "bet"
    }
  }
};
