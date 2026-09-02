'use strict';

const _ = require('lodash');
const csv = require('csv');
const debug = require('debug')('formio:error');
const Exporter = require('../Exporter');
const { renderSubmission } = require('../nextgen/NextgenCsvRenderer');

class NextgenCSVExporter extends Exporter {
  constructor(form, req, res) {
    super(form, req, res);
    this.extension = 'csv';
    this.contentType = 'text/csv';
    this.stringifier = csv.stringify({ delimiter: ',', quoted: true });
    this.columns = [];
    this.formatted = req.query?.view === 'formatted';
  }

  async start(resolve, reject) {
    try {
      this.stringifier.on('readable', () => {
        let row;
        while ((row = this.stringifier.read())) {
          this.res.write(row.toString());
        }
      });
      this.stringifier.on('end', () => this.res.end());

      this.columns = Object.keys(
        await renderSubmission(this.form, { data: {} }, { formatted: this.formatted }),
      );
      this.stringifier.write(['_id', 'created', 'modified', ...this.columns]);
      resolve();
    } catch (err) {
      reject(err);
    }
  }

  stream(stream) {
    const pending = [];
    stream.on('data', (submission) => {
      stream.pause();
      const metadata = [
        submission._id != null ? submission._id.toString() : '',
        submission.created,
        submission.modified,
      ];
      pending.push(
        renderSubmission(this.form, submission, { formatted: this.formatted })
          .then((values) => {
            this.stringifier.write([
              ...metadata,
              ...this.columns.map((column) =>
                this.injectionProtector(this.stringifyCell(values[column])),
              ),
            ]);
          })
          .catch((err) => {
            debug(`CSV export failed to render submission ${submission?._id}:`, err);
            this.stringifier.write([...metadata, ...this.columns.map(() => '')]);
          })
          .then(() => stream.resume()),
      );
    });
    stream.on('end', () => {
      Promise.all(pending).then(() => this.stringifier.end());
    });
    return stream;
  }

  stringifyCell(value) {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  }

  injectionProtector(data) {
    if (!data) {
      return data;
    }
    if (!_.isString(data)) {
      data = data.toString();
    }
    const riskyChars = ['=', '+', '-', '@'];
    const regexStr = `(?<=(?:^|"|“)\\s*)([${riskyChars.join('\\')}])`;
    const regExp = new RegExp(regexStr, 'gm');
    return _.replace(data, regExp, (char) => `\`${char}`);
  }
}

module.exports = NextgenCSVExporter;
