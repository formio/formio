module.exports = {
    title: "Form with Review Page",
    name: "formWithReviewPage",
    path: "formWithReviewPage",
    type: "form",
    display: "form",
    owner: "62e1332c98da5d30a9ea6510",
    components: [
        {
            label: "Text Field",
            applyMaskOn: "change",
            tableView: true,
            validateWhenHidden: false,
            key: "textField",
            type: "textfield",
            input: true
        },
        {
            label: "Number",
            applyMaskOn: "change",
            mask: false,
            tableView: false,
            delimiter: false,
            requireDecimal: false,
            inputFormat: "plain",
            truncateMultipleSpaces: false,
            validateWhenHidden: false,
            key: "number",
            type: "number",
            input: true
        },
        {
            label: "Review Page",
            reviewFields: [
                {
                    path: "textField1",
                    label: "Text Field"
                },
                {
                    path: "number",
                    label: "Number"
                }
            ],
            type: "reviewpage",
            input: true,
            key: "reviewPage",
            tableView: false,
            tag: "div"
        },
        {
            type: "button",
            label: "Submit",
            key: "submit",
            disableOnInvalid: true,
            input: true,
            tableView: false
        }
    ]
}