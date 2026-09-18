'use strict';

const inquirer = require('inquirer').default;
const async = require('async');
const fs = require('fs-extra');
const nunjucks = require('nunjucks');
nunjucks.configure([], { watch: false });
const { logger } = require('./src/util/logger');
const installLogger = logger.child({ module: 'formio:install' });

module.exports = function (formio, items, done) {
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
    whatTemplate: function (done) {
      if (process.env.ROOT_EMAIL) {
        templateFile = './default-template.json';
        return done();
      }

      let message = '\nWhich project template would you like to install?\n'.green;
      message += '\n   Please provide the local file path of the template file.'.yellow;
      message +=
        '\n   Or, just press '.yellow + 'ENTER'.green + ' to use the default template.\n'.yellow;
      installLogger.info(message);
      inquirer
        .prompt([
          {
            name: 'templateFile',
            message: 'Enter a local file path or press Enter for the default template.',
            default: './default-template.json',
            validate: function (input) {
              if (!input) {
                return 'Template file is not specified';
              }
              return true;
            },
          },
        ])
        .then((results) => {
          if (!results.templateFile) {
            return done('Cannot find the template file!'.red);
          }

          templateFile = results.templateFile;
          done();
        })
        .catch((err) => {
          done(err);
        });
    },

    /**
     * Import the template.
     * @param done
     */
    importTemplate: function (done) {
      if (!items.import) {
        return done();
      }

      if (!fs.existsSync(templateFile)) {
        installLogger.info(templateFile);
        return done('Cannot find the template file!'.red);
      }

      let template = {};
      try {
        template = JSON.parse(fs.readFileSync(templateFile));
      } catch (err) {
        installLogger.error(err);
        return done(err);
      }

      // Get the form.io service.
      installLogger.info('Importing template');
      const importer = require('./src/templates/import')({ formio: formio });
      importer.template(template, function (err, template) {
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
    createRootUser: function (done) {
      if (!items.user) {
        return done();
      }
      installLogger.info('Creating root user account');
      inquirer
        .prompt([
          {
            name: 'email',
            message: 'Enter your email address for the root account.',
            when: function () {
              return process.env.ROOT_EMAIL ? false : true;
            },
            validate: function (input) {
              if (!input) {
                return 'Email is not specified';
              }
              const pattern =
                /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
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
            when: function () {
              return process.env.ROOT_PASSWORD ? false : true;
            },
            validate: function (input) {
              if (!input) {
                return 'Password is not specified';
              }
              return true;
            },
          },
        ])
        .then(function (result) {
          installLogger.info('Encrypting password');
          formio.encrypt(result.password || process.env.ROOT_PASSWORD, async function (err, hash) {
            if (err) {
              return done(err);
            }

            // Create the root user submission.
            installLogger.info('Creating root user account');
            try {
              await formio.resources.submission.model.create({
                form: project.resources.admin._id,
                data: {
                  email: result.email || process.env.ROOT_EMAIL,
                  password: hash,
                },
                roles: [project.roles.administrator._id],
              });
              return done();
            } catch (err) {
              return done(err);
            }
          });
        })
        .catch(function (err) {
          done(err);
        });
    },
  };

  installLogger.info('Installing...');
  async.series([steps.whatTemplate, steps.importTemplate, steps.createRootUser], function (err) {
    if (err) {
      installLogger.error(err);
      return done(err);
    }

    installLogger.info('Install successful!');
    done();
  });
};
