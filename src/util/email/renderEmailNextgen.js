'use strict';

const _ = require('lodash');
const { getScript, getRenderMethod } = require('./renderEmail');
const macros = require('./nunjucks-macros');

const omitUndefined = (obj) => _.omitBy(obj, _.isUndefined);

// Nextgen email render: same two-stage shape as renderEmail (core), but stage 1
// (the submission table + per-component value/label maps) runs entirely inside
// the nextgen render isolate instead of on the host. `callbacks` are the same
// request-scoped host callbacks the validator uses, so the render de-references
// an unhydrated submission (see email/index.js). Stage 2 is the SAME
// getScript/vm nunjucks path — the componentValue/componentLabel filters prefer
// the nextgen maps when present (see vm/src/nunjucks.js).
async function renderEmailNextgen({ render, context = {}, vm, renderer, callbacks }) {
  if (context._private) {
    delete context._private;
  }
  context.macros = macros;

  const data = {
    input: omitUndefined(render),
    context,
    submissionTableHtml: null,
    componentValues: {},
    componentLabels: {},
  };

  if (getRenderMethod(render) === 'dynamic') {
    const rendered = await renderer.renderEmail({
      form: context.form,
      submission: { data: context.data, metadata: context.metadata },
      callbacks,
    });
    data.submissionTableHtml = rendered.submissionTableHtml;
    data.componentValues = rendered.componentValues;
    data.componentLabels = rendered.componentLabels;
  }

  try {
    return await vm.evaluate(getScript(render), data);
  } catch (err) {
    console.warn(err);
  }
}

module.exports = { renderEmailNextgen };
