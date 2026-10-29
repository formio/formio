/* eslint-disable */
// Two distinct child forms, each with a public + protected field, and a parent
// with its own public/protected pair embedding childA with reference: true
// (hydrated pointer) and childB with reference: false (inline copy). Used to
// assert protected redaction in API responses across both nested branches.
const child = (letter) => ({
  title: `Nested Child ${letter}`,
  name: `nestedChild${letter}`,
  path: `nestedchild${letter.toLowerCase()}`,
  type: 'form',
  components: [
    { type: 'textfield', key: `child${letter}Public`, input: true },
    { type: 'textfield', key: `child${letter}Secret`, input: true, protected: true },
  ],
});

module.exports = {
  childFormA: () => child('A'),
  childFormB: () => child('B'),
  parentForm: (childAId, childBId) => ({
    title: 'Nested Parent Protected',
    name: 'nestedParentProtected',
    path: 'nestedparentprotected',
    type: 'form',
    components: [
      { type: 'textfield', key: 'parentPublic', input: true },
      { type: 'textfield', key: 'parentSecret', input: true, protected: true },
      { type: 'form', key: 'childA', form: childAId, reference: true, input: true },
      { type: 'form', key: 'childB', form: childBId, reference: false, input: true },
    ],
  }),
  submission: {
    data: {
      parentPublic: 'pp',
      parentSecret: 'ps',
      childA: { data: { childAPublic: 'cap', childASecret: 'cas' } },
      childB: { data: { childBPublic: 'cbp', childBSecret: 'cbs' } },
    },
  },
};
