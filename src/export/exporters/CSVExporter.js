'use strict';

const Exporter = require('../Exporter');
const util = require('../../util/util');
const {
  getInputMask,
  convertFormatToMoment,
} = require('formiojs/utils').default;
const through = require('through');
const csv = require('csv');
const _ = require('lodash');
const Entities = require('html-entities').AllHtmlEntities;
const moment = require('moment');
const {conformToMask} = require('vanilla-text-mask');

const interpolate = (string, data) => string.replace(/{{\s*(\S*)\s*}}/g, (match, path) => {
  const value = _.get(data, path);
  if (_.isObject(value)) {
    return JSON.stringify(value);
  }

  return value;
});

/**
 * Create a CSV exporter.
 * @param form
 * @param res
 * @param req
 * @constructor
 */
class CSVExporter extends Exporter {
  constructor(form, req, res) {
    super(form, req, res);

    this.extension = 'csv';
    this.contentType = 'text/csv';
    this.stringifier = csv.stringify({
      delimiter: ',',
      quoted: true
    });
    this.fields = [];

    const formattedView = req.query.view === 'formatted';
    this.formattedView = formattedView;

    const ignore = ['password', 'button', 'container', 'datagrid'];
    try {
      util.eachComponent(form.components, (component, path) => {
        if (!component.input || !component.key || ignore.includes(component.type)) {
          return;
        }

        const items = [];

        // If a component has multiple parts, pick what we want.
        if (component.type === 'address') {
          items.push({
            subpath: 'formatted_address',
            rename: (label) => `${label}.formatted`
          });
          items.push({
            subpath: 'geometry.location.lat',
            rename: (label) => `${label}.lat`
          });
          items.push({
            subpath: 'geometry.location.lng',
            rename: (label) => `${label}.lng`
          });
        }
        else if (component.type === 'selectboxes') {
          _.each(component.values, (option) => {
            items.push({label: [path, option.value].join('.'), subpath: option.value, type: 'boolean'});
          });
        }
        else if (component.type === 'radio') {
          items.push({
            preprocessor(value) {
              if (_.isObject(value)) {
                return value;
              }

              const componentValue = component.values.find((v) => v.value === value) || '';
                return componentValue && formattedView
                  ? componentValue.label
                  : componentValue.value;
            }
          });
        }
        else if (formattedView && ['currency', 'number'].includes(component.type)) {
          const currency = component.type === 'currency';

          const formatOptions = {
            style: currency ? 'currency' : 'decimal',
            useGrouping: true,
            maximumFractionDigits: component.decimalLimit || 2
          };

          if (currency) {
            formatOptions.currency = component.currency || 'USD';
          }

          items.push({
            preprocessor(value) {
              if (_.isObject(value)) {
                return value;
              }

              return value.toLocaleString('en', formatOptions);
            }
          });
        }
        else if (component.type === 'checkbox') {
          items.push({type: 'boolean'});
        }
        else if (component.type === 'survey') {
          _.each(component.questions, (question) => {
            items.push({
              label: [path, question.value].join('.'),
              subpath: question.value,
              preprocessor(value) {
                if (_.isObject(value)) {
                  return value;
                }

                const componentValue = component.values.find((v) => v.value === value) || '';
                return componentValue && formattedView
                  ? componentValue.label
                  : componentValue.value;
              }
            });
          });
        }
        else if (['select', 'resource'].includes(component.type)) {
          // Prepare the Lodash template by deleting tags and html entities
          const clearTemplate = Entities.decode(component.template.replace(/<\/?[^>]+(>|$)/g, ''));
          const templateExtractor = (item) => interpolate(clearTemplate, {item});

          const valuesExtractor = (value) => {
            // Check if this is within a datagrid.
            if (_.isArray(value) && value[0] && value[0][component.key]) {
              const rowValues = [];
              _.each(value, (row) => {
                if (!row) {
                  return;
                }
                const rowValue = row[component.key];
                if (rowValue) {
                  rowValues.push(valuesExtractor(rowValue));
                }
              });
              return rowValues;
            }
            else {
              //checking if the component can accept multiple values.
              if (component.multiple) {
                if (component.type === 'resource') {
                  const tempVal = [];
                  _.each(value, (eachItem) => {
                    let result = '';
                    try {
                      result = templateExtractor(eachItem);
                    }
                    catch (err) {
                      result = err.message;
                    }
                    tempVal.push(result);
                  });
                  return tempVal;
                }
                else if (component.type === 'select') {
                  return value;
                }
              }
              else {
                let result = '';
                try {
                  result = _.isObject(value) ? templateExtractor(value) : value;
                }
                catch (err) {
                  result = err.message;
                }
                return result;
              }
            }
          };

          const primitiveValueHandler = (value) => {
            if (component.type === 'select' && component.dataSrc === 'values') {
              const componentValue = component.data.values.find((v) => v.value === value) || '';
                return componentValue && formattedView
                  ? componentValue.label
                  : componentValue.value;
            }

            return value;
          };

          items.push({
            preprocessor(value) {
              return _.isObject(value)
                ? valuesExtractor(value)
                : primitiveValueHandler(value);
            }
          });
        }
        else if (component.type === 'datetime') {
          items.push({
            preprocessor(value) {
              if (_.isObject(value) && !_.isDate(value)) {
                return value;
              }

              if (!formattedView && value) {
                return (typeof value.toISOString === 'function') ? value.toISOString() : value;
              }

              if (value) {
                const result = moment(value).format(convertFormatToMoment(component.format));
                return result;
              }

              return '';
            }
          });
        }
        else if (component.type === 'signature') {
          items.push({
            preprocessor(value) {
              if (_.isObject(value)) {
                return value;
              }

              return value ? 'YES' : 'NO';
            }
          });
        }
        else if (formattedView && component.inputMask) {
          const mask = getInputMask(component.inputMask);
          items.push({
            preprocessor(value) {
              return conformToMask(value, mask).conformedValue;
            }
          });
        }
        else {
          // Default to the current component item.
          items.push({});
        }

        items.forEach((item) => {
          const finalItem = {
            path,
            key: component.key,
            label: item.label || path
          };

          if (item.hasOwnProperty('subpath')) {
            finalItem.subpath = item.subpath;
          }

          if (item.hasOwnProperty('rename')) {
            finalItem.rename = item.rename;
          }

          if (item.hasOwnProperty('type')) {
            finalItem.type = item.type;
          }

          if (item.hasOwnProperty('preprocessor')) {
            finalItem.preprocessor = item.preprocessor;
          }

          this.fields.push(finalItem);
        });
      }, true);
    }
    catch (err) {
      res.status(500).send(err.message || err);
    }
  }

  /**
   * Start the CSV export by creating the headers.
   *
   * @param deferred
   */
  start(resolve) {
    let row = null;
    this.stringifier.on('readable', () => {
      /* eslint-disable no-cond-assign */
      while (row = this.stringifier.read()) {
        this.res.write(row.toString());
      }
      /* eslint-enable no-cond-assign */

      resolve();
    });

    const labels = this.formattedView
      ? ['ID', 'Created', 'Modified']
      : ['_id', 'created', 'modified'];
    this.fields.forEach((item) => {
      if (item.hasOwnProperty('rename')) {
        if (_.isFunction(item.rename)) {
          labels.push(item.rename(item.label));
        }
        else {
          labels.push(item.rename);
        }

        return;
      }

      labels.push(item.label);
    });

    this.stringifier.write(labels);
  }

  /**
   * Stream the CSV export.
   *
   * @param stream
   * @returns {*}
   */
  stream(stream) {
    const self = this;
    const write = function(submission) {
      const data = [
        submission._id.toString(),
        submission.created.toISOString(),
        submission.modified.toISOString()
      ];

      /**
       * Util function to unwrap an unknown data payload into a string.
       *
       * @param data
       * @returns {string}
       */
      const coerceToString = (data, column) => {
        data = (column.preprocessor || _.identity)(data);

        if (_.isArray(data) && data.length > 0) {
          const fullPath = column.subpath
            ? `${column.key}.${column.subpath}`
            : column.key;

          return data.map((item) => `"${coerceToString(_.get(item, fullPath, item), column)}"`).join(',');
        }
        if (_.isString(data)) {
          if (column.type === 'boolean') {
            return Boolean(data).toString();
          }

          return data.toString();
        }
        if (_.isNumber(data)) {
          return data.toString();
        }
        if (_.isObject(data)) {
          return coerceToString(_.get(data, column.subpath, ''), column);
        }

        return JSON.stringify(data);
      };

      self.fields.forEach((column) => {
        const componentData = _.get(submission.data, column.path);

        // If the path had no results and the component specifies a path, check for a datagrid component
        if (_.isUndefined(componentData) && column.path.includes('.')) {
          const parts = column.path.split('.');
          const container = parts.shift();
          const containerData = _.get(submission.data, container);

          // If the subdata is an array, coerce it to a displayable string.
          if (_.isArray(containerData)) {
            // Update the column component path, since we removed part of it.
            column.path = parts.join('.');

            data.push(coerceToString(containerData, column));
            return;
          }
        }

        data.push(coerceToString(componentData, column));
      });

      this.queue(data);
    };

    return stream
      .pipe(through(write, () => this.res.end()))
      .pipe(this.stringifier);
  }
}

module.exports = CSVExporter;
