/* eslint-env mocha */
'use strict';

const makeTestSuite = require('./utils/makeTestSuite');

makeTestSuite(
  'Authentication',
  (app, template, hook) => {
    require('./auth')(app, template, hook);
  },
  { skipUserRegistration: true },
);
