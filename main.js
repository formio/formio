'use strict';

/**
 * Run the server directly without an install process or welcome message.
 */
require('dotenv').load({silent: true});
const express = require('express');
const bodyParser = require('body-parser');
const Formio = require('./src/Formio');
const config = require('./src/config');
const cors = require('cors');

const app = express();
const db = require('./src/db')(config);

module.exports = new Promise((resolve, reject) => {
  // Only continue if the DB is initializing.
  if (!db) {
    return reject('Error: No database configured');
  }

  resolve(db.ready.then(() => {
    app.use(cors());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json({limit: '16mb'}));

    const formio = new Formio(app, db);

    app.listen(config.port);
    console.log('');
    console.log('Listening on port ' + config.port);

    return formio;
  }));
});


