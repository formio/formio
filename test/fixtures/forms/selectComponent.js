module.exports = {
  components: [
    {
      "label": "Select Values do not match Labels",
      "widget": "choicesjs",
      "tableView": true,
      "data": {
        "values": [
          {
            "label": "One",
            "value": "1"
          },
          {
            "label": "Two",
            "value": "2"
          },
          {
            "label": "Three",
            "value": "3"
          }
        ]
      },
      "key": "selectValuesDoNotMatchLabels",
      "type": "select",
      "input": true
    },
    {
      "label": "Select Resource Value and Label",
      "widget": "choicesjs",
      "tableView": true,
      "dataSrc": "resource",
      "data": {
        "resource": "selectValuesAndLabels"
      },
      "template": "<span>{{ item.data.label }}</span>",
      "validate": {
        "select": false
      },
      "key": "selectResourceValueAndLabel",
      "type": "select",
      "searchField": "data.value__regex",
      "input": true,
      "noRefreshOnScroll": false,
      "addResource": false,
      "reference": false,
      "valueProperty": "data.value"
    },
    {
      "label": "Select Data Source value and label",
      "widget": "choicesjs",
      "tableView": true,
      "dataSrc": "url",
      "data": {
        "url": "https://gists.rawgit.com/mshafrir/2646763/raw/states_titlecase.json",
        "headers": [
          {
            "key": "",
            "value": ""
          }
        ]
      },
      "valueProperty": "abbreviation",
      "template": "<span>{{ item.name }}</span>",
      "key": "selectDataSourceValueAndLabel",
      "type": "select",
      "disableLimit": false,
      "noRefreshOnScroll": false,
      "input": true
    },
    {
      "type": "button",
      "label": "Submit",
      "key": "submit",
      "disableOnInvalid": true,
      "input": true,
      "tableView": false
    }
  ],
  submission: {
    "data": {
      "selectValuesDoNotMatchLabels": 2,
      "selectResourceValueAndLabel": "val",
      "selectDataSourceValueAndLabel": "AR",
      "submit": true
    },
    "metadata": {
        "selectData": {
            "selectValuesDoNotMatchLabels": {
                "label": "Two"
            },
            "selectResourceValueAndLabel": {
                "data":  {
                  "label": "label"
                }
            },
            "selectDataSourceValueAndLabel": {
                "name": "Arkansas"
            }
        }
    }
  }
}
