/* eslint-env mocha */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { ESLint, RuleTester } = require('eslint');
const { plugin, config: loggingConfig } = require('@formio/eslint-config/logging');

// FIO-7988. Redaction in src/util/logger only censors the request/response objects that
// pino-http binds. It cannot help a call site that hands the logger a credential or a
// person's record directly -- `logger.debug(user)` is indistinguishable from any other
// object by the time it reaches pino. The `formio/*` ESLint rules are the guard for that
// class of mistake, and for the two call shapes pino mishandles silently (a dropped second
// argument, a detached level method). Both server packages lint with them; this spec runs
// the same rules over both source trees so the guard also holds where lint is not a gate.
//
// The rule: log an identifier, not the record. `submission._id`, not `submission`.

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');

// This package is synced to the standalone OSS repo, where it is the whole repo and
// formio-server is not present at all -- so scan the trees that exist rather than assuming
// the monorepo layout. The test asserts below that at least one tree was found, so a moved
// directory fails loudly instead of turning the guard into a no-op.
//
// The package-root entry points log too (`install.js` prompts for the root password), so they
// are scanned alongside the trees -- the same files `pnpm -F <pkg> lint` covers.
const SCANNED_TREES = [
  path.join(PACKAGE_ROOT, 'src'),
  path.join(PACKAGE_ROOT, 'index.js'),
  path.join(PACKAGE_ROOT, 'server.js'),
  path.join(PACKAGE_ROOT, 'install.js'),
  path.join(PACKAGE_ROOT, '../formio-server/src'),
  path.join(PACKAGE_ROOT, '../formio-server/server.js'),
  path.join(PACKAGE_ROOT, '../formio-server/config.js'),
].filter((tree) => fs.existsSync(tree));

const languageOptions = { ecmaVersion: 'latest', sourceType: 'commonjs' };

// The package eslint configs ignore `src/db/updates` (legacy migrations that fail the base
// rules); the logging rules still have to hold there, so this run lints the trees with only
// those rules and its own ignore list. `src/vm/bundles` is webpack output holding vendored
// code -- not our call sites.
const lintTrees = async () => {
  const eslint = new ESLint({
    cwd: REPO_ROOT,
    overrideConfigFile: true,
    overrideConfig: [{ files: ['**/*.js'], languageOptions }, ...loggingConfig],
    ignorePatterns: ['**/node_modules/**', '**/bundles/**'],
  });
  const results = await eslint.lintFiles(SCANNED_TREES);
  return results.flatMap((result) =>
    result.messages
      .filter((message) => message.severity === 2)
      .map(
        (message) =>
          `${path.relative(REPO_ROOT, result.filePath)}:${message.line} ${message.message}`,
      ),
  );
};

describe('Logging - the server trees pass the logging rules', function () {
  this.timeout(60000);

  it('never hands a record to the logger, drops an argument or detaches a level method', async function () {
    assert.ok(SCANNED_TREES.length > 0, 'found no server source tree to scan');

    const violations = await lintTrees();

    assert.deepStrictEqual(
      violations,
      [],
      `Log an identifier, not the record; use log.error({ err }, 'message'):\n  ${violations.join('\n  ')}\n`,
    );
  });
});

// The rules are only worth having if they still fire. These pin the shapes they must catch
// -- and, just as importantly, the correct code they must leave alone.
describe('Logging - the rules themselves', function () {
  const ruleTester = new RuleTester({ languageOptions });

  ruleTester.run('formio/no-sensitive-log-payload', plugin.rules['no-sensitive-log-payload'], {
    valid: [
      // an identifier interpolated into the message
      'log.debug(`User: ${user._id}`);',
      // a wrapped call that logs only identifiers
      'this.logger.error(\n  { err },\n  `CSV export failed to render submission ${submission?._id}`,\n);',
      // bindings that are not records
      "log.debug({ formId, userId: user._id }, 'loaded');",
      // console is out of scope
      'console.log(user);',
      // a sensitive word in the message text is not a value
      "log.info('Encrypting password');",
      'log.debug(`Updating password policy for ${formId}`);',
    ],
    invalid: [
      { code: 'log.debug(user);', errors: 1 },
      // a sensitive value, however it is reached
      { code: 'log.debug({ password });', errors: 1 },
      { code: 'log.debug(user.password);', errors: 1 },
      { code: "log.debug(_.get(req.headers, 'x-admin-key'));", errors: 1 },
      // shorthand, even when it is not the first key
      { code: "log.debug({ formId, user }, 'msg');", errors: 1 },
      { code: "log.debug({ ...user }, 'msg');", errors: 1 },
      { code: 'log.debug(`User: ${JSON.stringify(user)}`);', errors: 1 },
      { code: "log.debug('Transaction:', transaction.data);", errors: 1 },
      { code: "log.debug(`Key: ${headers['x-license-key']}`);", errors: 1 },
      // a call whose arguments wrap onto later lines
      { code: "log.debug(\n  { user },\n  'a message long enough to wrap',\n);", errors: 1 },
      { code: 'actionsToRoutesLogger.debug(project);', errors: 1 },
    ],
  });

  ruleTester.run('formio/no-dropped-log-arguments', plugin.rules['no-dropped-log-arguments'], {
    valid: [
      // printf-style interpolation is what the extra arguments are for
      "log.debug('form %s loaded', formId);",
      // the error-first and bindings-first shapes
      "log.error(err, 'failed');",
      "log.error({ err }, 'failed');",
      "console.error('failed', err);",
      // a trailing comma after a wrapped message is not a second argument
      'log.debug(\n  `a message long enough to wrap onto the next line`,\n);',
    ],
    invalid: [
      { code: "log.error('Err2', err);", errors: 1 },
      { code: 'log.error(`Check Signatures error`, e);', errors: 1 },
    ],
  });

  ruleTester.run('formio/no-detached-log-method', plugin.rules['no-detached-log-method'], {
    valid: [
      'promise.catch((e) => childLogger.error(e));',
      'promise.catch(childLogger.error.bind(childLogger));',
      "log.error('failed');",
      // console methods are bound
      'promise.catch(console.error);',
      // a level-named property on something that is not a logger
      'callback(response.error);',
      'const failed = Boolean(result.error);',
    ],
    invalid: [
      { code: 'promise.catch(childLogger.error);', errors: 1 },
      { code: 'promise.then(onSuccess, log.error);', errors: 1 },
    ],
  });

  ruleTester.run('formio/no-debug-package', plugin.rules['no-debug-package'], {
    valid: ["const { logger } = require('formio/src/util/logger');"],
    invalid: [{ code: "const debug = require('debug')('formio:x');", errors: 1 }],
  });
});
