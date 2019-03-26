'use strict'

const dbs = require('./dbs');
const MongoWrapper = require('./dbs/mongodb');

module.exports = config => {
  let connection = false;
  // Find which database has a configuration and instantiate it.
  Object.keys(dbs).forEach(dbName => {
    if (!connection && config[dbName]) {
      console.log(`Connecting to ${dbName} database`);
      connection = new dbs[dbName](config[dbName]);
    }
  });
  if (connection) {
    return connection;
  }
  console.log('Error: No database configured');
  return false;
};
