'use strict';

const FormioCore = require("@formio/core");
const _ = require("lodash");
const nunjucks = require("nunjucks");
const moment = require("moment");
const inputmask = require("inputmask");

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
      this.component.path,
      this._data
    );
  }

  // No op
  set data(data) {}

  // Returns parent instance
  get parent() {
    return this.root.getComponent(
      this.component.path.replace(/(\.[^.]+)$/, "")
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
      const defaultValue = FormioCore.JSONLogicEvaluator.evaluate(
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

class RootShim {
  constructor(form, submission, scope) {
    this.instanceMap = {};
    this._form = form;
    this._submission = submission;
    this.data = submission.data;
    this.components = [];
    this._scope = scope || {};
    FormioCore.Utils.eachComponentData(
      form.components,
      submission.data,
      (component, data, row, compPath, components, index, parent, paths) => {
        if (!paths) {
          paths = FormioCore.Utils.getComponentPaths(component);
        }
        const {path, fullPath, fullLocalPath, dataPath, localDataPath} =
          paths;
        const instance = new InstanceShim(
          component,
          this,
          submission.data,
          dataPath ?? path ?? component.key,
          index,
          this._scope
        );
        this.components.push(instance);
        if (path && !this.instanceMap[path]) {
          this.instanceMap[path] = instance;
        }
        if (fullPath && !this.instanceMap[fullPath]) {
          this.instanceMap[fullPath] = instance;
        }
        if (fullLocalPath && !this.instanceMap[fullLocalPath]) {
          this.instanceMap[fullLocalPath] = instance;
        }
        if (dataPath && !this.instanceMap[dataPath]) {
          this.instanceMap[dataPath] = instance;
        }
        if (localDataPath && !this.instanceMap[localDataPath]) {
          this.instanceMap[localDataPath] = instance;
        }
      },
      true
    );
  }

  getComponent(pathArg) {
    const path = FormioCore.Utils.getStringFromComponentPath(pathArg);
    // If we don't have an exact path match, compare the final pathname segment with the path argument for each component
    // i.e. getComponent('foo') should return a component at the path 'bar.foo' if it exists
    if (!this.instanceMap[path]) {
      for (const key in this.instanceMap) {
        const match = key.match(new RegExp(`\\.${path}$`));
        const lastPathSegment = match ? match[0].slice(1) : "";
        if (lastPathSegment === path) {
          // set a cache for future `getComponent` calls in this lifecycle
          this.instanceMap[path] = this.instanceMap[key];
          break;
        }
      }
    }
    return this.instanceMap[path];
  }

  get submission() {
    return this._submission;
  }

  set submission(data) {}

  get form() {
    return this._form;
  }

  set form(form) {}

  get root() {
    return null;
  }
}

class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
    this.defaultPrevented = false;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }
}
globalThis.Text = class {};
globalThis.HTMLElement = class {};
globalThis.HTMLCanvasElement = class {};
globalThis.navigator = {userAgent: ""};

globalThis.document = {
  createElement: () => ({}),
  cookie: "",
  getElementsByTagName: () => [],
  documentElement: {
    style: [],
    firstElementChild: {appendChild: () => {}},
  },
};
globalThis.window = {
  addEventListener: () => {},
  Event,
  navigator: globalThis.navigator,
};
globalThis.btoa = (str) => {
  return str instanceof Buffer
    ? str.toString("base64")
    : Buffer.from(str.toString(), "binary").toString("base64");
};
globalThis.setTimeout = (cb) => {
  cb();
};

function evaluateProcess(context) {
  const root = new RootShim(context.form, context.submission, context.scope);
  const data = context.data;
  context.instances = root.instanceMap;

  if (context.form.module) {
    try {
      // Wrap with parentheses to return object, not function
      const formModule = eval(`(${context.form.module})`);
      const evalContext = formModule?.options?.form?.evalContext;

      if (evalContext) {
        const evalContextFn = (context) => Object.assign({}, context, evalContext);
        context.evalContext = evalContextFn;
      }
    }
    catch (ignoreErr) {
      // Ignore errors
    }
  }

  context.processors = FormioCore.ProcessTargets.evaluator;
  const scope = FormioCore.processSync(context);

  return {scope, data};
}

globalThis.evaluateProcess = evaluateProcess;
globalThis.Event = Event;
globalThis.FormioCore = FormioCore;
globalThis.InstanceShim = InstanceShim;
globalThis.RootShim = RootShim;
globalThis.nunjucks = nunjucks;
globalThis.moment = moment;
globalThis.inputmask = inputmask;
globalThis._ = _;

module.exports = {};
