'use strict';

var debug = require('debug')('formio:middleware:mergeFormHandler');
var Q = require('q');
var _ = require('lodash');

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
    if (req.method !== 'PUT' || !req.formId || !_.has(req, 'body.modified') || !_.has(req, 'body.components')) {
      debug('Skipping');
      return next();
    }

    var util = router.formio.util;
    var cache = router.formio.cache;
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

      // If the update contains components, deep merge all the components.
      var _components = {stable: _.cloneDeep(form.components), local: _.cloneDeep(req.body.components)};
      var _map = {stable: {}, local: {}};
      var _path = {stable: {}, local: {}};

      // Build the new component list using the oldest components first.
      var final = _.cloneDeep(_components.stable);
      var ignoreTypes = ['panel'];
      var ignoredComponents = [];
      ['stable', 'local'].forEach(function(type) {
        util.eachComponent(_components[type], function(component, path) {
          // If this component has components, and is in the ignore types, flag all its children, so it isnt merged 2x.
          if (ignoreTypes.indexOf(component.type) !== -1) {
            var container = _.intersection(['components', 'rows', 'columns'], Object.keys(component));
            util.eachComponent(component[container], function(subcomponent) {
              ignoredComponents.push(subcomponent.key);
            }, true);
          }

          debug('path (' + component.key + '): ' + path);
          // Update the map and path references for this type on a per component basis.
          _map[type][component.key] = component;
          _path[type][component.key] = path;
        }, true);
      });


      // The list of components with duplicate keys, but different types.
      var collisions = [];

      // Compute which keys are new in the local copy and merge them into the existing form.
      var difference = _.difference(Object.keys(_map.local), Object.keys(_map.stable));
      var parents = {};
      var newComponents = [];
      difference.forEach(function(key) {
        // Add this new local component to the list of new components.
        var component = _map.local[key];
        newComponents.push(component);

        // Determine this components parent component path.
        var path = _path.local[key];
        debug(path);
        if (path === key && ignoredComponents.indexOf(key) === -1) {
          parents[''] = parents[''] || [];
          parents[''].push(key);
        }
        else if (path.indexOf('.') !== -1) {
          path = path.split('.');
          var last = path.pop();
          if (last === key) {
            last = path.pop();
          }

          parents[last] = parents[last] || [];
          parents[last].push(key);
        }
      });
      debug('parents:');
      debug(parents);

      var newComponents = _.filter(_map.local, function(item) {
        return difference.indexOf(item.key) !== -1
      });
      debug('newComponents:');
      debug(newComponents);

      // Build the new component list using the oldest components first.
      util.eachComponent(final, function(component, path) {
        // Check to see if the stable component has local modifications.
        var modifications = _.get(_map.local, component.key);

        // Check to see if the stable component
        var subComponents = _.get(_path.stable, '');
        if (!modifications) {
          return;
        }

        // If the types are different, this is a component collision, take care of this after.
        if (modifications.type !== component.type) {
          collisions.push(modifications);
          delete _map.local[component.key];
          return;
        }

        // Remove any subcomponents, because they will be individually merged.
        modifications = _.omit(modifications, ['components', 'rows', 'columns']);
        component = _.assign(component, modifications);

        // Check to see if this component has new subcomponents.
        var container = _.intersection(['components', 'rows', 'columns'], Object.keys(component));
        if (container && _.has(parents, component.key)) {
          component[container] = component[container].concat(parents[component.key])
        }
      }, true);

      // Add totally new components to the form, without clobbering other form modifications.
      // @TODO: Make insertion in the correct place.
      if (parents.hasOwnProperty('') && parents[''].length > 0) {
        parents[''].forEach(function(key) {
          final.push(_map.local[key]);
        });
      }

      // Update the final components payload to include all changes.
      debug('final');
      debug(final);
      req.body.components = final;
      return next();
    });
  };
};
