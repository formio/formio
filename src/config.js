'use strict'

module.exports = {
  port: process.env.PORT || 3000,
  mongo: process.env.MONGO || 'mongodb://localhost:27017',
  mongoDatabase: process.env.MONGO_DATABASE || 'formio',
  jwt: {
    secret: process.env.JWT_SECRET,
    expireTime: process.env.JWT_EXPIRETIME || 240,
  }
};
