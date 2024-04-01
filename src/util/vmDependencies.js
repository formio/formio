'use strict';
const fs = require('fs');

const lodashCode = fs.readFileSync(require.resolve('lodash/lodash.min.js'), 'utf8');
const momentCode = fs.readFileSync(require.resolve('moment/min/moment.min.js'), 'utf8');
const formioCoreCode = fs.readFileSync(require.resolve('@formio/core/dist/formio.core.min.js'), 'utf8');
const fastJsonPatchCode = fs.readFileSync(require.resolve('fast-json-patch/dist/fast-json-patch.min.js'), 'utf8');

module.exports = {
    lodashCode,
    momentCode,
    formioCoreCode,
    fastJsonPatchCode
};
