'use strict';
const {
  I18n,
  convertFormatToMoment,
  coreEnTranslation,
  currentTimezone,
  momentDate,
  Evaluator,
  Utils,
} = require('@formio/core');
const _ = require('lodash');
const moment = require('moment');

const insertHtml = (html, parentId, document) => {
  const parentElement = document.getElementById(parentId);
  if (parentElement) {
    parentElement.insertAdjacentHTML('beforeend', html);
  }
};

const t = (
  text,
  language,
  params,
  ...args
) => {
  if (!text) {
    return '';
  }
  // Use _userInput: true to ignore translations from defaults
  if (text in coreEnTranslation && params._userInput) {
    return text;
  }
  const i18n = I18n.init(language);
  return i18n.t(text, params, ...args);
};

const isLayoutComponent = (component) => {
  const modelType = Utils.getModelType(component);
  return modelType === 'none' || modelType === 'content';
};

const isGridBasedComponent = (component) => {
  if (!component) {
    return false;
  }
  const modelType = Utils.getModelType(component);
  return modelType === 'nestedArray' || modelType === 'nestedDataArray';
};

const shouldInsertGridChild = (
  component,
  parent,
  directChildOfGrid, // if the parent is a layout component, we use this to determine if this component is within a grid
) => isGridBasedComponent(parent) || (!isGridBasedComponent(component) && directChildOfGrid);

const isValueInLegacyFormat = (value) => {
  return value && !value.mode;
};

// if the value is in legacy format, it won't be of type AddressComponentDataObject
// so using any instead
const normalizeValue = (value, component) => {
  return component.enableManualMode && isValueInLegacyFormat(value)
    ? {
        mode: 'autocomplete',
        address: value,
      }
    : value;
};

const getProviderDisplayValue = (
  address,
  component,
) => {
  let displayedProperty = '';
  switch (component.provider) {
    case 'google':
      displayedProperty = _.has(address, 'formattedPlace') ? 'formattedPlace' : 'formatted_address';
      break;
    case 'nominatim':
      displayedProperty = 'display_name';
      break;
    case 'azure':
      displayedProperty = 'address.freeformAddress';
      break;
    case 'custom':
      displayedProperty = component?.providerOptions?.displayValueProperty;
      break;
  }
  return _.get(address, displayedProperty, '');
};

const formatAddressValue = (
  value,
  component,
  data,
) => {
  const normalizedValue = normalizeValue(value, component);

  const {address, mode} = component.enableManualMode
    ? normalizedValue
    : {
        address: normalizedValue,
        mode: 'autocomplete',
      };

  const valueInManualMode = mode === 'manual';

  if (component.provider && !valueInManualMode) {
    return getProviderDisplayValue(address, component);
  }
  if (valueInManualMode) {
    if (component.manualModeViewString && address) {
      return Evaluator.evaluate(component.manualModeViewString, {
        address,
        component,
        data: value,
      }, 'value');
    }
  }
  if (address) {
    const parts = [];
    if (address.address1) {
parts.push(address.address1);
}
    if (address.address2) {
parts.push(address.address2);
}
    if (address.city) {
parts.push(address.city);
}
    if (address.state) {
parts.push(address.state);
}
    if (address.zip) {
parts.push(address.zip);
}
    if (address.country) {
parts.push(address.country);
}
    return parts.join(', ');
  }
  return '';
};

const formatCurrency = (component, value) => {
  if (!value) {
return '';
}
  const currency = component.currency;
  return currency
    ? Number(value).toLocaleString(undefined, {
        style: 'currency',
        currency,
      })
    : value;
};

const formatDatetime = (
  component,
  userProvidedTimezone,
  value,
) => {
  if (!value) {
return '';
}
  const rawFormat = component.format ?? 'yyyy-MM-dd hh:mm a';
  let format = convertFormatToMoment(rawFormat);
  format += format.match(/z$/) ? '' : ' z';
  const displayInTimezone = component.displayInTimezone;
  const locationTimezone = component.timezone;
  const timezone =
    displayInTimezone === 'utc'
      ? 'Etc/UTC'
      : userProvidedTimezone && displayInTimezone === 'submission'
        ? userProvidedTimezone
        : locationTimezone && displayInTimezone === 'location'
          ? locationTimezone
          : // of viewer (i.e. wherever this server is)
            userProvidedTimezone || currentTimezone();
  return momentDate(value, format, timezone).format(format);
};

const formatTime = (component, value) => {
  if (!value) {
    return '';
  }
  const format = component.format ?? 'HH:mm';
  const dataFormat = component.dataFormat ?? 'HH:mm:ss';
  return moment(value, dataFormat).format(format);
};

const insertGridHeader = (componentRenderContext) => {
  const {component, data, row, parentId, paths, document, language} = componentRenderContext;
  const componentIdNoLastIndex = `${parentId}-${component.key}`;
  const existingHeadValue = document.getElementById(`${componentIdNoLastIndex}-th`);
  if (!existingHeadValue) {
    const headValue = `
      <th style="padding: 5px 10px;" id="${componentIdNoLastIndex}-th">${t(
        component?.label ?? component.key,
        language,
        {
          data,
          row,
          paths,
          _userInput: true,
        },
      )}
      </th>`;
    const parentTheadId = `${parentId}-thead`;
    insertHtml(headValue, parentTheadId, document);
  }
};

const insertGridHtml = (
  componentRenderContext,
  childHtml, // child row or child table
) => {
  const {document, paths, directChildOfTagPad, parentId} = componentRenderContext;
  const childRowId = `${parentId}${paths?.dataIndex ?? 0}-childRow`;
  const existingChildRow = document.getElementById(childRowId);
  const styles = directChildOfTagPad ? 'text-align: center' : 'padding: 5px 10px;';
  const rowValue = `
    ${!existingChildRow ? `<tr id="${childRowId}">` : ''}
        ${
          !existingChildRow && directChildOfTagPad
            ? `<td style="${styles}">${paths?.dataIndex != null ? paths.dataIndex + 1 : 0}</td>`
            : ''
        }
        ${childHtml}
      ${!existingChildRow ? `</tr>` : ''}`;

  insertHtml(
    rowValue,
    // use parentId, which has no last index since when the parent grid-based table was inserted
    // the componentId of that table had no index
    // i.e. 'tagpad' was the componentId of the parent
    // but the data path of the child would be 'tagpad[0].textfield'
    // so, to derive the parentId based on the child's data path
    // we need to 1: remove the component key from the path, and 2: remove the final index
    // if it's a nested grid, we need every index except the last
    // i.e. 'editgrid[0].editgrid1[1].textfield', the parentId would be 'editgrid[0].editgrid1'
    existingChildRow ? childRowId : parentId,
    document,
  );
};

const insertGridRow = (value, componentRenderContext) => {
  const {directChildOfTagPad} = componentRenderContext;
  insertGridHeader(componentRenderContext);
  const styles = directChildOfTagPad ? 'text-align: center' : 'padding: 5px 10px;';
  const childValue = `<td style="${styles}">${value}</td>`;
  insertGridHtml(componentRenderContext, childValue);
};

// a child that is a table within a grid-based component
// i.e. a nested form inside of an edit grid
const insertGridChildTable = (
  componentRenderContext,
  rows,
  tHead,
) => {
  const {componentId, directChildOfTagPad} = componentRenderContext;
  insertGridHeader(componentRenderContext);
  const styles = directChildOfTagPad ? 'text-align: center' : 'padding: 5px 10px;';
  const childTable = `
    <td style="${styles}">
      <table border="1" style="width:100%">
        ${tHead ?? ''}
        <tbody id="${componentId}">
        ${rows ?? ''}
        </tbody>
      </table>
    </td>
  `;
  insertGridHtml(componentRenderContext, childTable);
};

const insertRow = (
  componentRenderContext,
  rawValue,
  label,
  noInsert, // only used by insertDataMapTable
) => {
  const {component, parent, parentId, document, directChildOfGrid} = componentRenderContext;
  const value = component?.protected ? '--- PROTECTED ---' : rawValue ?? '';
  if (shouldInsertGridChild(component, parent, directChildOfGrid) && !noInsert) {
    insertGridRow(value, componentRenderContext);
    return;
  }
  const html = `
    <tr>
      <th style="padding: 5px 10px;">${label ?? component?.label ?? component?.key ?? ''}</th>
      <td style="width:100%;padding:5px 10px;">
        ${value}
      </td>
    </tr>
  `;
  if (noInsert) {
return html;
}
  insertHtml(html, parentId, document);
};

const insertTable = (
  componentRenderContext,
  rows,
  tHead,
) => {
  const {component, componentId, parentId, document, parent, directChildOfGrid} =
    componentRenderContext;
  if (shouldInsertGridChild(component, parent, directChildOfGrid)) {
    insertGridChildTable(componentRenderContext, rows, tHead);
    return;
  }
  const html = `
    <tr>
      <th style="padding: 5px 10px;">${component.label ?? component.key}</th>
      <td style="width:100%;padding:5px 10px;">
        <table border="1" style="width:100%">
          ${tHead ?? ''}
          <tbody id="${componentId}">
            ${rows ?? ''}
          </tbody>
        </table>
      </td>
    </tr>
  `;
  insertHtml(html, parentId, document);
};

const insertSketchpadTable = (
  componentRenderContext,
  rowValue,
) => {
  const {component, data, row, language = 'en'} = componentRenderContext;
  const tHead =
    rowValue?.length !== 0
      ? `
        <thead>
          <tr><th>${t(component?.label ?? component.key, language, {
            data,
            row,
            component,
            _userInput: true,
          })}</th>${t('complexData', language, {data, row, component})}</tr>
        </thead>
      `
      : '';
  insertTable(componentRenderContext, undefined, tHead);
};

// insert a grid-based table component
// i.e. an edit grid, data grid, etc.
const insertGridTable = (
  componentRenderContext,
  rowValue,
) => {
  const {component, componentId, data, row, paths, language = 'en'} = componentRenderContext;
  const tHead =
    rowValue?.length !== 0
      ? `
    <thead>
      <tr id="${componentId}-thead">
        ${
          component.type === 'tagpad'
            ? `<th id="tagpad-dots" style="padding: 5px 10px;">${t('dots', language, {
                data,
                row,
                paths,
              })}</th>`
            : ''
        }
      </tr>
    </thead>
  `
      : '';
  insertTable(componentRenderContext, undefined, tHead);
};

const insertSurveyTable = (
  componentRenderContext,
  value,
) => {
  const {component, data, row, language = 'en'} = componentRenderContext;
  const tHead = `
    <thead>
      <tr>
        <th>${t('surveyQuestion', language, {data, row, component})}</th>
        <th>${t('surveyQuestionValue', language, {data, row, component})}</th>
      </tr>
    </thead>`;
  const rows = value
    ? Object.entries(value)
        .map(([key, value]) => {
          const question = _.find(component.questions, ['value', key]);
          const answer = _.find(component.values, ['value', value]);
          if (!question || !answer) {
            return;
          }
          return `
            <tr>
              <td style="text-align:center;padding: 5px 10px;">${question.label}</td>
              <td style="text-align:center;padding: 5px 10px;">${answer.label}</td>
            </tr>
        `;
        })
        .join('')
    : '';
  insertTable(componentRenderContext, rows, tHead);
};

const insertDataMapTable = (
  componentRenderContext,
  value,
) => {
  const rows = value
    ? Object.entries(value)
        .map(([key, value]) => insertRow(componentRenderContext, value, key, true))
        .join('')
    : '';
  insertTable(componentRenderContext, rows);
};

const convertToString = (value) => {
  if (_.isObject(value)) {
    try {
      return JSON.stringify(value);
    }
    catch (e) {
      return value;
    }
  }
  else {
    return value;
  }
};

const cleanLabelTemplate = (template) => {
  return (template || '').replace(/<\/?[^>]+(>|$)/g, '');
};

const getSelectTemplate = (component) => {
  return cleanLabelTemplate(component.template) || '{{ item.label }}';
};

const formioComponents = [
  'address',
  'base',
  'component',
  'componentmodal',
  'button',
  'checkbox',
  'columns',
  'container',
  'content',
  'currency',
  'datagrid',
  'datamap',
  'datetime',
  'day',
  'editgrid',
  'email',
  'input',
  'field',
  'multivalue',
  'list',
  'fieldset',
  'file',
  'form',
  'hidden',
  'htmlelement',
  'nested',
  'nesteddata',
  'nestedarray',
  'number',
  'panel',
  'password',
  'phoneNumber',
  'radio',
  'recaptcha',
  'select',
  'selectboxes',
  'signature',
  'survey',
  'table',
  'tabs',
  'tags',
  'textarea',
  'textfield',
  'time',
  'url',
  'well',
  'datasource',
  'sketchpad',
  'tagpad',
  'datatable',
  'reviewpage',
  'captcha',
  'resourcefields',
];

module.exports = {
  isLayoutComponent,
  isGridBasedComponent,
  insertDataMapTable,
  insertSketchpadTable,
  insertSurveyTable,
  insertGridTable,
  formatAddressValue,
  formatCurrency,
  formatDatetime,
  formatTime,
  insertRow,
  insertTable,
  insertGridChildTable,
  insertGridHtml,
  insertHtml,
  t,
  shouldInsertGridChild,
  isValueInLegacyFormat,
  normalizeValue,
  getProviderDisplayValue,
  insertGridHeader,
  insertGridRow,
  convertToString,
  cleanLabelTemplate,
  formioComponents,
  getSelectTemplate
};
