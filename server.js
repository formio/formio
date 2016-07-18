'use strict';

/**
 * This is the Form.io application server.
 */
var express = require('express');
var config = require('config');
var nunjucks = require('nunjucks');
var fs = require('fs-extra');
var util = require('./src/util/util');
require('colors');
var Q = require('q');
var test = process.env.TEST_SUITE;

module.exports = function() {
  var q = Q.defer();

  util.log('');
  var rl = require('readline').createInterface({
    input: require('fs').createReadStream('logo.txt')
  });

  rl.on('line', function(line) {
    util.log(
      line.substring(0,4) +
      line.substring(4, 30).cyan.bold +
      line.substring(30, 33) +
      line.substring(33, 42).green.bold +
      line.substring(42)
    );
  });

  rl.on('close', function() {
    // Print the welcome screen.
    util.log('');
    util.log(fs.readFileSync('welcome.txt').toString().green);
  });

  // Get the express application.
  var server = express();

  // Configure nunjucks.
  nunjucks.configure('client', {
    autoescape: true,
    express: server
  });

  // Mount the client application.
  server.use('/', express.static(__dirname + '/client/dist'));

  // Load the form.io server.
  var formioServer = require('./index')(config);
  server.use(formioServer.formio.middleware.restrictRequestTypes);
  formioServer.init().then(function(formio) {
    // Called when we are ready to start the server.
    var start = function() {
      // Start the application.
      if (fs.existsSync('app')) {
        var app = express();
        app.use('/', express.static(__dirname + '/app/dist'));
        config.appPort = config.appPort || 8080;
        app.listen(config.appPort);
        var appHost = 'http://localhost:' + config.appPort;
        util.log(' > Serving application at ' + appHost.green);
      }

      // Mount the Form.io API platform at /api.
      server.use('/', formioServer);

      // Allow tests access server internals.
      server.formio = formio;
      server._server = formioServer;

      // Listen on the configured port.
      return q.resolve({
        server: server,
        config: config
      });
      //util.log(' > Serving the Form.io API Platform at ' + config.domain.green);
      //server.listen(config.port);
    };

    // Which items should be installed.
    var install = {
      download: false,
      extract: false,
      import: false,
      user: false
    };

    // Check for the client folder.
    if (!fs.existsSync('client') && !test) {
      install.download = true;
      install.extract = true;
    }

    // See if they have any forms available.
    formio.db.collection('forms').count(function(err, numForms) {
      // If there are forms, then go ahead and start the server.
      if ((!err && numForms > 0) || test) {
        if (!install.download && !install.extract) {
          return start();
        }
      }

      // Import the project and create the user.
      install.import = true;
      install.user = true;

      // Install.
      require('./install')(formio, install, function(err) {
        if (err) {
          return util.log(err.message);
        }

        // Start the server.
        start();
      });
    });
  });

  return q.promise;
};
