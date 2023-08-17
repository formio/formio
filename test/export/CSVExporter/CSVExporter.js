module.exports = function(app, template, hook) {
  const docker = process.env.DOCKER;
  const assert = require('assert');
  const Helper = require('../../helper')(app);
  let helper = null;
  const test = require('../../fixtures/forms/datetime-format.js');
  const testFile = require('../../fixtures/forms/fileComponent.js');
  const testTags = require('../../fixtures/forms/tagsWithDelimiter.js');
  const testRadio = require('../../fixtures/forms/radioComponent');
  const testAzureAddress= require('../../fixtures/forms/azureAddressComponent');
  const testGoogleAddress= require('../../fixtures/forms/googleAddressComponent');
  const testNominatimAddress= require('../../fixtures/forms/nominatimAddressComponent');

  function getComponentValue(exportedText, compKey, submissionIndex) {
    const rows = exportedText.split('\n');
    const headerRow = rows[0];
    const headings = headerRow.split(/,(?=")/);
    const compColIndex = headings.indexOf(`"${compKey}"`);
    const submissionRow = rows[submissionIndex + 1];
    const submissionRowValues = submissionRow.split(/,(?=")/);
    const compValue = submissionRowValues[compColIndex];
    console.log({
      rows,
      headerRow,
      headings,
      compColIndex,
      submissionRow,
      submissionRowValues,
      compValue
    });
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

            const addressLat = getComponentValue(result.text, 'address.lat', 0);
            const addressLng = getComponentValue(result.text, 'address.lng', 0);
            const addressName = getComponentValue(result.text, 'address.formatted', 0);

            const expectedAddressLat = '"35.68696"';
            const expectedAddressLng = '"139.74946"';
            const expectedAddressName = '"Tokyo, Kanto"';

            assert.strictEqual(addressLat, expectedAddressLat);
            assert.strictEqual(addressLng, expectedAddressLng);
            assert.strictEqual(addressName, expectedAddressName);
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

            const addressLat = getComponentValue(result.text, 'address.lat', 0);
            const addressLng = getComponentValue(result.text, 'address.lng', 0);
            const addressName = getComponentValue(result.text, 'address.formatted', 0);

            const expectedAddressLat = '"35.6761919"';
            const expectedAddressLng = '"139.6503106"';
            const expectedAddressName = '"Tokyo, Japan"';

            assert.strictEqual(addressLat, expectedAddressLat);
            assert.strictEqual(addressLng, expectedAddressLng);
            assert.strictEqual(addressName, expectedAddressName);
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

            const addressLat = getComponentValue(result.text, 'address.lat', 0);
            const addressLng = getComponentValue(result.text, 'address.lng', 0);
            const addressName = getComponentValue(result.text, 'address.formatted', 0);

            const expectedAddressLat = '"35.6840574"';
            const expectedAddressLng = '"139.7744912"';
            const expectedAddressName = '"Tokyo, Japan"';

            assert.strictEqual(addressLat, expectedAddressLat);
            assert.strictEqual(addressLng, expectedAddressLng);
            assert.strictEqual(addressName, expectedAddressName);
            done();
          });
        });
    });
  });
};
