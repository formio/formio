'use strict';
const fs = require('fs');
const path = require('path');

const defaultBundle = fs.readFileSync(path.resolve(__dirname, 'bundles/default_bundle.js'), 'utf8');

module.exports = {defaultBundle};
