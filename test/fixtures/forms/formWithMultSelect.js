module.exports = {
    form: {
        title: 'test multiple csv',
        name: 'testmultiplecsv',
        path: 'testmultiplecsv',
        type: 'form',
        display: 'form',
        components: [{
                label: '16.1 - Select-URL',
                widget: 'choicesjs',
                tableView: true,
                multiple: true,
                dataSrc: 'url',
                data: {
                    url: 'https://cdn.rawgit.com/mshafrir/2646763/raw/states_titlecase.json',
                    headers: [{
                        key: '',
                        value: '',
                    }, ],
                },
                lazyLoad: false,
                disableLimit: false,
                template: '<span>{{ item.name }}</span>',
                noRefreshOnScroll: false,
                validateWhenHidden: false,
                key: 'SelectUrl',
                type: 'select',
                input: true,
            },
            {
                label: '16.2 - Select - Raw JSON',
                widget: 'choicesjs',
                tableView: true,
                multiple: true,
                dataSrc: 'json',
                data: {
                    json: [{
                            label: 'Apples',
                            value: 'apples',
                        },
                        {
                            label: 'Banana',
                            value: 'banana',
                        },
                        {
                            label: 'Orange',
                            value: 'orange',
                        },
                        {
                            label: 'Peach',
                            value: 'peach',
                        },
                        {
                            label: 'Pineapple',
                            value: 'pineapple',
                        },
                        {
                            label: 'Mango',
                            value: 'mango',
                        },
                        {
                            label: 'Pear',
                            value: 'pear',
                        },
                        {
                            label: 'Tangerine',
                            value: 'tangerine',
                        },
                        {
                            label: 'Avocado',
                            value: 'avocado',
                        },
                        {
                            label: 'Watermelon',
                            value: 'watermelon',
                        },
                        {
                            label: 'Berries',
                            value: 'berries',
                        },
                        {
                            label: 'Cherries',
                            value: 'cherries',
                        },
                        {
                            label: 'Melon',
                            value: 'melon',
                        },
                        {
                            label: 'Lemon',
                            value: 'lemon',
                        },
                        {
                            label: 'Strawberry',
                            value: 'strawberry',
                        },
                        {
                            label: 'Grapes',
                            value: 'grapes',
                        },
                        {
                            label: 'Coconut',
                            value: 'coconut',
                        },
                        {
                            label: 'Fig',
                            value: 'fig',
                        },
                        {
                            label: 'Plum',
                            value: 'plum',
                        },
                        {
                            label: 'Kiwifruit',
                            value: 'kiwifruit',
                        },
                    ],
                },
                validateWhenHidden: false,
                key: 'SelectRawJson',
                type: 'select',
                input: true,
            },
            {
                label: '16.3 Select Resource',
                widget: 'choicesjs',
                description: 'lazy load= false',
                tableView: true,
                multiple: true,
                dataSrc: 'resource',
                data: {
                    resource: '6939646b2399a4c2e548d2f5',
                },
                lazyLoad: false,
                searchField: 'data.valueProperty__regex',
                template: '<span>{{ item.data.label }}</span>',
                noRefreshOnScroll: false,
                addResource: false,
                reference: false,
                validate: {
                    select: false,
                },
                validateWhenHidden: false,
                key: 'SelectResource',
                type: 'select',
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
    submission: {
        data: {
            SelectUrl: [{
                    name: 'Alaska',
                    abbreviation: 'AK'
                },
                {
                    name: 'California',
                    abbreviation: 'CA'
                },
                {
                    name: 'Connecticut',
                    abbreviation: 'CT'
                },
            ],
            SelectRawJson: [{
                    label: 'Banana',
                    value: 'banana'
                },
                {
                    label: 'Pineapple',
                    value: 'pineapple'
                },
                {
                    label: 'Pear',
                    value: 'pear'
                },
            ],
            SelectResource: [{
                    data: {
                        label: 'Apple',
                        valueProperty: 'ap'
                    },
                    state: 'submitted',
                },
                {
                    data: {
                        label: 'Strawberry',
                        valueProperty: 'st'
                    },
                    state: 'submitted',
                },
            ],
            submit: true,
        },
        state: 'submitted',
    },
};