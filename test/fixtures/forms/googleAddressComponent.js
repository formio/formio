module.exports = {
  components: [
    {
      label: "Address",
      enableManualMode: true,
      tableView: true,
      defaultValue: {},
      allowCalculateOverride: true,
      provider: "google",
      validate: {
        json: "\"\""
      },
      errors: "\"\"",
      key: "address",
      conditional: {
        "json": "\"\""
      },
      type: "address",
      providerOptions: {
        params: {
          key: "GOOGLE_MAPS_API_KEY",
          autocompleteOptions: {}
        }
      },
      input: true,
    },
    {
      type: "button",
      label: "Submit",
      key: "submit",
      disableOnInvalid: true,
      input: true,
      tableView: false,
    },
  ],
  submission: {
    "data": {
      "textField": "Test",
      "address": {
        "mode": "autocomplete",
        "address": {
          "address_components": [
            {
              "long_name": "Tokyo",
              "short_name": "Tokyo",
              "types": [
                "administrative_area_level_1",
                "political"
              ]
            },
            {
              "long_name": "Japan",
              "short_name": "JP",
              "types": [
                "country",
                "political"
              ]
            }
          ],
          "formatted_address": "Tokyo, Japan",
          "geometry": {
            "location": {
              "lat": 35.6761919,
              "lng": 139.6503106
            },
            "viewport": {
              "south": 34.5776326,
              "west": 138.2991098,
              "north": 36.4408483,
              "east": 141.2405144
            }
          },
          "place_id": "ChIJ51cu8IcbXWARiRtXIothAS4",
          "types": [
            "administrative_area_level_1",
            "political"
          ],
          "formattedPlace": "Tokyo, Japan",
          "address1": "",
          "address2": "",
          "city": "",
          "state": "",
          "country": "",
          "zip": ""
        }
      },
      "submit": true
    },
    "state": "submitted",
    "_vnote": ""
  }
};
