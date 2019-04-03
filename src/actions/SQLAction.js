'use strict';

const mssql = require('mssql');
const mysql = require('mysql');
const _ = require('lodash');
const debug = require('debug')('formio:action:sql');

const LOG_EVENT = 'SQL Action';

module.exports = function(router) {
  const Action = router.formio.Action;
  const hook = require('../util/hook')(router.formio);
  const ecode = router.formio.util.errorCodes;
  const logOutput = router.formio.log || debug;
  const log = (...args) => logOutput(LOG_EVENT, ...args);

  /**
   * SQLAction class.
   *   This class is used to integrate into external SQL Databases.
   */
  class SQLAction extends Action {
    constructor(data, req, res) {
      super(data, req, res);
    }

    static info(req, res, next) {
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
    }

    static settingsForm(req, res, next) {
      hook.settings(req, function(err, settings) {
        if (err) {
          log(req, ecode.app.ESETTINGSLOAD, err, '#settingsForm');
          return next(null, {});
        }

        settings = settings || {};

        // Include only server types that have complete configurations
        let missingSetting = null;
        const serverTypes = [];
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
    }

    /**
     * Escape a query to protect against SQL Injection.
     *
     * @param query
     * @returns {*}
     */
    /* eslint-disable no-useless-escape */
    escape(query) {
      return query.replace(/[\0\n\r\b\t\\\'\'\x1a]/g, function(s) { // eslint-disable-line no-control-regex
        switch (s) {
          case '\0': return '\\0';
          case '\n': return '\\n';
          case '\r': return '\\r';
          case '\b': return '\\b';
          case '\t': return '\\t';
          case '\x1a': return '\\Z';
          default: return `\\${s}`;
        }
      });
    }
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
    resolve(handler, method, req, res, next) {
      // Store the current resource.
      const currentResource = res.resource;

      // Load the settings.
      hook.settings(req, function(err, settings) {
        if (err) {
          log(req, ecode.app.ESETTINGSLOAD, err, '#resolve');
          return next(err);
        }

        // Get the settings for this database type.
        settings = settings.databases[this.settings.type];

        // Make sure there aren't any missing settings
        const missingSetting = _.find(['host', 'port', 'database', 'user', 'password'], function(prop) {
          return !settings[prop];
        });

        if (missingSetting) {
          log(req, ecode.app.EDBCONFIG, new Error(ecode.app.EDBCONFIG), '#resolve', missingSetting);
          return res.status(400).send(`Database settings is missing \`${missingSetting}\``);
        }

        // Make sure they cannot connect to localhost.
        if (settings.host.search(/localhost|127\.0\.0\.1/) !== -1) {
          log(req, ecode.app.EDBHOST, new Error(ecode.app.EDBHOST), '#resolve', settings.host);
          return res.status(400).send('Invalid SQL Host');
        }

        const method = req.method.toLowerCase();
        let wait = method === 'get' && this.settings.type === 'mssql';

        // Called when the submission is loaded.
        const onSubmission = function(submission) {
          if (!submission) {
            wait = false;
            return;
          }

          // Create the query based on callbacks.
          const query = this.settings.query.replace(/{{\s+([^}]+)\s+}}/g, function() {
            let value = '';
            let data = _.cloneDeep(submission);

            // Replace {{ id }} with the external ID.
            if (arguments[1] === 'id') {
              value = _.result(_.find(currentResource.item.externalIds, {type: 'SQLQuery'}), 'id');
            }
            else {
              // Replace all others with the data from the submission.
              const parts = arguments[1].split('.');
              for (let i = 0; i < parts.length; i++) {
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
            log(req, ecode.db.EINVQUERY, new Error(ecode.db.EINVQUERY), '#resolve');
            return res.status(400).send(ecode.db.EINVQUERY);
          }

          // Perform a post execution.
          const postExecute = function(result) {
            // Update the resource with the external Id.
            const submissionModel = req.submissionModel || router.formio.resources.submission.model;
            submissionModel.findOne(
              hook.alter('submissionQuery', {_id: currentResource.item._id, deleted: {$eq: null}}, req)
            ).exec(function(err, submission) {
              if (err) {
                log(req, ecode.submission.ESUBLOAD, err, '#resolve');
                return;
              }

              // Update the submissions externalIds.
              submission.externalIds = submission.externalIds || [];
              submission.externalIds.push({
                type: 'SQLQuery',
                id: result.id
              });
              submission.save(function(err, submission) {
                if (err) {
                  log(req, ecode.submission.ESUBSAVE, err, '#resolve');
                  return;
                }
              });
            });
          };

          // Execute the query.
          if (this.settings.type === 'mssql') {
            const config = {
              user: settings.user,
              password: settings.password,
              server: settings.host,
              port: settings.port,
              database: settings.database,
              options: {encrypt: settings.azure ? true : false}
            };

            const pool = new mssql.ConnectionPool(config);
            pool.connect(function(err) {
              if (err) {
                log(req, ecode.db.EDBCONN, err, '#resolve', 'MSSQL connection pool');
                if (wait) {
                  return next();
                }
                return;
              }

              const request = new mssql.Request(pool);
              request.query(`${query}; SELECT SCOPE_IDENTITY() as id;`, function(err, result) {
                if (err) {
                  debug(req, ecode.db.EQUERY, err, '#resolve', 'MSSQL Request err');
                }
                if ((method === 'post') && !err) {
                  postExecute.call(this, result.recordset[0]);
                }
                if ((method === 'get' ) && !err && res && res.resource && res.resource.item) {
                  res.resource.item.metadata = res.resource.item.metadata || {};
                  res.resource.item.metadata[this.title] = result.recordset.toTable();
                }
                pool.close();
                if (wait) {
                  return next();
                }
              }.bind(this));
            }.bind(this));
          }
          else if (this.settings.type === 'mysql') {
            const connection = mysql.createConnection({
              host: settings.host,
              port: settings.port,
              user: settings.user,
              password: settings.password,
              database: settings.database
            });
            connection.query(query, function(err, result) {
              if (err) {
                log(req, ecode.db.EQUERY, err, '#resolve', 'MySQL query error.');
              }
              if ((method === 'post') && !err) {
                postExecute.call(this, {
                  id: result.insertId
                });
              }
              connection.destroy();
            }.bind(this));
          }
        }.bind(this);

        if (method !== 'get' && req.body) {
          onSubmission(method === 'delete' ? currentResource.item : req.body);
        }
        else {
          router.formio.cache.loadCurrentSubmission(req, function(err, submission) {
            if (err) {
              log(req, ecode.submission.ESUBLOAD, err, '#resolve', 'Load current submission');
            }
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
    }
  }

  // Return the SQLAction.
  return SQLAction;
};
