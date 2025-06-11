module.exports = function (app, template, hook) {
  const docker = process.env.DOCKER;
  const assert = require('assert');
  const request = require('../../formio-supertest');
  const moment = require('moment-timezone');
  const Helper = require('../../helper')(app);
  let helper = null;
  const test = require('../../fixtures/forms/datetime-format.js');
  const testFile = require('../../fixtures/forms/fileComponent.js');
  const testTags = require('../../fixtures/forms/tagsWithDelimiter.js');
  const testRadio = require('../../fixtures/forms/radioComponent');
  const testFormWithReviewPage = require('../../fixtures/forms/formWithReviewPage.js');
  const testAzureAddress = require('../../fixtures/forms/azureAddressComponent');
  const testGoogleAddress = require('../../fixtures/forms/googleAddressComponent');
  const testNominatimAddress = require('../../fixtures/forms/nominatimAddressComponent');
  const testTimeDate = require('../../fixtures/forms/timeDateComponent.js');
  const wizardTest = require('../../fixtures/forms/wizardFormWithAdvancedConditions.js');
  const formWithLayoutComponents = require('../../fixtures/forms/formWithLayoutComponents.js');
  function getComponentValue(exportedText, compKey, submissionIndex) {
    const rows = exportedText.split('\n');
    const headerRow = rows[0];
    const headings = headerRow.split(/,(?=")/);
    const compColIndex = headings.indexOf(`"${compKey}"`);
    const submissionRow = rows[submissionIndex + 1];
    const submissionRowValues = submissionRow.split(/,(?=")/);
    const compValue = submissionRowValues[compColIndex];
    // console.log({
    //   rows,
    //   headerRow,
    //   headings,
    //   compColIndex,
    //   submissionRow,
    //   submissionRowValues,
    //   compValue
    // });
    return compValue;
  }

  describe('CSVExporter', () => {
    it('Sets up a default project', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().user('user', 'user1').execute(done);
    });

    it(`Export works in case when format is not set`, (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('test', test.components)
        .submission({ data: { dateTime: '2020-03-10T09:00:00.000Z' } })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.test, 'csv', (error, result) => {
            if (error) {
              done(error);
            }
            assert(!!result.text.split('\n')[1].split(',')[3], 'Date was not set');
            done();
          });
        });
    });

    it(`Test displaying File values`, (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('testFile', testFile.components)
        .submission({
          data: {
            file: [
              {
                name: 'myFilePrefix-sunil-naik-0eNs9-dO9jM-unsplash-91e11557-3e57-465f-acf7-2e6ae867f45b.jpg',
                originalName: 'sunil-naik-0eNs9-dO9jM-unsplash.jpg',
                size: 2752197,
                storage: 'base64',
                type: 'image/jpeg',
                url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
              },
              {
                name: 'myFilePrefix-szabolcs-toth-t6A2qw9gjAo-unsplash-e88df4aa-0de1-4f40-982c-12cf88974c51.jpg',
                originalName: 'szabolcs-toth-t6A2qw9gjAo-unsplash.jpg',
                size: 1296003,
                storage: 'base64',
                type: 'image/jpeg',
                url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAA',
              }
            ]
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.testFile, 'csv', (error, result) => {
            if (error) {
              done(error);
            }

            const fileValue = getComponentValue(result.text, 'file', 0);
            const expectedValue =
              '"myFilePrefix-sunil-naik-0eNs9-dO9jM-unsplash-91e11557-3e57-465f-acf7-2e6ae867f45b.jpg, ' +
              'myFilePrefix-szabolcs-toth-t6A2qw9gjAo-unsplash-e88df4aa-0de1-4f40-982c-12cf88974c51.jpg"';
            assert.strictEqual(fileValue, expectedValue);
            done();
          });
        });
    });

    it(`Test using Tags delimiter`, (done) => {
      let owner = (
        app.hasProjects || docker
      ) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('testTags', testTags.components)
        .submission({
          data: {
            tags: [
              'tag1', 'tag2', 'tag3',
            ],
          },
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.testTags, 'csv', (error, result) => {
            if (error) {
              done(error);
            }

            const tagsValue = getComponentValue(result.text, 'tags', 0);
            const expectedValue = '"tag1!tag2!tag3"';
            assert.strictEqual(tagsValue, expectedValue);
            done();
          });
        });
    });

    it(`Test displaying File values in Radio component`, (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('testRadio', testRadio.form1.components)
        .submission({
          data: {
            "radio": false
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.testRadio, 'csv', (error, result) => {
            if (error) {
              done(error);
            }

            const fileValue = getComponentValue(result.text, 'radio', 0);
            const expectedValue = '"false"';
            assert.strictEqual(fileValue, expectedValue);
            done();
          });
        });
    });

    it('Should not include Review Page in the CSV file', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('formWithReviewPage', testFormWithReviewPage.components)
        .submission({
          data: {
            number: 11,
            textField: 'test',
            submit: true
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.formWithReviewPage, 'csv', (error, result) => {
            if (error) {
              return done(error);
            }
            assert.strictEqual(result.text.split('\n')[0].includes('textField'), true);
            assert.strictEqual(result.text.split('\n')[0].includes('number'), true);
            assert.strictEqual(result.text.split('\n')[0].includes('reviewPage'), false);
            assert.strictEqual(result.text.split('\n')[0].includes('submit'), false);
            done();
          });
        })
    })

    it('Should export csv with conditional radio component', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('radioWithCondition', testRadio.form2.components)
        .submission({
          data: {
            select: [2]
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.radioWithCondition, 'csv', (error, result) => {
            if (error) {
              return done(error);
            }

            const fileValue = getComponentValue(result.text, 'radio', 0);
            assert.strictEqual(fileValue, undefined);
            done();
          });
        });
    });

    it('Should export csv for wizard forms', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form(wizardTest)
        .submission({
          data: {
            number: 2,
            textField: 'test',
            textArea: 'test New'
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.wizardTest, 'csv', (error, result) => {
            if (error) {
              return done(error);
            }
            assert.strictEqual(getComponentValue(result.text, 'number', 0), '"2"');
            assert.strictEqual(getComponentValue(result.text, 'textField', 0), '"test"');
            assert.strictEqual(getComponentValue(result.text, 'textArea', 0), '"test New"');
            done();
          });
        });
    });

    it('Should display data for Components inside the Layout Components', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('panelTest', wizardTest.components)
        .submission({
          data: {
            number: 2,
            textField: 'test Form',
            textArea: 'test Form New'
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.panelTest, 'csv', (error, result) => {
            if (error) {
              return done(error);
            }

            assert.strictEqual(helper.template.forms.panelTest.display, 'form');
            assert.strictEqual(getComponentValue(result.text, 'number', 0), '"2"');
            assert.strictEqual(getComponentValue(result.text, 'textField', 0), '"test Form"');
            assert.strictEqual(getComponentValue(result.text, 'textArea', 0), '"test Form New"');
            done();
          });
        });
    });

    it('Should correctly display paths for component inside layout components', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('layoutTest', formWithLayoutComponents.form.components)
        .submission(formWithLayoutComponents.submission)
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(helper.template.forms.layoutTest, 'csv', (error, result) => {
            if (error) {
              return done(error);
            }
            const rows = result.text.split('\n');
            const headerRow = rows[0];
            const headings = headerRow.split(/,(?=")/);
            assert.deepEqual(headings, [
              '"_id"',
              '"created"',
              '"modified"',
              '"id"',
              '"number"',
              '"firstName"',
              '"lastName"',
              '"age"',
              '"textArea"',
              '"email"',
              '"phoneNumber"',
              '"container.signature"'
            ]);
      
            done();
          });
        });
    });

    it(`Test Azure address data`, (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .form('testAzureAddress', testAzureAddress.components)
        .submission(testAzureAddress.submission)
        .execute((err) => {
          if (err) {
            return done(err);
          }

          helper.getExport(helper.template.forms.testAzureAddress, 'csv', (error, result) => {
            if (error) {
              done(error);
            }

            const addressLatWithMode = getComponentValue(result.text, 'addressWithMode.lat', 0);
            const addressLngWithMode = getComponentValue(result.text, 'addressWithMode.lng', 0);
            const addressNameWithMode = getComponentValue(result.text, 'addressWithMode.formatted', 0);

            const addressLat = getComponentValue(result.text, 'address.lat', 0);
            const addressLng = getComponentValue(result.text, 'address.lng', 0);
            const addressName = getComponentValue(result.text, 'address.formatted', 0);

            const expectedAddressLat = '"40.71305"';
            const expectedAddressLng = '"`-74.00723"';
            const expectedAddressName = '"New York, NY"';

            const expectedAddressLatWithMode = '"47.37319"';
            const expectedAddressLngWithMode = '"`-120.4237"';
            const expectedAddressNameWithMode = '"Washington"';

            assert.strictEqual(addressLat, expectedAddressLat);
            assert.strictEqual(addressLng, expectedAddressLng);
            assert.strictEqual(addressName, expectedAddressName);

            assert.strictEqual(addressLatWithMode, expectedAddressLatWithMode);
            assert.strictEqual(addressLngWithMode, expectedAddressLngWithMode);
            assert.strictEqual(addressNameWithMode, expectedAddressNameWithMode);

            done();
          });
        });
    });

    it(`Test Google address data`, (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .form('testGoogleAddress', testGoogleAddress.components)
        .submission(testGoogleAddress.submission)
        .execute((err) => {
          if (err) {
            return done(err);
          }

          helper.getExport(helper.template.forms.testGoogleAddress, 'csv', (error, result) => {
            if (error) {
              done(error);
            }

            const addressLatWithMode = getComponentValue(result.text, 'addressWithMode.lat', 0);
            const addressLngWithMode = getComponentValue(result.text, 'addressWithMode.lng', 0);
            const addressNameWithMode = getComponentValue(result.text, 'addressWithMode.formatted', 0);

            const addressLat = getComponentValue(result.text, 'address.lat', 0);
            const addressLng = getComponentValue(result.text, 'address.lng', 0);
            const addressName = getComponentValue(result.text, 'address.formatted', 0);

            const expectedAddressLat = '"40.7127753"';
            const expectedAddressLng = '"`-74.0059728"';
            const expectedAddressName = '"New York, NY, USA"';

            const expectedAddressLatWithMode = '"47.7510741"';
            const expectedAddressLngWithMode = '"`-120.7401386"';
            const expectedAddressNameWithMode = '"Washington, USA"';

            assert.strictEqual(addressLat, expectedAddressLat);
            assert.strictEqual(addressLng, expectedAddressLng);
            assert.strictEqual(addressName, expectedAddressName);

            assert.strictEqual(addressLatWithMode, expectedAddressLatWithMode);
            assert.strictEqual(addressLngWithMode, expectedAddressLngWithMode);
            assert.strictEqual(addressNameWithMode, expectedAddressNameWithMode);

            done();
          });
        });
    });

    it(`Test OpenStreetMap Nominatim address data`, (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .form('testNominatimAddress', testNominatimAddress.components)
        .submission(testNominatimAddress.submission)
        .execute((err) => {
          if (err) {
            return done(err);
          }

          helper.getExport(helper.template.forms.testNominatimAddress, 'csv', (error, result) => {
            if (error) {
              done(error);
            }

            const addressLatWithMode = getComponentValue(result.text, 'addressWithMode.lat', 0);
            const addressLngWithMode = getComponentValue(result.text, 'addressWithMode.lng', 0);
            const addressNameWithMode = getComponentValue(result.text, 'addressWithMode.formatted', 0);

            const addressLat = getComponentValue(result.text, 'address.lat', 0);
            const addressLng = getComponentValue(result.text, 'address.lng', 0);
            const addressName = getComponentValue(result.text, 'address.formatted', 0);

            const expectedAddressLat = '"40.7127281"';
            const expectedAddressLng = '"`-74.0060152"';
            const expectedAddressName = '"New York, United States"';

            const expectedAddressLatWithMode = '"47.2868352"';
            const expectedAddressLngWithMode = '"`-120.212613"';
            const expectedAddressNameWithMode = '"Washington, United States"';

            assert.strictEqual(addressLat, expectedAddressLat);
            assert.strictEqual(addressLng, expectedAddressLng);
            assert.strictEqual(addressName, expectedAddressName);

            assert.strictEqual(addressLatWithMode, expectedAddressLatWithMode);
            assert.strictEqual(addressLngWithMode, expectedAddressLngWithMode);
            assert.strictEqual(addressNameWithMode, expectedAddressNameWithMode);

            done();
          });
        });
    });

    it('Should export csv with date time component with display in timezone of submission', (done) => {
      const currentDate = moment().utc().seconds(0).milliseconds(0);
      const submissionDate = currentDate.format('YYYY-MM-DDTHH:mm:ssZ');
      const formattedDate = currentDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('testTimeDate', testTimeDate.formWithTimeDateWithSubmission.components)
        .submission({
          data: {
                dateTime: submissionDate
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          
          helper.getExport(helper.template.forms.testTimeDate, 'csv', (error, result) => {
            if (error) {
              return done(error);
            }
            const date = getComponentValue(result.text, 'dateTime', 0);
            assert.strictEqual(date, `"${formattedDate}"`);

            done();
          });
        });
    });

    it('Should export csv with date time component with display in timezone of submission in edit grid', (done) => {
      const currentDate = moment().utc().seconds(0).milliseconds(0);
      const submissionDate = currentDate.format('YYYY-MM-DDTHH:mm:ssZ');
      const formattedDate = currentDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper
        .project()
        .form('testTimeDateInEditGrid', testTimeDate.testDateTimeWithSubmissionInEditGrid.components)
        .submission({
          data: {
            editGrid: [
              {
                dateTime: submissionDate
              }
            ]
          }
        })
        .execute((err) => {
          if (err) {
            return done(err);
          }
          
          helper.getExport(helper.template.forms.testTimeDateInEditGrid, 'csv', (error, result) => {
            if (error) {
              return done(error);
            }
            const date = getComponentValue(result.text, 'editGrid.dateTime', 0);
            assert.strictEqual(date, `"${formattedDate}"`);

            done();
          });
        });
    });

  });

  describe('Nested form CSV export', () => {
    it('Sets up a default project', (done) => {
      let owner = (app.hasProjects || docker) ? template.formio.owner : template.users.admin;
      helper = new Helper(owner);
      helper.project().user('user', 'user1').execute(done);
    });

    let childForm, parentForm;
    const submission = {
      data: {
        form: {
          data: {
            name: 'Mary Jane',
            age: 23
          }
        }
      },
      state: 'submitted'
    };

    it('Build the forms', (done) => {
      helper.form('in', [
        {
          type: 'textfield',
          key: 'name',
          input: true,
        },
        {
          type: 'number',
          key: 'age',
          input: true,
        }
      ])
        .execute((err) => {
          if (err) {
            return done(err);
          }
          childForm = helper.template.forms.in;
          helper.form('out', [
            {
              tableView: true,
              form: childForm._id,
              useOriginalRevision: false,
              key: 'form',
              type: 'form',
              input: true
            }
          ])
            .execute((err) => {
              if (err) {
                return done(err);
              }
              parentForm = helper.template.forms.out;
              done();
            });
        });
    });

    it(`Test nested form data`, (done) => {
      helper
        .submission(submission)
        .execute((err) => {
          if (err) {
            return done(err);
          }
          helper.getExport(parentForm, 'csv', (error, result) => {
            if (error) {
              done(error);
            }

            const age = getComponentValue(result.text, 'form.age', 0);
            const name = getComponentValue(result.text, 'form.name', 0);

            assert.equal(age, '"23"');
            assert.equal(name, '"Mary Jane"');
            done();
          });
        });
    });

  });
};
