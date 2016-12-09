'use strict';

var debug = require('debug')('formio:middleware:mergeFormHandler');
var _ = require('lodash');
var suffixRegex = /(\d+)$/;

/**
 * The mergeFormHandler middleware.
 *
 * This middleware is used for merging multiple modifications made to a form by different people.
 *
 * @param router
 * @returns {Function}
 *
 * @TODO: Uniquify all key:type pairs in the update form, to prohibit invalid merges.
 */
module.exports = function(router) {
  return function(req, res, next) {
    var util = router.formio.util;
    var cache = router.formio.cache;

    if (req.method !== 'PUT' || !req.formId || !_.has(req, 'body.modified') || !_.has(req, 'body.components')) {
      debug('Skipping');
      return next();
    }

    /**
     * Given a list of used keys, and a current component key, update the current key to be unique in the set.
     *
     * @param {Object} exhausted
     *   The map of exhausted component key:type pairs.
     * @param {Object} current
     *   The current object which requires a unique key.
     *
     * @returns {String}
     *   A unique key derived from the input key.
     */
    var uniquifyKey = function(exhausted, current) {
      var key = current.key;

      // Make the key unique by iterating it.
      while (_.has(exhausted, key) && exhausted[key] !== current.type) {
        if (!key.match(suffixRegex)) {
          return key + '2';
        }

        return key.replace(suffixRegex, function(suffix) {
          return Number(suffix) + 1;
        });
      }

      return key;
    };

    /**
     * Get the name of the child components object.
     *
     * @param {Object} component
     *   A form component object with components..
     *
     * @returns {*}
     */
    var getComponentsName = function(component) {
      var container = _.intersection(['components', 'rows', 'columns'], Object.keys(component));
      return _.first(container);
    };

    /**
     * Traverse all the children of the given component, and add their keys to the list.
     *
     * @param {Object} component
     *   A form component object with components.
     * @param {Array} list
     *   A list of child component keys
     * @param [String] container
     *   The container name, if known
     */
    var addChildKeysToList = function(component, list, children) {
      var container = children || getComponentsName(component);
      util.eachComponent(_.get(component, container), function(child) {
        if (list.indexOf(child) === -1) {
          list.push(child.key);
        }
      }, true);
    };

    /**
     * Add the given unique component to the final list.
     *
     * @param {Object} component
     *   The unique form component to add.
     * @param {Array} list
     *   The final list of components, in which to add this component.
     * @param {Array} listKeys
     *   The final list of component keys, used for quick unique searches.
     */
    var addUniqueComponent = function(component, list, listKeys) {
      debug('add: ', component.key);
      list.push(component);
      listKeys.push(component.key);

      // Update the listKeys with all this components children.
      var children = getComponentsName(component);
      if (children) {
        addChildKeysToList(component, listKeys, children);
      }
    };

    /**
     * Merge the components of two forms together.
     *
     * @param {Array} formA
     *   The most up-to-date list of components.
     * @param {Object} componentMapA
     *   A map of all the components in formA, component.key:component
     * @param [Array] formB
     *   The most recent copy of components, may be missing or contain new components when compared to formA.
     * @param {Object} componentMapB
     *   A map of all the components in formA, component.key:component
     * @param [Array] list
     *   The final list of components.
     * @param [Array] listKeys
     *   The final list of component keys inside the final list.
     *
     * @returns {*|Array}
     *   The merged components of formA and formB.
     *
     * Note:
     *   A stale update to an existing component can wipe out component settings, if they were not set at the time the
     *   stale form was loaded. This is due to the fact that empty/default settings for most things are empty strings,
     *   literal '', which will take precedence in the _.assign. If we were to filter this restriction, then sometimes
     *   you would have to double update a component to actually remove a setting (would mess with the ability to clear
     *   settings). This will be fixed when we update the form builder to not send blank/null/default settings in the
     *   update payload.
     */
    var merge = function(formA, componentMapA, formB, componentMapB, list, listKeys) {
      list = list || [];
      listKeys = listKeys || [];
      debug('new merge()');

      // Traverse all the components in form a for merging.
      util.eachComponent(formA, function(a, pathA) {
        debug('pathA: ', pathA);

        // Skip components which have been inserted already.
        if (listKeys.indexOf(a.key) !== -1) {
          return;
        }

        // If a isnt even in form b, add a without traversing b.
        if (!componentMapB.hasOwnProperty(a.key)) {
          return addUniqueComponent(a, list, listKeys);
        }

        // Traverse all the components in form b for merging.
        var skip = false;
        util.eachComponent(formB, function(b, pathB) {
          debug('pathB: ', pathB);

          if (skip || listKeys.indexOf(b.key) !== -1) {
            return;
          }

          // If b traverses over an element not found in a, add it to the main list.
          if (!componentMapA.hasOwnProperty(b.key)) {
            addUniqueComponent(b, list, listKeys);
            skip = true;
            return;
          }

          // If component a and b are the same, merge the component settings, then any components they may have.
          if (a.key === b.key) {
            // Build a copy of each component without child components.
            var container = getComponentsName(a);
            var tempA = _.omit(a, container);
            var tempB = _.omit(b, container);

            // Update tempA with the settings of tempB.
            tempA = _.assign(tempA, tempB);

            // Merge each column if present in the component.
            if (a.hasOwnProperty('columns') || b.hasOwnProperty('columns')) {
              debug('Merge columns');
              var colsA = a.columns || [];
              var colsB = b.columns || [];
              var max = Math.max(colsA.length, colsB.length, 0);
              var finalColumns = [];
              for (var iter = 0; iter < max; iter++) {
                // Merge each column from a and b together.
                finalColumns.push({
                  components: merge(
                    _.get(colsA[iter], 'components', []),
                    componentMapA,
                    _.get(colsB[iter], 'components', []),
                    componentMapB,
                    [],
                    listKeys
                  )
                });
              }

              tempA.columns = finalColumns;
              addUniqueComponent(tempA, list, listKeys);

              // Make following iterations of formB skip until the next component in formA, to preserve insert order.
              skip = true;
              return;
            }

            // If neither component a or b has child components, return to merging.
            if (!a.hasOwnProperty(container) && !b.hasOwnProperty(container)) {
              debug('No child components in a or b, skipping recursive call');
              addUniqueComponent(tempA, list, listKeys);
              skip = true;
              return;
            }

            // Child a or b has components, so recursively merge all their components.
            var childA = _.get(a, container, []);
            var childB = _.get(b, container, []);
            var childComponents = merge(childA, componentMapA, childB, componentMapB, [], listKeys);

            // Update the child components using the merged result.
            _.set(tempA, container, childComponents);
            list.push(tempA);
            listKeys.push(tempA.key);

            // Make following iterations of formB skip until the next component in formA, to preserve insert order.
            skip = true;
            return;
          }
        }, true, 'rootB');
      }, true, 'rootA');

      // Sweep formB one last time for any remaining components.
      util.eachComponent(formB, function(b) {
        if (listKeys.indexOf(b.key) !== -1) {
          return;
        }

        return addUniqueComponent(b, list, listKeys);
      }, true);

      return list;
    };

    cache.loadCurrentForm(req, function(err, form) {
      if (err || !form) {
        var msg = err || 'No form was contained in the current request.';
        debug(msg);
        return next(msg);
      }

      // If both times are the same, continue as usual, because no outside modifications have been made since.
      var current = new Date();
      var stable = new Date(_.get(form, 'modified', current.getTime())).getTime();
      var local = new Date(_.get(req, 'body.modified', current.getTime())).getTime();
      if (stable === local) {
        debug('skipping - up to date');
        return next();
      }

      /**
       * Sweep the components of the stable and local form once on initial processing.
       *
       * We do this to:
       * 1) Build the key map to force unique key:type pairs across each form, with the stable form having priority
       * 2) Build the component key maps for merge(), to greatly increase performance of searching for components by key
       */
      var stable = _.cloneDeep(form.components);
      var local = _.cloneDeep(req.body.components);
      var componentMap = {stable: {}, local: {}};
      var keyMap = {};
      ['stable', 'local'].forEach(function(type) {
        var components = (type === 'stable') ? stable : local;
        util.eachComponent(components, function(component) {
          // Force each component to be unique, with stable taking precedence.
          if (type === 'local') {
            component.key = uniquifyKey(keyMap, component);
          }
          keyMap[component.key] = component.type;

          // Build the componentMaps for merge(); componentMapA and componentMapB.
          componentMap[type][component.key] = component;
        }, true);
      });

      // Merge the stable and local form.
      req.body.components = merge(stable, componentMap.stable, local, componentMap.local);
      debug('final');
      debug(JSON.stringify(req.body.components));
      return next();

      //// If the update contains components, deep merge all the components.
      //var _components = {stable: _.cloneDeep(form.components), local: _.cloneDeep(req.body.components)};
      //var _map = {stable: {}, local: {}};
      //var _path = {stable: {}, local: {}};
      //
      //// Build the new component list using the oldest components first.
      //var final = _.cloneDeep(_components.stable);
      //var ignoreTypes = ['panel', 'columns', 'fieldset', 'table', 'well', 'container'];
      //var ignoredComponents = [];
      //['stable', 'local'].forEach(function(type) {
      //  util.eachComponent(_components[type], function(component, path) {
      //    // If this component has components, and is in the ignore types, flag all its children, so it isnt merged 2x.
      //    if (ignoreTypes.indexOf(component.type) !== -1) {
      //      var container = _.intersection(['components', 'rows', 'columns'], Object.keys(component));
      //      util.eachComponent(component[container], function(subcomponent) {
      //        ignoredComponents.push(subcomponent.key);
      //      }, true);
      //    }
      //
      //    debug('path (' + component.key + '): ' + path);
      //    // Update the map and path references for this type on a per component basis.
      //    _map[type][component.key] = component;
      //    _path[type][component.key] = path;
      //  }, true);
      //});
      //
      //
      //// The list of components with duplicate keys, but different types.
      //var collisions = [];
      //
      //// Compute which keys are new in the local copy and merge them into the existing form.
      //var difference = _.difference(Object.keys(_map.local), Object.keys(_map.stable));
      //var parents = {};
      //var newComponents = [];
      //difference.forEach(function(key) {
      //  // Add this new local component to the list of new components.
      //  var component = _map.local[key];
      //  newComponents.push(component);
      //
      //  // Determine this components parent component path.
      //  var path = _path.local[key];
      //  debug(path);
      //  if (path === key && ignoredComponents.indexOf(key) === -1) {
      //    parents[''] = parents[''] || [];
      //    parents[''].push(key);
      //  }
      //  else if (path.indexOf('.') !== -1) {
      //    path = path.split('.');
      //    var last = path.pop();
      //    if (last === key) {
      //      last = path.pop();
      //    }
      //
      //    parents[last] = parents[last] || [];
      //    parents[last].push(key);
      //  }
      //});
      //debug('parents:');
      //debug(parents);
      //
      //var newComponents = _.filter(_map.local, function(item) {
      //  return difference.indexOf(item.key) !== -1
      //});
      //debug('newComponents:');
      //debug(newComponents);
      //
      //// Build the new component list using the oldest components first.
      //util.eachComponent(final, function(component, path) {
      //  // Check to see if the stable component has local modifications.
      //  var modifications = _.get(_map.local, component.key);
      //
      //  // Check to see if the stable component
      //  var subComponents = _.get(_path.stable, '');
      //  if (!modifications) {
      //    return;
      //  }
      //
      //  // If the types are different, this is a component collision, take care of this after.
      //  if (modifications.type !== component.type) {
      //    collisions.push(modifications);
      //    delete _map.local[component.key];
      //    return;
      //  }
      //
      //  // Remove any subcomponents, because they will be individually merged.
      //  modifications = _.omit(modifications, ['components', 'rows', 'columns']);
      //  component = _.assign(component, modifications);
      //
      //  // Check to see if this component has new subcomponents.
      //  var container = _.intersection(['components', 'rows', 'columns'], Object.keys(component));
      //  if (container && _.has(parents, component.key)) {
      //    component[container] = component[container].concat(parents[component.key])
      //  }
      //}, true);
      //
      //// Add totally new components to the form, without clobbering other form modifications.
      //// @TODO: Make insertion in the correct place.
      //if (parents.hasOwnProperty('') && parents[''].length > 0) {
      //  parents[''].forEach(function(key) {
      //    final.push(_map.local[key]);
      //  });
      //}
      //
      //// Update the final components payload to include all changes.
      //debug('final');
      //debug(final);
      //req.body.components = final;
      //return next();
    });
  };
};
