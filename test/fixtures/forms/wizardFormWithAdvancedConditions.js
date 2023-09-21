module.exports = {
    "components" : [
      {
         "title": "Page 1",
         "label": "Page 1",
         "type": "panel",
         "key": "page1",
         "components": [
         {
            "label": "Number",
            "applyMaskOn": "change",
            "mask": false,
            "tableView": false,
            "delimiter": false,
            "requireDecimal": false,
            "inputFormat": "plain",
            "truncateMultipleSpaces": false,
            "key": "number",
            "type": "number",
            "input": true
         }],
         "input": false,
         "tableView": false
      },
      {
         "title": "Page 2",
         "breadcrumbClickable": true,
         "buttonSettings":
         {
            "previous": true,
            "cancel": true,
            "next": true
         },
         "navigateOnEnter": false,
         "saveOnEnter": false,
         "scrollToTop": false,
         "collapsible": false,
         "key": "page2",
         "conditional":
         {
            "show": true,
            "conjunction": "all",
            "conditions": [
            {
               "component": "number",
               "operator": "isEqual",
               "value": 2
            }]
         },
         "type": "panel",
         "label": "Page 2",
         "components": [
         {
            "label": "Text Field",
            "applyMaskOn": "change",
            "tableView": true,
            "clearOnHide": false,
            "key": "textField",
            "type": "textfield",
            "input": true
         },
         {
            "label": "Text Area",
            "applyMaskOn": "change",
            "autoExpand": false,
            "tableView": true,
            "key": "textArea",
            "type": "textarea",
            "input": true
         }],
         "input": false,
         "tableView": false
      }
    ],
    "display" : "wizard",
    "plan" : "commercial",
    "name" : "wizardTest",
    "path" : "wizardTest",
    "type" : "form",
    "title" : "wizardTest"
}