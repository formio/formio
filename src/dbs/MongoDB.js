'use strict';

const { ObjectID } = require('mongodb');
const { MongoClient } = require('mongodb');
const { dbs, log } = require('@formio/form-api');
const PreserveModel = require('./PreserveModel');

module.exports = class MongoDB extends dbs.Database {
  constructor(config) {
    super(config);
    this.toID = value => new ObjectID(value);
    this.config = config;

    // TODO: Change this to class property.
    this.Model = PreserveModel;

    // Cache collection names
    this.dbs = {};

    this.ready = new Promise((resolve, reject) => {
      MongoClient.connect(this.config.connectionString, (err, client) => {
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

  getDatabaseName() {
    return this.config.database;
  }

  async collection(name, database = this.config.database) {
    const db = await this.getDb(database);
    return await db.collection(name);
  }

  async getCollections(database = this.config.database) {
    const db = await this.getDb(database);

    return new Promise((resolve, reject) => {
      db.listCollections().toArray((err, collections) => {
        if (err) {
          return reject(err);
        }
        this.collections = collections.map(collection => collection.name);
        return resolve(this.collections);
      });
    });
  }

  async getIndexes(collection, database = this.config.database) {
    const db = await this.getDb(database);
    return await db.collection(collection).indexes();
  }

  async createCollection(name, options, database = this.config.database) {
    const db = await this.getDb(database);
    return await db.createCollection(name, options);
  }

  async createIndex(collection, def, options, database = this.config.database) {
    const db = await this.getDb(database);
    return await db.collection(collection).createIndex(def, options)
      .catch(() => {/* Swallow errors.*/});
  }

  async find(collectionName, query, options) {
    const database = this.getDatabaseName(collectionName, query);
    const collection = await this.collection(collectionName, database);

    return new Promise((resolve, reject) => {
      collection.find(query, options).toArray((err, docs) => {
        if (err) {
          return reject(err);
        }
        return resolve(docs);
      });
    });
  }

  async count(collectionName, query) {
    const database = this.getDatabaseName(collectionName, query);
    const collection = await this.collection(collectionName, database);
    return collection.count(query);
  }

  async create(collectionName, doc) {
    const database = this.getDatabaseName(collectionName, doc);
    const collection = await this.collection(collectionName, database);
    const result = await collection.insertOne(doc);
    return result.ops[0];
  }

  async read(collectionName, query, options) {
    const database = this.getDatabaseName(collectionName, query);
    const collection = await this.collection(collectionName, database);
    return await collection.findOne(query, options);
  }

  async update(collectionName, doc) {
    const database = this.getDatabaseName(collectionName, doc);
    const collection = await this.collection(collectionName, database);
    const result = await collection.findOneAndUpdate({ _id: doc._id }, doc, { returnOriginal: false });
    return result.value;
  }

  async delete(collectionName, query) {
    const database = this.getDatabaseName(collectionName, query);
    const collection = await this.collection(collectionName, database);
    return await collection.deleteOne(query);
  }
};
