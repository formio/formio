'use strict';
const path = require('path');
const fs = require('fs');

let macros = fs.readFileSync(path.join(__dirname, '/table.html')).toString();
macros += fs.readFileSync(path.join(__dirname, '/value.html')).toString();
module.exports = macros;
