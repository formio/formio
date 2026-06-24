module.exports = {
  components: [{
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
    "unique": true,
    "protected": false,
    "defaultValue": "",
    "multiple": false,
    "suffix": "",
    "prefix": "",
    "placeholder": "",
    "key": "test",
    "label": "test",
    "inputMask": "",
    "inputType": "text",
    "tableView": true,
    "input": true
  }, {
    "input": true,
    "tableView": true,
    "label": "address",
    "key": "for213",
    "placeholder": "",
    "multiple": false,
    "protected": false,
    "unique": true,
    "persistent": true,
    "map": {
      "region": "",
      "key": ""
    },
    "validate": {
      "required": false
    },
    "type": "address",
    "tags": [],
    "conditional": {
      "show": "",
      "when": null,
      "eq": ""
    }
  }, {
    "isNew": false,
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
  }],
  submission: {
    "test": "",
    "for213": {
      "mode": "autocomplete",
      "address": {
        "address_components": [{
          "long_name": "Estonia",
          "short_name": "EE",
          "types": ["country", "political"]
        }],
        "formatted_address": "Estonia",
        "geometry": {
          "bounds": {
            "northeast": {
              "lat": 59.7315,
              "lng": 28.2101389
            },
            "southwest": {
              "lat": 57.50931600000001,
              "lng": 21.6540999
            }
          },
          "location": {
            "lat": 58.595272,
            "lng": 25.013607
          },
          "location_type": "APPROXIMATE",
          "viewport": {
            "northeast": {
              "lat": 59.7001516,
              "lng": 28.2089248
            },
            "southwest": {
              "lat": 57.5093539,
              "lng": 21.7643721
            }
          }
        },
        "place_id": "ChIJ_UuggpyUkkYRwyW0T7qf6kA",
        "types": ["country", "political"]
      }
    }
  }
};
