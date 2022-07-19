'use strict';

const _ = require('lodash');

module.exports = (formio) => async (component, data, handler, action, {validation}) => {
  // Only perform before validation has occurred.
  if (validation && ['put', 'post', 'patch'].includes(action)) {
    let value = _.get(data, component.key);
    if (value) {
      if (_.isArray(value)) {
        value = value.map(val => val ? val : '');
      }
      _.set(data, component.key, value);
    }
    else if (value === '') {
      _.set(data, component.key, null);
    }
  }
};
