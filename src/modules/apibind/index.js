'use strict';

module.exports = {
  load: function(router, server) {

    // Create our Primus server for websocket communication.
    var primus = require('primus')(server, {transformer: 'websockets'});

    // Keep track of all connections.
    var client = null;
    var clientData = null;

    router.get('/testme', function(req, res, next) {
      if (client) {
        clientData = function(data) {
          res.json(data);
        };

        client.write({
          headers: req.headers,
          body: req.body,
          query: req.query
        });
      }
      else {
        res.json({error: 'Client not connected'});
      }
    });

    // Called when a connection has been made.
    primus.on('connection', function (spark) {
      client = spark;
      client.on('data', function(data) {
        if (clientData) {
          clientData(data);
        }
      });
    });
  }
};
