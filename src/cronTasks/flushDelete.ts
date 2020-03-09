import { Model } from '@formio/api';
import { Formio } from '../Formio';

const MONTH = 2678400000;

/**
 * Flush any deleted actions/forms/submissions/roles, etc from the database after a certain time.
 * @param app
 */
export default async (app: Formio) => {
  const contextModelName = process.env.CONTEXT_MODEL_NAME || '';

  const period = parseInt(process.env.FLUSH_DELETE_PERIOD, 10) || MONTH;
  const timestamp = Date.now() - period;

  const query = {
    deleted: { $lt: timestamp },
  };

  const models = getModels(app, contextModelName);
  const contextItems = await findItems(models.context);
  const globalDeletePromises = getDeletePromises(models.global, query, {});

  let commonDeletePromises: Array<Promise<any>> = [];
  if (!contextModelName || !contextItems.length) {
    // If there is not context items - delete items with empty context
    commonDeletePromises = getDeletePromises(models.common, query, {});
  } else {
    // Delete items with specified context
    contextItems.forEach(({_id}) => {
      const context = {};

      if (_id) {
        context[`${contextModelName}Id`] = _id.toString();
      }

      commonDeletePromises.push(
        ...getDeletePromises(models.common, query, context),
      );
    });
  }

  return Promise.all([
    ...globalDeletePromises,
    ...commonDeletePromises,
  ]);
};

const getModels = (app: Formio, contextModelName: string) => {
  const models = {
    context: null,
    common: [],
    global: [],
  };

  Object.keys(app.models).forEach((modelName: string) => {
    const model: Model = app.models[modelName];

    if (model.schema.name === contextModelName) {
      models.context = model;
    }

    if (model.schema.global) {
      models.global.push(model);
    } else {
      models.common.push(model);
    }
  });

  return models;
};

const findItems = async (model: Model): Promise<any[]> => {
  if (!model) {
    return [];
  }

  return model.find({});
};

const getDeletePromises = (
  models: Model[],
  query = {},
  context = {},
): Array<Promise<any>> => models.map((model: Model) => model.delete(query, context, {force: true}));
