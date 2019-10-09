import { CronJob } from 'cron';

export const cron = (app, cronTasks) => {
  return new CronJob(app.config.cronTime, () => {
    Object.keys(cronTasks).forEach((task) => cronTasks[task](app));
  }, null, true);
};
