'use strict';

const { dbs } = require('form-api');

module.exports = class PreserveModel extends dbs.Model {
  constructor(schema, db) {
    // Add delete field to track delete status.
    schema.schema.deleted = schema.schema.deleted || {
      type: 'number',
      index: true,
      default: null
    };

    super(schema, db);
  }

  afterLoad(doc) {
    return super.afterLoad(doc)
      .then(doc => {
        if (doc) {
          delete doc.deleted;
        }
        return doc;
      });
  }

  find(query = {}, options = {}) {
    query.deleted = { $eq: null };
    return super.find(query, options);
  }

  count(query = {}) {
    query.deleted = { $eq: null };
    return super.count(query);
  }

  read(query = {}) {
    query.deleted = { $eq: null };
    return super.read(query);
  }

  delete(_id) {
    return this.initialized.then(() => {
      return this.read({ _id }).then(doc => {
        doc.deleted = Date.now();
        return this.db.update(this.collectionName, doc);
      });
    });
  }
};
