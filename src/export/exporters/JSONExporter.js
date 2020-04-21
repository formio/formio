'use strict';

const Exporter = require('../Exporter');
const JSONStream = require('JSONStream');

class JSONExporter extends Exporter {
  constructor(form, req, res) {
    super(form, req, res);

    this.extension = 'json';
    this.contentType = 'application/json';
  }

  stream(stream) {
    return stream
      .pipe(JSONStream.stringify())
      .pipe(this.res);
  }
}

module.exports = JSONExporter;
