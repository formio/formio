module.exports = function (app, template, hook) {
  const assert = require('assert');
  const resolveExporter = require('../../../src/export/resolveExporter');
  const CSVExporter = require('../../../src/export/exporters/CSVExporter');
  const NextgenCSVExporter = require('../../../src/export/exporters/NextgenCSVExporter');
  const JSONExporter = require('../../../src/export/exporters/JSONExporter');

  describe('resolveExporter', () => {
    const flagOn = { alter: () => true };
    const flagOff = { alter: () => false };

    it('selects the nextgen CSV exporter when the nextgen flag is on', () => {
      assert.equal(resolveExporter('csv', flagOn), NextgenCSVExporter);
    });

    it('selects the classic CSV exporter when the nextgen flag is off', () => {
      assert.equal(resolveExporter('csv', flagOff), CSVExporter);
    });

    it('is unaffected for non-csv formats', () => {
      assert.equal(resolveExporter('json', flagOn), JSONExporter);
    });
  });
};
