'use strict';

var prompt = require('prompt');
var async = require('async');
var fs = require('fs-extra');
var _ = require('lodash');
var nunjucks = require('nunjucks');
nunjucks.configure([], {watch: false});
var util = require('./src/util/util');
var debug = require('debug')('formio:error');
var path = require('path');

module.exports = function(formio, items, done) {
  // The project that was created.
  var project = {};

  // The directory for the client application.
  var directories = {
    client: path.join(__dirname, 'client'),
    app: path.join(__dirname, 'app')
  };

  // The application they wish to install.
  var application = '';
  var templateFile = '';

  /**
   * Download a zip file.
   *
   * @param url
   * @param zipFile
   * @param dir
   * @param done
   * @returns {*}
   */
  var download = function(url, zipFile, dir, done) {
    // Check to see if the client already exists.
    if (fs.existsSync(zipFile)) {
      util.log(directories[dir] + ' file already exists, skipping download.');
      return done();
    }

    var request = require('request');
    var ProgressBar = require('progress');
    util.log('Downloading ' + dir + '...'.green);

    // Download the project.
    var downloadError = null;
    var tries = 0;
    var bar = null;
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
  var extract = function(zipFile, fromDir, dir, done) {
    // See if we need to extract.
    if (fs.existsSync(directories[dir])) {
      util.log(directories[dir] + ' already exists, skipping extraction.');
      return done();
    }

    // Unzip the contents.
    var AdmZip = require('adm-zip');
    util.log('Extracting contents...'.green);
    var zip = new AdmZip(zipFile);
    zip.extractAllTo('', true);
    fs.move(fromDir, directories[dir], function(err) {
      if (err) {
        return done(err);
      }

      // Delete the zip file.
      fs.remove(zipFile);

      // Get the package json file.
      var info = {};
      try {
        info = JSON.parse(fs.readFileSync(path.join(directories[dir], 'package.json')));
      }
      catch (err) {
        debug(err);
        return done(err);
      }

      // Set local variable to directory path.
      var directoryPath = directories[dir];

      // Change the document root if we need to.
      if (info.formio && info.formio.docRoot) {
        directoryPath = path.join(directories[dir], info.formio.docRoot);
      }

      if (!fs.existsSync(path.join(directoryPath, 'config.template.js'))) {
        return done('Missing config.template.js file');
      }

      // Change the project configuration.
      var config = fs.readFileSync(path.join(directoryPath, 'config.template.js'));
      var newConfig = nunjucks.renderString(config.toString(), {
        domain: formio.config.domain ? formio.config.domain : 'https://form.io'
      });
      fs.writeFileSync(path.join(directoryPath, 'config.js'), newConfig);
      done();
    });
  };

  // All the steps in the installation.
  var steps = {
    /**
     * Step to perform the are you sure step.
     *
     * @param done
     */
    areYouSure: function(done) {
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

    // Allow them to select the application.
    whatApp: function(done) {
      var repos = [
        'None',
        'https://github.com/formio/formio-app-humanresources',
        'https://github.com/formio/formio-app-servicetracker',
        'https://github.com/formio/formio-app-todo',
        'https://github.com/formio/formio-app-salesquote',
        'https://github.com/formio/formio-app-basic'
      ];
      var message = '\nWhich Github application would you like to install?\n'.green;
      _.each(repos, function(repo, index) {
        message += '  ' + (index + 1) + '.) ' + repo + '\n';
      });
      message += '\nOr, you can provide a custom Github repository...\n'.green;
      util.log(message);
      prompt.get([
        {
          name: 'app',
          description: 'GitHub repository or selection?',
          default: '1',
          required: true
        }
      ], function(err, results) {
        if (err) {
          return done(err);
        }

        if (results.app.indexOf('https://github.com/') !== -1) {
          application = results.app;
        }
        else {
          var selection = parseInt(results.app, 10);
          if (_.isNumber(selection)) {
            if ((selection > 1) && (selection <= repos.length)) {
              application = repos[selection - 1];
            }
          }
        }

        // Replace github.com url.
        application = application.replace('https://github.com/', '');
        done();
      });
    },

    /**
     * Download the application.
     *
     * @param done
     * @returns {*}
     */
    downloadApp: function(done) {
      if (!application) {
        return done();
      }

      // Download the app.
      download(
        'https://nodeload.github.com/' + application + '/zip/master',
        'app.zip',
        'app',
        done
      );
    },

    /**
     * Extract the application to the app folder.
     *
     * @param done
     * @returns {*}
     */
    extractApp: function(done) {
      if (!application) {
        return done();
      }

      var parts = application.split('/');
      var appDir = parts[1] + '-master';
      extract('app.zip', appDir, 'app', done);
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

      var message = '\nWhich project template would you like to install?\n'.green;
      message += '\n   Please provide the local file path of the project.json file.'.yellow;
      message += '\n   Or, just press '.yellow + 'ENTER'.green + ' to use the default template.\n'.yellow;
      util.log(message);
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
      var customProject = (['app', 'client'].indexOf(templateFile) === -1);
      var directoryPath = '';

      if (!customProject) {
        directoryPath = directories[templateFile];
        // Get the package json file.
        var info = {};
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

      var projectJson = customProject ? templateFile : path.join(directoryPath, 'project.json');
      if (!fs.existsSync(projectJson)) {
        util.log(projectJson);
        return done('Missing project.json file'.red);
      }

      var template = {};
      try {
        template = JSON.parse(fs.readFileSync(projectJson));
      }
      catch (err) {
        debug(err);
        return done(err);
      }

      // Get the form.io service.
      util.log('Importing template...'.green);
      var importer = require('./src/templates/import')({formio: formio});
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

        util.log('Encrypting password');
        formio.encrypt(result.password, function(err, hash) {
          if (err) {
            return done(err);
          }

          // Create the root user submission.
          util.log('Creating root user account');
          formio.resources.submission.model.create({
            form: project.resources.admin._id,
            data: {
              email: result.email,
              password: hash
            },
            roles: [
              project.roles.administrator._id
            ]
          }, function(err, item) {
            if (err) {
              return done(err);
            }

            done();
          });
        });
      });
    }
  };

  util.log('Installing...');
  prompt.start();
  async.series([
    steps.areYouSure,
    steps.whatApp,
    steps.downloadApp,
    steps.extractApp,
    steps.downloadClient,
    steps.extractClient,
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
