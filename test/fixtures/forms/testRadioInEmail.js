'use strict';
module.exports = {
  form: {
    title: '1',
    name: '1',
    path: '1',
    type: 'form',
    display: 'form',
    components: [
      {
        label: 'Radio (value = string)',
        optionsLabelPosition: 'right',
        inline: false,
        tableView: true,
        values: [
          {
            label: 'one',
            value: 'one',
            shortcut: '',
          },
          {
            label: 'two',
            value: 'two',
            shortcut: '',
          },
          {
            label: 'three',
            value: 'three',
            shortcut: '',
          },
        ],
        validateWhenHidden: false,
        key: 'radio',
        type: 'radio',
        input: true,
      },
      {
        label: 'Radio (value = number)',
        optionsLabelPosition: 'right',
        inline: false,
        tableView: false,
        values: [
          {
            label: 'one',
            value: '111',
            shortcut: '',
          },
          {
            label: 'two',
            value: '222',
            shortcut: '',
          },
          {
            label: 'three',
            value: '333',
            shortcut: '',
          },
        ],
        validateWhenHidden: false,
        key: 'radio1',
        type: 'radio',
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
    data: { radio: 'one', radio1: 222, submit: true },
    state: 'submitted',
  },
};
