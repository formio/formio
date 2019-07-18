const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const sandbox = sinon.createSandbox();

describe('Example', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('does stuff', () => Promise.resolve());
});
