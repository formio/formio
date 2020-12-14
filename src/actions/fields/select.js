'use strict';
const _ = require('lodash');
const util = require('../../util/util');

module.exports = (formio) => {
  const hook = require('../../util/hook')(formio);
  return async (component, data, handler, action, {validation}) => {
    // Only perform before validation has occurred.
    if (!validation && ['put', 'post', 'patch'].includes(action)) {
      const value = _.get(data, component.key);
      const {dataSrc} = component;

      if (dataSrc === 'resource') {
        // Ensure we have ObjectIds for all properties.
        if (value._id) {
          value._id = util.idToBson(value._id);
        }
        if (value.form) {
          value.form = util.idToBson(value.form);
        }
        if (value.owner) {
          value.owner = util.idToBson(value.owner);
        }
        hook.alter('resourceField', component, value, data, handler, action);
      }
      if (value && (dataSrc === 'json' || dataSrc === 'values' || dataSrc === 'custom' || !dataSrc)) {
        if (component.validate) {
          component.validate.onlyAvailableItems = true;
        }
        else {
          component.validate = {onlyAvailableItems: true};
        }
      }
    }
  };
};
