'use strict';

const db = require('./db');
const actions = require('./actions');

module.exports = config => Promise.all([
  db(config),
  actions(config),
]);
