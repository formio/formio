'use strict';

const { createHeadlessForm, eachInstance, isDisplayComponent } = require('@formio/nextgen');
const { CSV_EXPORT_TYPE } = require('./CsvExport');

const isStructuralContainer = (definition) =>
  Boolean(definition.components?.some((child) => child.scope !== 'transparent'));

function isDataColumn(instance) {
  const { dataPath, definition, value } = instance;
  const isArrayElementPath = /\[\d+\]/.test(dataPath);
  if (isArrayElementPath) {
    return false;
  }
  if (isDisplayComponent(definition)) {
    return false;
  }
  const isNonPersistent =
    definition.persistent === false || definition.persistent === 'client-only';
  if (isNonPersistent) {
    return false;
  }
  if (definition.protected) {
    return false;
  }
  const isFlattenedContainer = isStructuralContainer(definition) && !Array.isArray(value);
  if (isFlattenedContainer) {
    return false;
  }
  return true;
}

const serializeCell = (value) => {
  const isNonScalar = value !== null && typeof value === 'object';
  return isNonScalar ? JSON.stringify(value) : String(value);
};

async function renderSubmission(form, submission, options = {}) {
  const { formatted } = options;
  // PERF: this rebuilds the whole instance tree per row. Large exports could instead
  // build one Island and re-drive it per submission (reset via rootInstance.submission +
  // island.render()/settled). Note: formatted mode also needs options.submission updated
  // per row, or select/radio labels resolve against the first row's metadata.
  const root = await createHeadlessForm(
    { type: CSV_EXPORT_TYPE, components: form.components },
    submission,
    { readOnly: true },
  );
  const values = {};
  eachInstance(root, ({ instance, pathPrefix }) => {
    if (!isDataColumn(instance)) {
      return;
    }
    const columnKey = pathPrefix ? `${pathPrefix}.${instance.dataPath}` : instance.dataPath;
    const { valueSchema } = instance.definition;
    if (valueSchema?.properties) {
      const value = instance.value || {};
      Object.keys(valueSchema.properties).forEach((key) => {
        values[`${columnKey}.${key}`] = value[key];
      });
      return;
    }
    values[columnKey] = formatted ? instance.view() : serializeCell(instance.value);
  });
  return values;
}

module.exports = { renderSubmission };
