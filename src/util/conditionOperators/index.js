'use strict';

const IsNotEqualTo = require('./IsNotEqualTo');
const IsEmptyValue = require('./IsEmptyValue');
const IsNotEmptyValue = require('./IsNotEmptyValue');
const LessThan = require('./LessThan');
const GreaterThan = require('./GreaterThan');
const IsEqualTo = require('./IsEqualTo');
const DateGreaterThan = require('./DateGreaterThan');
const DateLessThan = require('./DateLessThan');
const Includes = require('./Includes');
const StartsWith = require('./StartsWith');
const NotIncludes = require('./NotIncludes');
const EndsWith = require('./EndsWith');
const DateGreaterThanOrEqual = require('./DateGreaterThanOrEqual');
const DateLessThanOrEqual = require('./DateLessThanOrEqual');
const LessThanOrEqual = require('./LessThanOrEqual');
const GreaterThanOrEqual = require('./GreaterThanOrEqual');
const IsDateEqual = require('./IsDateEqual');
const IsNotDateEqual = require('./IsNotDateEqual');
const _ = require('lodash');
const {Formio} = require('../util');

const ConditionOperators = {
  [`${IsNotEqualTo.operatorKey}`]: IsNotEqualTo,
  [`${IsEqualTo.operatorKey}`]: IsEqualTo,
  [`${IsEmptyValue.operatorKey}`]: IsEmptyValue,
  [`${IsNotEmptyValue.operatorKey}`]: IsNotEmptyValue,
  [`${LessThan.operatorKey}`]: LessThan,
  [`${GreaterThan.operatorKey}`]: GreaterThan,
  [`${DateGreaterThan.operatorKey}`]: DateGreaterThan,
  [`${DateLessThan.operatorKey}`]: DateLessThan,
  [`${Includes.operatorKey}`]: Includes,
  [`${StartsWith.operatorKey}`]: StartsWith,
  [`${EndsWith.operatorKey}`]: EndsWith,
  [`${NotIncludes.operatorKey}`]: NotIncludes,
  [`${DateGreaterThanOrEqual.operatorKey}`]: DateGreaterThanOrEqual,
  [`${DateLessThanOrEqual.operatorKey}`]: DateLessThanOrEqual,
  [`${LessThanOrEqual.operatorKey}`]: LessThanOrEqual,
  [`${GreaterThanOrEqual.operatorKey}`]: GreaterThanOrEqual,
  [`${IsDateEqual.operatorKey}`]: IsDateEqual,
  [`${IsNotDateEqual.operatorKey}`]: IsNotDateEqual,
};

const conditionOperatorsByComponentType = {
  base: [
    IsEqualTo.operatorKey,
    IsNotEqualTo.operatorKey,
    IsEmptyValue.operatorKey,
    IsNotEmptyValue.operatorKey,
  ]};

Object.keys(Formio.Components.components).forEach((type) => {
  const component = Formio.Components.components[type];
  const operators = component && component.serverConditionSettings ? component.serverConditionSettings.operators : null;
  if (operators) {
    conditionOperatorsByComponentType[type] = operators;
  }
});

const filterComponentsForConditionComponentFieldOptions = (flattenedComponents) => _.map(
    flattenedComponents,
    (component,path) => ({
      ...component,
      path,
    }),
)
    // Hide components without key, layout components, data components and form, datasource, button components
    .filter((component) => {
      let allowed = component.key &&
          component.input === true &&
          !component.hasOwnProperty('components') &&
          ![
            'form',
            'datasource',
            'button',
          ].includes(component.type);

      const pathArr = component.path.split('.');

      // Do not show component if it is inside dataGrid, editGrid, dataMap or tagpad
      if (pathArr.length > 1) {
        let subPath = pathArr[0];
        for (let i = 1; i < pathArr.length; i++) {
          const parent = flattenedComponents[subPath];
          if (parent && ['datagrid','editgrid','tagpad','datamap'].includes(parent.type)) {
            allowed = false;
            break;
          }
          else {
            subPath += `.${pathArr[i]}`;
          }
        }
      }
      return allowed;
    })
    .map(({
      path,
      key,
      label,
    }) => ({
      value: path,
      label: `${label || key} (${path})`,
    }));

const allConditionOperatorsOptions = Object.keys(ConditionOperators).map((operatorKey) => ({
  value: operatorKey,
  label: ConditionOperators[operatorKey].displayedName,
}));

const operatorsWithNoValue = _.chain(ConditionOperators)
  .map(operator => {
    return !operator.requireValue
      ? operator.operatorKey
      : null;
})
  .filter(operatorKey => !!operatorKey)
  .value();

const getValueComponentsForEachFormComponent = (flattenedComponents) => {
  const valueComponentSettingsByComponentPath = {};

  Object.keys(flattenedComponents).forEach((path) => {
    const componentSchema = flattenedComponents[path];
    const component = componentSchema && componentSchema.type
      ? Formio.Components.components[componentSchema.type]
      : null;
    const getValueComponent = component && component.serverConditionSettings ?
      component.serverConditionSettings.valueComponent :
      null;

    const valueComponent = getValueComponent && typeof getValueComponent === 'function' ?
      getValueComponent(componentSchema) :
      {type: 'textfield'};

    valueComponentSettingsByComponentPath[path] = _.omit(valueComponent, [
      'logic',
      'prefix',
      'suffix',
      'action',
      'defaultValue',
      'conditional',
      'hideLabel',
      'multiple',
      'calculateValue',
      'validate',
      'hidden',
      'customConditional',
    ]);
  });

  return valueComponentSettingsByComponentPath;
};

const getValueComponentRequiredSettings = (valueComponentsByComponentPath) => {
  return {
    label: 'Value:',
    key: 'value',
    placeholder: 'Enter Compared Value',
    input: true,
    typeChangeEnabled: true,
    logic: [
      {
        name: 'check if row component is defined',
        trigger: {
          type: 'javascript',
          javascript: 'result = true || row.component;',
        },
        actions: [
          {
            name: 'change value component',
            type: 'mergeComponentSchema',
            schemaDefinition: `
            const valueComponentsByComponentPath = ${JSON.stringify(valueComponentsByComponentPath)};
            const valueComponent = valueComponentsByComponentPath[row.component] || { type: 'textfield' };
            
            if (valueComponent.type !== 'datetime') {
              valueComponent.widget = null;
            }
            
            schema = {
              ...valueComponent,
              ..._.pick(component, [
                'label', 'key', 'placeholder', 'input', 'typeChangeEnabled', 'logic', 'customConditional'
              ])
            };
          `,
          },
        ],
      },
      {
        name: 'clear value on empty operator',
        trigger: {
          type: 'javascript',
          javascript: 'result = !row.operator && row[component.key];',
        },
        actions: [
          {
            name: 'clear value',
            type: 'customAction',
            customAction: 'instance.resetValue()',
          },
        ],
      },
    ],
    customConditional: `
      const singleOperators = ${JSON.stringify(operatorsWithNoValue)};
      show = !_.includes(singleOperators, row.operator);
    `,
  };
};

module.exports = {
  ConditionOperators,
  filterComponentsForConditionComponentFieldOptions,
  conditionOperatorsByComponentType,
  allConditionOperatorsOptions,
  operatorsWithNoValue,
  getValueComponentsForEachFormComponent,
  getValueComponentRequiredSettings,
};
