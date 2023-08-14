'use strict';

const Exporter = require('../Exporter');
const util = require('../../util/util');
const through = require('through');
const csv = require('csv');
const _ = require('lodash');
const Entities = require('html-entities');
const moment = require('moment-timezone');
const {conformToMask} = require('vanilla-text-mask');
const Formio = require('formiojs/formio.form');

const interpolate = (string, data) => string.replace(/{{\s*(\S*)\s*}}/g, (match, path) => {
  const value = _.get(data, path);
  if (_.isObject(value)) {
    return JSON.stringify(value);
  }

  return value;
});

const labelRegexp = /(?:(\.data\.)(?!\.data\.))/g;

/**
 * Create a CSV exporter.
 * @param form
 * @param res
 * @param req
 * @constructor
 */
class CSVExporter extends Exporter {
  /* eslint-disable max-statements */
  constructor(form, req, res) {
    super(form, req, res);
    this.timezone = _.get(form, 'settings.components.datetime.timezone', '');
    this.dateFormat = util.FormioUtils.convertFormatToMoment('yyyy-MM-dd hh:mm a');
    this.extension = 'csv';
    this.contentType = 'text/csv';
    this.stringifier = csv.stringify({
      delimiter: ',',
      quoted: true
    });
    this.fields = [];

    this.customTransformers = {};

    const formattedView = req.query.view === 'formatted';
    this.formattedView = formattedView;

    const ignore = ['password', 'button', 'container', 'datagrid', 'editgrid', 'dynamicWizard'];
    try {
      util.eachComponent(form.components, (comp, path) => {
        if (!comp.input || !comp.key || ignore.includes(comp.type)) {
          return;
        }

        const {component} = Formio.Components.create(comp);
        const items = [];
        let noRecurse = false;

        // If a component has multiple parts, pick what we want.
        if (component.type === 'address') {
          items.push({
            rename: (label) => `${label}.formatted`,
            preprocessor: (value) => {
              if (_.isArray(value)) {
                return value;
              }

              const address = (value && value.address) || value || {};

              // OpenStreetMap || Azure || Google
              // eslint-disable-next-line max-len
              return address.display_name || _.get(address, 'address.freeformAddress') || address.formatted_address || '';
            },
          });
          items.push({
            rename: (label) => `${label}.lat`,
            preprocessor: (value) => {
              if (_.isArray(value)) {
                return value;
              }

              const address = (value && value.address) || value || {};

              // OpenStreetMap || Azure || Google
              return address.lat || _.get(address, 'position.lat') || _.get(address, 'geometry.location.lat') || '';
            },
          });
          items.push({
            rename: (label) => `${label}.lng`,
            preprocessor: (value) => {
              if (_.isArray(value)) {
                return value;
              }

              const address = (value && value.address) || value || {};

              // OpenStreetMap || Azure || Google
              return address.lon || _.get(address, 'position.lon') || _.get(address, 'geometry.location.lng') || '';
            },
          });

          noRecurse = true;
        }
        else if (component.type === 'selectboxes') {
          _.each(component.values, (option) => {
            items.push({label: [path, option.value].join('.'), subpath: option.value, type: 'boolean'});
          });
        }
        else if (component.type === 'radio') {
          items.push({
            preprocessor: (value) => {
              if (_.isObject(value)) {
                return value;
              }

              if (_.isNil(value)) {
                return '';
              }

              const componentValue = component.values.find((v) => v.value === value.toString()) || '';
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
            preprocessor: (value) => {
              if (!value) {
                return '';
              }

              if (_.isObject(value)) {
                return value;
              }

              return value.toLocaleString('en', formatOptions);
            }
          });
        }
        else if (component.type === 'checkbox') {
          if (component.name && component.inputType === 'radio') {
            items.push({name: component.name, rename: component.name});
          }
          else {
            items.push({type: 'boolean'});
          }
        }
        else if (component.type === 'survey') {
          _.each(component.questions, (question) => {
            items.push({
              label: [path, question.value].join('.'),
              subpath: question.value,
              preprocessor: (value) => {
                if (_.isObject(value)) {
                  return value;
                }

                if (!value) {
                  return '';
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
            if (Array.isArray(value) && value[0] && value[0][component.key]) {
              const rowValues = [];
              value.forEach((row) => {
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
                  value.forEach((eachItem) => {
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
                  // eslint-disable-next-line max-depth
                  return this.customTransform(path, value);
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
            preprocessor: (value) => {
              if (!value) {
                return '';
              }
              return _.isObject(value)
                ? valuesExtractor(value)
                : primitiveValueHandler(value.toString());
            }
          });
        }
        else if (component.type === 'datetime') {
          if (component.displayInTimezone === 'location' && component.timezone) {
            this.timezone = component.timezone;
          }

          // If we are configured to display in timezone of viewer, then look for a query string of the timezone.
          if (component.displayInTimezone === 'viewer' && req.query.timezone) {
            this.timezone = decodeURIComponent(req.query.timezone);
          }

          // If we want to display in timezone of utc, then reset timezone.
          if (component.displayInTimezone === 'utc') {
            this.timezone = '';
          }
          items.push({
            preprocessor: (value, submission) => {
              // If we wish to display in submission timezone, and there is submission timezone metadata.
              if (
                (component.displayInTimezone === 'submission') &&
                submission.metadata &&
                submission.metadata.timezone
              ) {
                this.timezone = submission.metadata.timezone;
              }
              if (_.isObject(value) && !_.isDate(value)) {
                return value;
              }

              if (!formattedView && value) {
                return (typeof value.toISOString === 'function') ? value.toISOString() : value;
              }

              if (value) {
                const dateMoment = moment(value).tz(this.timezone || 'Etc/UTC');
                const format = component.format || 'yyyy-MM-dd hh:mm a';
                this.dateFormat = util.FormioUtils.convertFormatToMoment(format);
                const result = dateMoment.format(`${this.dateFormat} z`);
                return result;
              }

              return '';
            }
          });
        }
        else if (component.type === 'signature') {
          items.push({
            preprocessor: (value) => {
              if (_.isObject(value)) {
                return value;
              }

              return value ? 'YES' : 'NO';
            }
          });
        }
        else if (formattedView && component.inputMask) {
          const mask = util.FormioUtils.getInputMask(component.inputMask);
          items.push({
            preprocessor: (value) => {
              if (!value) {
                return '';
              }

              if (_.isObject(value)) {
                return value;
              }

              return conformToMask(value, mask).conformedValue;
            }
          });
        }
        else if (component.type === 'sketchpad') {
          items.push({
            preprocessor: (value) => {
              if (_.isObject(value)) {
                return _.isEmpty(value) ? '' : '[Visual Data]';
              }

              return value;
            }
          });
        }
        else if (component.type === 'file') {
          items.push({
            preprocessor: (value) => {
              if (!value || !value.length) {
                return '';
              }
              const formatted = value
                .map((file) => {
                  const fileName = file && (file.name || file.originalName);

                  if (req.googleSheetAction && typeof req.googleSheetAction === 'function') {
                    return req.googleSheetAction(file, fileName);
                  }

                  return fileName;
                })
                .filter((val) => !!val)
                .join(', ');
              return formatted;
            }
          });
        }
        else if (component.type === 'tags') {
          items.push({
            preprocessor: (value) => {
              if (!value || !Array.isArray(value)) {
                return value || '';
              }

              const formatted = value.join(component.delimeter || ',');

              return formatted;
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
            label: (item.label || path).replace(labelRegexp, '.'),
            title: component.label,
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

          if (item.hasOwnProperty('name')) {
            if (_.find(this.fields, {path: item.name})) {
              return;
            }
            finalItem.path = item.name;
          }

          this.fields.push(finalItem);
        });

        return noRecurse;
      }, true);
    }
    catch (err) {
      res.status(400).send(err.message || err);
    }
  }
  /* eslint-enable max-statements */

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
      const formatDate = (value) => {
        return moment(value).tz(self.timezone || 'Etc/UTC').format(`${self.dateFormat} z`);
      };

      const data = [
        submission._id.toString(),
        // Perform this after the field data since they may set the timezone and format.
        formatDate(submission.created),
        formatDate(submission.modified),
        ...self.getSubmissionData(submission),
      ];

      this.queue(data);
    };

    return stream
      .pipe(through(write, () => this.res.end()))
      .pipe(this.stringifier);
  }

  getSubmissionData(submission) {
    const updatedSubmission = {};
    const result = this.fields.map((column) => {
      const componentData = _.get(submission.data, column.path);

      // If the path had no results and the component specifies a path, check for a datagrid component
      if (_.isUndefined(componentData) && column.path.includes('.')) {
        let parts = column.path.split('.');

        // If array in nested form
        if (parts.length > 2) {
          let newParts = _.chunk(parts, parts.length - 1);
          newParts = newParts.map(part => part.join('.'));
          parts = newParts;
        }
        const container = parts.shift();
        const containerData = _.get(submission.data, container);

        // If the subdata is an array, coerce it to a displayable string.
        if (Array.isArray(containerData)) {
          // Update the column component path, since we removed part of it.
          const subcolumn = {
            ...column,
            path: parts.join('.'),
          };

          const result = this.coerceToString(containerData, subcolumn, submission);
          _.set(updatedSubmission, column.label, result);
          return result;
        }
      }

      const result = this.coerceToString(componentData, column, submission);
      _.set(updatedSubmission, column.label, result);
      return result;
    });

    result.updatedSubmission = updatedSubmission;
    return result;
  }

  /**
   * Util function to unwrap an unknown data payload into a string.
   *
   * @param data
   * @returns {string}
   */
  coerceToString(data, column, submission) {
    data = (column.preprocessor || _.identity)(data, submission);
    let result = '';
    if (Array.isArray(data) && data.length > 0) {
      const fullPath = column.subpath
        ? `${column.key}.${column.subpath}`
        : column.key;

      return data.map((item) => `"${this.coerceToString(_.get(item, fullPath, item), column)}"`).join(',');
    }
    else if (_.isString(data)) {
      if (column.type === 'boolean') {
        result = Boolean(data).toString();
      }
      else {
        result = data.toString();
      }
    }
    else if (_.isNumber(data)) {
      result = data.toString();
    }
    else if (_.isObject(data)) {
      return this.coerceToString(_.get(data, column.subpath, ''), column);
    }
    else {
      result = JSON.stringify(data);
    }

    return this.injectionProtector(result);
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

    return _.replace(data, regExp, (char) => {
      return `\`${char}`;
    });
  }

  addCustomTransformer(path, fn) {
    this.customTransformers[path] = fn;
  }

  customTransform(path, value, ...rest) {
    const transformer = this.customTransformers[path];
    if (transformer && typeof transformer === 'function') {
      return transformer(value, ...rest);
    }

    return value;
  }
}

module.exports = CSVExporter;
