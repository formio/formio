'use strict';

const {
  defineComponent,
  registerComponent,
  createProcess,
  createPerComponentProcessor,
  createFormComponentProcessor,
  normalizeKeys,
  normalizeTextFieldCalendarWidget,
  normalizeTextFieldWithMultipleMasks,
  normalizeMultiple,
  normalizeValue,
  resolveSelectResourceReference,
  resolveNestedFormReference,
  processSubtree,
} = require('@formio/nextgen');

const CSV_EXPORT_TYPE = 'csvExport';

const buildComponents = createPerComponentProcessor(
  createProcess(CSV_EXPORT_TYPE, [
    normalizeTextFieldCalendarWidget,
    normalizeTextFieldWithMultipleMasks,
    normalizeMultiple,
    createFormComponentProcessor,
    normalizeValue,
    resolveSelectResourceReference,
    resolveNestedFormReference,
    processSubtree,
  ]),
);

const CsvExport = defineComponent({
  defaults: { scope: 'process' },
  model: () => undefined,
  process: async (context) => {
    await normalizeKeys(context, async () => {});
    await buildComponents(context, async () => {});
  },
  render: () => null,
  methods: {
    extendRenderContext(context) {
      const initial = this.options.submission;
      if (initial) {
        context.submission = { ...initial, data: this.data };
      }
    },
  },
});

registerComponent(CSV_EXPORT_TYPE, CsvExport);

module.exports = { CsvExport, CSV_EXPORT_TYPE };
