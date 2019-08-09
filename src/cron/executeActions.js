'use strict';

/**
 * Trigger any actions that were initiated remotely and need to be run.
 **/
module.exports = async (app) => {
  const actionItems = await app.models.ActionItem.find({
    state: 'new',
    attempts: { $lt: 3 },
  });

  return Promise.all(
    actionItems.map(async actionItem => {
      try {
        await app.executeAction(actionItem, { uuid: `cron-${actionItem._id}` }, {});
      }
      catch (err) {
        actionItem.attempts++;

        if (actionItem.attempts >= 3) {
          // eslint-disable-next-line require-atomic-updates
          actionItem.state = 'error';
        }

        await app.models.ActionItem.update(actionItem);
      }
    })
  );
};
