'use strict';

module.exports = (router) => {
  return {
    import: require('./import')(router),
    export: require('./export')(router)
  };
};
