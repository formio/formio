const { CronJob } = require('cron');
const config = require('./config');


module.exports = (app, cronTasks) => {
  new CronJob(config.cronTime, () => {
    Object.keys(cronTasks).forEach(task => cronTasks[task](app));
  }, null, true);
};
