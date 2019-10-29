const assert = require('chai').assert;
const Sinon = require('sinon');

// A fake db wrapper for stubbing.
const sandbox = Sinon.createSandbox();

describe('Example', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('does stuff', () => Promise.resolve());
});
