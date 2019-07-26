'use strict';

const { CronJob } = require('cron');

module.exports = (app, cronTasks) => {
  return new CronJob(app.config.cronTime, () => {
    Object.keys(cronTasks).forEach(task => cronTasks[task](app));
  }, null, true);
};
