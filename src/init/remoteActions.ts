import * as request from 'request-promise-native';
import {remoteActionFactory} from '../classes/RemoteAction';
import {log} from '../log';

export const remoteActions = async (config) => {
  const response = {
    actions: {},
    groups: {},
  };

  if (!config.actionsServer) {
    return response;
  }
  log('log', 'Fetching actions from action server', config.actionsServer);
  const headers: any = {};
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
    for (const name of Object.keys(actions)) {
      const action = actions[name];
      // If they don't provide a URL, set it to the config url plus action name.
      if (!action.url) {
        action.url = `${config.actionsUrl}/actions/${name}`;
      }
      response.actions[name] = remoteActionFactory(action);
    }
    log('log', ` > Fetched ${Object.keys(actions).length} actions`);
  }
  catch (err) {
    log('log', ' > Failed to fetch actions', err);
  }

  return response;
};
