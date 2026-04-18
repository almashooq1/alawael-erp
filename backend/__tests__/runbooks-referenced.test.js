/**
 * runbooks-referenced.test.js — every runbook is discoverable.
 *
 * A runbook nobody links to is a runbook nobody reads. This file
 * asserts each docs/runbooks/*.md (except README.md which IS the
 * index) is referenced from at least one of:
 *   • docs/runbooks/README.md  (the index)
 *   • docs/alerts/*.yml        (alert annotations)
 *   • docs/OPERATIONS.md       (on-call front door)
 *
 * If someone adds a runbook file but forgets to link it, CI fails.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('runbook discoverability', () => {
  const runbookDir = path.join(REPO_ROOT, 'docs/runbooks');
  const indexSrc = read('docs/runbooks/README.md');
  const opsSrc = read('docs/OPERATIONS.md');
  const alertsDir = path.join(REPO_ROOT, 'docs/alerts');
  const alertSrcs = fs
    .readdirSync(alertsDir)
    .filter(f => /\.ya?ml$/.test(f))
    .map(f => fs.readFileSync(path.join(alertsDir, f), 'utf8'));

  const files = fs.readdirSync(runbookDir).filter(f => f.endsWith('.md') && f !== 'README.md');

  it('at least one runbook exists', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s is linked from runbook-index / OPERATIONS / an alert rule', file => {
    const found =
      indexSrc.includes(file) || opsSrc.includes(file) || alertSrcs.some(src => src.includes(file));
    expect(found).toBe(true);
  });
});
