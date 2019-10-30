import {db} from './db';
import {remoteActions} from './remoteActions';

export { db, remoteActions };
export const init = (config) => Promise.all([
  db(config),
  remoteActions(config),
]);
