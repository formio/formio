'use strict'

/**
 * The primary export file for Formio. This can be used to extend the server and add your own customizations.
 *
 * @type {{Action, FormApi, log, actions, dbs, resources, schemas}|*}
 */
const FormApi = require('@formio/api');
const Formio = require('./src/Formio');
const dbs = require('./src/dbs');
const db = require('./src/init/db');
const remoteActions = require('./src/init/remoteActions');
const config = require('./src/config');

module.exports = {
  ...FormApi,
  Formio,
  dbs: {
    ...FormApi.dbs,
    ...dbs
  },
  init: {
    db,
    remoteActions
  },
  config,
};
