'use strict';

const db = require('./db');
const actions = require('./remoteActions');

module.exports = config => Promise.all([
  db(config),
  actions(config),
]);
