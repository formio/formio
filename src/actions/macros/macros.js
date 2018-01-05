'use strict';

const fs = require('fs');
let macros = fs.readFileSync(`${__dirname}/table.html`).toString();
macros += fs.readFileSync(`${__dirname}/value.html`).toString();
module.exports = macros;
