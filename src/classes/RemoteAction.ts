import { Action } from '@formio/api';
import * as request from 'request-promise-native';

export const remoteActionFactory = (config) => class RemoteAction extends Action {
  public static info() {
    return config.info;
  }

  public static settingsForm(options) {
    return super.settingsForm(options, config.settingsForm);
  }

  static get serverOnly() {
    return true;
  }

  public async resolve({handler, method, data, req, res}, setActionInfoMessage) {
    setActionInfoMessage('Starting remote action');

    const headers: any = {};
    if (config.actionsServerKey) {
      headers.authorization = `Bearer: ${config.actionsServerKey}`;
    }

    const reqMethod = config.method.toUpperCase() === 'USE' ? method : config.info.method;
    const response = await request({
      method: reqMethod,
      uri: config.url,
      json: true,
      headers,
      data: {
        method,
        handler,
        submission: data,
        context: {
          params: req.context.params,
          resources: req.context.resources,
        },
      },
    });

    // If response is an array, it is a set of results to apply.
    if (Array.isArray(response)) {
      response.forEach((item) => {
        // TODO: What do we do with the response?
        // console.log(item);
      });
    }

    return;
  }
};
