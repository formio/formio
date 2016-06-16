'use strict';

var fs = require('fs');
var macros = fs.readFileSync(__dirname + '/table.html').toString();
macros += fs.readFileSync(__dirname + '/value.html').toString();
module.exports = macros;
