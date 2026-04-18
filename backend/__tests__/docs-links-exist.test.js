/**
 * docs-links-exist.test.js — every relative link in the root README
 * and OPERATIONS.md points at a file that actually exists on disk.
 *
 * Catches the "renamed a runbook, forgot the README row" class of
 * drift that's otherwise only noticed when a reader clicks and gets
 * a 404.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function collectMdLinks(markdown, basedir) {
  // Capture link targets in [text](target). Keep only RELATIVE targets
  // (no scheme, no '#' anchors, not mailto).
  const re = /\]\(([^)\s#]+?)(?:#[^)]*)?\)/g;
  const links = [];
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target)) continue; // http, https, mailto
    if (target.startsWith('#')) continue; // same-page anchor
    links.push({ target, resolved: path.resolve(basedir, target) });
  }
  return links;
}

function assertAllLinksExist(relFile) {
  const abs = path.join(REPO_ROOT, relFile);
  const src = fs.readFileSync(abs, 'utf8');
  const links = collectMdLinks(src, path.dirname(abs));
  const missing = links.filter(l => !fs.existsSync(l.resolved));
  if (missing.length) {
    const report = missing
      .map(l => `  ${relFile}: → ${l.target}  (resolved to ${l.resolved})`)
      .join('\n');
    throw new Error(`Broken doc links:\n${report}`);
  }
}

describe('doc-link existence', () => {
  it('README.md has no broken relative links', () => {
    assertAllLinksExist('README.md');
  });

  it('docs/OPERATIONS.md has no broken relative links', () => {
    assertAllLinksExist('docs/OPERATIONS.md');
  });

  it('docs/runbooks/README.md has no broken relative links', () => {
    assertAllLinksExist('docs/runbooks/README.md');
  });

  it('docs/4.0.x-DELIVERY.md has no broken relative links', () => {
    assertAllLinksExist('docs/4.0.x-DELIVERY.md');
  });
});
