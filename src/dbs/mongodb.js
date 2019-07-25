'use strict';

const ID = require('mongodb').ObjectID;
const MongoClient = require('mongodb').MongoClient;
const log = require('form-api').log;

module.exports = class MongoDB {
  constructor(config) {
    this.toID = value => new ID(value);
    this.connectionString = config.connectionString;
    this.database = config.database;

    // Cache collection names
    this.dbs = {};

    this.ready = new Promise((resolve, reject) => {
      MongoClient.connect(this.connectionString, (err, client) => {
        if (err) {
          log('error', err);
          return reject(err);
        }
        else {
          console.log(' > Successfully connected to mongodb');
          return resolve(client);
        }
      });
    });
  }

  getDb(name) {
    // Db connection cache.
    if (this.dbs.hasOwnProperty(name)) {
      return Promise.resolve(this.dbs[name]);
    }
    return this.ready.then(client => {
      this.dbs[name] = client.db(name);
      return this.dbs[name];
    });
  }

  collection(name, {database} = {}) {
    return this.getDb(database || this.database).then(db => {
      return db.collection(name);
    });
  }

  getCollections({database} = {}) {
    return this.getDb(database || this.database).then(db => {
      return new Promise((resolve, reject) => {
        db.listCollections().toArray((err, collections) => {
          if (err) {
            return reject(err);
          }
          this.collections = collections.map(collection => collection.name);
          return resolve(this.collections);
        });
      });
    });
  }

  getIndexes(collection, {database} = {}) {
    return this.getDb(database || this.database).then(db => {
      return db.collection(collection).indexes();
    });
  }

  createCollection(name, options, {database} = {}) {
    return this.getDb(database || this.database).then(db => {
      return db.createCollection(name, options);
    });
  }

  createIndex(collection, def, options, {database} = {}) {
    return this.getDb(database || this.database).then(db => {
      return db.collection(collection).createIndex(def, options)
        .catch(() => {/* Swallow errors.*/});
    });
  }

  find(collection, query, options, info) {
    return new Promise((resolve, reject) => {
      this.collection(collection, info).then(collection => collection.find(query, options).toArray((err, docs) => {
        if (err) {
          return reject(err);
        }
        return resolve(docs);
      }));
    });
  }

  count(collection, query, info) {
    return this.collection(collection, info).then(collection => collection.count(query));
  }

  create(collection, doc, info) {
    return this.collection(collection, info)
      .then(collection => collection.insertOne(doc))
      .then((result) => result.ops[0]);
  }

  read(collection, query, options, info) {
    return this.collection(collection, info).then(collection => collection.findOne(query, options));
  }

  update(collection, doc, info) {
    return this.collection(collection, info)
      .then(collection => collection.findOneAndUpdate({_id: doc._id}, doc, {returnOriginal: false}))
      .then(result => result.value);
  }

  delete(collection, _id, info) {
    return this.collection(collection, info).then(collection => collection.deleteOne({_id}));
  }
};
