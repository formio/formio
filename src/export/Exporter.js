'use strict';

class Exporter {
  constructor(form, req, res) {
    this.extension = '';
    this.contentType = '';
    this.form = form;
    this.req = req;
    this.res = res;
  }

  /**
   * Initialize the export.
   *
   * @returns
   *  A promise when the exporter is done initializing.
   */
  init() {
    return new Promise((resolve, reject) => {
      this.res.setHeader('Content-Disposition', `attachment; filename=export.${this.extension}`);
      this.res.setHeader('Content-Type', this.contentType);
      this.start(resolve, reject);
    });
  }

  /**
   * Start the export.
   *
   * @param resolve
   */
  start(resolve) {
    resolve();
  }

  /**
   * The stream for the export
   *
   * @type {Function}
   */
  stream(stream) {
    return stream;
  }
}

// Export the exporter.
module.exports = Exporter;
