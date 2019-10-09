'use strict';

/**
 * Run the server directly without an install process or welcome message.
 */
require('dotenv').load({ silent: true });
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
import {Formio} from './src/Formio';
const config = require('./src/config');
const cors = require('cors');

const app = express();
import {init} from './src/init';

export const main = new Promise((resolve, reject) => {
  return init(config).then(([db, remoteActions]) => {
    // Only continue if the DB is initializing.
    if (!db) {
      return reject('Error: No database configured');
    }

    // Serve client app if it exists.
    app.use('/', express.static(path.join(__dirname, '/client/dist')));
    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: true, limit: config.maxBodySize }));
    app.use(bodyParser.json({ limit: config.maxBodySize }));

    const formio = new Formio(app, db, config, remoteActions || {});

    app.listen(config.port);
    console.log('');
    console.log(`Listening on port ${  config.port}`);

    return resolve(formio);
  });
});

