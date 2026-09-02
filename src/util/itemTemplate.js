'use strict';

const cleanLabelTemplate = (template) => {
  return (template || '').replace(/<\/?[^>]+(>|$)/g, '');
};

const getSelectTemplate = (component) => {
  return cleanLabelTemplate(component.template) || '{{ item.label }}';
};

module.exports = { cleanLabelTemplate, getSelectTemplate };
