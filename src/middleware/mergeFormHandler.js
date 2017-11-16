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
/* eslint-disable max-statements, max-depth */
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

      // FOR-392 - Default unknown keys.
      if (_.isNull(key) || _.isUndefined(key)) {
        key = 'component';
      }

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
      formA = formA || [];
      formB = formB || [];
      list = list || [];
      listKeys = listKeys || [];
      debug('new merge()');

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
      var addUniqueComponent = function(component) {
        debug('add: ', component.key);
        list.push(component);
        listKeys.push(component.key);

        // Update the listKeys with all this components children.
        var children = getComponentsName(component);
        if (!component.input && children) {
          addChildKeysToList(component, listKeys, children);
        }
      };

      /**
       * Combine the same component from two sources into one.
       *
       * @param a
       *   The stable component.
       * @param b
       *   The local component to copy changes from.
       *
       * @returns {boolean}
       *   If an item was combined.
       */
      var combine = function(a, b) {
        // Build a copy of each component without child components.
        var container = getComponentsName(a);
        var tempA = _.omit(a, container);
        var tempB = _.omit(b, container);

        // Update tempA with the settings of tempB.
        tempA = _.assign(tempA, tempB);

        // If neither component a or b has child components, return to merging.
        if (!a.hasOwnProperty(container) && !b.hasOwnProperty(container)) {
          debug('No child components in a or b, skipping recursive call');
          addUniqueComponent(tempA);
          return true;
        }

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
              ),
              width: _.get(colsB[iter], 'width') || _.get(colsA[iter], 'width') || 6,
              offset: _.get(colsB[iter], 'offset') || _.get(colsA[iter], 'offset') || 0,
              push: _.get(colsB[iter], 'push') || _.get(colsA[iter], 'push') || 0,
              pull: _.get(colsB[iter], 'pull') || _.get(colsA[iter], 'pull') || 0
            });
          }

          tempA.columns = finalColumns;
          addUniqueComponent(tempA);

          // Make following iterations of formB skip until the next component in formA, to preserve insert order.
          return true;
        }

        // Merge each row if present in the component.
        if (a.hasOwnProperty('rows') || b.hasOwnProperty('rows')) {
          var rowsA = a.rows || [];
          var rowsB = b.rows || [];
          var finalRows = [];
          var maxR = Math.max(rowsA.length, rowsB.length, 0);
          for (var r = 0; r < maxR; r++) {
            var finalCols = [];
            var maxC = Math.max(rowsA[r].length, rowsB[r].length, 0);
            for (var c = 0; c < maxC; c++) {
              // Merge each column from a and b together.
              finalCols.push({
                components: merge(
                  _.get(rowsA[r][c], 'components', []),
                  componentMapA,
                  _.get(rowsB[r][c], 'components', []),
                  componentMapB,
                  [],
                  listKeys
                )
              });
            }
            finalRows.push(finalCols);
          }

          tempA.rows = finalRows;
          addUniqueComponent(tempA);

          // Make following iterations of formB skip until the next component in formA, to preserve insert order.
          return true;
        }

        // Merge each component array if present in the component.
        if (a.hasOwnProperty('components') || b.hasOwnProperty('component')) {
          var componentsA = a.components || [];
          var componentsB = b.components || [];

          tempA.components = merge(componentsA, componentMapA, componentsB, componentMapB, [], listKeys);
          addUniqueComponent(tempA);

          // Make following iterations of formB skip until the next component in formA, to preserve insert order.
          return true;
        }

        return false;
      };

      // Traverse all the components in form a for merging.
      util.eachComponent(formA, function(a, pathA) {
        debug('pathA: ', pathA);

        // Skip components which have been inserted already.
        if (listKeys.indexOf(a.key) !== -1) {
          return;
        }

        // If a isnt even in form b, add a without traversing b.
        if (!componentMapB.hasOwnProperty(a.key)) {
          return addUniqueComponent(a);
        }

        // If list b is empty, but the element exist somewhere, apply the settings.
        if (formB.length === 0 && componentMapB.hasOwnProperty(a.key)) {
          combine(a, componentMapB[a.key]);
          return;
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
            addUniqueComponent(b);
            skip = true;
            return;
          }

          // If component a and b are the same, merge the component settings, then any components they may have.
          if (a.key === b.key) {
            skip = combine(a, b);
            return;
          }
        }, true);
      }, true);

      // Sweep formB one last time for any remaining components.
      util.eachComponent(formB, function(b) {
        if (listKeys.indexOf(b.key) !== -1) {
          return;
        }

        return addUniqueComponent(b);
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
      var timeStable = new Date(_.get(form, 'modified', current.getTime())).getTime();
      var timeLocal = new Date(_.get(req, 'body.modified', current.getTime())).getTime();
      if (timeStable === timeLocal) {
        debug('skipping - up to date');
        return next();
      }

      // Add our custom form merge header, to display in the ui
      res.header('Access-Control-Expose-Headers', 'x-jwt-token, x-form-merge');
      res.header('x-form-merge', JSON.stringify({stable: timeStable, local: timeLocal}));

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
      debug(JSON.stringify(req.body.components));
      return next();
    });
  };
};
/* eslint-enable max-statements, max-depth */
