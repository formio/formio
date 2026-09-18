'use strict';

// Hands out every chance.word() exactly once per process.
//
// The suites name their fixtures with chance.word(): `title`, `name` and `path` for the
// hundreds of forms, projects and roles they create. The word space is small enough that
// a run of this size eventually draws the same one twice, and `name` and `path` carry a
// unique-per-project index -- so the second create comes back
// "The Name must be unique per Project." That 400 is rarely where it hurts: the fixture
// simply never exists, and the failure lands on whichever later test consumed it, as a
// 404, an HTML error page, or a response with no Content-Type at all. It reads as a flaky
// suite. It is a birthday collision, and it reproduces with a single spec run alone.
//
// Patched on the prototype, not at the ~450 call sites: every spec builds its own
// `new Chance()`, and forms created by different specs share a project as often as not.
const Chance = require('chance');

const handedOut = new Set();
const draw = Chance.prototype.word;

Chance.prototype.word = function (...args) {
  // Redraw first, so the common case keeps exactly the shape the caller asked for -- a
  // plain word, or one of the requested length. Only disambiguate once the space is
  // genuinely crowded, which is rare enough not to matter.
  for (let attempt = 0; attempt < 20; attempt++) {
    const word = draw.apply(this, args);
    if (!handedOut.has(word)) {
      handedOut.add(word);
      return word;
    }
  }

  let suffix = 0;
  let word;
  do {
    word = `${draw.apply(this, args)}${++suffix}`;
  } while (handedOut.has(word));
  handedOut.add(word);
  return word;
};

module.exports = { handedOut };
