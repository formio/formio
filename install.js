'use strict';

const inquirer = require('inquirer').default;
const async = require('async');
const fs = require('fs-extra');
const nunjucks = require('nunjucks');
nunjucks.configure([], {watch: false});
const util = require('./src/util/util');
const debug = require('debug')('formio:error');

module.exports = function(formio, items, done) {
  // The project that was created.
  let project = {};

  let templateFile = '';

  // All the steps in the installation.
  const steps = {
    /**
     * Select the template to use.
     *
     * @param done
     * @return {*}
     */
    whatTemplate: function(done) {
      if (process.env.ROOT_EMAIL) {
        templateFile = './default-template.json';
        return done();
      }

      let message = '\nWhich project template would you like to install?\n'.green;
      message += '\n   Please provide the local file path of the template file.'.yellow;
      message += '\n   Or, just press '.yellow + 'ENTER'.green + ' to use the default template.\n'.yellow;
      util.log(message);
      inquirer.prompt([
        {
          name: 'templateFile',
          message: 'Enter a local file path or press Enter for the default template.',
          default: './default-template.json',
          validate: function(input) {
            if (!input) {
              return 'Template file is not specified';
            }
            return true;
          },
        },
      ]).then((results) => {
        if (!results.templateFile) {
          return done('Cannot find the template file!'.red);
        }

        templateFile = results.templateFile;
        done();
      }).catch((err) => {
        done(err);
      });
    },

    /**
     * Import the template.
     * @param done
     */
    importTemplate: function(done) {
      if (!items.import) {
        return done();
      }

      // Determine if this is a custom project.
      if (!fs.existsSync(templateFile)) {
        util.log(templateFile);
        return done('Cannot find the template file!'.red);
      }

      let template = {};
      try {
        template = JSON.parse(fs.readFileSync(templateFile));
      }
      catch (err) {
        debug(err);
        return done(err);
      }

      // Get the form.io service.
      util.log('Importing template...'.green);
      const importer = require('./src/templates/import')({formio: formio});
      importer.template(template, function(err, template) {
        if (err) {
          return done(err);
        }

        project = template;
        done(null, template);
      });
    },

    /**
     * Create the root user object.
     *
     * @param done
     */
    createRootUser: function(done) {
      if (!items.user) {
        return done();
      }
      util.log('Creating root user account...'.green);
      inquirer.prompt([
        {
          name: 'email',
          message: 'Enter your email address for the root account.',
          when: function() {
            return process.env.ROOT_EMAIL ? false : true;
          },
          validate: function(input) {
            if (!input) {
              return 'Email is not specified';
            }
            const pattern = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
            if (!pattern.test(input)) {
              return 'Must be a valid email';
            }
            return true;
          },
        },
        {
          name: 'password',
          type: 'password',
          message: 'Enter your password for the root account.',
          when: function() {
            return process.env.ROOT_PASSWORD ? false : true;
          },
          validate: function(input) {
            if (!input) {
              return 'Password is not specified';
            }
            return true;
          },
        }
      ]).then(function(result) {
        util.log('Encrypting password');
        formio.encrypt(result.password, async function(err, hash) {
          if (err) {
            return done(err);
          }

          // Create the root user submission.
          util.log('Creating root user account');
          try {
            await formio.resources.submission.model.create({
              form: project.resources.admin._id,
              data: {
                email: result.email,
                password: hash
              },
              roles: [
                project.roles.administrator._id
              ]
            });
          return done();
          }
          catch (err) {
            return done(err);
          }
        });
      }).catch(function(err) {
        done(err);
      });
    }
  };

  util.log('Installing...');
  async.series([
    steps.whatTemplate,
    steps.importTemplate,
    steps.createRootUser
  ], function(err, result) {
    if (err) {
      util.log(err);
      return done(err);
    }

    util.log('Install successful!'.green);
    done();
  });
};
