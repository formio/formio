'use strict';
const _ = require('lodash');

module.exports = (formio) => async (component, data, handler, action, {validation}) => {
  // Only perform before validation has occurred.
  if (!validation && ['put', 'post', 'patch'].includes(action)) {
    const value = _.get(data, component.key);

    if (value) {
      if (component.validate) {
        component.validate.onlyAvailableItems = true;
      }
      else {
        component.validate = {onlyAvailableItems: true};
      }
    }
  }
};
