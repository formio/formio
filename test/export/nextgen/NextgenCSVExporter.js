module.exports = function (app, template, hook) {
  const assert = require('assert');
  const { Readable } = require('stream');
  const through = require('through');
  const NextgenCSVExporter = require('../../../src/export/exporters/NextgenCSVExporter');

  describe('NextgenCSVExporter', () => {
    // Fails to render exactly the submission carrying the BOOM value, so a test can
    // drive the exporter's per-row failure path.
    class ExplodingExporter extends NextgenCSVExporter {
      stringifyCell(value) {
        if (value === 'BOOM') {
          throw new Error('render boom');
        }
        return super.stringifyCell(value);
      }
    }

    // Stands in for the pino logger pino-http attaches as req.log, recording every
    // level call so a test can assert the exporter logged through it.
    const recordingLogger = (records) => {
      const record =
        (level) =>
        (...args) =>
          records.push({ level, args });
      return {
        debug: record('debug'),
        info: record('info'),
        warn: record('warn'),
        error: record('error'),
        child: () => recordingLogger(records),
      };
    };

    it('streams a CSV header row and one row per submission', async () => {
      const form = {
        components: [
          { type: 'textfield', key: 'name', input: true, label: 'Name' },
          {
            type: 'selectboxes',
            key: 'colors',
            input: true,
            values: [
              { value: 'r', label: 'Red' },
              { value: 'g', label: 'Green' },
            ],
          },
        ],
      };
      const submissions = [
        {
          _id: 'id1',
          created: 'c1',
          modified: 'm1',
          data: { name: 'Alice', colors: { r: true, g: false } },
        },
        {
          _id: 'id2',
          created: 'c2',
          modified: 'm2',
          data: { name: 'Bob', colors: { r: false, g: true } },
        },
      ];

      const chunks = [];
      const res = {
        setHeader() {},
        write(chunk) {
          chunks.push(chunk.toString());
        },
        end() {},
      };
      const req = { query: {}, headers: {}, log: recordingLogger([]) };

      const exporter = new NextgenCSVExporter(form, req, res);
      await exporter.init();
      await new Promise((resolve) => {
        res.end = resolve;
        exporter.stream(Readable.from(submissions));
        setTimeout(resolve, 2000);
      });

      const csv = chunks.join('');
      const lines = csv.trim().split('\n').filter(Boolean);

      assert.equal(lines.length, 3, `expected header + 2 rows, got:\n${csv}`);
      assert.ok(
        lines[0].includes('name') && lines[0].includes('colors.r') && lines[0].includes('colors.g'),
        `header: ${lines[0]}`,
      );
      assert.ok(lines[1].includes('Alice'), `row1: ${lines[1]}`);
      assert.ok(lines[2].includes('Bob'), `row2: ${lines[2]}`);
    });

    it('uses display labels when view=formatted', async () => {
      const form = {
        components: [
          {
            type: 'radio',
            key: 'choice',
            input: true,
            label: 'Choice',
            values: [
              { value: 'y', label: 'Yes' },
              { value: 'n', label: 'No' },
            ],
          },
        ],
      };
      const submissions = [{ _id: 'id1', created: 'c1', modified: 'm1', data: { choice: 'n' } }];

      const chunks = [];
      const res = {
        setHeader() {},
        write(chunk) {
          chunks.push(chunk.toString());
        },
        end() {},
      };
      const req = { query: { view: 'formatted' }, headers: {}, log: recordingLogger([]) };

      const exporter = new NextgenCSVExporter(form, req, res);
      await exporter.init();
      await new Promise((resolve) => {
        res.end = resolve;
        exporter.stream(Readable.from(submissions));
        setTimeout(resolve, 2000);
      });

      const csv = chunks.join('');
      const lines = csv.trim().split('\n').filter(Boolean);

      assert.ok(lines[1].includes('No'), `expected label 'No', got: ${lines[1]}`);
    });

    it('degrades a failed row to its id with blank data cells and keeps exporting', async () => {
      const form = {
        components: [{ type: 'textfield', key: 'name', input: true, label: 'Name' }],
      };
      const submissions = [
        { _id: 'id1', created: 'c1', modified: 'm1', data: { name: 'Alice' } },
        { _id: 'id2', created: 'c2', modified: 'm2', data: { name: 'BOOM' } },
        { _id: 'id3', created: 'c3', modified: 'm3', data: { name: 'Carol' } },
      ];

      const chunks = [];
      const res = {
        setHeader() {},
        write(chunk) {
          chunks.push(chunk.toString());
        },
        end() {},
      };
      const req = { query: {}, headers: {}, log: recordingLogger([]) };

      const exporter = new ExplodingExporter(form, req, res);
      await exporter.init();
      await new Promise((resolve) => {
        res.end = resolve;
        exporter.stream(Readable.from(submissions));
        setTimeout(resolve, 2000);
      });

      const csv = chunks.join('');
      const lines = csv.trim().split('\n').filter(Boolean);

      assert.equal(lines.length, 4, `expected header + 3 rows, got:\n${csv}`);
      assert.ok(lines[1].includes('Alice'), `row1: ${lines[1]}`);
      assert.ok(
        lines[2].includes('id2') && !lines[2].includes('BOOM'),
        `failed row must keep its id and drop the unrenderable data: ${lines[2]}`,
      );
      assert.ok(
        lines[3].includes('Carol'),
        `the row after a failure must still export: ${lines[3]}`,
      );
    });

    // FIO-7988: this exporter arrived after the debug -> pino migration, so the
    // swallowed render failure still logged through the debug package.
    it('logs a failed row through req.log', async () => {
      const form = {
        components: [{ type: 'textfield', key: 'name', input: true, label: 'Name' }],
      };
      const submissions = [{ _id: 'id2', created: 'c2', modified: 'm2', data: { name: 'BOOM' } }];

      const res = {
        setHeader() {},
        write() {},
        end() {},
      };
      const logs = [];
      const req = { query: {}, headers: {}, log: recordingLogger(logs) };

      const exporter = new ExplodingExporter(form, req, res);
      await exporter.init();
      await new Promise((resolve) => {
        res.end = resolve;
        exporter.stream(Readable.from(submissions));
        setTimeout(resolve, 2000);
      });

      const logged = logs.filter((entry) =>
        entry.args.some(
          (arg) => typeof arg === 'string' && arg.includes('failed to render submission'),
        ),
      );
      assert.equal(
        logged.length,
        1,
        `expected one req.log line about the failed row, got: ${JSON.stringify(logs)}`,
      );
    });

    it('preserves row order and ends the response when fed the production through-module stream', async () => {
      const form = {
        components: [{ type: 'textfield', key: 'name', input: true, label: 'Name' }],
      };
      const submissions = [
        { _id: 'id1', created: 'c1', modified: 'm1', data: { name: 'Alice' } },
        { _id: 'id2', created: 'c2', modified: 'm2', data: { name: 'Bob' } },
        { _id: 'id3', created: 'c3', modified: 'm3', data: { name: 'Carol' } },
      ];

      const chunks = [];
      let ended = false;
      const res = {
        setHeader() {},
        write(chunk) {
          chunks.push(chunk.toString());
        },
        end() {},
      };
      const req = { query: {}, headers: {}, log: recordingLogger([]) };

      const exporter = new NextgenCSVExporter(form, req, res);
      await exporter.init();
      await new Promise((resolve) => {
        res.end = () => {
          ended = true;
          resolve();
        };
        const source = through();
        exporter.stream(source);
        submissions.forEach((submission) => source.queue(submission));
        source.queue(null);
        setTimeout(resolve, 2000);
      });

      const lines = chunks.join('').trim().split('\n').filter(Boolean);

      assert.ok(ended, 'the through-stream end must propagate to res.end()');
      assert.equal(lines.length, 4, `expected header + 3 ordered rows, got:\n${chunks.join('')}`);
      assert.ok(lines[1].includes('Alice') && lines[1].includes('id1'), `row1: ${lines[1]}`);
      assert.ok(lines[2].includes('Bob'), `row2: ${lines[2]}`);
      assert.ok(lines[3].includes('Carol'), `row3: ${lines[3]}`);
    });
  });
};
