/* eslint-env mocha */
'use strict';

const makeTestSuite = require('./utils/makeTestSuite');

makeTestSuite('Actions', require('./actions'));
