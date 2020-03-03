import {db} from './db';

export { db };
export const init = (config) => Promise.all([
  db(config),
]);
