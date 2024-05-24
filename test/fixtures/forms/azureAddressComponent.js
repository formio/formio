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
      "provider": "azure",
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
          "subscription-key": "GmlF67m8ZDnjjIltC4yg9snIis5jaRhjRfq-nmvszgc"
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
      "provider": "azure",
      "key": "address",
      "type": "address",
      "providerOptions": {
        "params": {
          "autocompleteOptions": {},
          "subscription-key": "AZURE_API_KEY"
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
          "type": "Geography",
          "id": "Pu0OhJmmMboGreDYM87aIw",
          "score": 1,
          "entityType": "CountrySubdivision",
          "matchConfidence": {
            "score": 1
          },
          "address": {
            "countrySubdivision": "WA",
            "countrySubdivisionName": "Washington",
            "countrySubdivisionCode": "WA",
            "countryCode": "US",
            "country": "United States",
            "countryCodeISO3": "USA",
            "freeformAddress": "Washington"
          },
          "position": {
            "lat": 47.37319,
            "lon": -120.4237
          },
          "viewport": {
            "topLeftPoint": {
              "lat": 49.00249,
              "lon": -124.76258
            },
            "btmRightPoint": {
              "lat": 45.54354,
              "lon": -116.91599
            }
          },
          "boundingBox": {
            "topLeftPoint": {
              "lat": 49.00249,
              "lon": -124.76258
            },
            "btmRightPoint": {
              "lat": 45.54354,
              "lon": -116.91599
            }
          },
          "dataSources": {
            "geometry": {
              "id": "00005858-5800-1200-0000-000077361cb4"
            }
          }
        }
      },
      "address": {
        "type": "Geography",
        "id": "al9oTvbe7VmKoP3ql8XHKA",
        "score": 1,
        "entityType": "Municipality",
        "matchConfidence": {
          "score": 1
        },
        "address": {
          "municipality": "New York",
          "countrySubdivision": "NY",
          "countrySubdivisionName": "New York",
          "countrySubdivisionCode": "NY",
          "countryCode": "US",
          "country": "United States",
          "countryCodeISO3": "USA",
          "freeformAddress": "New York, NY"
        },
        "position": {
          "lat": 40.71305,
          "lon": -74.00723
        },
        "viewport": {
          "topLeftPoint": {
            "lat": 40.9175,
            "lon": -74.25909
          },
          "btmRightPoint": {
            "lat": 40.47738,
            "lon": -73.70027
          }
        },
        "boundingBox": {
          "topLeftPoint": {
            "lat": 40.9175,
            "lon": -74.25909
          },
          "btmRightPoint": {
            "lat": 40.47738,
            "lon": -73.70027
          }
        },
        "dataSources": {
          "geometry": {
            "id": "d49d86a4-0f4b-45f2-b607-31a84d02af00"
          }
        }
      },
      "submit": true


    }
  },
  "state": "submitted",
  "_vnote": ""
}

