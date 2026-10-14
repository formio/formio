'use strict';

// Output-collection helpers for the encapsulated nextgen render. They walk the
// LIVE renderer instance graph (errorsRecord, eachInstance), so
// they run INSIDE the isolate against the in-isolate form instance and return
// plain, structured-cloneable results across the boundary. Moved here from
// Validator.js when the render moved into the sandbox.
const { eachInstance, isDisplayComponent, renderToHtml } = require('@formio/nextgen');

// Email render data collected from the LIVE renderer instance graph (html render
// mode): the whole-form submission table plus per-component value/label maps for
// the value()/label() template macros. Runs INSIDE the isolate — same boundary
// contract as collectHiddenPaths — so email form JS never executes on the host.
function collectEmailRenderData(formInstance) {
  const componentValues = {};
  const componentLabels = {};
  const rows = [];
  eachInstance(formInstance, ({ instance, absoluteDataPath }) => {
    const definition = instance.definition;
    if (!instance.dataPath) {
      return;
    }
    const isSkippedInEmail =
      definition.skipInEmail ||
      isDisplayComponent(definition) ||
      definition.type === 'button' ||
      !instance.visible;
    if (isSkippedInEmail) {
      return;
    }
    const rendered = definition.protected ? '--- PROTECTED ---' : instance.view({ html: true });
    const value = typeof rendered === 'string' ? rendered : renderToHtml(rendered);
    const label = definition.label ?? definition.key;
    componentValues[absoluteDataPath] = value;
    componentLabels[absoluteDataPath] = label;
    rows.push({ dataPath: absoluteDataPath, label, value });
  });
  return { submissionTableHtml: buildSubmissionTable(rows), componentValues, componentLabels };
}

function buildSubmissionTable(rows) {
  const dataPaths = rows.map((row) => row.dataPath);
  const isDescendantPath = (candidate, ancestor) =>
    candidate.startsWith(`${ancestor}.`) || candidate.startsWith(`${ancestor}[`);
  const isNested = (dataPath) => dataPaths.some((ancestor) => isDescendantPath(dataPath, ancestor));
  const cells = rows
    .filter((row) => !isNested(row.dataPath))
    .map(
      (row) =>
        `<tr><th style="padding: 5px 10px;">${row.label}</th>` +
        `<td style="width:100%;padding:5px 10px;">${row.value}</td></tr>`,
    )
    .join('');
  return `<table border="1" style="width:100%">${cells}</table>`;
}

// Absolute data paths of every conditionally-hidden component — nextgen never
// sets submission.scope.conditionals, so the server reads visibility this way.
function collectHiddenPaths(formInstance) {
  const hidden = [];
  eachInstance(
    formInstance,
    ({ instance, absoluteDataPath }) => {
      if (instance.visible === false) {
        hidden.push(absoluteDataPath);
      }
    },
    { shouldDescend: (instance) => instance.visible !== false },
  );
  return hidden;
}

// Flatten the renderer's errorsRecord into formio-shaped ValidationError details.
function errorsRecordToDetails(formInstance) {
  const details = [];
  eachInstance(formInstance, ({ instance, path, instancePath, owner }) => {
    const errors = owner.errorsRecord?.[path] || [];
    if (!errors.length) {
      return;
    }
    const definition = instance.definition;
    // errorsRecord is keyed by the instance path, not the data path.
    const pathArray = dataPathToArray(instancePath);
    const key = String(pathArray.at(-1) ?? '');
    const indexInArray = lastRowIndex(pathArray);
    for (const err of errors) {
      const settingFromConfig = definition.validate?.[err.rule];
      details.push({
        message: err.message,
        level: err.severity || 'error',
        path: pathArray,
        context: {
          validator: err.rule,
          hasLabel: !!definition.label,
          key,
          label: definition.label || definition.placeholder || definition.key || key,
          path: instancePath,
          ...(settingFromConfig !== undefined ? { setting: settingFromConfig } : {}),
          index: indexInArray,
          ...(err.context || {}),
        },
      });
    }
  });
  return details;
}

function lastRowIndex(pathArray) {
  return pathArray.reduce((last, segment) => (typeof segment === 'number' ? segment : last), 0);
}

function dataPathToArray(dataPath) {
  const out = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(String(dataPath))) !== null) {
    if (m[1] !== undefined) out.push(m[1]);
    else if (m[2] !== undefined) out.push(Number(m[2]));
  }
  return out;
}

module.exports = {
  collectHiddenPaths,
  errorsRecordToDetails,
  dataPathToArray,
  collectEmailRenderData,
};
