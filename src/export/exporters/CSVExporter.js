'use strict';

var Exporter = require('../Exporter');
var util = require('../../util/util');
var through = require('through');
var csv = require('csv');
var _ = require('lodash');
var _property = require('lodash.property');

/**
 * Create a CSV exporter.
 * @param form
 * @param res
 * @param req
 * @constructor
 */
var CSVExporter = function(form, req, res) {
  Exporter.call(this, form, req, res);
  this.extension = 'csv';
  this.contentType = 'text/csv';
  this.stringifier = csv.stringify({
    delimiter: ',',
    quoted: true
  });
  this.fields = [
    {label: 'ID'},
    {label: 'Created'},
    {label: 'Modified'}
  ];
  util.eachComponent(form.components, function(component) {
    if (component.input) {
      this.fields.push(component);
    }
  }.bind(this));
};

CSVExporter.prototype = Object.create(Exporter.prototype);
CSVExporter.prototype.constructor = CSVExporter;

/**
 * Start the CSV export by creating the headers.
 *
 * @param deferred
 */
CSVExporter.prototype.start = function(deferred) {
  var row = null;

  this.stringifier.on('readable', function() {
    while(row = this.stringifier.read()) {
      this.res.write(row.toString());
    }
    deferred.resolve();
  }.bind(this));
  this.stringifier.write(_.pluck(this.fields, 'label'));
};

/**
 * Stream the CSV export.
 *
 * @param stream
 * @returns {*}
 */
CSVExporter.prototype.stream = function(stream) {
  var self = this;
  var write = function(row) {
    var data = [];
    data.push(row._id.toString());
    data.push(row.created);
    data.push(row.modified);
    _.each(self.fields, function(field) {
      if (!field.key) { return; }

      // Nested fields are in the data property of their parent
      var value = _property(util.getSubmissionKey(field.key))(row.data);
      if(value && value.url) {
        // Use the resource URL instead of the whole object
        value = value.url;
      }
      data.push(value);
    });
    this.queue(data);
  };

  return stream
    .pipe(through(write, function() {
      this.res.end();
    }.bind(this)))
    .pipe(this.stringifier);
};

module.exports = CSVExporter;
