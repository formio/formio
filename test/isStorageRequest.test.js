/* eslint-env mocha */
'use strict';

const assert = require('assert');
const isStorageRequest = require('../src/util/isStorageRequest');

describe('Storage request matching', () => {
  for (const prefix of ['', '/project/project-id']) {
    for (const provider of ['s3', 'azure', 'dropbox', 'gdrive']) {
      const url = `${prefix}/form/form-id/storage/${provider}`;
      it(`matches the supported route ${url}`, () => {
        assert.strictEqual(isStorageRequest({ url }), true);
      });
    }

    for (const operation of ['complete', 'abort']) {
      const url = `${prefix}/form/form-id/storage/s3/multipart/${operation}`;
      it(`matches the S3 multipart route ${url}`, () => {
        assert.strictEqual(isStorageRequest({ url }), true);
      });
    }
  }

  it('matches case-insensitively and permits a trailing slash', () => {
    assert.strictEqual(
      isStorageRequest({ url: '/PROJECT/project-id/FORM/form-id/STORAGE/S3/' }),
      true,
    );
  });

  it('matches a storage route whose request target is an absolute URL', () => {
    const url = 'http://localhost:3001/project/project-id/form/form-id/storage/s3?bucket=b&key=k';

    assert.strictEqual(isStorageRequest({ url }), true);
  });

  for (const url of [
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k#',
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k\t',
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k\n',
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k\f',
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k\r',
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k ',
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k\u00a0',
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k\ufeff',
    'http://localhost:3001/project/project-id/form/form-id/storage\\s3?bucket=b&key=k',
  ]) {
    it(`treats a backslash as a path separator: ${JSON.stringify(url)}`, () => {
      assert.strictEqual(isStorageRequest({ url }), true);
    });
  }

  for (const url of [
    '/project/project-id/form/form-id/storage\\s3?bucket=b&key=k',
    '/project/project-id/form/form-id/storage\\s3',
  ]) {
    it(`does not match a backslash the router reads literally: ${JSON.stringify(url)}`, () => {
      assert.strictEqual(isStorageRequest({ url }), false);
    });
  }

  it('ignores the query string on a storage request', () => {
    assert.strictEqual(
      isStorageRequest({ url: '/form/form-id/storage/s3?bucket=files&key=folder/file.txt' }),
      true,
    );
  });

  it('uses the resolved URL after form alias resolution', () => {
    assert.strictEqual(
      isStorageRequest({
        url: '/project/project-id/form/form-id/storage/azure',
        originalUrl: '/expense/storage/azure',
      }),
      true,
    );
  });

  it('does not infer a storage route from the original URL', () => {
    assert.strictEqual(
      isStorageRequest({
        url: '/form/form-id',
        originalUrl: '/form/form-id/storage/s3',
      }),
      false,
    );
  });

  for (const url of [
    '',
    '/storage',
    '/form/storage',
    '/form/form-id?next=/storage/s3',
    '/expense/storage/s3',
    '/form/form-id/storage/unknown',
    '/form/form-id/storage/s3/unrelated',
    '/form/form-id/storage/azure/multipart/complete',
    '/form/form-id/storage/s3/multipart/unknown',
    '/form/form-id/storage/s3/multipart/complete/unrelated',
    '/prefix/form/form-id/storage/s3',
    '/project/project-id/prefix/form/form-id/storage/s3',
    '/form//storage/s3',
  ]) {
    it(`rejects a non-storage URL: ${JSON.stringify(url)}`, () => {
      assert.strictEqual(isStorageRequest({ url }), false);
    });
  }
});
