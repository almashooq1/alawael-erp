/**
 * makefile-npm-script-refs.test.js — every `npm run X` in the Makefile
 * points at a script that actually exists in backend/package.json or
 * the root package.json.
 *
 * Catches the "renamed/removed a script without updating the Makefile"
 * class of drift. Previously would only surface when someone ran
 * `make <target>` and got an npm ERR!.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('Makefile → npm script existence', () => {
  const makefile = fs.readFileSync(path.join(REPO_ROOT, 'Makefile'), 'utf8');
  const backendScripts = new Set(
    Object.keys(require(path.join(REPO_ROOT, 'backend/package.json')).scripts || {})
  );
  const rootScripts = new Set(
    Object.keys(require(path.join(REPO_ROOT, 'package.json')).scripts || {})
  );

  // Matches  npm run <scriptName>  (stopping at whitespace, end-of-line,
  // pipe, redirect, or semicolon).
  const re = /npm\s+run\s+([a-zA-Z][\w:-]*)/g;

  it('has at least one `npm run …` reference', () => {
    expect(makefile).toMatch(/npm\s+run/);
  });

  it('every referenced script exists in backend/ or root package.json', () => {
    const refs = new Set();
    let m;
    while ((m = re.exec(makefile)) !== null) refs.add(m[1]);

    const missing = [];
    for (const name of refs) {
      if (!backendScripts.has(name) && !rootScripts.has(name)) {
        missing.push(name);
      }
    }
    if (missing.length) {
      throw new Error(
        `Makefile references npm scripts that don't exist in backend/ or root package.json:\n  ${missing.join('\n  ')}`
      );
    }
    // Defensive: we must have examined SOMETHING. If refs is empty,
    // the regex broke and the assertion is meaningless.
    expect(refs.size).toBeGreaterThan(0);
  });
});
