/* eslint-env mocha */
'use strict';

const request = require('./formio-supertest');
const assert = require('assert');
const _ = require('lodash');

module.exports = function (app, template, hook) {
  // Local request helpers: tenant-aware url, carry + refresh the admin token,
  // assert the status, and hand back the response body.
  const url = (path) => hook.alter('url', path, template);
  const token = () => template.users.admin.token;
  const body = (res) => {
    template.users.admin.token = res.headers['x-jwt-token'] || token();
    return res.body;
  };
  const post = async (path, payload, status = 201) =>
    body(
      await request(app).post(url(path)).set('x-jwt-token', token()).send(payload).expect(status),
    );
  const put = async (path, payload, status = 200) =>
    body(
      await request(app).put(url(path)).set('x-jwt-token', token()).send(payload).expect(status),
    );
  const patch = async (path, payload, status = 200) =>
    body(
      await request(app).patch(url(path)).set('x-jwt-token', token()).send(payload).expect(status),
    );
  const get = async (path, status = 200) =>
    body(await request(app).get(url(path)).set('x-jwt-token', token()).expect(status));
  // Resolve through the alter so this suite also runs under formio-server,
  // where the formio object is nested one level deeper.
  const submissionModel = () => hook.alter('formio', app.formio).resources.submission.model;
  const formModel = () => hook.alter('formio', app.formio).resources.form.model;

  describe('Protected Fields', function () {
    const createdFormIds = [];
    const createForm = async (payload) => {
      const form = await post('/form', payload);
      createdFormIds.push(form._id);
      return form;
    };

    after('remove the forms and submissions created by this suite', async () => {
      await submissionModel().deleteMany({ form: { $in: createdFormIds } });
      await formModel().deleteMany({ _id: { $in: createdFormIds } });
    });

    // Pure-function coverage for the shared enumerator: given a form's components,
    // getProtectedFieldsPaths returns the data-path templates redaction acts on.
    // Reuses the same fixtures the response-redaction tests below use.
    describe('getProtectedFieldsPaths', function () {
      const util = require('../src/util/util');

      it('returns the protected path for every grid type, carrying a row index', function () {
        const { components } = require('./fixtures/forms/protected/protectedGrids');
        assert.deepStrictEqual(util.getProtectedFieldsPaths(components), [
          'dataGrid[0].protected_datagrid',
          'editGrid[0].protected_editgrid',
          'dataTable[0].protected_datatable',
        ]);
      });

      it('returns protected paths nested in layout components, with no layout segment', function () {
        const { components } = require('./fixtures/forms/protected/protectedLayout');
        assert.deepStrictEqual(util.getProtectedFieldsPaths(components), [
          'protected_root',
          'protected_columns_0',
          'protected_columns_1',
          'protected_fieldset',
          'protected_panel',
          'protected_table_0',
          'protected_table_1',
          'protected_tabs_1',
          'protected_tabs_2',
          'protected_well',
        ]);
      });

      it('returns a wildcard entry path for a protected datamap sub-field', function () {
        const { components } = require('./fixtures/forms/protected/protectedDataMap');
        assert.deepStrictEqual(util.getProtectedFieldsPaths(components), ['dataMap.*.ssn']);
      });
    });

    describe('Layout components', function () {
      const {
        components,
        submission,
        expected,
      } = require('./fixtures/forms/protected/protectedLayout');

      before('create a form with protected fields in every layout component', async function () {
        this.formId = (
          await createForm({
            title: 'Protected Layout',
            name: 'protectedLayout',
            path: 'protectedlayout',
            type: 'form',
            components,
          })
        )._id;
      });

      it('removes protected fields from the create response', async function () {
        const created = await post(`/form/${this.formId}/submission`, { data: submission });
        this.submissionId = created._id;
        assert.deepStrictEqual(created.data, expected);
      });

      it('removes protected fields from the get response', async function () {
        const fetched = await get(`/form/${this.formId}/submission/${this.submissionId}`);
        assert.deepStrictEqual(fetched.data, expected);
      });

      it('removes protected fields from the index response', async function () {
        const list = await get(`/form/${this.formId}/submission`);
        const found = list.find((item) => item._id === this.submissionId);
        assert.ok(found, 'created submission should be in the index response');
        assert.deepStrictEqual(found.data, expected);
      });

      // The update/patch tests below modify a field nested in a panel — so they run after the reads above.
      it('removes a protected field nested in a layout component from the update response', async function () {
        const publicValue = 'updated';
        const updated = await put(`/form/${this.formId}/submission/${this.submissionId}`, {
          data: { ...submission, public_panel: publicValue, protected_panel: 'updated-secret' },
        });
        assert.strictEqual(
          updated.data.protected_panel,
          undefined,
          'modified protected field must not be returned',
        );
        assert.deepStrictEqual(updated.data, { ...expected, public_panel: publicValue });
      });

      it('removes a protected field nested in a layout component from the patch response even when modified', async function () {
        const publicValue = 'patched';
        const patched = await patch(`/form/${this.formId}/submission/${this.submissionId}`, [
          { op: 'replace', path: '/data/public_panel', value: publicValue },
          // The patch base is the RAW submission, so the protected field is present
          // and gets updated. The response still redacts it.
          { op: 'replace', path: '/data/protected_panel', value: 'patched-secret' },
        ]);
        assert.strictEqual(
          patched.data.protected_panel,
          undefined,
          'modified protected field must not be returned',
        );
        assert.deepStrictEqual(patched.data, { ...expected, public_panel: publicValue });
      });
    });

    describe('Grid components', function () {
      const {
        components,
        submission,
        expected,
      } = require('./fixtures/forms/protected/protectedGrids');

      before('create a form with protected fields in every grid component', async function () {
        this.formId = (
          await createForm({
            title: 'Protected Grids',
            name: 'protectedGrids',
            path: 'protectedgrids',
            type: 'form',
            components,
          })
        )._id;
      });

      it('removes protected fields from every row of the create response', async function () {
        const created = await post(`/form/${this.formId}/submission`, { data: submission });
        this.submissionId = created._id;
        assert.deepStrictEqual(created.data, expected);
      });

      it('removes protected fields from every row of the get response', async function () {
        const fetched = await get(`/form/${this.formId}/submission/${this.submissionId}`);
        assert.deepStrictEqual(fetched.data, expected);
      });

      it('removes protected fields from every row of the index response', async function () {
        const list = await get(`/form/${this.formId}/submission`);
        const found = list.find((item) => item._id === this.submissionId);
        assert.ok(found, 'created submission should be in the index response');
        assert.deepStrictEqual(found.data, expected);
      });

      // The update/patch tests below modify a field in a grid row — so they run after the reads above.
      it('removes a protected field in a grid row from the update response', async function () {
        const publicValue = 'updated';
        const data = _.cloneDeep(submission);
        data.dataGrid[0].public_datagrid = publicValue;
        data.dataGrid[0].protected_datagrid = 'updated-secret';
        const updated = await put(`/form/${this.formId}/submission/${this.submissionId}`, { data });

        // The mutated row comes back with the public change and no protected field.
        assert.deepStrictEqual(updated.data.dataGrid[0], { public_datagrid: publicValue });
      });

      it('removes a protected field in a grid row from the patch response even when modified', async function () {
        const publicValue = 'patched';
        const patched = await patch(`/form/${this.formId}/submission/${this.submissionId}`, [
          { op: 'replace', path: '/data/dataGrid/0/public_datagrid', value: publicValue },
          // The patch base is the RAW submission, so the protected field is present
          // and gets updated. The response still redacts it.
          { op: 'replace', path: '/data/dataGrid/0/protected_datagrid', value: 'patched-secret' },
        ]);

        // The mutated row comes back with the public change and no protected field.
        assert.deepStrictEqual(patched.data.dataGrid[0], { public_datagrid: publicValue });
      });
    });

    // A datamap keys its values by dynamic user strings, so the value component's
    // static schema key never matches the stored data — the redaction walk must
    // rebuild the value component per actual map key to reach the protected values.
    // The map keys are public and survive; every protected value is stripped.
    describe('Data map component', function () {
      const {
        components,
        submission,
        expected,
      } = require('./fixtures/forms/protected/protectedDataMap');

      before('create a form with a protected datamap value component', async function () {
        this.formId = (
          await createForm({
            title: 'Protected Data Map',
            name: 'protectedDataMap',
            path: 'protecteddatamap',
            type: 'form',
            components,
          })
        )._id;
      });

      it('removes every protected datamap value from the create response', async function () {
        const created = await post(`/form/${this.formId}/submission`, { data: submission });
        this.submissionId = created._id;
        assert.deepStrictEqual(created.data, expected);
      });

      it('removes every protected datamap value from the get response', async function () {
        const fetched = await get(`/form/${this.formId}/submission/${this.submissionId}`);
        assert.deepStrictEqual(fetched.data, expected);
      });

      it('removes every protected datamap value from the index response', async function () {
        const list = await get(`/form/${this.formId}/submission`);
        const found = list.find((item) => item._id === this.submissionId);
        assert.ok(found, 'created submission should be in the index response');
        assert.deepStrictEqual(found.data, expected);
      });

      // The update/patch tests below modify a datamap entry — so they run after the reads above.
      it('removes a protected datamap value from the update response and preserves raw values', async function () {
        const data = _.cloneDeep(submission);
        data.dataMap.alpha.name = 'public_alpha_updated';
        data.dataMap.alpha.ssn = 'secret_alpha_updated';
        const updated = await put(`/form/${this.formId}/submission/${this.submissionId}`, { data });

        // Response: public change visible, protected ssn keys removed from every entry.
        assert.deepStrictEqual(updated.data, {
          dataMap: {
            alpha: { name: 'public_alpha_updated' },
            beta: { name: 'public_beta' },
          },
        });

        // Raw stored doc: touched values (public and protected) updated, beta intact.
        const raw = await submissionModel().findOne({ _id: this.submissionId }).lean().exec();
        assert.deepStrictEqual(raw.data, {
          dataMap: {
            alpha: { name: 'public_alpha_updated', ssn: 'secret_alpha_updated' },
            beta: { name: 'public_beta', ssn: 'secret_beta' },
          },
        });
      });

      it('removes a protected datamap value from the patch response and preserves untouched entries', async function () {
        // Patch only entry alpha (one public, one protected op). Entry beta is never touched, so its
        // protected ssn must survive — the patch base is the RAW submission, so protected values are
        // present and resolvable.
        const patched = await patch(`/form/${this.formId}/submission/${this.submissionId}`, [
          { op: 'replace', path: '/data/dataMap/alpha/name', value: 'public_alpha_patched' },
          { op: 'replace', path: '/data/dataMap/alpha/ssn', value: 'secret_alpha_patched' },
        ]);

        // Response: public change visible, protected ssn keys removed from every entry.
        assert.deepStrictEqual(patched.data, {
          dataMap: {
            alpha: { name: 'public_alpha_patched' },
            beta: { name: 'public_beta' },
          },
        });

        // Raw stored doc: touched values (public and protected) updated, beta intact.
        const raw = await submissionModel().findOne({ _id: this.submissionId }).lean().exec();
        assert.deepStrictEqual(raw.data, {
          dataMap: {
            alpha: { name: 'public_alpha_patched', ssn: 'secret_alpha_patched' },
            beta: { name: 'public_beta', ssn: 'secret_beta' },
          },
        });
      });
    });

    // A datamap whose value is itself a datamap: the protected ssn sits under two
    // user-keyed levels (dataMap.<k1>.<k2>.ssn). Redaction must reach it through both
    // dynamic levels while leaving the public name and the map keys intact.
    describe('Data map nested in a data map', function () {
      const components = [
        {
          type: 'datamap',
          key: 'dataMap',
          input: true,
          valueComponent: {
            type: 'datamap',
            key: 'dataMap1',
            input: true,
            valueComponent: {
              type: 'container',
              key: 'container',
              input: true,
              components: [
                { type: 'textfield', key: 'name', input: true },
                { type: 'textfield', key: 'ssn', input: true, protected: true },
              ],
            },
          },
        },
      ];
      const submission = {
        dataMap: {
          alpha: { inner1: { name: 'public_a', ssn: 'secret_a' } },
          beta: { inner2: { name: 'public_b', ssn: 'secret_b' } },
        },
      };
      const expected = {
        dataMap: {
          alpha: { inner1: { name: 'public_a' } },
          beta: { inner2: { name: 'public_b' } },
        },
      };

      before('create a form with a datamap nested in a datamap', async function () {
        this.formId = (
          await createForm({
            title: 'Protected Nested Data Map',
            name: 'protectedNestedDataMap',
            path: 'protectednesteddatamap',
            type: 'form',
            components,
          })
        )._id;
      });

      it('removes the deeply nested protected value from the create response', async function () {
        const created = await post(`/form/${this.formId}/submission`, { data: submission });
        this.submissionId = created._id;
        assert.deepStrictEqual(created.data, expected);
      });

      it('removes it from the get response but keeps the raw value in storage', async function () {
        const fetched = await get(`/form/${this.formId}/submission/${this.submissionId}`);
        assert.deepStrictEqual(fetched.data, expected);

        // Redacted only from the response — the protected value is still persisted.
        const raw = await submissionModel().findOne({ _id: this.submissionId }).lean().exec();
        assert.strictEqual(raw.data.dataMap.alpha.inner1.ssn, 'secret_a');
        assert.strictEqual(raw.data.dataMap.beta.inner2.ssn, 'secret_b');
      });
    });

    describe('Data map schema shapes', function () {
      const util = require('../src/util/util');
      const redact = (components, data) => {
        const submission = { data: _.cloneDeep(data) };
        util.removeProtectedFields({ components }, 'read', submission);
        return submission.data;
      };

      it('removes the whole map when its value component is protected', function () {
        const components = [
          {
            type: 'datamap',
            key: 'dataMap',
            input: true,
            valueComponent: { type: 'textfield', key: 'value', input: true, protected: true },
          },
        ];
        // Every entry's value is protected, so the field itself goes.
        assert.deepStrictEqual(
          redact(components, { dataMap: { alpha: 'secret_a', beta: 'secret_b' } }),
          {},
        );
      });

      it('removes every entry value when a nested datamap is wholly protected', function () {
        const components = [
          {
            type: 'datamap',
            key: 'dataMap',
            input: true,
            valueComponent: {
              type: 'datamap',
              key: 'dataMap1',
              input: true,
              valueComponent: { type: 'textfield', key: 'value', input: true, protected: true },
            },
          },
        ];
        assert.deepStrictEqual(
          redact(components, {
            dataMap: { alpha: { inner1: 'secret_a' }, beta: { inner2: 'secret_b' } },
          }),
          { dataMap: {} },
        );
      });

      it('removes a protected field from every row of a datamap of grids', function () {
        const components = [
          {
            type: 'datamap',
            key: 'dataMap',
            input: true,
            valueComponent: {
              type: 'datagrid',
              key: 'grid',
              input: true,
              components: [
                { type: 'textfield', key: 'name', input: true },
                { type: 'textfield', key: 'ssn', input: true, protected: true },
              ],
            },
          },
        ];
        assert.deepStrictEqual(
          redact(components, {
            dataMap: {
              alpha: [
                { name: 'public_a', ssn: 'secret_a' },
                { name: 'public_b', ssn: 'secret_b' },
              ],
            },
          }),
          { dataMap: { alpha: [{ name: 'public_a' }, { name: 'public_b' }] } },
        );
      });

      it('reaches a datamap nested inside another datamap value component', function () {
        const components = [
          {
            type: 'datamap',
            key: 'dataMap',
            input: true,
            valueComponent: {
              type: 'container',
              key: 'container',
              input: true,
              components: [
                {
                  type: 'datamap',
                  key: 'dataMap1',
                  input: true,
                  valueComponent: { type: 'textfield', key: 'value', input: true, protected: true },
                },
              ],
            },
          },
        ];
        assert.deepStrictEqual(
          redact(components, { dataMap: { alpha: { dataMap1: { inner1: 'secret_a' } } } }),
          { dataMap: { alpha: {} } },
        );
      });

      it('reaches a protected field three datamap levels deep', function () {
        const components = [
          {
            type: 'datamap',
            key: 'dataMap',
            input: true,
            valueComponent: {
              type: 'datamap',
              key: 'dataMap1',
              input: true,
              valueComponent: {
                type: 'datamap',
                key: 'dataMap2',
                input: true,
                valueComponent: {
                  type: 'container',
                  key: 'container',
                  input: true,
                  components: [
                    { type: 'textfield', key: 'name', input: true },
                    { type: 'textfield', key: 'ssn', input: true, protected: true },
                  ],
                },
              },
            },
          },
        ];
        assert.deepStrictEqual(
          redact(components, {
            dataMap: { alpha: { one: { x: { name: 'public_a', ssn: 'secret_a' } } } },
          }),
          { dataMap: { alpha: { one: { x: { name: 'public_a' } } } } },
        );
      });

      it('removes a protected field wrapped in a layout component inside a datamap', function () {
        const components = [
          {
            type: 'datamap',
            key: 'dataMap',
            input: true,
            valueComponent: {
              type: 'container',
              key: 'container',
              input: true,
              components: [
                {
                  type: 'panel',
                  key: 'panel',
                  components: [
                    { type: 'textfield', key: 'name', input: true },
                    { type: 'textfield', key: 'ssn', input: true, protected: true },
                  ],
                },
              ],
            },
          },
        ];
        assert.deepStrictEqual(
          redact(components, { dataMap: { alpha: { name: 'public_a', ssn: 'secret_a' } } }),
          { dataMap: { alpha: { name: 'public_a' } } },
        );
      });
    });

    // Regression guard for the PATCH data-loss bug: PATCH used to build its base
    // from the redacted GET, so protected fields were dropped from req.body and wiped
    // from storage on save. submissionApplyPatch now patches the RAW submission, so a
    // protected field that the patch updates is persisted, and one the patch never
    // touches survives. Protected values never come back over the API, so the response
    // stays redacted and we inspect the raw stored document for the real values.
    describe('PATCH protected fields', function () {
      it('updates touched protected fields (top-level and nested) and preserves untouched ones', async function () {
        const form = await createForm({
          title: 'Patch Protected',
          name: 'patchProtected',
          path: 'patchprotected',
          type: 'form',
          components: [
            { type: 'textfield', key: 'name', input: true },
            { type: 'textfield', key: 'topSecret', input: true, protected: true },
            {
              type: 'datagrid',
              key: 'grid',
              input: true,
              components: [
                { type: 'textfield', key: 'rowPublic', input: true },
                { type: 'textfield', key: 'rowSecret', input: true, protected: true },
              ],
            },
          ],
        });
        const created = await post(`/form/${form._id}/submission`, {
          data: {
            name: 'n',
            topSecret: 'ts',
            grid: [
              { rowPublic: 'p0', rowSecret: 's0' },
              { rowPublic: 'p1', rowSecret: 's1' },
            ],
          },
        });

        // Update one public + one protected field at the top level and in row 0.
        // The patch base is the RAW submission, so protected fields are present and
        // `replace` resolves against them. Row 1 is left untouched to
        // prove untouched protected fields survive.
        const patched = await patch(`/form/${form._id}/submission/${created._id}`, [
          { op: 'replace', path: '/data/name', value: 'n2' },
          { op: 'replace', path: '/data/topSecret', value: 'ts2' },
          { op: 'replace', path: '/data/grid/0/rowPublic', value: 'p0-new' },
          { op: 'replace', path: '/data/grid/0/rowSecret', value: 's0-new' },
        ]);

        // API response: public changes visible, protected keys removed entirely.
        assert.deepStrictEqual(patched.data, {
          name: 'n2',
          grid: [{ rowPublic: 'p0-new' }, { rowPublic: 'p1' }],
        });

        // Raw stored doc: every value is correct — touched fields (public and
        // protected) updated, untouched row 1 fully intact.
        const raw = await submissionModel().findOne({ _id: created._id }).lean().exec();
        assert.deepStrictEqual(raw.data, {
          name: 'n2',
          topSecret: 'ts2',
          grid: [
            { rowPublic: 'p0-new', rowSecret: 's0-new' },
            { rowPublic: 'p1', rowSecret: 's1' },
          ],
        });
      });
    });

    // A parent embedding two different child forms: childA with save as reference: true (a
    // pointer to a separate child submission, hydrated into every response) and childB
    // with save as reference: false (an inline copy). Every response type must contain exactly
    // the public data — protected keys removed at all three levels — while raw storage
    // keeps every value.
    describe('Nested forms (two children: reference and inline)', function () {
      const {
        childFormA,
        childFormB,
        parentForm,
        submission,
      } = require('./fixtures/forms/protected/protectedNested');

      let parentId, submissionId, childAId;

      const assertResponse = (
        sub,
        parentPublic = 'pp',
        childAPublic = 'cap',
        childBPublic = 'cbp',
      ) =>
        assert.deepStrictEqual(
          { ...sub.data, childA: _.pick(sub.data.childA, ['_id', 'data']) },
          {
            parentPublic,
            childA: { _id: childAId, data: { childAPublic } },
            childB: { data: { childBPublic } },
          },
        );

      const rawData = async (id) => {
        const doc = await submissionModel().findOne({ _id: id }).lean();
        return JSON.parse(JSON.stringify(doc.data));
      };
      const assertRaw = async (
        parentPublic = 'pp',
        parentSecret = 'ps',
        childAData = submission.data.childA.data,
        childBData = submission.data.childB.data,
      ) => {
        assert.deepStrictEqual(await rawData(submissionId), {
          parentPublic,
          parentSecret,
          childA: { _id: childAId },
          childB: { data: childBData },
        });
        assert.deepStrictEqual(await rawData(childAId), childAData);
      };

      before('create two child forms and a parent embedding both', async function () {
        const childA = await createForm(childFormA());
        const childB = await createForm(childFormB());
        parentId = (await createForm(parentForm(childA._id, childB._id)))._id;
      });

      it('redacts the create (POST) response and stores the raw values', async function () {
        const created = await post(`/form/${parentId}/submission`, submission);
        submissionId = created._id;
        childAId = _.get(created, 'data.childA._id');
        assert.ok(childAId, 'referenced child submission should have been created');
        assertResponse(created);
        await assertRaw();
      });

      it('redacts the read (GET) response and hydrates the reference', async function () {
        const fetched = await get(`/form/${parentId}/submission/${submissionId}`);
        assertResponse(fetched);
      });

      it('redacts the index (GET all) response', async function () {
        const list = await get(`/form/${parentId}/submission`);
        const found = list.find((item) => item._id === submissionId);
        assert.ok(found, 'created submission should be in the index response');
        assertResponse(found);
      });

      it('redacts the update (PUT) response and persists the raw values', async function () {
        const updated = await put(`/form/${parentId}/submission/${submissionId}`, {
          data: {
            parentPublic: 'pp2',
            parentSecret: 'ps2',
            childA: { _id: childAId, data: { childAPublic: 'cap2', childASecret: 'cas2' } },
            childB: { data: { childBPublic: 'cbp2', childBSecret: 'cbs2' } },
          },
        });
        assertResponse(updated, 'pp2', 'cap2', 'cbp2');
        await assertRaw(
          'pp2',
          'ps2',
          { childAPublic: 'cap2', childASecret: 'cas2' },
          { childBPublic: 'cbp2', childBSecret: 'cbs2' },
        );
      });

      it('redacts the patch (PATCH) response and persists the raw values', async function () {
        const patched = await patch(`/form/${parentId}/submission/${submissionId}`, [
          { op: 'replace', path: '/data/parentPublic', value: 'pp3' },
          { op: 'replace', path: '/data/parentSecret', value: 'ps3' },
          { op: 'replace', path: '/data/childA/data/childASecret', value: 'cas3' },
        ]);
        assertResponse(patched, 'pp3', 'cap2', 'cbp2');
        await assertRaw(
          'pp3',
          'ps3',
          { childAPublic: 'cap2', childASecret: 'cas3' },
          { childBPublic: 'cbp2', childBSecret: 'cbs2' },
        );
      });
    });

    describe('Error responses', function () {
      const nested = require('./fixtures/forms/protected/protectedNested');
      // The redaction suite above already created these forms, so each test here takes its own
      // copy under a suffixed name and path.
      const rename = (def, suffix) => ({
        ...def,
        name: `${def.name}${suffix}`,
        path: `${def.path}${suffix.toLowerCase()}`,
      });
      // Make every protected field fail validation.
      const failProtected = (def) => ({
        ...def,
        components: def.components.map((component) =>
          component.protected ? { ...component, validate: { minLength: 30 } } : component,
        ),
      });
      // A protected field inside a grid inside a panel
      const panelWithGrid = (validate) => ({
        type: 'panel',
        key: 'panel',
        input: false,
        components: [
          {
            type: 'datagrid',
            key: 'dataGrid',
            input: true,
            components: [
              { type: 'textfield', key: 'gridPublic', input: true, validate },
              { type: 'textfield', key: 'gridSecret', input: true, protected: true, validate },
            ],
          },
        ],
      });

      it('redacts protected fields in a patch validation error', async function () {
        const childA = await createForm(rename(failProtected(nested.childFormA()), 'Err'));
        const childB = await createForm(rename(failProtected(nested.childFormB()), 'Err'));
        // childA is reference: true, childB is reference: false on the parent form
        const parentDef = rename(failProtected(nested.parentForm(childA._id, childB._id)), 'Err');
        // gridPublic fails too, to assert a public value is still returned in the validation errors.
        parentDef.components.push(panelWithGrid({ minLength: 30 }));
        // No datamap: it seems like the validator doesn't descend into a datamap's dynamic entries
        const parent = await createForm(parentDef);
        const created = await post(`/form/${parent._id}/submission?noValidate=true`, {
          data: { ...nested.submission.data, dataGrid: [{ gridPublic: 'gp', gridSecret: 'gs' }] },
        });

        const error = await patch(
          `/form/${parent._id}/submission/${created._id}`,
          [{ op: 'add', path: '/metadata/probe', value: '1' }],
          400,
        );
        // The public field is the only reported field that still carries its value.
        assert.deepStrictEqual(
          error.details
            .filter(({ context }) => 'value' in context)
            .map(({ context }) => [context.path, context.value]),
          [['dataGrid[0].gridPublic', 'gp']],
        );
      });

      // fast-json-patch rejects an op whose path does not resolve and attaches the whole
      // document it was patching as err.tree — which is now the RAW submission.
      it('does not echo the raw submission when a patch op path is unresolvable', async function () {
        const childA = await createForm(rename(nested.childFormA(), 'Tree'));
        const childB = await createForm(rename(nested.childFormB(), 'Tree'));
        const parentDef = rename(nested.parentForm(childA._id, childB._id), 'Tree');
        parentDef.components.push(panelWithGrid());
        // A datamap of datamaps: both levels are keyed by user-supplied strings, so the protected
        // `ssn` resolves through two wildcards while the sibling `name` survives.
        parentDef.components.push({
          type: 'datamap',
          key: 'dataMap',
          input: true,
          valueComponent: {
            type: 'datamap',
            key: 'dataMap1',
            input: true,
            valueComponent: {
              type: 'container',
              key: 'container',
              input: true,
              components: [
                { type: 'textfield', key: 'name', input: true },
                { type: 'textfield', key: 'ssn', input: true, protected: true },
              ],
            },
          },
        });
        const parent = await createForm(parentDef);
        const created = await post(`/form/${parent._id}/submission`, {
          data: {
            ...nested.submission.data,
            dataGrid: [{ gridPublic: 'gp', gridSecret: 'gs' }],
            dataMap: {
              alpha: { inner1: { name: 'an', ssn: 'as' } },
              beta: { inner2: { name: 'bn', ssn: 'bs' } },
            },
          },
        });

        const error = await patch(
          `/form/${parent._id}/submission/${created._id}`,
          [{ op: 'replace', path: '/data/parentSecert', value: 'typo-in-the-key' }],
          400,
        );
        // The public fields are the only data the echoed document carries — including inside both
        // dynamic datamap levels, where every entry keeps `name` and loses `ssn`.
        const tree = error.tree.data;
        assert.deepStrictEqual(
          { ...tree, childA: _.pick(tree.childA, ['data']) },
          {
            parentPublic: 'pp',
            childA: { data: { childAPublic: 'cap' } },
            childB: { data: { childBPublic: 'cbp' } },
            dataGrid: [{ gridPublic: 'gp' }],
            dataMap: {
              alpha: { inner1: { name: 'an' } },
              beta: { inner2: { name: 'bn' } },
            },
          },
        );
      });
    });

    describe('Patch operations that read protected fields', function () {
      const SECRET = 'secret-value';
      const ROW_SECRET = 'row-secret-value';

      before('create a form with public and protected fields', async function () {
        this.formId = (
          await createForm({
            title: 'Patch Read Guard',
            name: 'patchReadGuard',
            path: 'patchreadguard',
            type: 'form',
            components: [
              { type: 'textfield', key: 'note', input: true },
              { type: 'textfield', key: 'ssn', input: true, protected: true },
              // A protected container: redaction removes the whole subtree, so a pointer to
              // anything inside it reads protected data without naming a protected path.
              {
                type: 'container',
                key: 'wrapper',
                input: true,
                protected: true,
                components: [{ type: 'textfield', key: 'inner', input: true }],
              },
              // A grid mixes a public and a protected column in one row, so a pointer can
              // reach a protected value through a row index rather than a static path.
              {
                type: 'datagrid',
                key: 'rows',
                input: true,
                components: [
                  { type: 'textfield', key: 'rowNote', input: true },
                  { type: 'textfield', key: 'rowSsn', input: true, protected: true },
                ],
              },
            ],
          })
        )._id;
      });

      beforeEach('create a submission', async function () {
        this.submissionId = (
          await post(`/form/${this.formId}/submission`, {
            data: {
              note: 'public',
              ssn: SECRET,
              wrapper: { inner: 'inner-secret' },
              rows: [{ rowNote: 'row-public', rowSsn: ROW_SECRET }],
            },
          })
        )._id;
      });

      it('refuses a copy from a protected field', async function () {
        await patch(
          `/form/${this.formId}/submission/${this.submissionId}`,
          [{ op: 'copy', from: '/data/ssn', path: '/data/note' }],
          400,
        );
        const fetched = await get(`/form/${this.formId}/submission/${this.submissionId}`);
        assert.strictEqual(fetched.data.note, 'public', 'the public field must be unchanged');
      });

      it('refuses a move from a protected field, leaving the stored value intact', async function () {
        await patch(
          `/form/${this.formId}/submission/${this.submissionId}`,
          [{ op: 'move', from: '/data/ssn', path: '/data/note' }],
          400,
        );
        const raw = await submissionModel().findOne({ _id: this.submissionId }).lean().exec();
        assert.deepStrictEqual(raw.data, {
          note: 'public',
          ssn: SECRET,
          wrapper: { inner: 'inner-secret' },
          rows: [{ rowNote: 'row-public', rowSsn: ROW_SECRET }],
        });
      });

      it('refuses a test on a protected field identically for a right and a wrong guess', async function () {
        const right = await patch(
          `/form/${this.formId}/submission/${this.submissionId}`,
          [{ op: 'test', path: '/data/ssn', value: SECRET }],
          400,
        );
        const wrong = await patch(
          `/form/${this.formId}/submission/${this.submissionId}`,
          [{ op: 'test', path: '/data/ssn', value: 'not-the-secret' }],
          400,
        );
        assert.deepStrictEqual(
          right,
          wrong,
          'the response must not reveal whether a guess matched',
        );
      });

      it('refuses a copy from a field inside a protected container', async function () {
        await patch(
          `/form/${this.formId}/submission/${this.submissionId}`,
          [{ op: 'copy', from: '/data/wrapper/inner', path: '/data/note' }],
          400,
        );
        const fetched = await get(`/form/${this.formId}/submission/${this.submissionId}`);
        assert.strictEqual(fetched.data.note, 'public', 'the public field must be unchanged');
      });

      it('refuses a copy from a protected column of a grid row', async function () {
        await patch(
          `/form/${this.formId}/submission/${this.submissionId}`,
          [{ op: 'copy', from: '/data/rows/0/rowSsn', path: '/data/note' }],
          400,
        );
        const fetched = await get(`/form/${this.formId}/submission/${this.submissionId}`);
        assert.strictEqual(fetched.data.note, 'public', 'the public field must be unchanged');
      });

      it('allows a copy from a public column of a grid row', async function () {
        const patched = await patch(`/form/${this.formId}/submission/${this.submissionId}`, [
          { op: 'copy', from: '/data/rows/0/rowNote', path: '/data/note' },
        ]);
        assert.strictEqual(patched.data.note, 'row-public');
      });

      it('allows a test on a public field', async function () {
        const patched = await patch(`/form/${this.formId}/submission/${this.submissionId}`, [
          { op: 'test', path: '/data/note', value: 'public' },
          { op: 'replace', path: '/data/note', value: 'ok' },
        ]);
        assert.strictEqual(patched.data.note, 'ok');
      });

      it('allows a copy from a public field into a protected one', async function () {
        await patch(`/form/${this.formId}/submission/${this.submissionId}`, [
          { op: 'copy', from: '/data/note', path: '/data/ssn' },
        ]);
        const raw = await submissionModel().findOne({ _id: this.submissionId }).lean().exec();
        assert.strictEqual(raw.data.ssn, 'public');
      });

      it('still persists a replace on a protected field', async function () {
        await patch(`/form/${this.formId}/submission/${this.submissionId}`, [
          { op: 'replace', path: '/data/ssn', value: 'new-secret' },
        ]);
        const raw = await submissionModel().findOne({ _id: this.submissionId }).lean().exec();
        assert.strictEqual(raw.data.ssn, 'new-secret');
      });
    });
  });
};
