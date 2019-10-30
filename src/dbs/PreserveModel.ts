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

  public find(query: any = {}, options = {}, context = {}) {
    query.deleted = { $eq: null };
    return super.find(query, options, context = {});
  }

  public count(query: any = {}, options = {}, context = {}) {
    query.deleted = { $eq: null };
    return super.count(query, options, context);
  }

  public read(query: any = {}, context?) {
    query.deleted = { $eq: null };
    return super.read(query, context);
  }

  public delete(query, context?) {
    return this.initialized.then(() => {
      return this.read(query, context).then((doc) => {
        doc.deleted = Date.now();
        return this.db.update(this.collectionName, doc, context);
      });
    });
  }
}
