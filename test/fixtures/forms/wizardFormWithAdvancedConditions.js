module.exports = {
    "components" : [
       {
          "collapsible" : false,
          "scrollToTop" : false,
          "input" : false,
          "components" : [
             {
                "input" : true,
                "type" : "textfield",
                "applyMaskOn" : "change",
                "label" : "Text Field",
                "key" : "textField",
                "tableView" : true
             }
          ],
          "saveOnEnter" : false,
          "navigateOnEnter" : false,
          "tableView" : false,
          "key" : "page1",
          "label" : "Page 1",
          "type" : "panel",
          "title" : "Page 1",
          "breadcrumbClickable" : true,
          "buttonSettings" : {
             "previous" : false,
             "next" : false,
             "cancel" : false
          }
       },
       {
          "collapsible" : false,
          "scrollToTop" : false,
          "input" : false,
          "components" : [
             {
                "input" : true,
                "type" : "textfield",
                "label" : "Text Field",
                "key" : "textField1",
                "tableView" : true
             }
          ],
          "saveOnEnter" : false,
          "navigateOnEnter" : false,
          "tableView" : false,
          "key" : "page2",
          "label" : "Page 2",
          "type" : "panel",
          "title" : "Page 2",
          "breadcrumbClickable" : true,
          "buttonSettings" : {
             "previous" : false,
             "next" : false,
             "cancel" : false
          }
       },
       {
          "input" : false,
          "components" : [],
          "type" : "panel",
          "label" : "Page 3",
          "title" : "Page 3",
          "tableView" : false,
          "key" : "page3"
       },
       {
          "input" : false,
          "columns" : [
             {
                "width" : 2,
                "currentWidth" : 2,
                "push" : 0,
                "pull" : 0,
                "components" : [
                   {
                      "input" : true,
                      "custom" : "instance.root.nextPage().then(()=>{\n  changeTooltipIconClass();\n});",
                      "key" : "next",
                      "tableView" : false,
                      "showValidations" : true,
                      "action" : "custom",
                      "label" : "Continue",
                      "block" : true,
                      "type" : "button",
                      "customConditional" : "show=!instance.root.isLastPage()\r\n"
                   }
                ],
                "offset" : 0,
                "size" : "md"
             },
             {
                "width" : 6,
                "currentWidth" : 6,
                "push" : 0,
                "pull" : 0,
                "components" : [],
                "size" : "md",
                "offset" : 0
             }
          ],
          "type" : "columns",
          "label" : "Columns",
          "tableView" : false,
          "customConditional" : "show=false;\r\nif (instance.root.page>0) {\r\n  show=true;\r\n}\r\n    ",
          "key" : "columns1"
       }
    ],
    "display" : "wizard",
    "plan" : "commercial",
    "name" : "wizardTest",
    "path" : "wizardTest",
    "type" : "form",
    "title" : "wizardTest"
}