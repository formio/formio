'use strict';

const util = require('./src/util/util');

require('colors');
require('./server')().then(function(state) {
  util.log(` > Serving the Form.io API Platform on port ${String(state.config.port).green}`, );
  state.server.listen(state.config.port);
});
