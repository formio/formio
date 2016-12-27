'use strict';

var Exporter = require('../Exporter');
var util = require('../../util/util');
var through = require('through');
var csv = require('csv');
var _ = require('lodash');

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
    /* eslint-disable no-cond-assign */
    while (row = this.stringifier.read()) {
      this.res.write(row.toString());
    }

    /* eslint-enable no-cond-assign */
    deferred.resolve();
  }.bind(this));
  this.stringifier.write(_.map(this.fields, 'label'));
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
    data.push(row.created.toISOString());
    data.push(row.modified.toISOString());
    _.each(self.fields, function(field) {
      if (!field.key) {
        return;
      }

      // Nested fields are in the data property of their parent
      var value = _.property(util.getSubmissionKey(field.key))(row.data);
      if (value && value.url) {
        // Use the resource URL instead of the whole object
        value = value.url;
      }
      data.push(value);
    });

    this.queue(data);
  };

  return stream
    .pipe(through(write, function() {
      return self.res.end();
    }))
    .pipe(this.stringifier);
};

module.exports = CSVExporter;
