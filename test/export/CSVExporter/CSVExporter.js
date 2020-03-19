module.exports = function(app, template, hook) {
  const docker = process.env.DOCKER;
  const Helper = require('../../helper')(app);
  let helper = null;
  const test = require('../../fixtures/forms/datetime-format.js');

  describe('CSVExporter', () => {
    it('Sets up a default project', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
        helper.project().user('user', 'user1').execute(done);
    });

    it (`Export works in case when format is not set`, (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('test', test.components)
        .submission({data: {dateTime: '2020-03-10T09:00:00.000Z'}})
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.test,'csv', (error, result) => {
            if (error) {
              done(error);
            }
            if (result.text.split('\n')[1].split(',')[3]) {
              done();
            }
          });
        });
    })
  })
};