/**
 * sidebar-paths-routed.test.js — every sidebar navigation path has a
 * matching <Route path=...> in AuthenticatedShell.js.
 *
 * Without this, renaming a route (or typo'ing one) would ship a
 * sidebar link that 404s.  Only checks admin/* entries — other
 * nav items are spread across multiple route modules (Finance/HR/
 * Rehab) that this test doesn't know how to enumerate.
 *
 * The check is source-regex-based, no React rendering needed.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('sidebar /admin path coverage', () => {
  const sidebar = fs.readFileSync(
    path.join(REPO_ROOT, 'frontend/src/components/Layout/sidebar/sidebarNavConfig.jsx'),
    'utf8'
  );
  const shell = fs.readFileSync(path.join(REPO_ROOT, 'frontend/src/AuthenticatedShell.js'), 'utf8');

  // Collect admin/* paths from the sidebar config
  const sidebarPaths = new Set();
  const pathRe = /path:\s*['"]\/(admin\/[\w\-/:.]+)['"]/g;
  let m;
  while ((m = pathRe.exec(sidebar)) !== null) sidebarPaths.add(m[1]);

  // Collect Route paths from the shell — they're written as
  // <Route path="admin/X" ...> (no leading slash in react-router v6
  // nested routes).
  const shellPaths = new Set();
  const routeRe = /<Route\s+path=["'](admin\/[\w\-/:.]+)["']/g;
  let rm;
  while ((rm = routeRe.exec(shell)) !== null) shellPaths.add(rm[1]);

  it('sidebar contains at least a handful of /admin/* paths (sanity)', () => {
    expect(sidebarPaths.size).toBeGreaterThan(10);
  });

  it('every sidebar /admin path is mounted as a route in the shell', () => {
    const missing = [];
    for (const p of sidebarPaths) {
      if (!shellPaths.has(p)) missing.push(`/${p}`);
    }
    if (missing.length) {
      throw new Error(
        'Sidebar links pointing at unmounted routes (will 404):\n  ' + missing.join('\n  ')
      );
    }
  });
});
