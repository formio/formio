'use strict';

module.exports = {
  reference: (component) => {
    if (component.type === 'form') {
      component.reference = true;
    }
  },
};
