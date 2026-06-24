'use strict';

const path = require('path');
const fs = require('fs');

const table = fs.readFileSync(path.join(__dirname, './table.html')).toString();
const value = fs.readFileSync(path.join(__dirname, './value.html')).toString();
const macros = `${table}${value}`.replace(/\n/g, '');

module.exports = macros;
