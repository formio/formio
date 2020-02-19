import { Formio } from '../Formio';

const MONTH = 2678400000;

/**
 * Flush any deleted actions/forms/submissions/roles, etc from the database after a certain time.
 * @param app
 */
export default async (app: Formio) => {
  const period = parseInt(process.env.FLUSH_DELETE_PERIOD, 10) || MONTH;
  const timestamp = Date.now() - period;

  const query = {
    deleted: { $lt: timestamp },
  };

  const deletePromises = Object.keys(app.models)
    .map((modelName: string) => app.models[modelName].delete(query));

  return Promise.all(deletePromises);
};
