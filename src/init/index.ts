import {db} from './db';
import {actions} from './remoteActions';

export const init = (config) => Promise.all([
  db(config),
  actions(config),
]);
