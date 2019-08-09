'use strict';

const request = require('request-promise-native');
const remoteActionFactory = require('../classes/RemoteAction');

module.exports = async config => {
  if (!config.actionsUrl) {
    return {};
  }

  const { actions } = await request({
    uri: config.actionsUrl,
    json: true,
  });

  // Create remote action classes for the actions.
  const response = {};
  for (const name in actions) {
    // If they don't provide a URL, set it to the config url plus action name.
    if (!actions[name].url) {
      actions[name].url = `${config.actionsUrl}/${name}`;
    }
    response[name] = remoteActionFactory(actions[name]);
  }

  return actions;
};
