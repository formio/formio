'use strict';

const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const semver = require('semver');
const _ = require('lodash');
const fs = require('fs');
const debug = {
  db: require('debug')('formio:db'),
  error: require('debug')('formio:error'),
  sanity: require('debug')('formio:sanityCheck')
};
const path = require('path');

// The mongo database connection.
let db = null;
let schema = null;
let tools = null;

// The lock that contains the most recent version in mongo.
let currentLock = null;

// The updates available to this codebase, listed in chronological order.
let updates = null;

/**
 * The Form.io update script.
 *
 * Compares the version defined within this script and in the database and retroactively applies the updates.
 *
 * @param formio {Object}
 *   The Formio router.
 */
module.exports = function(formio) {
  let config = formio.config;

  // Allow anyone to hook the current config.
  config = formio.hook.alter('updateConfig', config);

  // Current codebase version.
  if (!config.schema && !process.env.TEST_SUITE) {
    throw new Error(
      'No database schema version defined in the config, terminating process to ensure db schemas are not incorrectly' +
      ' manipulated.'
    );
  }

  // The last time a sanity check occurred for GET use only (cache non-manipulative operations).
  let now = (new Date()).getTime();

  // The simplex schema cache item.
  const cache = {
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
   * Unlock the formio lock.
   *
   * @param next
   *   The next function to invoke after this function has finished.
   */
  const unlock = function(next) {
    if (!currentLock) {
      return next(new Error('Could not find the formio lock to unlock..'));
    }

    currentLock.isLocked = false;
    schema.updateOne(
      {key: 'formio'},
      {$set: {isLocked: currentLock.isLocked}},
      (err) => {
        if (err) {
          return next(err);
        }
        schema.findOne({key: 'formio'}, (err, result) => {
          if (err) {
            return next(err);
          }
          currentLock = result;
          debug.db('Lock unlocked');
          next();
        });
      }
    );
  };
  /**
   * Fetch the SA certificate.
   *
   * @param next
   * @return {*}
   */
  const getCA = function(next) {
    // Handle reverse compatability.
    const CA = config.mongoSA || config.mongoCA;
    if (!CA) {
      return next();
    }

    config.mongoSA = config.mongoCA = CA;
    return next();
  };

  /**
   * Fetch the SSL certificates from local dir.
   *
   * @param next
   * @return {*}
   */
  const getSSL = function(next) {
    if (!config.mongoSSL) {
      return next();
    }

    console.log('Loading Mongo SSL Certificates');

    const certs = {
      sslValidate: !!config.mongoSSLValidate,
      ssl: true,
    };

    if (config.mongoSSLPassword) {
      certs.sslPass = config.mongoSSLPassword;
    }

    const files = {
      sslCA: 'ca.pem',
      sslCert: 'cert.pem',
      sslCRL: 'crl.pem',
      sslKey: 'key.pem',
    };

    // Load each file into its setting.
    Object.keys(files).forEach((key) => {
      const file = files[key];
      if (fs.existsSync(path.join(config.mongoSSL, file))) {
        console.log(' > Reading', path.join(config.mongoSSL, file));
        if (key === 'sslCA') {
          certs[key] = [fs.readFileSync(path.join(config.mongoSSL, file))];
        }
        else {
          certs[key] = fs.readFileSync(path.join(config.mongoSSL, file));
        }
      }
      else {
        console.log(' > Could not find', path.join(config.mongoSSL, file), 'skipping');
      }
    });
    console.log('');

    config.mongoSSL = certs;
    return next();
  };

  /**
   * Initialize the Mongo Connections for queries.
   *
   * @param next
   *  The next function to execute after establishing connections.
   *
   * @returns {*}
   */
  const connection = function(next) {
    // If a connection exists, skip the initialization.
    if (db) {
      debug.db('Connection exists');
      return next();
    }

    // Get a connection to mongo, using the config settings.
    const dbUrl = (typeof config.mongo === 'string')
      ? config.mongo
      : config.mongo[0];

    debug.db(`Opening new connection to ${dbUrl}`);
    let mongoConfig = config.mongoConfig ? JSON.parse(config.mongoConfig) : {};
    if (!mongoConfig.hasOwnProperty('connectTimeoutMS')) {
      mongoConfig.connectTimeoutMS = 300000;
    }
    if (!mongoConfig.hasOwnProperty('socketTimeoutMS')) {
      mongoConfig.socketTimeoutMS = 300000;
    }
    if (!mongoConfig.hasOwnProperty('useNewUrlParser')) {
      mongoConfig.useNewUrlParser = true;
    }
    if (config.mongoSA || config.mongoCA) {
      mongoConfig.sslValidate = true;
      mongoConfig.sslCA = config.mongoSA || config.mongoCA;
    }
    if (config.mongoSSL) {
      mongoConfig = {
        ...mongoConfig,
        ...config.mongoSSL,
      };
    }

    mongoConfig.useUnifiedTopology = true;

    // Establish a connection and continue with execution.
    MongoClient.connect(dbUrl, mongoConfig, async function(err, client) {
      if (err) {
        debug.db(`Connection Error: ${err}`);
        unlock(function() {
          throw new Error(`Could not connect to the given Database for server updates: ${dbUrl}.`);
        });
      }
      db = client.db(client.s.options.dbName);
      debug.db('Connection successful');
      try {
        const collection = await db.collection('schema');
        debug.db('Schema collection opened');
        schema = collection;
      }
      catch (err) {
        return next(err);
      }
      // Load the tools available to help manage updates.
      tools = require('./tools')(db, schema);
      next();
    });
  };

  /**
   * Test to see if the application has been installed. Install if not.
   */
  const checkSetup = function(next) {
    setTimeout(() => {
      formio.util.log('Checking for db setup.');
      db.listCollections().toArray().then(function(collections) {
        debug.db(`Collections found: ${collections.length}`);
        // 3 is an arbitrary length. We just want a general idea that things have been installed.
        if (collections.length < 3) {
          formio.util.log(' > No collections found. Starting new setup.');
          require(path.join(__dirname, '/install'))(db, config, function() {
            formio.util.log(' > Setup complete.\n');
            next();
          });
        }
        else {
          formio.util.log(' > Setup complete.\n');
          return next();
        }
      });
    }, Math.random() * 1000);
  };

  const checkEncryption = function(next) {
    if (config.mongoSecretOld) {
      formio.util.log('DB Secret update required.');
      const projects = db.collection('projects');
      projects.find({}).forEach(function(project) {
        if (project.settings_encrypted) {
          try {
            const settings = tools.decrypt(config.mongoSecretOld, project.settings_encrypted.buffer);
            if (settings) {
              /* eslint-disable camelcase */
              projects.updateOne(
                {_id: project._id},
                {
                  $set: {
                    settings_encrypted: tools.encrypt(config.mongoSecret, settings)
                  }
                }
              );
              /* eslint-enable camelcase */
            }
          }
          catch (err) {
            debug.error(err);
            formio.util.log(' > Unable to use old db secret key.');
          }
        }
      },
      function(err) {
        formio.util.log(' > Finished updating db secret.\n');
        next(err);
      });
    }
    else {
      return next();
    }
  };

  /**
   * Check for certain mongodb features.
   * @param {*} next.
   */
  const checkFeatures = function(next) {
    formio.util.log('Determine MongoDB compatibility.');
    (async () => {
      config.mongoFeatures = formio.mongoFeatures = {
        collation: true,
        compoundIndexWithNestedPath: true,
      };
      const featuresTest = db.collection('formio-collation-test');
      try {
        await featuresTest.createIndex({test: 1}, {collation: {locale: 'en_US', strength: 1}});
        formio.util.log('Collation indexes are supported.');
      }
      catch (err) {
        formio.util.log('Collation indexes are not supported.');
        config.mongoFeatures.collation = formio.mongoFeatures.collation = false;
      }

      // Test for support for compound indexes that contain nested paths
      try {
        await featuresTest.createIndex({test: 1, 'nested.test': 1});
        formio.util.log('Compound indexes that contain nested paths are supported.');
      }
      catch (err) {
        formio.util.log('Compound indexes that contain nested paths are not supported.');
        config.mongoFeatures.compoundIndexWithNestedPath = formio.mongoFeatures.compoundIndexWithNestedPath = false;
      }
      await featuresTest.drop();
      next();
    })();
  };

  /**
   * The sanity check middleware to determine version delta between codebase and database.
   *
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  const sanityCheck = function sanityCheck(req, res, next) {
    // Determine if a response is expected by the request path.
    const response = (req.path === '/health');
    const {verboseHealth} = req;

    // Skip functionality if testing.
    if (process.env.TEST_SUITE) {
      debug.db('Skipping for TEST_SUITE');

      if (response && verboseHealth) {
        res.status(200);
        return next();
      }

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
    const handleResponse = function(err) {
      if (response && verboseHealth) {
        if (err) {
          res.status(400);
        }
        else {
          res.status(200);
        }
        return next();
      }

      if (err) {
        return res.status(400).send(err);
      }

      return response
        ? res.sendStatus(200)
        : next();
    };

    // After connecting, perform the sanity check.
    connection(function() {
      // Skip update if request was a get and update was less than 10 seconds ago (in ms).
      if (req.method === 'GET') {
        debug.sanity('Checking GET');
        now = (new Date()).getTime();

        // Do a full sanity check when expecting a response.
        if (response) {
          if ((cache.full.last + 10000) > now) {
            debug.sanity('Response and Less than 10 seconds');
            return cache.full.isValid
              ? handleResponse()
              : handleResponse(cache.full.error);
          }
          else {
            debug.sanity('Response and More than 10 seconds');
            // Update the last check time.
            cache.full.last = now;
          }
        }
        // Do a partial sanity check when expecting a response.
        else {
          if ((cache.partial.last + 10000) > now) {
            debug.sanity('No Response and Less than 10 seconds');
            return cache.partial.isValid
              ? handleResponse()
              : handleResponse(cache.partial.error);
          }
          else {
            debug.sanity('No Response and More than 10 seconds');
            // Update the last check time.
            cache.partial.last = now;
          }
        }
      }

      debug.sanity('Checking formio schema');
      // A cached response was not viable here, query and update the cache.
      schema.findOne({key: 'formio'}, (err, document) => {
        if (err || !document) {
          cache.full.isValid = false;
          cache.partial.isValid = false;

          throw new Error('The formio lock was not found..');
        }
        debug.sanity('Schema found');

        // When sending a response, a direct query was performed, check for different versions.
        if (response) {
          // Update the valid cache for following GET requests.
          cache.full.isValid = semver.neq(document.version, config.schema)
            ? false
            : true;

          debug.sanity(`Has Response is valid: ${cache.full.isValid}`);
          return cache.full.isValid
            ? handleResponse()
            : handleResponse(cache.full.error);
        }
        // This is just a request sanity check, only puke if there are major differences.
        else {
          // Update the valid cache for following GET requests.
          cache.partial.isValid = semver.major(document.version) === semver.major(config.schema);

          debug.sanity(`Has Partial Response is valid: ${cache.partial.isValid}`);
          return cache.partial.isValid
            ? handleResponse()
            : handleResponse(cache.partial.error);
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
  const getUpdates = function(next) {
    fs.readdir(path.join(__dirname, '/updates'), function(err, files) {
      if (err) {
        return next(err);
      }

      files = files.map(function(name) {
        debug.db(`Update found: ${name}`);
        return name.split('.js')[0];
      });

      // Allow anyone to hook the update system.
      formio.hook.alter('getUpdates', files, function(err, files) {
        if (err) {
          return next(err);
        }

        updates = files.sort(semver.compare);
        debug.db('Final updates');
        next();
      });
    });
  };

  /**
   * Lock the formio lock.
   *
   * @param next
   *   The next function to invoke after this function has finished.
   *
   * @returns {*}
   */
  const lock = function(next) {
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
        debug.db('Creating a lock, because one was not found.');
        schema.insertOne({
          key: 'formio',
          isLocked: (new Date()).getTime(),
          version: config.schema
        }, function(err, document) {
          if (err) {
            return next(err);
          }

          currentLock = document.ops[0];
          debug.db('Created a new lock');
          next();
        });
      }
      else if (document.length > 1) {
        return next('More than one lock was found, terminating updates.');
      }
      else {
        debug.db(document);
        currentLock = document[0];

        if (currentLock.isLocked) {
          formio.util.log(' > DB is already locked for updating');
        }
        else {
          // Lock
          schema.updateOne(
            {key: 'formio'},
            {$set: {isLocked: (new Date()).getTime()}},
            (err) => {
              if (err) {
                throw err;
              }

              schema.findOne({key: 'formio'}, (err, result) => {
                if (err) {
                  return next(err);
                }
                currentLock = result;
                debug.db('Lock engaged');
                next();
              });
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
  const pendingUpdates = function(code, database) {
    // Check the validity of the the code and database version numbers.
    if (
      (!code || typeof code !== 'string' || !semver.valid(code))
      || (!database || typeof database !== 'string' || !semver.valid(database))
    ) {
      return unlock(function() {
        throw new Error(`${'The provided versions given for comparison, do not match the semantic versioning format; ' +
          'code: '}${code}, database: ${database}`);
      });
    }

    // Versions are the same, skip updates.
    if (semver.eq(code, database)) {
      debug.db(`Current database (${database}) and Pending code sversions (${code}) are the same.`);
      return false;
    }
    else if (
      semver.gt(database, code) &&
      (['patch', 'prepatch', 'prerelease', 'minor'].indexOf(semver.diff(database, code)) === -1)
    ) {
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
  const doUpdates = function(next) {
    formio.util.log('Checking for db schema updates.');

    // Skip updates if there are no pending updates to apply.
    if (!pendingUpdates(config.schema, currentLock.version)) {
      formio.util.log(' > No updates found.\n');
      return next();
    }

    // Determine the pending updates, by filtering the searchable updates.
    const pending = _.filter(updates, function(potential) {
      // An update is only applicable if it has not been applied to the db yet, and it is lower than the current.
      const applicable = semver.gt(potential, currentLock.version) && semver.lte(potential, config.schema);

      // Display progress.
      if (applicable) {
        formio.util.log(` > Pending schema update: ${potential}`);
      }

      return applicable;
    });

    // Only take action if outstanding updates exist.
    debug.db('Pending updates');
    if (pending.length > 0) {
      async.eachSeries(pending, function(pending, callback) {
        formio.util.log(` > Starting schema update to ${pending}`);

        // Load the update then update the schema lock version.
        let _update = null;

        // Attempt to load the the pending update.
        // Allow anyone to hook the pending updates location.
        try {
          _update = formio.hook.alter('updateLocation', pending);
        }
        catch (e) {
          debug.error(e);
          debug.db(e);
        }

        // No private update was found, check the public location.
        debug.db('_update:');
        debug.db(_update);
        if (typeof _update !== 'function') {
          try {
            _update = require(path.join(__dirname, `/updates/${pending}`));
          }
          catch (e) {
            debug.error(e);
            debug.db(e);
          }
        }

        // Attempt to resolve the update.
        try {
          if (typeof _update !== 'function') {
            return callback(`Could not resolve the path for update: ${pending}`);
          }

          debug.db('Update Params:');
          debug.db(db);
          debug.db(config);
          debug.db(tools);
          _update(db, config, tools, function(err) {
            if (err) {
              return callback(err);
            }

            tools.updateLockVersion(pending, callback);
          });
        }
        catch (e) {
          debug.error(e);
          return callback(e);
        }
      }, function(err) {
        if (err) {
          debug.db(err);
          return next(err);
        }

        formio.util.log(' > Done applying pending updates\n');
        next();
      });
    }
    else {
      formio.util.log(' > No pending updates are available.');
      formio.util.log(`   > Code version: ${config.schema}`);
      formio.util.log(`   > Schema version: ${currentLock.version}`);
      formio.util.log(`   > Latest Available: ${updates[updates.length-1]}\n`);
      return next();
    }
  };

  /**
   * Update the default configuration forms, from the current version, to the version required by the server.
   *
   * @param next
   *   The next function to invoke after this function has finished.
   */
  const doConfigFormsUpdates = function(next) {
    formio.util.log('Checking for Config Forms updates.');

    let configFormsUpdates = {};
    configFormsUpdates = formio.hook.alter('getConfigFormsUpdates', configFormsUpdates);
    const updates = Object.keys(configFormsUpdates);

    // Skip updates if there are no  updates to apply.
    if (!updates.length) {
      formio.util.log(' > No config forms updates found.\n');
      return next();
    }
    // Only take action if updates exist.
    debug.db('Pending config forms updates');
      async.eachSeries(updates, function(update, callback) {
        formio.util.log(` > Starting config forms update: ${update}`);

        // Load the update then update the schema lock version.
        let _update = null;

        // Attempt to load the the pending update.
        // Allow anyone to hook the pending updates location.
        try {
          _update = configFormsUpdates[update];
        }
        catch (e) {
          debug.error(e);
          debug.db(e);
        }
        // Attempt to resolve the update.
        try {
          if (typeof _update !== 'function') {
            return callback(`Could not resolve the path for config form update: ${update}`);
          }

          debug.db('Update Params:');
          debug.db(db);
          debug.db(config);
          debug.db(tools);
          _update(db, config, tools, function(err) {
            if (err) {
              return callback(err);
            }
            return callback();
          });
        }
        catch (e) {
          debug.error(e);
          return callback(e);
        }
      }, function(err) {
        if (err) {
          debug.db(err);
          return next(err);
        }

        formio.util.log(' > Done applying pending config forms updates\n');
        next();
      });
  };
  /**
   * Initialized the update script.
   */
  const initialize = function(next) {
    if (process.env.TEST_SUITE) {
      return async.series([
        connection,
        checkFeatures
      ], (err) => {
        if (err) {
          debug.db(err);
          return next(err);
        }
        next(null, db);
      });
    }

    async.series([
      getCA,
      getSSL,
      connection,
      checkSetup,
      checkEncryption,
      checkFeatures,
      getUpdates,
      lock,
      doConfigFormsUpdates,
      doUpdates,
      unlock
    ], function(err) {
      unlock(function() {
        if (err) {
          debug.db(err);
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
