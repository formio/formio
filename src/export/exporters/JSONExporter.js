'use strict';

var Exporter = require('../Exporter');
var JSONStream = require('JSONStream');

var JSONExporter = function(form, req, res) {
  Exporter.call(this, form, req, res);
  this.extension = 'json';
  this.contentType = 'application/json';
};

JSONExporter.prototype = Object.create(Exporter.prototype);
JSONExporter.prototype.constructor = JSONExporter;
JSONExporter.prototype.stream = function(stream) {
  return stream.pipe(JSONStream.stringify());
}

module.exports = JSONExporter;
