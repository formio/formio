module.exports = {
  components: [
    {
      label: "Address",
      enableManualMode: true,
      tableView: true,
      defaultValue: {},
      allowCalculateOverride: true,
      provider: "azure",
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
          "subscription-key": "AZURE_API_KEY"
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
      "textField": "Test Address",
      "address": {
        "mode": "autocomplete",
        "address":{
          "type": "Geography",
          "id": "TbOmYMFBz7Hm8q_lxc-oCA",
          "score": 2.3817019463,
          "entityType": "Municipality",
          "matchConfidence": {
            "score": 1
          },
          "address": {
            "municipality": "Tokyo",
            "countrySubdivision": "Kanto",
            "countryCode": "JP",
            "country": "Japan",
            "countryCodeISO3": "JPN",
            "freeformAddress": "Tokyo, Kanto"
          },
          "position": {
            "lat": 35.68696,
            "lon": 139.74946
          },
          "viewport": {
            "topLeftPoint": {
              "lat": 37.14388,
              "lon": 138.37411
            },
            "btmRightPoint": {
              "lat": 34.89988,
              "lon": 140.87509
            }
          },
          "boundingBox": {
            "topLeftPoint": {
              "lat": 37.14388,
              "lon": 138.37411
            },
            "btmRightPoint": {
              "lat": 34.89988,
              "lon": 140.87509
            }
          },
          "dataSources": {
            "geometry": {
              "id": "00005858-5800-1200-0000-00007d30cf7f"
            }
          },
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
