'use strict';

var mssql = require('mssql');
var mysql = require('mysql');
var _ = require('lodash');

module.exports = function(router) {
  var Action = router.formio.Action;
  var hook = require('../util/hook')(router.formio);

  /**
   * SQLAction class.
   *   This class is used to integrate into external SQL Databases.
   *
   * @constructor
   */
  var SQLAction = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  SQLAction.prototype = Object.create(Action.prototype);
  SQLAction.prototype.constructor = SQLAction;
  SQLAction.info = function(req, res, next) {
    next(null, {
      name: 'sql',
      title: 'SQL Query',
      description: 'Allows you to execute a remote SQL Query.',
      priority: 0,
      defaults: {
        handler: ['after'],
        method: ['create']
      }
    });
  };
  SQLAction.settingsForm = function(req, res, next) {
    hook.settings(req, function(err, settings) {
      if (err) {
        return next(null, {});
      }

      settings = settings || {};

      // Include only server types that have complete configurations
      var missingSetting = null;
      var serverTypes = [];
      if (settings.databases && settings.databases.mysql) {
        missingSetting = _.find(['host', 'port', 'database', 'user', 'password'], function(prop) {
          return !settings.databases.mysql[prop];
        });
        if (!missingSetting) {
          serverTypes.push({
            type: 'mysql',
            title: 'MySQL'
          });
        }
      }
      if (settings.databases && settings.databases.mssql) {
        missingSetting = _.find(['host', 'port', 'database', 'user', 'password'], function(prop) {
          return !settings.databases.mssql[prop];
        });
        if (!missingSetting) {
          serverTypes.push({
            type: 'mssql',
            title: 'Microsoft SQL Server'
          });
        }
      }

      next(null, [
        {
          type: 'select',
          input: true,
          label: 'SQL ServerType',
          key: 'type',
          placeholder: 'Select the SQL Server Type',
          template: '<span>{{ item.title }}</span>',
          dataSrc: 'json',
          data: {
            json: JSON.stringify(serverTypes)
          },
          valueProperty: 'type',
          multiple: false
        },
        {
          label: 'Query',
          key: 'query',
          placeholder: 'Enter the SQL query.',
          type: 'textarea',
          multiple: false,
          input: true
        }
      ]);
    });
  };

  /**
   * Escape a query to protect against SQL Injection.
   *
   * @param query
   * @returns {*}
   */
  /* eslint-disable no-useless-escape */
  SQLAction.prototype.escape = function(query) {
    return query.replace(/[\0\n\r\b\t\\\'\'\x1a]/g, function(s) { // eslint-disable-line no-control-regex
      switch (s) {
        case '\0': return '\\0';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '\b': return '\\b';
        case '\t': return '\\t';
        case '\x1a': return '\\Z';
        default: return '\\' + s;
      }
    });
  };
  /* eslint-enable no-useless-escape */

  /**
   * Trigger the SQL action.
   *
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param next
   *   The callback function to execute upon completion.
   */
  SQLAction.prototype.resolve = function(handler, method, req, res, next) {
    // Store the current resource.
    var currentResource = res.resource;

    // Load the settings.
    hook.settings(req, function(err, settings) {
      if (err) {
        return next(err);
      }

      // Get the settings for this database type.
      settings = settings.databases[this.settings.type];

      // Make sure there aren't any missing settings
      var missingSetting = _.find(['host', 'port', 'database', 'user', 'password'], function(prop) {
        return !settings[prop];
      });
      if (missingSetting) {
        return res.status(400).send('Database settings is missing `' + missingSetting + '`');
      }

      // Make sure they cannot connect to localhost.
      if (settings.host.search(/localhost|127\.0\.0\.1/) !== -1) {
        return res.status(400).send('Invalid SQL Host');
      }

      var method = req.method.toLowerCase();
      var wait   = method === 'get' && this.settings.type === 'mssql';

      // Called when the submission is loaded.
      var onSubmission = function(submission) {
        if (!submission) {
          wait = false;
          return;
        }

        // Create the query based on callbacks.
        var query = this.settings.query.replace(/{{\s+([^}]+)\s+}}/g, function() {
          var value = '';
          var data = _.cloneDeep(submission);

          // Replace {{ id }} with the external ID.
          if (arguments[1] === 'id') {
            value = _.result(_.find(currentResource.item.externalIds, {type: 'SQLQuery'}), 'id');
          }
          else {
            // Replace all others with the data from the submission.
            var parts = arguments[1].split('.');
            for (var i = 0; i < parts.length; i++) {
              if (data.hasOwnProperty(parts[i])) {
                data = value = data[parts[i]];
              }
            }
          }

          // Make sure we only set the strings or numbers.
          switch (typeof value) {
            case 'string':
              return this.escape(value);
            case 'number':
              return value;
            default:
              return '';
          }
        }.bind(this));

        // Make sure our query is still valid.
        if (!query) {
          wait = false;
          return res.status(400).send('Invalid Query');
        }

        // Perform a post execution.
        var postExecute = function(result) {
          // Update the resource with the external Id.
          router.formio.resources.submission.model.findOne(
            {_id: currentResource.item._id, deleted: {$eq: null}}
          ).exec(function(err, submission) {
              if (err) {
                return router.formio.util.log(err);
              }

              // Update the submissions externalIds.
              submission.externalIds = submission.externalIds || [];
              submission.externalIds.push({
                type: 'SQLQuery',
                id: result.id
              });
              submission.save(function(err, submission) {
                if (err) {
                  return router.formio.util.log(err);
                }
              });
            });
        };

        // Execute the query.
        if (this.settings.type === 'mssql') {
          var config = {
            user: settings.user,
            password: settings.password,
            server: settings.host,
            port: settings.port,
            database: settings.database,
            options: {encrypt: settings.azure ? true : false}
          };

          mssql.connect(config, function(err) {
            if (err) {
              if (wait) {
                return next();
              }
              return;
            }

            var request = new mssql.Request();
            request.query(query + '; SELECT SCOPE_IDENTITY() as id;', function(err, result) {
              if ((method === 'post') && !err) {
                postExecute.call(this, result[0]);
              }
              if ((method === 'get' ) && !err && res && res.resource && res.resource.item) {
                res.resource.item.metadata = res.resource.item.metadata || {};
                res.resource.item.metadata[this.title] = result.toTable();
              }
              mssql.close();
              if (wait) {
                return next();
              }
            }.bind(this));
          }.bind(this));
        }
        else if (this.settings.type === 'mysql') {
          var connection = mysql.createConnection({
            host: settings.host,
            port: settings.port,
            user: settings.user,
            password: settings.password,
            database: settings.database
          });
          connection.query(query, function(err, result) {
            if ((method === 'post') && !err) {
              postExecute.call(this, {
                id: result.insertId
              });
            }
            connection.destroy();
          }.bind(this));
        }
      }.bind(this);

      if (method === 'post' && req.body) {
        onSubmission(req.body);
      }
      else if (method === 'delete') {
        onSubmission(currentResource.item);
      }
      else {
        router.formio.cache.loadCurrentSubmission(req, function(err, submission) {
          if (!err && submission) {
            onSubmission(submission);
          }
        });
      }

      // Do not wait for the query to execute except...
      // Do wait on SQL Server get so we can return results
      if (!wait) {
        return next();
      }
    }.bind(this));
  };

  // Return the SQLAction.
  return SQLAction;
};
