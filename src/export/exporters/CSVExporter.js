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
  this.fields = [];

  var ignore = ['password', 'button', 'container'];
  util.eachComponent(form.components, function(component, path) {
    if (component.input && component.key && ignore.indexOf(component.type) === -1) {
      var items = [];

      // If a component has multiple parts, pick what we want.
      if (component.type === 'address') {
        items.push({
          path: 'formatted_address',
          rename: 'formatted'
        });
        items.push({
          path: 'geometry.location.lat',
          rename: 'lat'
        });
        items.push({
          path: 'geometry.location.lng',
          rename: 'lng'
        });
      }
      else if (component.type === 'selectboxes') {
        _.each(component.values, function(option) {
          items.push({path: option.label, type: 'boolean'});
        });
      }
      else if (component.type === 'checkbox') {
        items.push({type: 'boolean'});
      }
      else if (component.type === 'survey') {
        _.each(component.questions, function(question) {
          items.push({path: question.value});
        });
      }
      else {
        // Default to the current component item.
        items.push({});
      }

      items.forEach(function(item) {
        var finalItem = {
          path: (_.filter([path, item.path])).join('.')
        };

        if (item.hasOwnProperty('rename')) {
          finalItem.rename = (_.filter([path, item.rename])).join('.');
        }

        if (item.hasOwnProperty('type')) {
          finalItem.type = item.type;
        }

        this.fields.push(finalItem);
      }.bind(this));
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

  var labels = ['ID', 'Created', 'Modified'];
  this.fields.forEach(function(item) {
    if (item.hasOwnProperty('rename')) {
      labels.push(item.rename);
      return;
    }

    labels.push(item.path);
  });

  this.stringifier.write(labels);
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
    var data = [
      row._id.toString(),
      row.created.toISOString(),
      row.modified.toISOString()
    ];

    self.fields.forEach(function(item) {
      var temp = _.get(row.data, item.path, '');
      if (temp instanceof Array && temp.length === 0) {
        temp = '';
      }
      else if (item.type === 'boolean') {
        temp = Boolean(temp).toString();
      }

      data.push(temp);
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
