/* eslint-disable */
// A datamap whose valueComponent is a container holding a public `name` textfield
// and a `protected` `ssn` textfield. Datamaps key values by user-supplied strings,
// so the schema key (`container`) never matches the stored data — redaction must
// rebuild the value component per dynamic key. The map keys survive; every nested
// protected `ssn` is stripped; the nested `name` and the sibling top-level `name`
// survive.
module.exports = {
  components: [
    {
      label: 'Data Map',
      tableView: false,
      validateWhenHidden: false,
      key: 'dataMap',
      type: 'datamap',
      input: true,
      valueComponent: {
        label: 'Container',
        tableView: false,
        validateWhenHidden: false,
        key: 'container',
        type: 'container',
        input: true,
        components: [
          {
            label: 'Name',
            applyMaskOn: 'change',
            tableView: true,
            validateWhenHidden: false,
            key: 'name',
            type: 'textfield',
            input: true,
          },
          {
            label: 'SSN',
            applyMaskOn: 'change',
            tableView: true,
            protected: true,
            validateWhenHidden: false,
            key: 'ssn',
            type: 'textfield',
            input: true,
          },
        ],
      },
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
  // Multiple dynamic keys so we assert redaction reaches every entry.
  submission: {
    dataMap: {
      alpha: { name: 'public_alpha', ssn: 'secret_alpha' },
      beta: { name: 'public_beta', ssn: 'secret_beta' },
    },
  },
  // What the API should return: nested public `name` per entry, no protected `ssn`.
  expected: {
    dataMap: {
      alpha: { name: 'public_alpha' },
      beta: { name: 'public_beta' },
    },
  },
};
