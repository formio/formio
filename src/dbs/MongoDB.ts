import { Database, log } from '@formio/api';
import { ObjectID } from 'mongodb';
import { MongoClient } from 'mongodb';
import { log as consoleLog } from '../log';
import { PreserveModel } from './PreserveModel';

export class MongoDB extends Database {
  protected dbs: {};
  private collections: [string];

  constructor(config) {
    super(config);

    // TODO: Change this to class property.
    this.Model = PreserveModel;

    // Cache collection names
    this.dbs = {};

    this.ready = new Promise((resolve, reject) => {
      MongoClient.connect(this.config.connectionString, config.mongoConfig || {}, (err, client) => {
        if (err) {
          log('error', err);
          return reject(err);
        }
        else {
          consoleLog( 'log', ' > Successfully connected to mongodb');
          return resolve(client);
        }
      });
    });
  }

  public toID(value) {
    return new ObjectID(value);
  }

  public getDb(name) {
    // Db connection cache.
    if (this.dbs.hasOwnProperty(name)) {
      return Promise.resolve(this.dbs[name]);
    }
    return this.ready.then((client) => {
      this.dbs[name] = client.db(name);
      return this.dbs[name];
    });
  }

  public getDatabaseName(collectionName, params) {
    return this.config.database;
  }

  public async collection(name, database = this.config.database) {
    const db = await this.getDb(database);
    return await db.collection(name);
  }

  public async getCollections(database = this.config.database): Promise<[string]> {
    const db = await this.getDb(database);

    return new Promise((resolve, reject) => {
      db.listCollections().toArray((err, collections) => {
        if (err) {
          return reject(err);
        }
        this.collections = collections.map((collection) => collection.name);
        return resolve(this.collections);
      });
    });
  }

  public async getIndexes(collection, database = this.config.database) {
    const db = await this.getDb(database);
    return await db.collection(collection).indexes();
  }

  public async createCollection(name, schema, database = this.config.database) {
    const db = await this.getDb(database);
    return await db.createCollection(name);
  }

  public async createIndex(collection, def, options, database = this.config.database) {
    log('debug', 'Index', database, collection, def);
    const db = await this.getDb(database);
    return await db.collection(collection).ensureIndex(def, options)
      .catch(() => {/* Swallow errors.*/});
  }

  public async find(collectionName, query, options) {
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

  public async count(collectionName, query) {
    const database = this.getDatabaseName(collectionName, query);
    const collection = await this.collection(collectionName, database);
    return collection.count(query);
  }

  public async create(collectionName, doc) {
    const database = this.getDatabaseName(collectionName, doc);
    const collection = await this.collection(collectionName, database);
    const result = await collection.insertOne(doc);
    return result.ops[0];
  }

  public async read(collectionName, query, options) {
    const database = this.getDatabaseName(collectionName, query);
    const collection = await this.collection(collectionName, database);
    return await collection.findOne(query, options);
  }

  public async update(collectionName, doc) {
    const database = this.getDatabaseName(collectionName, doc);
    const collection = await this.collection(collectionName, database);
    const result = await collection.findOneAndReplace({ _id: doc._id }, doc, {
      returnNewDocument: true,
      returnOriginal: false,
    });
    return result.value;
  }

  public async delete(collectionName, query) {
    const database = this.getDatabaseName(collectionName, query);
    const collection = await this.collection(collectionName, database);
    return await collection.deleteOne(query);
  }
}
