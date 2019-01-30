'use strict';

require('dotenv').load({silent: true});
const express = require('express');
const bodyParser = require('body-parser');
const FormServer = require('./src/FormServer');
const config = require('./src/config');
const cors = require('cors');

const app = express();
const db = require('./src/db')(config);

// Only continue if the DB is initializing.
if (db) {
  app.use(cors());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json({limit: '16mb'}));

  const formio = new FormServer(app, db);

  app.listen(config.port);
  db.ready
    .then(() => {
      console.log('Listening on port ' + config.port);
    })
    .catch(err => {
      console.error(err);
    });
}
