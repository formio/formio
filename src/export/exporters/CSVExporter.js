'use strict';

const Exporter = require('../Exporter');
const util = require('../../util/util');
const through = require('through');
const csv = require('csv');
const _ = require('lodash');
const Entities = require('html-entities').AllHtmlEntities;

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
            path: 'formatted_address',
            rename: 'formatted'
          });
          items.push({
            path: 'geometry.location.lat',
            rename: 'lat'
          });
          items.push({
            path: 'geometry.location.lng',
            rename: 'lng'
          });
        }
        else if (component.type === 'selectboxes') {
          _.each(component.values, (option) => {
            items.push({label: [path, option.value].join('.'), path: option.value, type: 'boolean'});
          });
        }
        else if (component.type === 'checkbox') {
          items.push({type: 'boolean'});
        }
        else if (component.type === 'survey') {
          _.each(component.questions, (question) => {
            items.push({label: [path, question.value].join('.'), path: question.value});
          });
        }
        else if (['select', 'resource'].includes(component.type)) {
          // Prepare the Lodash template by deleting tags and html entities
          const clearTemplate = Entities.decode(component.template.replace(/<\/?[^>]+(>|$)/g, ''));
          const templateExtractor = _.template(clearTemplate, {
            variable: 'item'
          });

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
                    tempVal.push(templateExtractor(eachItem));
                  });
                  return tempVal;
                }
                else if (component.type === 'select') {
                  return value;
                }
              }
              else {
                return _.isObject(value)
                  ? templateExtractor(value)
                  : value;
              }
            }
          };
          items.push({
            preprocessor(value) {
              return _.isObject(value)
                ? valuesExtractor(value)
                : value;
            }
          });
        }
        else {
          // Default to the current component item.
          items.push({});
        }

        items.forEach((item) => {
          const finalItem = {
            component: path,
            path: item.path || component.key,
            label: item.label || path
          };

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
      });
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

    const labels = ['ID', 'Created', 'Modified'];
    this.fields.forEach((item) => {
      if (item.hasOwnProperty('rename')) {
        labels.push(item.rename);
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
          return data.map((item) => `"${coerceToString(_.get(item, column.path, item), column)}"`).join(',');
        }
        if (_.isString(data)) {
          if (_.isBoolean(column.type)) {
            return Boolean(data).toString();
          }

          return data.toString();
        }
        if (_.isNumber(data)) {
          return data.toString();
        }
        if (_.isObject(data)) {
          return coerceToString(_.get(data, column.path, ''), column);
        }

        return JSON.stringify(data);
      };

      self.fields.forEach((column) => {
        const componentData = _.get(submission.data, column.component);

        // If the path had no results and the component specifies a path, check for a datagrid component
        if (_.isUndefined(componentData) && column.component.includes('.')) {
          const parts = column.component.split('.');
          const container = parts.shift();
          // If the subdata is an array, coerce it to a displayable string.
          if (_.isArray(_.get(submission.data, container))) {
            // Update the column component path, since we removed part of it.
            column.component = parts.join('.');

            data.push(coerceToString(_.get(submission.data, container), column));
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
