'use strict';

const fs = require('fs-extra');
const path = require('path');
const request = require('request');
const prompt = require('prompt');
const async = require('async');
const _ = require('lodash');
const nunjucks = require('nunjucks');
nunjucks.configure([], {watch: false});
const debug = require('debug')('formio:error');
const ProgressBar = require('progress');
const AdmZip = require('adm-zip');

module.exports = function(formio, items, done) {
  // The project that was created.
  let project = {};

  // The directory for the client application.
  const directories = {
    client: path.join(__dirname, 'client'),
    app: path.join(__dirname, 'app')
  };

  // The application they wish to install.
  let application = '';
  let templateFile = '';

  /**
   * Download a zip file.
   *
   * @param url
   * @param zipFile
   * @param dir
   * @param done
   * @returns {*}
   */
  const download = function(url, zipFile, dir, done) {
    // Check to see if the client already exists.
    if (fs.existsSync(zipFile)) {
      console.log(`${directories[dir]} file already exists, skipping download.`);
      return done();
    }

    console.log(`Downloading ${dir}${'...'.green}`);

    // Download the project.
    let downloadError = null;
    let tries = 0;
    let bar = null;
    (function downloadProject() {
      request.get(url)
        .on('response', function(res) {
          if (
            !res.headers.hasOwnProperty('content-disposition') ||
            !parseInt(res.headers['content-length'], 10)
          ) {
            if (tries++ > 3) {
              return done('Unable to download project. Please try again.');
            }

            setTimeout(downloadProject, 200);
            return;
          }

          // Setup the progress bar.
          bar = new ProgressBar('  downloading [:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 50,
            total: parseInt(res.headers['content-length'], 10)
          });

          res.pipe(fs.createWriteStream(zipFile, {
            flags: 'w'
          }));
          res.on('data', function(chunk) {
            if (bar) {
              bar.tick(chunk.length);
            }
          });
          res.on('error', function(err) {
            downloadError = err;
          });
          res.on('end', function() {
            setTimeout(function() {
              done(downloadError);
            }, 100);
          });
        });
    })();
  };

  /**
   * Extract a download to a folder.
   *
   * @param zipFile
   * @param fromDir
   * @param dir
   * @param done
   * @returns {*}
   */
  const extract = function(zipFile, fromDir, dir, done) {
    // See if we need to extract.
    if (fs.existsSync(directories[dir])) {
      console.log(`${directories[dir]} already exists, skipping extraction.`);
      return done();
    }

    // Unzip the contents.
    console.log('Extracting contents...'.green);
    const zip = new AdmZip(zipFile);
    zip.extractAllTo('', true);
    fs.move(fromDir, directories[dir], function(err) {
      if (err) {
        return done(err);
      }

      // Delete the zip file.
      fs.remove(zipFile);

      // Get the package json file.
      let info = {};
      try {
        info = JSON.parse(fs.readFileSync(path.join(directories[dir], 'package.json')));
      }
      catch (err) {
        debug(err);
        return done(err);
      }

      // Set local variable to directory path.
      let directoryPath = directories[dir];

      // Change the document root if we need to.
      if (info.formio && info.formio.docRoot) {
        directoryPath = path.join(directories[dir], info.formio.docRoot);
      }

      if (!fs.existsSync(path.join(directoryPath, 'config.template.js'))) {
        return done('Missing config.template.js file');
      }

      // Change the project configuration.
      const config = fs.readFileSync(path.join(directoryPath, 'config.template.js'));
      const newConfig = nunjucks.renderString(config.toString(), {
        domain: formio.config.domain ? formio.config.domain : `http://localhost:${formio.config.port}`
      });
      fs.writeFileSync(path.join(directoryPath, 'config.js'), newConfig);
      done();
    });
  };

  // All the steps in the installation.
  const steps = {
    /**
     * Step to perform the are you sure step.
     *
     * @param done
     */
    areYouSure: function(done) {
      if (process.env.ROOT_USER) {
        done();
      }
      prompt.get([
        {
          name: 'install',
          description: 'Are you sure you wish to install? (y/N)',
          required: true
        }
      ], function(err, results) {
        if (err) {
          return done(err);
        }
        if (results.install.toLowerCase() !== 'y') {
          return done('Installation canceled.');
        }

        done();
      });
    },

    /**
     * Download the Form.io admin client.
     *
     * @param done
     * @returns {*}
     */
    downloadClient: function(done) {
      if (!items.download) {
        return done();
      }

      // Download the client.
      download(
        'https://nodeload.github.com/formio/formio-app-formio/zip/master',
        'client.zip',
        'client',
        done
      );
    },

    /**
     * Extract the client.
     *
     * @param done
     * @returns {*}
     */
    extractClient: function(done) {
      if (!items.extract) {
        return done();
      }

      extract('client.zip', 'formio-app-formio-master', 'client', done);
    },

    /**
     * Select the template to use.
     *
     * @param done
     * @return {*}
     */
    whatTemplate: function(done) {
      if (application) {
        templateFile = 'app';
        return done();
      }
      if (process.env.ROOT_USER) {
        templateFile = 'client';
        done();
      }

      let message = '\nWhich project template would you like to install?\n'.green;
      message += '\n   Please provide the local file path of the project.json file.'.yellow;
      message += '\n   Or, just press '.yellow + 'ENTER'.green + ' to use the default template.\n'.yellow;
      console.log(message);
      prompt.get([
        {
          name: 'templateFile',
          description: 'Local file path or just press Enter for default.',
          default: 'client',
          required: true
        }
      ], function(err, results) {
        if (err) {
          return done(err);
        }

        templateFile = results.templateFile ? results.templateFile : 'client';
        done();
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
      const customProject = (['app', 'client'].indexOf(templateFile) === -1);
      let directoryPath = '';

      if (!customProject) {
        directoryPath = directories[templateFile];
        // Get the package json file.
        let info = {};
        try {
          info = JSON.parse(fs.readFileSync(path.join(directoryPath, 'package.json')));
        }
        catch (err) {
          debug(err);
          return done(err);
        }

        // Change the document root if we need to.
        if (info.formio && info.formio.docRoot) {
          directoryPath = path.join(directoryPath, info.formio.docRoot);
        }
      }

      const projectJson = customProject ? templateFile : path.join(directoryPath, 'project.json');
      if (!fs.existsSync(projectJson)) {
        console.log(projectJson);
        return done('Missing project.json file'.red);
      }

      let template = {};
      try {
        template = JSON.parse(fs.readFileSync(projectJson));
      }
      catch (err) {
        debug(err);
        return done(err);
      }

      // Save template for later.
      project = template;

      // Get the form.io service.
      console.log('Importing template...'.green);
      formio.importTemplate(template)
        .then(done)
        .catch(done);
    },

    /**
     * Create the root user object.
     *
     * @param done
     */
    createRootUser: function(done) {
      if (process.env.ROOT_USER) {
        prompt.override = {
          email: process.env.ROOT_EMAIL,
          password: process.env.ROOT_PASSWORD
        };
      }
      if (!items.user) {
        return done();
      }
      console.log('Creating root user account...'.green);
      prompt.get([
        {
          name: 'email',
          description: 'Enter your email address for the root account.',
          pattern: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
          message: 'Must be a valid email',
          required: true
        },
        {
          name: 'password',
          description: 'Enter your password for the root account.',
          require: true,
          hidden: true
        }
      ], function(err, result) {
        if (err) {
          return done(err);
        }

        // Find admin resource
        console.log('Finding admin resource');
        formio.models.Form.findOne({
          name: 'admin',
          type: 'resource',
        })
          .then(adminForm => {
            formio.models.Role.findOne({
              admin: true,
            })
              .then(adminRole => {
                console.log('Encrypting password');
                formio.encrypt(result.password)
                  .then((hash) => {
                    // Create the root user submission.
                    console.log('Creating root user account');
                    return formio.models.Submission.create({
                      form: formio.db.toID(adminForm._id),
                      data: {
                        email: result.email,
                        password: hash
                      },
                      roles: [
                        adminRole._id
                      ]
                    });
                  })
                  .then(() => done())
                  .catch(done);
              });
          });
      });
    }
  };

  console.log('Installing...');
  prompt.start();
  async.series([
    steps.areYouSure,
    steps.downloadClient,
    steps.extractClient,
    steps.whatTemplate,
    steps.importTemplate,
    steps.createRootUser
  ], function(err, result) {
    if (err) {
      console.log(err);
      return done(err);
    }

    console.log('Install successful!'.green);
    done();
  });
};
