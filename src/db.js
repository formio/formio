'use strict'

const MongoWrapper = require('./dbs/mongodb');

module.exports = config => {
  console.log('Connecting to database');
  if (config.mongo) {
    return new MongoWrapper(config.mongo, config.mongoDatabase);
  }
  else {
    console.log('Error: No database configured');
    return false;
  }
};