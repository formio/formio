'use strict';

var Q = require('q');

var Exporter = function(form, req, res) {
  this.extension = '';
  this.contentType = '';
  this.form = form;
  this.req = req;
  this.res = res;
};

/**
 * Initialize the export.
 *
 * @returns
 *  A promise when the exporter is done initializing.
 */
Exporter.prototype.init = function() {
  var deferred = Q.defer();
  this.res.setHeader('Content-Disposition', 'attachment; filename=export.' + this.extension);
  this.res.setHeader('Content-Type', this.contentType);
  this.start(deferred);
  return deferred.promise;
};

/**
 * Start the export.
 *
 * @param deferred
 */
Exporter.prototype.start = function(deferred) {
  deferred.resolve();
};

/**
 * The stream for the export
 *
 * @type {Function}
 */
Exporter.prototype.stream = function(stream) {
  return stream;
};

// Export the exporter.
module.exports = Exporter;
