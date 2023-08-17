module.exports = {
  components: [
    {
      label: "Address",
      enableManualMode: true,
      tableView: true,
      defaultValue: {},
      allowCalculateOverride: true,
      provider: "nominatim",
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
        params: {}
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
          "place_id": 308320215,
          "licence": "Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright",
          "osm_type": "relation",
          "osm_id": 1543125,
          "boundingbox": [
            "20.2145811",
            "35.8984245",
            "135.8536855",
            "154.205541"
          ],
          "lat": "35.6840574",
          "lon": "139.7744912",
          "display_name": "Tokyo, Japan",
          "class": "boundary",
          "type": "administrative",
          "importance": 0.8693311914925306,
          "icon": "https://nominatim.openstreetmap.org/ui/mapicons/poi_boundary_administrative.p.20.png",
          "address": {
            "city": "Tokyo",
            "ISO3166-2-lvl4": "JP-13",
            "country": "Japan",
            "country_code": "jp"
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
