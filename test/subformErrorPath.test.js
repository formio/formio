/* eslint-env mocha */
'use strict';

const assert = require('assert');
const Utils = require('../src/util/util');

describe('subformErrorPath', function () {
  it('prefixes a flat child path', function () {
    assert.deepEqual(Utils.subformErrorPath('subForm', ['nestedField'], '.data.'), [
      'subForm',
      'data',
      'nestedField',
    ]);
  });

  it('keeps a row index numeric instead of comma-joining the array', function () {
    assert.deepEqual(Utils.subformErrorPath('subForm', ['dg', 0, 'field'], '.data.'), [
      'subForm',
      'data',
      'dg',
      0,
      'field',
    ]);
  });

  it('preserves a doubly-nested child path', function () {
    assert.deepEqual(Utils.subformErrorPath('subForm', ['inner', 'data', 'f'], '.data.'), [
      'subForm',
      'data',
      'inner',
      'data',
      'f',
    ]);
  });

  it('accepts a string child path', function () {
    assert.deepEqual(Utils.subformErrorPath('subForm', 'nestedField', '.data.'), [
      'subForm',
      'data',
      'nestedField',
    ]);
  });

  it('joins with the given separator', function () {
    assert.deepEqual(Utils.subformErrorPath('panel.subForm', ['dg', 0, 'field'], '.'), [
      'panel',
      'subForm',
      'dg',
      0,
      'field',
    ]);
  });
});
