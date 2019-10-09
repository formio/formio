import {Database} from '@formio/api/lib/dbs/Database';
import {dbs} from '../dbs';
import {log} from '../log';

export const db = (config) => {
  let connection: Database;
  log('log', 'Initializing DB Connection');
  // Find which database has a configuration and instantiate it.
  Object.keys(dbs).forEach((dbName) => {
    if (!connection && config[dbName.toLowerCase()]) {
      log('log', `  > Connecting to ${dbName} database`);
      connection = (new dbs[dbName](config[dbName.toLowerCase()]) as Database);
    }
  });
  if (connection) {
    return connection.ready.then(() => connection);
  }

  return Promise.reject('Error: No database configured');
};
