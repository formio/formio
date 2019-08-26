const { assert } = require('chai');
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const db = require('form-api/test/mocks/db');
const sandbox = sinon.createSandbox();

const Schema = require('form-api/src/dbs/Schema');
const Model = require('./PreserveModel');

describe('PreserveModel.js', () => {
  afterEach(() => {
    sandbox.restore();
  });

  describe('Read Tests', () => {
    it('Reads an existing record', () => {
      sandbox.stub(db, 'read').resolves({ _id: 'foo', bar: 'baz', deleted: null });

      class TestSchema extends Schema {
        get name() {
          return 'test';
        }

        get schema() {
          return {
            bar: {
              type: 'string',
            },
          }
        }
      }

      const model = new Model(new TestSchema(), db);

      return model.read({ _id: 'foo' }).then(doc => {
        assert(db.read.calledOnce, 'Should call read');
        assert.deepEqual(db.read.args[0][1], { _id: 'foo', deleted: { $eq: null } });
        assert.deepEqual(doc, { _id: 'foo', bar: 'baz' });
      });
    });
  });

  describe('Delete Tests', () => {
    it('Marks a record as deleted', () => {
      sandbox.spy(db, 'delete');
      sandbox.spy(db, 'update');
      sandbox.stub(db, 'read').resolves({ _id: 'foo', fiz: 'buz' });
      sandbox.stub(Date, 'now').returns(3);

      class TestSchema extends Schema {
        get name() {
          return 'test';
        }

        get schema() {
          return {
            fiz: {
              type: 'string',
            }
          }
        }
      }

      const model = new Model(new TestSchema(), db);

      return model.delete('foo').then(doc => {
        assert(db.delete.notCalled, 'Should not call delete');
        assert(db.update.calledOnce, 'Should call update');
        assert.deepEqual(db.update.args[0][1], { _id: 'foo', fiz: 'buz', deleted: 3 });
      });
    });
  });

  describe('Count Tests', () => {
    it('Counts records', () => {
      sandbox.stub(db, 'count').resolves(4);

      class TestSchema extends Schema {
        get name() {
          return 'test';
        }

        get schema() {
          return {
            bar: {
              type: 'string',
            }
          }
        }
      }

      const model = new Model(new TestSchema(), db);

      const query = { foo: 'bar' };
      return model.count(query).then(result => {
        assert(db.count.calledOnce, 'Should call count');
        assert.deepEqual(db.count.args[0][1], { foo: 'bar', deleted: { $eq: null } });
        assert.equal(result, 4);
      });
    });
  });

  describe('Find Tests', () => {
    it('Finds results', () => {
      sandbox.stub(db, 'find').resolves([
        { _id: 1, foo: 'bar', deleted: null },
        { _id: 2, foo: 'bar', deleted: null },
        { _id: 3, foo: 'bar', deleted: null }
        ]);

      class TestSchema extends Schema {
        get name() {
          return 'test';
        }

        get schema() {
          return {
            _id: {
              type: 'id'
            },
            foo: {
              type: 'string',
            },
          }
        }
      }

      const model = new Model(new TestSchema(), db);

      const query = { foo: 'bar' };
      const options = { sort: 1, limit: 10 };
      return model.find(query, options).then(result => {
        assert(db.find.calledOnce, 'Should call find');
        assert.deepEqual(db.find.args[0][1], { foo: 'bar', deleted: { $eq: null } });
        assert.deepEqual(db.find.args[0][2], options);
        assert.equal(result.length, 3);
        assert.isString(result[0]._id);
        assert.deepEqual(result[0], { _id: '1', foo: 'bar' });
        assert.isString(result[1]._id);
        assert.deepEqual(result[1], { _id: '2', foo: 'bar' });
        assert.isString(result[2]._id);
        assert.deepEqual(result[2], { _id: '3', foo: 'bar' });
      });
    });
  });
});
