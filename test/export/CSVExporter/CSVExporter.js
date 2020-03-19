module.exports = function(app, template, hook) {
    var docker = process.env.DOCKER;
    var Helper = require('../../helper')(app);
    var helper = null;
    const test = require('../../fixtures/forms/datetime-format.js');

  describe('CSVExporter', () => {
      it('Sets up a default project', function(done) {
        let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
        helper = new Helper(owner);
          helper.project().user('user', 'user1').execute(done);
      });

      it (`Export works in case when format is not set`, (done) => {
        let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
        helper = new Helper(owner);
        helper.project().user('user', 'user1').execute(() => {
          helper
            .form('test', test.components)
            .execute(function(err) {
              if (err) {
                return done(err);
              }

              helper.getExport(helper.template.forms.test,'csv', function(error, result) {
                if (error) {
                  done(error);
                }
                if (helper.template.forms.test.components[0].components[0].format) {
                  done();
                }
              });
            });
        });
    })
  })
};