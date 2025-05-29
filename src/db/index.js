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
const {customAlphabet} = require('nanoid/non-secure');

// Random string generator HOF
const nanoid = customAlphabet('1234567890abcdef', 10);

const {sanitizeMongoConnectionString} = require('./util');

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
   *
   * @param {object} lock - The lock object to sanitize.
   * @returns {object|undefined} - The sanitized lock object.
   */
  const sanitizeLock = function(lock) {
    if (!lock) {
      return;
    }
    if (typeof lock !== 'object') {
      throw new Error('Invalid lock object');
    }
    const validLock = {
      key: lock.key,
      isLocked: lock.isLocked,
      version: lock.version
    };
    return validLock;
  };

  /**
   * Unlock the formio lock.
   *
   *   The next function to invoke after this function has finished.
   */
  const unlock = async function() {
    if (!currentLock) {
      throw new Error('Could not find the formio lock to unlock..');
    }

    currentLock.isLocked = false;
    await schema.updateOne(
      {key: 'formio'},
      {$set: {isLocked: currentLock.isLocked}});
    const result = await schema.findOne({key: 'formio'});
    currentLock = sanitizeLock(result);
    debug.db('Lock unlocked');
  };
  /**
   * Fetch the SA certificate.
   *
   * @return {*}
   */
  const getCA = function() {
    // Handle reverse compatability.
    const CA = config.mongoSA || config.mongoCA;
    if (!CA) {
      return;
    }

    config.mongoSA = config.mongoCA = CA;
  };

  /**
   * Fetch the SSL certificates from local dir.
   *
   * @return {*}
   */
  const getSSL = function() {
    if (!config.mongoSSL) {
      return;
    }

    console.log('Loading Mongo TLS Certificates');

    const certs = {
      tls: true,
      tlsAllowInvalidCertificates: !config.mongoSSLValidate,
    };

    if (config.mongoSSLPassword) {
      certs.tlsCertificateKeyFilePassword = config.mongoSSLPassword;
    }

    const files = {
      ca: 'ca.pem',
      cert: 'cert.pem',
      crl: 'crl.pem',
      key: 'key.pem',
    };

    Object.keys(files).forEach((key) => {
      const file = files[key];
      const filePath = path.join(config.mongoSSL, file);

      if (fs.existsSync(filePath)) {
        console.log(' > Reading', filePath);
        const data = fs.readFileSync(filePath);

        if (key === 'ca') {
          // 'ca' can be an array if multiple CAs need to be trusted
          certs.ca = [data];
        }
        else if (key === 'crl') {
          certs.crl = data;
        }
        else if (key === 'cert') {
          certs.cert = data;
        }
        else if (key === 'key') {
          certs.key = data;
        }
      }
      else {
        console.log(' > Could not find', filePath, 'skipping');
      }
    });

    console.log('');
    config.mongoSSL = certs;
  };

  /**
   * Initialize the Mongo Connections for queries.
   *
   *
   * @returns {*}
   */
  const connection = async function() {
    // If a connection exists, skip the initialization.
    if (db) {
      debug.db('Connection exists');
      return;
    }

    // Get a connection to mongo, using the config settings.
    const dbUrl = (typeof config.mongo === 'string')
      ? config.mongo
      : config.mongo[0];

    const sanitizedDbUrl = sanitizeMongoConnectionString(dbUrl);
    debug.db(`Opening new connection to ${sanitizedDbUrl}`);
    let mongoConfig = config.mongoConfig ? JSON.parse(config.mongoConfig) : {};
    if (!mongoConfig.hasOwnProperty('connectTimeoutMS')) {
      mongoConfig.connectTimeoutMS = 300000;
    }
    if (!mongoConfig.hasOwnProperty('socketTimeoutMS')) {
      mongoConfig.socketTimeoutMS = 300000;
    }
    if (config.mongoSA || config.mongoCA) {
      mongoConfig.tls = true;
      mongoConfig.tlsCAFile = config.mongoSA || config.mongoCA;
    }
    if (config.mongoSSL) {
      mongoConfig = {
        ...mongoConfig,
        ...config.mongoSSL,
      };
    }

    // Establish a connection and continue with execution.
    const client = new MongoClient(dbUrl, mongoConfig);

    async function connectMongo() {
      try {
        await client.connect();
        db = client.db(client.s.options.dbName);
        debug.db('Connection successful');
        const collection = db.collection('schema');
        debug.db('Schema collection opened');
        schema = collection;
        // Load the tools available to help manage updates.
        tools = require('./tools')(db, schema);
      }
       catch (err) {
        debug.db(`Connection Error: ${err}`);
        try {
          await unlock();
        }
        catch (ignoreErr) {
          debug.db(`Unlock Error: ${ignoreErr}`);
        }
        throw new Error(`Could not connect to the given Database for server updates: ${sanitizedDbUrl}.`);
      }
    }

    // Establish a connection and continue with execution.
    await connectMongo();
  };

  /**
   * Test to see if the application has been installed. Install if not.
   */
  const checkSetup = async function() {
    formio.util.log('Checking for db setup.'); const collections = await db.listCollections().toArray();
    debug.db(`Collections found: ${collections.length}`);
    // 3 is an arbitrary length. We just want a general idea that things have been installed.
    if (collections.length < 3) {
      formio.util.log(' > No collections found. Starting new setup.');
      await require(path.join(__dirname, '/install'))(db, config);
      formio.util.log(' > Setup complete.\n');
    }
    else {
      formio.util.log(' > Setup complete.\n');
    }
  };

  const checkEncryption = function() {
    formio.hook.alter('checkEncryption', formio, db);
  };

  /**
   * Check for certain mongodb features.
   */
  const checkFeatures = async function() {
    formio.util.log('Determine MongoDB compatibility.');
    try {
      config.mongoFeatures = formio.mongoFeatures = {
        collation: true,
        compoundIndexWithNestedPath: true,
      };
      // Assign a random string to collection name to avoid multi-instance race conditions
      const randomString = nanoid();
      const featuresTest = db.collection(randomString);
      // Test for collation support
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

      // check CosmosDB indexes
      try {
        // Checking whether indexes need to be created for CosmosDB to function
        await featuresTest.dropIndexes();
        await featuresTest.insertOne({title: 'Test Title', nested: {test: 'value'}});
        await featuresTest.find().sort({title: 1}).limit(1).toArray();
      }
      catch (err) {
        // Create indexes if they don't exist
        const collections = await db.listCollections().toArray();

        for (const {name} of collections) {
          const collection = db.collection(name);
          const indexes = await collection.indexes();

          const hasWildcard = indexes.some(idx => idx.key && idx.key["$**"] === 1);

          if (!hasWildcard) {
            await collection.createIndex({"$**": 1});
          }
        }
      }
      await featuresTest.drop();
    }
    catch (err) {
      formio.util.log('Error determining MongoDB compatibility:');
      formio.util.log(err);
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
  const sanityCheck = async function sanityCheck(req, res, next) {
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
    await connection();
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

      const updateCache = async () =>{
      try {
        const document = await schema.findOne({key: 'formio'});
        if (!document) {
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
      }
      catch (err) {
        cache.full.isValid = false;
        cache.partial.isValid = false;

        throw new Error('The formio lock was not found..');
      }
    };
    await updateCache();
  };

  /**
   * Get a list of available update files.
   *
   * @param next {Function}
   *   The next function to invoke after this function has finished.
   */
  const getUpdates = async function() {
      let files = await fs.promises.readdir(path.join(__dirname, '/updates'));
      files = files.map(function(name) {
        debug.db(`Update found: ${name}`);
        return name.split('.js')[0];
      });

      // Allow anyone to hook the update system.
      formio.hook.alter('getUpdates', files, function(err, files) {
        updates = files.sort(semver.compare);
        debug.db('Final updates');
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
  const lock = async function() {
    if (!schema) {
      throw new Error('No Schema collection was found..');
    }

    const document = await schema.find({key: 'formio'}).toArray();
    // Engage the lock.
    if (!document || document.length === 0) {
      // Create a new lock, because one was not present.
      debug.db('Creating a lock, because one was not found.');
      const document = {
        key: 'formio',
        isLocked: (new Date()).getTime(),
        version: config.schema
      };
      const insertionResult = await schema.insertOne(document);
      if (!insertionResult.acknowledged || !insertionResult.insertedId) {
        throw new Error('Could not create a lock for the formio schema.');
      }
      const lock = await schema.findOne({_id: insertionResult.insertedId});
      currentLock = sanitizeLock(lock);
      debug.db('Created a new lock');
    }
    else if (document.length > 1) {
      throw ('More than one lock was found, terminating updates.');
    }
    else {
      debug.db(document);
      currentLock = document[0];

      if (currentLock.isLocked) {
        formio.util.log(' > DB is already locked for updating');
      }
      else {
        // Lock
        await schema.updateOne(
          {key: 'formio'},
          {$set: {isLocked: (new Date()).getTime()}});
        const result = await schema.findOne({key: 'formio'});
        currentLock = sanitizeLock(result);
        debug.db('Lock engaged');
      }
    }
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
  const pendingUpdates = async function(code, database) {
    // Check the validity of the the code and database version numbers.
    if (
      (!code || typeof code !== 'string' || !semver.valid(code))
      || (!database || typeof database !== 'string' || !semver.valid(database))
    ) {
      await unlock();
      throw new Error(`${'The provided versions given for comparison, do not match the semantic versioning format; ' +
        'code: '}${code}, database: ${database}`);
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
      await unlock();
      throw new Error(
        'The provided codebase version is more recent than the database schema version. Update the codebase and ' +
        'restart.'
      );
    }
    else {
      // The code has a higher version than the database, lock the database and update the schemas.
      return true;
    }
  };

  /**
   * Update the database schema, from the current version, to the latest defined.
   *
   */
  const doUpdates = async function() {
    formio.util.log('Checking for db schema updates.');

    // Skip updates if there are no pending updates to apply.
    if (!await pendingUpdates(config.schema, currentLock.version)) {
      formio.util.log(' > No updates found.\n');
      return;
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
          throw err;
        }

        formio.util.log(' > Done applying pending updates\n');
      });
    }
    else {
      formio.util.log(' > No pending updates are available.');
      formio.util.log(`   > Code version: ${config.schema}`);
      formio.util.log(`   > Schema version: ${currentLock.version}`);
      formio.util.log(`   > Latest Available: ${updates[updates.length-1]}\n`);
    }
  };

  /**
   * Update the default configuration forms, from the current version, to the version required by the server.
   *
   * @param next
   *   The next function to invoke after this function has finished.
   */
  const doConfigFormsUpdates = function() {
    formio.util.log('Checking for Config Forms updates.');

    let configFormsUpdates = {};
    configFormsUpdates = formio.hook.alter('getConfigFormsUpdates', configFormsUpdates);
    const updates = Object.keys(configFormsUpdates);

    // Skip updates if there are no  updates to apply.
    if (!updates.length) {
      formio.util.log(' > No config forms updates found.\n');
      return;
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
          throw err;
        }

        formio.util.log(' > Done applying pending config forms updates\n');
      });
  };
  /**
   * Initialized the update script.
   */
  const initialize = async function() {
    if (process.env.TEST_SUITE) {
      try {
        await connection();
        await checkFeatures();
        return db;
      }
      catch (err) {
        debug.db(err);
        throw err;
      }
    }

    try {
      getCA();
      getSSL();
      await connection();
      await checkSetup();
      checkEncryption();
      await checkFeatures();
      await getUpdates();
      await lock();
      doConfigFormsUpdates();
      await doUpdates();
      await unlock();
      return db;
    }
    catch (err) {
      try {
        await unlock();
        return db;
      }
      catch (ignoreErr) {
        // ignore unlock error, as database has already erred, so you probably can't unlock anyway
        debug.db(err);
        throw err;
      }
    }
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
