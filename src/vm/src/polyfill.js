'use strict';

class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
    this.defaultPrevented = false;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }
}
globalThis.Text = class {};
globalThis.HTMLElement = class {};
globalThis.HTMLCanvasElement = class {};
globalThis.navigator = {userAgent: ""};

globalThis.document = {
  createElement: () => ({}),
  cookie: "",
  getElementsByTagName: () => [],
  documentElement: {
    style: [],
    firstElementChild: {appendChild: () => {}},
  },
};
globalThis.window = {
  addEventListener: () => {},
  Event,
  navigator: globalThis.navigator,
};
globalThis.btoa = (str) => {
  return str instanceof Buffer
    ? str.toString("base64")
    : Buffer.from(str.toString(), "binary").toString("base64");
};
globalThis.setTimeout = (cb) => {
  cb();
};

module.exports = {Event};
