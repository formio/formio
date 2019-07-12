'use strict'

const config = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expireTime: process.env.JWT_EXPIRETIME || 240,
  },
  cronTime: process.env.CRON_TIME || '*/15 * * * *',
};

if (process.env.MONGO) {
  config.mongodb = {
    connectionString: process.env.MONGO,
    database: process.env.MONGO_DATABASE || 'formio',
  }
}

module.exports = config;
