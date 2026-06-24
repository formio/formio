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
      "provider": "nominatim",
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
        "params": {}
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
      "provider": "nominatim",
      "key": "address",
      "type": "address",
      "providerOptions": {
        "params": {}
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
          "place_id": 313229521,
          "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
          "osm_type": "relation",
          "osm_id": 165479,
          "lat": "47.2868352",
          "lon": "-120.212613",
          "class": "boundary",
          "type": "administrative",
          "place_rank": 8,
          "importance": 0.7129297923155674,
          "addresstype": "state",
          "name": "Washington",
          "display_name": "Washington, United States",
          "address": {
            "state": "Washington",
            "ISO3166-2-lvl4": "US-WA",
            "country": "United States",
            "country_code": "us"
          },
          "boundingbox": [
            "45.5437314",
            "49.0024392",
            "-124.8360916",
            "-116.9159938"
          ]
        }
      },
      "address": {
        "place_id": 390059406,
        "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
        "osm_type": "relation",
        "osm_id": 175905,
        "lat": "40.7127281",
        "lon": "-74.0060152",
        "class": "boundary",
        "type": "administrative",
        "place_rank": 10,
        "importance": 0.8175766114518461,
        "addresstype": "city",
        "name": "New York",
        "display_name": "New York, United States",
        "address": {
          "city": "New York",
          "state": "New York",
          "ISO3166-2-lvl4": "US-NY",
          "country": "United States",
          "country_code": "us"
        },
        "boundingbox": [
          "40.4765780",
          "40.9176300",
          "-74.2588430",
          "-73.7002330"
        ]
      },
      "submit": true

    },
  },
  "state": "submitted",
  "_vnote": ""
}
