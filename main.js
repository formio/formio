'use strict';

const util = require('./src/util/util');
require('colors');
require('./server')().then(function(state) {
  util.log(` > Serving the Form.io API Platform at ${state.config.domain.green}`);
  const hook = require('./src/util/hook')(state.server.formio);
  hook.alter('configFormio', util.Formio);
  state.server.listen(state.config.port);
});
