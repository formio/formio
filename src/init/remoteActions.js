'use strict';

const request = require('request-promise-native');
const remoteActionFactory = require('../classes/RemoteAction');

module.exports = async config => {
  const response = {
    actions: {},
    groups: {},
  };

  if (!config.actionsServer) {
    return response;
  }
  console.log('Fetching actions from action server', config.actionsServer);
  const headers = {};
  if (config.actionsServerKey) {
    headers.authorization = `Bearer: ${config.actionsServerKey}`;
  }

  try {
    const { actions } = await request({
      uri: `${config.actionsServer}`,
      json: true,
      headers,
    });

    // Create remote action classes for the actions.
    for (const name in actions) {
      const action = actions[name];
      // If they don't provide a URL, set it to the config url plus action name.
      if (!action.url) {
        action.url = `${config.actionsUrl}/actions/${name}`;
      }
      response.actions[name] = remoteActionFactory(action);
    }
    console.log(` > Fetched ${Object.keys(actions).length} actions`);
  }
  catch (err) {
    console.log(' > Failed to fetch actions', err);
  }

  return response;
};
