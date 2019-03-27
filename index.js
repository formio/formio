/**
 * The primary export file for Formio. This can be used to extend the server and add your own customizations.
 *
 * @type {{Action, FormApi, log, actions, dbs, resources, schemas}|*}
 */
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
