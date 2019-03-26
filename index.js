const FormApi = require('form-api');
const Formio = require('./src/Formio');
const actions = require('./src/actions');
const dbs = require('./src/dbs');
const resources = require('./src/resources');
const schemas = require('./src/schemas');

module.exports = {
  ...FormApi,
  Formio,
  actions: {
    ...FormApi.actions,
    ...actions
  },
  dbs: {
    ...FormApi.dbs,
    ...dbs
  },
  resources: {
    ...FormApi.resources,
    ...resources
  },
  schemas: {
    ...FormApi.schemas,
    ...schemas
  },
};
