'use strict';
const FormioCore = require('@formio/core');
const { InstanceShim } = require('./InstanceShim');

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
        const { path, fullPath, fullLocalPath, dataPath, localDataPath } = paths;
        const instance = new InstanceShim(
          component,
          this,
          submission.data,
          dataPath ?? path ?? component.key,
          index,
          this._scope,
        );
        this.components.push(instance);
        // Several components can resolve to one path — see `getSharedPathKey` in `@formio/core`
        // for the rule this follows. Only the path a processor looks this component up by takes
        // part, and it must be composed the same way on both sides of the map.
        const lookupPath = FormioCore.Utils.getInstanceLookupPath(component, compPath, paths);
        if (lookupPath) {
          FormioCore.Utils.registerInstanceAtPath(
            this.instanceMap,
            lookupPath,
            component.key,
            instance,
          );
        }
        // The remaining variants are only there for `getComponent` to address this instance by.
        // They are registered first-wins and without an alias: a nested form's child resolves to
        // a bare key for its local ones, so letting them contend would let that child shadow a
        // root component sharing its key.
        const addressablePaths = [path, fullPath, fullLocalPath, dataPath, localDataPath];
        addressablePaths.filter(Boolean).forEach((componentPath) => {
          if (!this.instanceMap[componentPath]) {
            this.instanceMap[componentPath] = instance;
          }
        });
      },
      true,
    );
  }

  getComponent(pathArg) {
    const path = FormioCore.Utils.getStringFromComponentPath(pathArg);
    // If we don't have an exact path match, compare the final pathname segment with the path argument for each component
    // i.e. getComponent('foo') should return a component at the path 'bar.foo' if it exists
    if (!this.instanceMap[path]) {
      for (const key in this.instanceMap) {
        const match = key.match(new RegExp(`\\.${path}$`));
        const lastPathSegment = match ? match[0].slice(1) : '';
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

module.exports = { RootShim };
