'use strict';

const dbs = require('../dbs');

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
    return connection.ready.then(() => connection);
  }

  return Promise.reject('Error: No database configured');
};
