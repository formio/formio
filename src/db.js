'use strict'

const dbs = require('./dbs');
const MongoWrapper = require('./dbs/mongodb');

module.exports = config => {
  let connection = false;
  console.log('Initializing DB Connection');
  // Find which database has a configuration and instantiate it.
  Object.keys(dbs).forEach(dbName => {
    if (!connection && config[dbName]) {
      console.log(` > Connecting to ${dbName} database`);
      connection = new dbs[dbName](config[dbName]);
    }
  });
  if (connection) {
    return connection;
  }
  return false;
};
