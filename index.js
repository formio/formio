'use strict'

/**
 * The primary export file for Formio. This can be used to extend the server and add your own customizations.
 *
 * @type {{Action, FormApi, log, actions, dbs, resources, schemas}|*}
 */
const FormApi = require('form-api');
const Formio = require('./src/Formio');
const dbs = require('./src/dbs');

module.exports = {
  ...FormApi,
  Formio,
  dbs: {
    ...FormApi.dbs,
    ...dbs
  },
};
