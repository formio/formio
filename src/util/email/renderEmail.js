/* eslint-disable max-statements */
'use strict';

const {processSync, Evaluator} = require('@formio/core');
const {JSDOM} = require('jsdom');
const _ = require('lodash');
const {
  formatAddressValue,
  formatCurrency,
  formatDatetime,
  formatTime,
  insertDataMapTable,
  insertGridTable,
  insertRow,
  insertSketchpadTable,
  insertSurveyTable,
  insertTable,
  isGridBasedComponent,
  isLayoutComponent,
  convertToString,
  cleanLabelTemplate,
  formioComponents,
  getSelectTemplate
} = require('./utils');
const macros = require('./nunjucks-macros');

const omitUndefined = (obj) => _.omitBy(obj, _.isUndefined);

function renderEmailProcessorSync(context) {
  const {component, paths, parent, row, scope, data} = context;
  const scopeRef = scope;
  if (component.skipInEmail || isLayoutComponent(component)) {
    return;
  }

  const conditionallyHidden = scopeRef.conditionals?.find(
    (cond) => cond.path === paths?.dataPath && cond.conditionallyHidden,
  );
  const intentionallyHidden = component.hidden;

  if (conditionallyHidden || intentionallyHidden) {
    return;
  }

  // the address component has all the data needed for rendering on context.data at the component's data path
  // the children (if in manual mode) do not need to be iterated over since this data is redundant
  // the children are the individual manual mode address fields (address1, city, etc)
  if (parent?.type === 'address') {
    return;
  }

  if (!scopeRef.emailDom) {
    scopeRef.emailDom = new JSDOM(`
        <table border="1" style="width:100%">
          <tbody id="main">
          </tbody>
        </table>
      `);
  }
  const document = scopeRef.emailDom.window.document;

  const language = context?.metadata?.language;

  const isRadioCheckbox = component.type === 'checkbox' && component.inputType === 'radio';
  const value = _.get(data, paths?.dataPath ?? component.key);
  const rowValue = isRadioCheckbox ? value === component.value : value;

  // some components (like nested forms) add .data to the path
  // this makes it hard to map onto the parent while iterating through nested children
  // i.e. if the parent's data path is 'form'
  // and the child's is 'form.data.textField'
  const componentId = paths?.dataPath?.replace(/\.data\b/g, '') ?? '';
  // remove the current component key from the path
  // so we can get at the parent component's data path
  // to insert child rows/tables into the parent html table
  // replace the last index (for grid-based components) for easier mapping
  // see comment in insertGridHtml()
  const parentId =
    parent && componentId.includes('.')
      ? componentId.substring(0, componentId.lastIndexOf('.')).replace(/\[\d+\]$/, '')
      : 'main';

  const isGridComponent = isGridBasedComponent(component);
  // this is necessary for rendering descendants of grid-based components that are wrapped by layout components
  const componentIdIncludesGridParent = componentId?.includes(scopeRef.gridComponentId);
  if (scopeRef.gridComponentId && !componentIdIncludesGridParent) {
    scopeRef.gridComponentId = undefined;
  }

  if (!scopeRef.gridComponentId && isGridComponent) {
    // it will be the parent for future iterations until the data path no longer includes the key
    scopeRef.gridComponentId = componentId;
  }

  const componentIdIncludesTagPadParent = componentId?.includes(scopeRef.tagPadComponentId);

  if (scopeRef.tagPadComponentId && !componentIdIncludesTagPadParent) {
    scopeRef.tagPadComponentId = undefined;
  }

  if (!scopeRef.tagPadComponentId && component?.type === 'tagpad') {
    scopeRef.tagPadComponentId = componentId;
  }

  // if the parent is a layout component, we need to check
  // if the current component is nested (directly) in a tagpad component
  // used to determine if we need to add a tagpad row number
  const directChildOfTagPad = parentId === scopeRef.tagPadComponentId;
  // if the parent is a layout component, we need to check
  // if the current component is nested (directly) in a grid-based component
  // if it has a parent that's a nested form or a container, we don't trigger the grid-based insertion logic
  const directChildOfGrid = parentId === scopeRef.gridComponentId;

  const componentRenderContext = {
    component,
    data,
    row,
    paths,
    parent,
    parentId,
    componentId,
    document,
    language,
    directChildOfTagPad,
    directChildOfGrid,
  };

  switch (component.type) {
    case 'textfield':
    case 'number':
    case 'password':
    case 'email':
    case 'url':
    case 'phoneNumber':
    case 'day':
    case 'tags': {
      const outputValue = component.multiple ? rowValue?.join(', ') : rowValue;
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'radio': {
      let outputValue = '';
    if (rowValue) {
      if (component.dataSrc === 'url') {
        // eslint-disable-next-line max-depth
        if (component.template && _.get(context.metadata, `selectData.${paths?.dataPath}`)) {
          const selectData = _.get(context.metadata, `selectData.${paths?.dataPath}`);
          const template = cleanLabelTemplate(component.template);
          outputValue = Evaluator.interpolate(template, {item: selectData});
        }
      }
      else {
        outputValue = component?.values?.filter(v => rowValue === v.value)
          .map(v => v.label)
          .join(', ') || '';
      }
    }
      else {
        outputValue = rowValue;
      }

      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'select': {
      let outputValue;
      if (rowValue  && _.get(context.metadata, `selectData.${paths?.dataPath}`)) {
        const selectData = _.get(context.metadata, `selectData.${paths?.dataPath}`);
        const getValueLabel = (v, labelData, template) => {
           return labelData
            ? Evaluator.interpolate(template, {item: labelData})
            : convertToString(v);
         };
        const template = getSelectTemplate(component);
        outputValue = component.multiple
          ? rowValue?.map(v => getValueLabel(v, _.get(selectData, v), template)).join(', ')
          : getValueLabel(rowValue, selectData, template);
      }
      else {
        const getDisplayValue = (v) => {
          let displayValue = v;
          if (_.isPlainObject(v) && !_.isEmpty(v)) {
            const template = getSelectTemplate(component);
            if (template) {
              const contextData = component.valueProperty === 'data' && component.dataSrc === 'resource'
                ? {item: {data: v}}
                : {item: v};
              displayValue = Evaluator.interpolate(template, contextData);
              // cover the case when option label is the stringified object
              if (displayValue === '[object Object]') {
                displayValue = v;
              }
            }
          }
          return convertToString(displayValue);
        };

        outputValue = component.multiple
          ? rowValue?.map(v => getDisplayValue(v)).join(', ')
          : getDisplayValue(rowValue);
      }

      insertRow(componentRenderContext, outputValue);
      return;
    }
    // TODO: translation
    case 'checkbox':
    case 'signature': {
      insertRow(componentRenderContext, rowValue ? 'Yes' : 'No');
      return;
    }
    case 'textarea': {
      const outputValue = component.multiple
        ? rowValue?.map((v) => v.replace(/\n/g, ' ')).join(', ')
        : rowValue;
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'selectboxes': {
      let outputValue = '';
      if (rowValue) {
        if (component.dataSrc === 'url') {
          // eslint-disable-next-line max-depth
          if (component.template && _.isArray(_.get(context.metadata, `selectData.${paths?.dataPath}`))) {
            const selectData = _.get(context.metadata, `selectData.${paths?.dataPath}`);
            const template = cleanLabelTemplate(component.template);
            outputValue = selectData.map(labelData => Evaluator.interpolate(template, {item: labelData})).join(', ');
          }
          else {
            outputValue = _(rowValue)
              .pickBy(Boolean)
              .keys()
              .join(', ');
          }
        }
        else {
          outputValue = component?.values?.filter(v => rowValue[v.value])
            .map(v => v.label)
            .join(', ') || '';
        }
      }
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'address': {
      const outputValue = component.multiple
        ? rowValue
            ?.map((v) =>
              formatAddressValue(v, component, data),
            )
            .join(', ')
        : formatAddressValue(rowValue, component, data);
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'datetime': {
      const timezone = context?.metadata?.timezone;
      const outputValue = component.multiple
        ? rowValue
            ?.map((v) => formatDatetime(component, timezone, v))
            .join(', ')
        : formatDatetime(component, timezone, rowValue);
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'time': {
      const outputValue = component.multiple
        ? rowValue?.map((v) => formatTime(component, v)).join(', ')
        : formatTime(component, rowValue);
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'currency': {
      const outputValue = component.multiple
        ? rowValue?.map((v) => formatCurrency(component, v)).join(', ')
        : formatCurrency(component, rowValue);
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'survey': {
      insertSurveyTable(componentRenderContext, rowValue);
      return;
    }
    case 'datamap': {
      insertDataMapTable(componentRenderContext, rowValue);
      return;
    }
    //TODO: look into how options.review works for file components
    case 'file': {
      const outputValue = _.isArray(rowValue)
        ? rowValue?.map((v) => v?.originalName).join(', ')
        : rowValue?.originalName;
      insertRow(componentRenderContext, outputValue);
      return;
    }
    case 'sketchpad': {
      insertSketchpadTable(componentRenderContext, rowValue);
      return;
    }
    case 'datagrid':
    case 'editgrid':
    case 'tagpad':
    case 'datatable': {
      insertGridTable(componentRenderContext, rowValue);
      return;
    }
    case 'form': {
      // if no child data exists in the nested form, just render the nested form's submission id
      if (!rowValue?.data) {
        const outputValue = rowValue?._id;
        insertRow(componentRenderContext, outputValue);
        return;
      }
      insertTable(componentRenderContext);
      return;
    }
    case 'container': {
      insertTable(componentRenderContext);
      return;
    }
    default:{
      // render custom component value
      if (!formioComponents.includes(component.type) && component.input) {
        if (component.components?.length) {
          insertTable(componentRenderContext);
          return;
        }
        else {
          const outputValue = component.multiple
            ? rowValue?.map(v => convertToString(v)).join(', ')
            : convertToString(rowValue);
          insertRow(componentRenderContext, outputValue);
          return;
        }
      }

      return;
    }
  }
}

const renderEmailProcessor = async (context) => {
  return renderEmailProcessorSync(context);
};

const renderEmailProcessorInfo = {
  name: 'renderEmail',
  process: renderEmailProcessor,
  processSync: renderEmailProcessorSync,
  shouldProcess: () => true,
};

async function renderEmail({
  render,
  context = {},
  vm,
  timeout = 500,
}) {
  if (context._private) {
    delete context._private;
  }
  context.macros = macros;

  const renderMethod = getRenderMethod(render);

  const data = {
    input: omitUndefined(render),
    context,
    submissionTableHtml: null,
  };

  if (renderMethod === 'dynamic') {
    const result = processSync({
      ...context,
      components: context.form.components,
      processors: [renderEmailProcessorInfo],
    });
    data.submissionTableHtml = result.emailDom.window.document.body.innerHTML;
  }

  try {
    const res = await vm.evaluate(getScript(render), data);
    return res;
  }
  catch (err) {
    console.warn(err);
  }
}

function getScript(data) {
  const injectDependencies = `
    if (_) {
    environment.addGlobal('_',_)
    }
    if (moment) {
    environment.addGlobal('moment',moment)
    }
    if (utils) {
    environment.addGlobal('utils',utils)
    }`;

  if (_.isString(data)) {
    // Script to render a single string.
    return `
      ${injectDependencies}
      environment.params = context;
      output = unescape(environment.renderString(sanitize(input), context));
    `;
  }

  // Script to render an object of properties.
  return `
    ${injectDependencies}
    environment.params = context;
    var rendered = {};
    for (let prop in input) {
      if (input.hasOwnProperty(prop)) {
        rendered[prop] = input[prop];
        if (prop === 'html') {
          rendered[prop] = unescape(environment.renderString(context.macros + sanitize(rendered[prop]), context));
        }
        rendered[prop] = unescape(environment.renderString(context.macros + sanitize(rendered[prop]), context));
      }
    }
    output = rendered;
  `;
}

function getRenderMethod(render) {
  let renderMethod = 'static';
  if (process.env.RENDER_METHOD) {
    renderMethod = process.env.RENDER_METHOD;
  }
  else if (render && render.renderingMethod) {
    renderMethod = render.renderingMethod;
  }
  return renderMethod;
}

module.exports = {renderEmail, getScript};
