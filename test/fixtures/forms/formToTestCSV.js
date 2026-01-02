module.exports = {
    dataTableResource: {
        title: 'Test',
        name: 'datatableresource',
        path: 'datatableresource',
        type: 'resource',
        display: 'form',
        components: [{
                label: 'Text Field',
                applyMaskOn: 'change',
                tableView: true,
                validateWhenHidden: false,
                key: 'textField',
                type: 'textfield',
                input: true,
            },
            {
                label: 'Text Area',
                applyMaskOn: 'change',
                autoExpand: false,
                tableView: true,
                validateWhenHidden: false,
                key: 'textArea',
                type: 'textarea',
                input: true,
            },
            {
                type: 'button',
                label: 'Submit',
                key: 'submit',
                disableOnInvalid: true,
                input: true,
                tableView: false,
            },
        ],
    },
    form: {
        title: 'CSV bug',
        name: 'testcsvform',
        path: 'testcsvform',
        type: 'form',
        display: 'form',
        components: [{
                label: '15 - Select Boxes URL',
                optionsLabelPosition: 'right',
                inline: true,
                tableView: true,
                dataSrc: 'url',
                valueProperty: 'abbreviation',
                validateWhenHidden: false,
                key: 'SelectBoxesURL',
                type: 'selectboxes',
                data: {
                    url: 'https://gists.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
                    headers: [{
                        key: '',
                        value: '',
                    }, ],
                },
                template: '<span>{{ item.name }}</span>',
                input: true,
                inputType: 'checkbox',
            },
            {
                label: '18 - Radio URL',
                optionsLabelPosition: 'right',
                inline: true,
                tableView: true,
                dataSrc: 'url',
                data: {
                    url: 'https://gists.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
                    headers: [{
                        key: '',
                        value: '',
                    }, ],
                },
                valueProperty: 'abbreviation',
                template: '<span>{{ item.name }}</span>',
                validateWhenHidden: false,
                key: 'radioUrl',
                type: 'radio',
                input: true,
            },
            {
                label: '19 Data Map',
                tableView: true,
                validateWhenHidden: false,
                key: 'dataMap',
                type: 'datamap',
                input: true,
                valueComponent: {
                    type: 'textfield',
                    key: 'value',
                    label: 'Value',
                    input: true,
                    hideLabel: true,
                    tableView: true,
                },
            },
            {
                label: '20.Tagpad',
                imageUrl: 'https://img.freepik.com/free-vector/flat-fruit-collection_23-2148938827.jpg?w=1060&t=st=1721723798~exp=1721724398~hmac=b90408a1f05bd5cea1ba0a5552816bccfc78aae991eb318dfad9816004f01854',
                tableView: true,
                validateWhenHidden: false,
                key: 'tagpad',
                type: 'tagpad',
                input: true,
                components: [{
                    label: 'Text Field tagpad',
                    applyMaskOn: 'change',
                    tableView: true,
                    validateWhenHidden: false,
                    key: 'textFieldTagpad',
                    type: 'textfield',
                    input: true,
                }, ],
            },
            {
                label: '21. Data Table',
                sortable: true,
                filterable: true,
                clipCells: false,
                itemsPerPage: 10,
                tableView: false,
                submitSelectedRows: true,
                validateWhenHidden: false,
                fetch: {
                    enableFetch: true,
                    dataSrc: 'resource',
                    authenticate: false,
                    sort: {
                        defaultQuery: '',
                    },
                    resource: '693964af2399a4c2e548d7c8',
                    components: [{
                            path: 'textField',
                            key: 'textField',
                        },
                        {
                            path: 'textArea',
                            key: 'textArea',
                        },
                    ],
                },
                allowCaching: true,
                key: 'dataTableRes',
                type: 'datatable',
                indexeddb: {},
                input: true,
                enableRowSelect: false,
                components: [],
            },
            {
                type: 'button',
                label: 'Submit',
                key: 'submit',
                disableOnInvalid: true,
                input: true,
                tableView: false,
            },
        ],
    },
    submission: {
        data: {
            SelectBoxesURL: {
                AL: false,
                AK: false,
                AS: false,
                AZ: false,
                AR: false,
                CA: true,
                CO: false,
                CT: false,
                DE: false,
                DC: false,
                FM: false,
                FL: false,
                GA: false,
                GU: false,
                HI: false,
                ID: false,
                IL: false,
                IN: false,
                IA: false,
                KS: false,
                KY: false,
                LA: false,
                ME: false,
                MH: false,
                MD: false,
                MA: true,
                MI: false,
                MN: false,
                MS: false,
                MO: false,
                MT: true,
                NE: false,
                NV: false,
                NH: false,
                NJ: false,
                NM: false,
                NY: false,
                NC: false,
                ND: false,
                MP: false,
                OH: false,
                OK: false,
                OR: false,
                PW: false,
                PA: false,
                PR: false,
                RI: false,
                SC: false,
                SD: false,
                TN: false,
                TX: false,
                UT: false,
                VT: false,
                VI: false,
                VA: false,
                WA: false,
                WV: false,
                WI: false,
                WY: false,
            },
            radioUrl: 'KS',
            dataMap: {
                key: 'test1',
                key1: 'test2'
            },
            tagpad: [{
                    coordinate: {
                        x: 388,
                        y: 290,
                        width: 599,
                        height: 399
                    },
                    data: {
                        textFieldTagpad: 'test1tagpad'
                    },
                },
                {
                    coordinate: {
                        x: 106,
                        y: 155,
                        width: 295,
                        height: 197
                    },
                    data: {
                        textFieldTagpad: 'test2tagpad'
                    },
                },
            ],
            dataTableRes: [{
                textField: 'unique',
                textArea: 'uniq'
            }],
            submit: true,
        },
        metadata: {
            selectData: {
                SelectBoxesURL: [{
                    name: 'California'
                }, {
                    name: 'Massachusetts'
                }, {
                    name: 'Montana'
                }],
                radioUrl: {
                    name: 'Kansas'
                },
            },
            listData: {
                SelectBoxesURL: [{
                        name: 'Alabama'
                    },
                    {
                        name: 'Alaska'
                    },
                    {
                        name: 'American Samoa'
                    },
                    {
                        name: 'Arizona'
                    },
                    {
                        name: 'Arkansas'
                    },
                    {
                        name: 'California'
                    },
                    {
                        name: 'Colorado'
                    },
                    {
                        name: 'Connecticut'
                    },
                    {
                        name: 'Delaware'
                    },
                    {
                        name: 'District Of Columbia'
                    },
                    {
                        name: 'Federated States Of Micronesia'
                    },
                    {
                        name: 'Florida'
                    },
                    {
                        name: 'Georgia'
                    },
                    {
                        name: 'Guam'
                    },
                    {
                        name: 'Hawaii'
                    },
                    {
                        name: 'Idaho'
                    },
                    {
                        name: 'Illinois'
                    },
                    {
                        name: 'Indiana'
                    },
                    {
                        name: 'Iowa'
                    },
                    {
                        name: 'Kansas'
                    },
                    {
                        name: 'Kentucky'
                    },
                    {
                        name: 'Louisiana'
                    },
                    {
                        name: 'Maine'
                    },
                    {
                        name: 'Marshall Islands'
                    },
                    {
                        name: 'Maryland'
                    },
                    {
                        name: 'Massachusetts'
                    },
                    {
                        name: 'Michigan'
                    },
                    {
                        name: 'Minnesota'
                    },
                    {
                        name: 'Mississippi'
                    },
                    {
                        name: 'Missouri'
                    },
                    {
                        name: 'Montana'
                    },
                    {
                        name: 'Nebraska'
                    },
                    {
                        name: 'Nevada'
                    },
                    {
                        name: 'New Hampshire'
                    },
                    {
                        name: 'New Jersey'
                    },
                    {
                        name: 'New Mexico'
                    },
                    {
                        name: 'New York'
                    },
                    {
                        name: 'North Carolina'
                    },
                    {
                        name: 'North Dakota'
                    },
                    {
                        name: 'Northern Mariana Islands'
                    },
                    {
                        name: 'Ohio'
                    },
                    {
                        name: 'Oklahoma'
                    },
                    {
                        name: 'Oregon'
                    },
                    {
                        name: 'Palau'
                    },
                    {
                        name: 'Pennsylvania'
                    },
                    {
                        name: 'Puerto Rico'
                    },
                    {
                        name: 'Rhode Island'
                    },
                    {
                        name: 'South Carolina'
                    },
                    {
                        name: 'South Dakota'
                    },
                    {
                        name: 'Tennessee'
                    },
                    {
                        name: 'Texas'
                    },
                    {
                        name: 'Utah'
                    },
                    {
                        name: 'Vermont'
                    },
                    {
                        name: 'Virgin Islands'
                    },
                    {
                        name: 'Virginia'
                    },
                    {
                        name: 'Washington'
                    },
                    {
                        name: 'West Virginia'
                    },
                    {
                        name: 'Wisconsin'
                    },
                    {
                        name: 'Wyoming'
                    },
                ],
                radioUrl: [{
                        name: 'Alabama'
                    },
                    {
                        name: 'Alaska'
                    },
                    {
                        name: 'American Samoa'
                    },
                    {
                        name: 'Arizona'
                    },
                    {
                        name: 'Arkansas'
                    },
                    {
                        name: 'California'
                    },
                    {
                        name: 'Colorado'
                    },
                    {
                        name: 'Connecticut'
                    },
                    {
                        name: 'Delaware'
                    },
                    {
                        name: 'District Of Columbia'
                    },
                    {
                        name: 'Federated States Of Micronesia'
                    },
                    {
                        name: 'Florida'
                    },
                    {
                        name: 'Georgia'
                    },
                    {
                        name: 'Guam'
                    },
                    {
                        name: 'Hawaii'
                    },
                    {
                        name: 'Idaho'
                    },
                    {
                        name: 'Illinois'
                    },
                    {
                        name: 'Indiana'
                    },
                    {
                        name: 'Iowa'
                    },
                    {
                        name: 'Kansas'
                    },
                    {
                        name: 'Kentucky'
                    },
                    {
                        name: 'Louisiana'
                    },
                    {
                        name: 'Maine'
                    },
                    {
                        name: 'Marshall Islands'
                    },
                    {
                        name: 'Maryland'
                    },
                    {
                        name: 'Massachusetts'
                    },
                    {
                        name: 'Michigan'
                    },
                    {
                        name: 'Minnesota'
                    },
                    {
                        name: 'Mississippi'
                    },
                    {
                        name: 'Missouri'
                    },
                    {
                        name: 'Montana'
                    },
                    {
                        name: 'Nebraska'
                    },
                    {
                        name: 'Nevada'
                    },
                    {
                        name: 'New Hampshire'
                    },
                    {
                        name: 'New Jersey'
                    },
                    {
                        name: 'New Mexico'
                    },
                    {
                        name: 'New York'
                    },
                    {
                        name: 'North Carolina'
                    },
                    {
                        name: 'North Dakota'
                    },
                    {
                        name: 'Northern Mariana Islands'
                    },
                    {
                        name: 'Ohio'
                    },
                    {
                        name: 'Oklahoma'
                    },
                    {
                        name: 'Oregon'
                    },
                    {
                        name: 'Palau'
                    },
                    {
                        name: 'Pennsylvania'
                    },
                    {
                        name: 'Puerto Rico'
                    },
                    {
                        name: 'Rhode Island'
                    },
                    {
                        name: 'South Carolina'
                    },
                    {
                        name: 'South Dakota'
                    },
                    {
                        name: 'Tennessee'
                    },
                    {
                        name: 'Texas'
                    },
                    {
                        name: 'Utah'
                    },
                    {
                        name: 'Vermont'
                    },
                    {
                        name: 'Virgin Islands'
                    },
                    {
                        name: 'Virginia'
                    },
                    {
                        name: 'Washington'
                    },
                    {
                        name: 'West Virginia'
                    },
                    {
                        name: 'Wisconsin'
                    },
                    {
                        name: 'Wyoming'
                    },
                ],
            },
        },
        state: 'submitted',
        _vnote: '',
    },
};