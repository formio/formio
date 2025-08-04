module.exports = {
  "components": [
    {
      "label": "address",
      "enableManualMode": true,
      "tableView": true,
      "provider": 'nominatim',
      "manualModeViewString": "value = data.address.address1",
      "validateWhenHidden": false,
      "key": "address",
      "type": "address",
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
    }
  ],
  submission: {
    "data": {
      "address": {
          "mode": "manual",
          "address": {
              "address1": "address 1",
              "address2": "address 2",
              "city": "city",
              "state": "state",
              "country": "country",
              "zip": "12345"
          }
      },
      "submit": true
    },
    "state": "submitted"
  }
}