module.exports = {
  "components": [
    {
      "label": "Address",
      "enableManualMode": true,
      "tableView": true,
      "defaultValue": {
        "mode": "autocomplete",
        "address": {}
      },
      "allowCalculateOverride": true,
      "provider": "google",
      "validate": {
        "json": "\"\""
      },
      "errors": "\"\"",
      "key": "addressWithMode",
      "conditional": {
        "json": "\"\""
      },
      "type": "address",
      "providerOptions": {
        "params": {
          "key": "GOOGLE_MAPS_API_KEY",
          "autocompleteOptions": {}
        }
      },
      "input": true,
      "components": [
        {
          "label": "Address 1",
          "tableView": false,
          "key": "address1",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "Address 2",
          "tableView": false,
          "key": "address2",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "City",
          "tableView": false,
          "key": "city",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "State",
          "tableView": false,
          "key": "state",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "Country",
          "tableView": false,
          "key": "country",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "Zip Code",
          "tableView": false,
          "key": "zip",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        }
      ]
    },
    {
      "label": "Address2",
      "tableView": false,
      "provider": "google",
      "key": "address",
      "type": "address",
      "providerOptions": {
        "params": {
          "autocompleteOptions": {},
          "key": "AIzaSyAb3phWudYkltC-MTdqoxlYRqKQ1BJYvVw"
        }
      },
      "input": true,
      "components": [
        {
          "label": "Address 1",
          "tableView": false,
          "key": "address1",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "Address 2",
          "tableView": false,
          "key": "address2",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "City",
          "tableView": false,
          "key": "city",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "State",
          "tableView": false,
          "key": "state",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "Country",
          "tableView": false,
          "key": "country",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        },
        {
          "label": "Zip Code",
          "tableView": false,
          "key": "zip",
          "type": "textfield",
          "input": true,
          "customConditional": "show = _.get(instance, 'parent.manualMode', false);"
        }
      ]
    },
    {
      "key": "submit",
      "type": "button",
      "input": true,
      "label": "Submit",
      "tableView": false,
      "disableOnInvalid": true
    }
  ],

  submission: {
    "data": {
      "addressWithMode": {
        "mode": "autocomplete",
        "address": {
          "address_components": [
            {
              "long_name": "Washington",
              "short_name": "WA",
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
            }
          ],
          "formatted_address": "Washington, USA",
          "geometry": {
            "location": {
              "lat": 47.7510741,
              "lng": -120.7401386
            },
            "viewport": {
              "south": 45.54354101516995,
              "west": -124.8489739457119,
              "north": 49.00249453041775,
              "east": -116.916071080042
            }
          },
          "place_id": "ChIJ-bDD5__lhVQRuvNfbGh4QpQ",
          "types": [
            "administrative_area_level_1",
            "political"
          ],
          "formattedPlace": "Washington, USA"
        }
      },
      "address": {
        "address_components": [
          {
            "long_name": "New York",
            "short_name": "New York",
            "types": [
              "locality",
              "political"
            ]
          },
          {
            "long_name": "New York",
            "short_name": "NY",
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
          }
        ],
        "formatted_address": "New York, NY, USA",
        "geometry": {
          "location": {
            "lat": 40.7127753,
            "lng": -74.0059728
          },
          "viewport": {
            "south": 40.47739906045452,
            "west": -74.25908991427882,
            "north": 40.91757705070789,
            "east": -73.70027206817629
          }
        },
        "place_id": "ChIJOwg_06VPwokRYv534QaPC8g",
        "types": [
          "locality",
          "political"
        ],
        "formattedPlace": "New York, NY, USA"
      },
      "submit": true
    },
  },
  "state": "submitted",
  "_vnote": ""
}

