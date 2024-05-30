import { Form, FormProps } from "@formio/react";

const DEFAULT_SEARCH_FORM = {
    display: "form" as const,
    components: [
        {
            label: "Columns",
            columns: [
                {
                    components: [
                        {
                            label: "Text Field",
                            prefix: '<i class="bi bi-search"></i>',
                            applyMaskOn: "change",
                            hideLabel: true,
                            tableView: true,
                            key: "textField",
                            type: "textfield",
                            input: true,
                        },
                    ],
                    offset: 0,
                    push: 0,
                    pull: 0,
                    size: "md",
                    currentWidth: 8,
                    width: 8,
                },
                {
                    components: [
                        {
                            label: "Select",
                            widget: "choicesjs",
                            hideLabel: true,
                            tableView: true,
                            data: {
                                values: [
                                    {
                                        label: "Name",
                                        value: "name",
                                    },
                                    {
                                        label: "Title",
                                        value: "title",
                                    },
                                    {
                                        label: "Tag",
                                        value: "tag",
                                    },
                                ],
                            },
                            key: "select",
                            type: "select",
                            input: true,
                        },
                    ],
                    offset: 0,
                    push: 0,
                    pull: 0,
                    size: "md",
                    currentWidth: 4,
                    width: 4,
                },
            ],
            key: "columns",
            type: "columns",
            input: false,
            tableView: false,
        },
    ],
};

export const SearchForm = ({
    onChange,
}: {
    onChange?: FormProps["onChange"];
}) => {
    return <Form src={DEFAULT_SEARCH_FORM} onChange={onChange} />;
};
