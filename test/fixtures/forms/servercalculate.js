module.exports = {
    components: [
        {
            "label": "Columns",
            "columns": [
                {
                    "components": [
                        {
                            "label": "Select the Number of Widgets",
                            "widget": "choicesjs",
                            "tableView": true,
                            "data": {
                                "values": [
                                    {
                                        "label": "1",
                                        "value": "1"
                                    },
                                    {
                                        "label": "2",
                                        "value": "2"
                                    },
                                    {
                                        "label": "3",
                                        "value": "3"
                                    },
                                    {
                                        "label": "4",
                                        "value": "4"
                                    },
                                    {
                                        "label": "5",
                                        "value": "5"
                                    }
                                ]
                            },
                            "dataType": "number",
                            "selectThreshold": 0.3,
                            "validate": {
                                "required": true
                            },
                            "key": "numberOfWidgets",
                            "type": "select",
                            "indexeddb": {
                                "filter": {}
                            },
                            "input": true,
                            "hideOnChildrenHidden": false
                        },
                        {
                            "label": "Price per Widget",
                            "mask": false,
                            "spellcheck": true,
                            "tableView": false,
                            "currency": "USD",
                            "inputFormat": "plain",
                            "calculateValue": "value = 29.95;",
                            "calculateServer": true,
                            "key": "pricePerWidget",
                            "type": "currency",
                            "input": true,
                            "delimiter": true,
                            "hideOnChildrenHidden": false
                        },
                        {
                            "label": "Choose One",
                            "optionsLabelPosition": "right",
                            "inline": false,
                            "tableView": false,
                            "values": [
                                {
                                    "label": "Option 1",
                                    "value": "option1",
                                    "shortcut": ""
                                },
                                {
                                    "label": "Option 2",
                                    "value": "option2",
                                    "shortcut": ""
                                },
                                {
                                    "label": "Option 3",
                                    "value": "option3",
                                    "shortcut": ""
                                }
                            ],
                            "validate": {
                                "required": true
                            },
                            "key": "chooseOne",
                            "type": "radio",
                            "input": true,
                            "hideOnChildrenHidden": false
                        },
                        {
                            "label": "Total",
                            "mask": false,
                            "spellcheck": true,
                            "tableView": false,
                            "currency": "USD",
                            "inputFormat": "plain",
                            "calculateValue": "value = data.numberOfWidgets * data.pricePerWidget;",
                            "calculateServer": true,
                            "key": "total",
                            "type": "currency",
                            "input": true,
                            "delimiter": true,
                            "hideOnChildrenHidden": false
                        }
                    ],
                    "width": 4,
                    "offset": 0,
                    "push": 0,
                    "pull": 0,
                    "size": "md"
                },
                {
                    "components": [],
                    "width": 4,
                    "offset": 0,
                    "push": 0,
                    "pull": 0,
                    "size": "md"
                }
            ],
            "key": "columns",
            "type": "columns",
            "input": false,
            "tableView": false
        },
        {
            "label": "Submit",
            "showValidations": false,
            "tableView": false,
            "key": "submit",
            "type": "button",
            "input": true
        }
    ],
    submission: {
        "numberOfWidgets": 2,
        "pricePerWidget": 29.95,
        "chooseOne": "option1",
        "total": 59.9
    },
    falseSubmission: {
        "numberOfWidgets": "nothing",
        "pricePerWidget": 29.95,
        "chooseOne": "option1",
        "total": null
    }
};
