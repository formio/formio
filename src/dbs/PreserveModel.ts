import { Model } from '@formio/api';

export class PreserveModel extends Model {
  constructor(schema, db) {
    // Add delete field to track delete status.
    schema.schema.deleted = schema.schema.deleted || {
      type: 'number',
      index: true,
      default: null,
    };

    super(schema, db);
  }

  public afterLoad(doc) {
    return super.afterLoad(doc)
      .then((doc) => {
        if (doc) {
          delete doc.deleted;
        }
        return doc;
      });
  }

  public find(query: any = {}, options = {}) {
    query.deleted = { $eq: null };
    return super.find(query, options);
  }

  public count(query: any = {}) {
    query.deleted = { $eq: null };
    return super.count(query);
  }

  public read(query: any = {}) {
    query.deleted = { $eq: null };
    return super.read(query);
  }

  public delete(_id) {
    return this.initialized.then(() => {
      return this.read({ _id }).then((doc) => {
        doc.deleted = Date.now();
        return this.db.update(this.collectionName, doc);
      });
    });
  }
}
