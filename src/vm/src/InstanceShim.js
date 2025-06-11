'use strict';
const FormioCore = require('@formio/core');
const _ = require('lodash');

class InstanceShim {
  constructor(
    component,
    root,
    data,
    path = component.path || component.key,
    dataIndex = null,
    scope
  ) {
    this._component = component;
    this._root = root;
    this._data = data;
    this._path = path;
    this._rowIndex = dataIndex;
    this._conditionals = scope.conditionals || [];
  }

  get root() {
    return this._root;
  }

  get rowIndex() {
    return this._rowIndex;
  }

  get component() {
    return this._component;
  }

  // No op
  get schema() {
    return {};
  }

  // No op
  get options() {
    return {};
  }

  get currentForm() {
    return this.root.form;
  }

  // Returns row
  get data() {
    return FormioCore.Utils.getContextualRowData(
      this.component,
      this._path,
      this._data
    );
  }

  // No op
  set data(data) {}

  // Returns parent instance
  get parent() {
    return this.root.getComponent(
      this._path?.replace(/(\.[^.]+)$/, "")
    );
  }

  // Returns component value
  get dataValue() {
    return _.get(this._data, this._path);
  }

  get visible() {
    return !_.some(
      this._conditionals || [],
      (condComp) =>
        condComp.conditionallyHidden &&
        (condComp.path === this._path ||
          _.startsWith(condComp.path, this._path))
    );
  }

  // Question: Should we allow this?
  // Sets component value
  set dataValue(value) {
    _.set(this._data, this._path, value);
  }

  // return component value
  getValue() {
    return this.dataValue;
  }

  // set component value
  setValue(value) {
    this.dataValue = value;
  }

  shouldSkipValidation() {
    return false;
  }

  isEmpty() {
    return FormioCore.Utils.isComponentDataEmpty(
      this.component,
      this._data,
      this._path
    );
  }

  getCustomDefaultValue() {
    if (this.component.customDefaultValue) {
      const evaluationContext = {
        form: this.root.form,
        component: this.component,
        submission: this.root.submission,
        data: this.root.data,
        config: {
          server: true,
        },
        options: {
          server: true,
        },
        value: null,
        util: FormioCore.Utils,
        utils: FormioCore.Utils,
      };
      const defaultValue = FormioCore.Evaluator.evaluate(
        this.component.customDefaultValue,
        evaluationContext,
        "value"
      );
      return defaultValue;
    }
  }

  // Do nothing functions.
  on() {}
  off() {}
  render() {
    return "";
  }
  redraw() {}
  ready() {
    return Promise.resolve();
  }
  init() {}
  destroy() {}
  teardown() {}
  attach() {}
  detach() {}
  build() {}
  t(text) {
    return text;
  }
  sanitize(dirty) {
    return dirty;
  }
  renderString(template) {
    return template;
  }
}

module.exports = {InstanceShim};
