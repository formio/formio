'use strict';

const _ = require('lodash');

module.exports = (formio) => async (component, data, handler, action, {validation, path, req, res}) => {
  let value = _.get(data, component.key);
  switch (handler) {
    case 'beforePost':
      if (!req.body.data) {
        return;
      }

      // Coerse the value into an empty string.
      if (!value && value !== '' && value !== undefined) {
        _.set(data, component.key, '');
      }
      break;
    case 'beforePut':
      if (!req.body.data) {
        return;
      }

      // Ensure that signatures are not ever wiped out with a PUT request
      // of data that came from the index request (where the signature is not populated).

      // Coerse the value into an empty string.
      if (!value && (value !== '') && value !== undefined) {
        value = '';
        _.set(data, component.key, '');
      }

      if (
        (typeof value !== 'string') ||
        ((value !== '') && (value.substr(0, 5) !== 'data:'))
      ) {
        const submission = await formio.cache.loadCurrentSubmission(req);

        if (!submission) {
          throw new Error('No submission found.');
        }
        if (!_.isNil(value)) {
          _.set(data, component.key, _.get(submission.data, path));
        }
      }
  }
};
