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
    if (!component.input || !component.key || ignore.indexOf(component.type) !== -1) {
      return;
    }

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
        items.push({label: [path, option.value].join('.'), path: option.value, type: 'boolean'});
      });
    }
    else if (component.type === 'checkbox') {
      items.push({type: 'boolean'});
    }
    else if (component.type === 'survey') {
      _.each(component.questions, function(question) {
        items.push({label: [path, question.value].join('.'), path: question.value});
      });
    }
    else {
      // Default to the current component item.
      items.push({});
    }

    items.forEach(function(item) {
      var finalItem = {
        component: path,
        path: item.path || component.key,
        label: item.label || path
      };

      if (item.hasOwnProperty('rename')) {
        finalItem.rename = item.rename;
      }

      if (item.hasOwnProperty('type')) {
        finalItem.type = item.type;
      }

      this.fields.push(finalItem);
    }.bind(this));
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

    labels.push(item.label);
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
  var write = function(submission) {
    var data = [
      submission._id.toString(),
      submission.created.toISOString(),
      submission.modified.toISOString()
    ];

    /**
     * Util function to unwrap an unknown data payload into a string.
     *
     * @param data
     * @returns {string}
     */
    var coerceToString = function(data, column) {
      if (data instanceof Array && data.length > 0) {
        return data.map(function(item) {
          return '"' + coerceToString(_.get(item, column.path, item), column) + '"';
        }).join(',');
      }
      if (typeof data === 'string') {
        if (column.type === 'boolean') {
          return Boolean(data).toString();
        }

        return data.toString();
      }
      if (typeof data === 'number') {
        return data.toString()
      }
      if (typeof data === 'object' && !!data) {
        return coerceToString(_.get(data, column.path, ''), column);
      }

      return JSON.stringify(data);
    };

    self.fields.forEach(function(column) {
      var componentData = _.get(submission.data, column.component, '');
      data.push(coerceToString(componentData, column))
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
