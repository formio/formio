'use strict';

var async = require('async');
var MongoClient = require('mongodb').MongoClient;
var semver = require('semver');
var _ = require('lodash');
var fs = require('fs');
var debug = require('debug')('formio:db');

// The mongo database connection.
var db = null;
var schema = null;
var tools = null;

// The lock that contains the most recent version in mongo.
var currentLock = null;

// The updates available to this codebase, listed in chronological order.
var updates = null;

/**
 * The Form.io update script.
 *
 * Compares the version defined within this script and in the database and retroactively applies the updates.
 *
 * @param formio {Object}
 *   The Formio router.
 */
module.exports = function(formio) {
  var config = formio.config;

  // Current codebase version.
  if (!config.schema && !process.env.TEST_SUITE) {
    throw new Error(
      'No database schema version defined in the config, terminating process to ensure db schemas are not incorrectly' +
      ' manipulated.');
  }

  // Allow anyone to hook the current schema version.
  config.schema = formio.hook.alter('codeSchema', config.schema);

  // The last time a sanity check occurred for GET use only (cache non-manipulative operations).
  var now = (new Date()).getTime();

  // The simplex schema cache item.
  var cache = {
    // The cache full schema sanity check.
    full: {
      last: 0,
      isValid: true,
      error: 'The codebase and database schema versions do not match.'
    },

    // The cache the partial schema sanity check.
    partial: {
      last: 0,
      isValid: true,
      error: 'The codebase and database schema major versions do not match.'
    }
  };

  /**
   * Initialize the Mongo Connections for queries.
   *
   * @param next
   *  The next function to execute after establishing connections.
   *
   * @returns {*}
   */
  var connection = function(next) {
    // If a connection exists, skip the initialization.
    if (db) {
      return next();
    }

    // Get a connection to mongo, using the config settings.
    var dbUrl = (typeof config.mongo === 'string')
      ? config.mongo
      : config.mongo[0];

    // Establish a connection and continue with execution.
    MongoClient.connect(dbUrl, function(err, connection) {
      if (err) {
        debug('Connection Error: ' + err);
        unlock(function() {
          throw new Error('Could not connect to the given Database for server updates: ' + dbUrl + '.');
        });
      }
      db = connection;

      db.collection('schema', function(err, collection) {
        if (err) {
          return next(err);
        }

        // Store our reference to the Schema Collection.
        schema = collection;

        // Load the tools available to help manage updates.
        tools = require('./tools')(db, schema);
        next();
      });
    });
  };

  /**
   * Test to see if the application has been installed. Install if not.
   */
  var checkInstall = function(next) {
    console.log('Checking for db install.');
    db.listCollections().toArray().then(function(collections) {
      debug('Collections found: ' + collections.length);
      // 3 is an arbitrary length. We just want a general idea that things have been installed.
      if (collections.length < 3) {
        console.log(' > No install found. Starting new install.');
        require(__dirname + '/install')(db, config, function() {
          console.log(' > Install complete.\n');
          next();
        });
      }
      else {
        console.log(' > Install found. No install necessary.\n');
        next();
      }
    });
  };

  var checkEncryption = function(next) {
    if (config.mongoSecretOld) {
      console.log('DB Secret update required.');
      var projects = db.collection('projects');
      projects.find({}).snapshot({$snapshot: true}).forEach(function(project) {
        if (project.settings_encrypted) {
          try {
            var settings = tools.decrypt(config.mongoSecretOld, project.settings_encrypted.buffer);
            if (settings) {
              projects.update(
                { _id: project._id },
                {
                  $set: {
                    settings_encrypted: tools.encrypt(config.mongoSecret, settings)
                  }
                }
              );
            }
          }
          catch(err) {
            console.log(' > Unable to use old db secret key.');
          }
        }
      },
      function(err) {
        console.log(' > Finished updating db secret.\n');
        next(err);
      });
    }
    else {
      next();
    }
  };

  /**
   * The sanity check middleware to determine version delta between codebase and database.
   *
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  var sanityCheck = function sanityCheck(req, res, next) {
    // Determine if a response is expected by the request path.
    var response = (req.path === '/health');

    // Skip functionality if testing.
    if (process.env.TEST_SUITE) {
      return response
        ? res.sendStatus(200)
        : next();
    }

    /**
     * Send a response or pass through to the next middleware, depending on if a response was expected.
     *
     * @param err
     *   The error to be sent in a response if any.
     *
     * @returns {*}
     */
    var handleResponse = function(err) {
      if (err) {
        return res.status(500).send(err);
      }

      return response
        ? res.sendStatus(200)
        : next();
    };

    // After connecting, perform the sanity check.
    connection(function() {
      // Skip update if request was a get and update was less than 10 seconds ago (in ms).
      if (req.method === 'GET') {
        now = (new Date()).getTime();

        // Do a full sanity check when expecting a response.
        if (response) {
          if ((cache.full.last + 10000) > now) {
            return cache.full.isValid
              ? handleResponse()
              : handleResponse(cache.full.error);
          }
          else {
            // Update the last check time.
            cache.full.last = now;
          }
        }
        // Do a partial sanity check when expecting a response.
        else {
          if ((cache.partial.last + 10000) > now) {
            return cache.partial.isValid
              ? handleResponse()
              : handleResponse(cache.partial.error);
          }
          else {
            // Update the last check time.
            cache.partial.last = now;
          }
        }
      }

      // A cached response was not viable here, query and update the cache.
      schema.findOne({key: 'formio'}, function(err, document) {
        if (err || !document) {
          cache.full.isValid = false;
          cache.partial.isValid = false;

          throw new Error('The formio lock was not found..');
        }

        // When sending a response, a direct query was performed, check for different versions.
        if (response) {
          // Update the valid cache for following GET requests.
          cache.full.isValid = semver.neq(document.version, config.schema)
            ? false
            : true;

          return cache.full.isValid
            ? handleResponse()
            : handleResponse(cache.full.error);
        }
        // This is just a request sanity check, only puke if there are major differences.
        else {
          // Update the valid cache for following GET requests.
          cache.partial.isValid = semver.major(document.version) === semver.major(config.schema);

          return cache.partial.isValid
            ? handleResponse()
            : handleResponse(cache.partial.error)
        }
      });
    });
  };

  /**
   * Get a list of available update files.
   *
   * @param next {Function}
   *   The next function to invoke after this function has finished.
   */
  var getUpdates = function(next) {
    fs.readdir(__dirname + '/updates', function(err, files) {
      files = files.map(function (name) {
        debug('Update found: ' + name);
        return name.split('.js')[0];
      });

      // Allow anyone to hook the update system.
      formio.hook.alter('getUpdates', files, function(err, files) {
        updates = files.sort(semver.compare);
        debug('Final updates: ' + JSON.stringify(updates));
        next();
      });
    });
  };

  /**
   * Unlock the formio lock.
   *
   * @param next
   *   The next function to invoke after this function has finished.
   */
  var unlock = function(next) {
    if (!currentLock) {
      return next(new Error('Could not find the formio lock to unlock..'));
    }

    currentLock.isLocked = false;
    schema.findOneAndUpdate(
      {key: 'formio'},
      {$set: {isLocked: currentLock.isLocked}},
      {returnOriginal: false},
      function(err, result) {
        if (err) {
          return next(err);
        }

        currentLock = result.value;
        debug('Lock unlocked: ' + JSON.stringify(currentLock));
        next();
      }
    );
  };

  /**
   * Lock the formio lock.
   *
   * @param next
   *   The next function to invoke after this function has finished.
   *
   * @returns {*}
   */
  var lock = function(next) {
    if (!schema) {
      return next(new Error('No Schema collection was found..'));
    }

    schema.find({key: 'formio'}).toArray(function(err, document) {
      if (err) {
        return next(err);
      }
      // Engage the lock.
      else if (!document || document.length === 0) {
        // Create a new lock, because one was not present.
        debug('Creating a lock, because one was not found.');
        schema.insertOne({key: 'formio', isLocked: (new Date()).getTime(), version: '0.0.0'}, function(err, document) {
          if (err) {
            return next(err);
          }

          currentLock = document.ops[0];
          debug('Created a new lock: ' + JSON.stringify(currentLock));
          next();
        });
      }
      else if (document.length > 1) {
        return next('More than one lock was found, terminating updates.');
      }
      else {
        debug(document);
        currentLock = document[0];

        if (currentLock.isLocked) {
          console.log(' > DB is already locked for updating');
        }
        else {
          // Lock
          schema.findOneAndUpdate(
            {key: 'formio'},
            {$set: {isLocked: (new Date()).getTime()}},
            {returnOriginal: false},
            function(err, result) {
              if (err) {
                throw err;
              }

              currentLock = result.value;
              debug('Lock engaged: ' + JSON.stringify(currentLock));
              next();
            }
          );
        }
      }
    });
  };

  /**
   * Determine if there are pending updates to be applied.
   *
   * @param code
   *   The schema version in code.
   * @param database
   *   The schema version in the database.
   *
   * @returns {boolean}
   *   If pending updates are available.
   */
  var pendingUpdates = function(code, database) {
    // Check the validity of the the code and database version numbers.
    if (
      (!code || typeof code !== 'string' || !semver.valid(code))
      || (!database || typeof database !== 'string' || !semver.valid(database))
    ) {
      return unlock(function() {
        throw new Error('The provided versions given for comparison, do not match the semantic versioning format; ' +
          'code: ' + code + ', database: ' + database);
      });
    }

    // Versions are the same, skip updates.
    if (semver.eq(code, database)) {
      debug('Current database (' + database + ') and Pending code sversions (' + code + ') are the same.');
      return false;
    }
    else if (semver.gt(database, code)) {
      // TODO: This should only throw an error if the MAJOR version is different. We can run a more recent MINOR or PATCH version.
      // The database has a higher version than code, notify that the code needs to be updated and exit.
      unlock(function() {
        throw new Error(
          'The provided codebase version is more recent than the database schema version. Update the codebase and ' +
          'restart.'
        );
      });
    }
    else {
      // The code has a higher version than the database, lock the database and update the schemas.
      return true;
    }
  };

  /**
   * Update the database schema, from the current version, to the latest defined.
   *
   * @param next
   *   The next function to invoke after this function has finished.
   */
  var doUpdates = function(next) {
    console.log('Checking for db schema updates.');

    // Skip updates if there are no pending updates to apply.
    if (!pendingUpdates(config.schema, currentLock.version)) {
      console.log(' > No updates found.\n');
      return next();
    }

    // Determine the pending updates, by filtering the searchable updates.
    var pending = _.filter(updates, function(potential) {
      // An update is only applicable if it has not been applied to the db yet, and it is lower than the current.
      var applicable = semver.gt(potential, currentLock.version) && semver.lte(potential, config.schema);

      // Display progress.
      if (applicable) {
        console.log(' > Pending schema update: ' + potential);
      }

      return applicable;
    });

    // Only take action if outstanding updates exist.
    debug('Pending updates: ' + JSON.stringify(pending));
    if (pending.length > 0) {
      async.eachSeries(pending, function(pending, callback) {
        console.log(' > Starting schema update to ' + pending);

        // Load the update then update the schema lock version.
        var _update = null;

        // Attempt to load the the pending update, allow anyone to hook the pending updates location.
        try {
          _update = require(__dirname + '/updates/' + pending);
        }
        catch(e) {
          _update = formio.hook.alter('updateLocation', pending);
        }

        // Attempt to resolve the update.
        try {
          _update(db, config, tools, function(err) {
            if (err) {
              return callback(err);
            }

            tools.updateLockVersion(pending, callback);
          });
        }
        catch(e) {
          return callback('Could not resolve the path for update: ' + pending);
        }
      }, function(err) {
        if (err) {
          debug(err);
          return next(err);
        }

        console.log(' > Done applying pending updates\n');
        next();
      });
    }
    else {
      console.log(' > No pending updates are available.');
      console.log('   > Code version: ' + version);
      console.log('   > Schema version: ' + currentLock.version);
      console.log('   > Latest Available: ' + updates[updates.length-1] + '\n');
      return next();
    }
  };

  /**
   * Initialized the update script.
   */
  var initialize = function(next) {
    if (process.env.TEST_SUITE) {
      return next();
    }

    async.series([
      connection,
      checkInstall,
      checkEncryption,
      getUpdates,
      lock,
      doUpdates,
      unlock
    ], function(err) {
      unlock(function() {
        if (err) {
          debug(err);
          return next(err);
        }

        next(null, db);
      });
    });
  };

  /**
   * Expose the update internals for outside use.
   */
  return {
    db: db,
    version: config.schema,
    initialize: initialize,
    sanityCheck: sanityCheck
  };
};
