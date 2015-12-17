var fs = require('fs');
var macros = fs.readFileSync(__dirname + '/table.txt').toString();
module.exports = macros;
