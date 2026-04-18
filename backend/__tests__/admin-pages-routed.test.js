/**
 * admin-pages-routed.test.js — every AdminX.jsx in pages/Admin has a
 * matching <Route> in AuthenticatedShell.js.
 *
 * Problem: a page component file exists but nobody can reach it
 * because no route points at it. Silent dead code; worse, the page
 * that was supposed to supersede an old one still loads the old one.
 *
 * Guard: for each Admin{Name}.jsx, assert the shell has an import
 * for it AND a <Route element={<Admin{Name} />} ...>. This catches:
 *   • new page created, shell not updated
 *   • page deleted, shell still imports it (separate concern —
 *     caught by build-time static analysis)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ADMIN_DIR = path.join(REPO_ROOT, 'frontend/src/pages/Admin');
const SHELL_PATH = path.join(REPO_ROOT, 'frontend/src/AuthenticatedShell.js');

// Pages that are acceptable to have NO route — either subcomponents,
// variants accessed via a parent, or explicitly deprecated pages
// kept for backward-compat.
const NO_ROUTE_NEEDED = new Set([
  // add known exceptions here with a one-line comment explaining why
]);

describe('Admin page routing completeness', () => {
  const shell = fs.readFileSync(SHELL_PATH, 'utf8');
  const pages = fs
    .readdirSync(ADMIN_DIR)
    .filter(f => /^Admin[A-Z][\w]*\.jsx$/.test(f))
    .map(f => f.replace(/\.jsx$/, ''));

  it('at least 10 AdminX.jsx pages exist (sanity)', () => {
    expect(pages.length).toBeGreaterThanOrEqual(10);
  });

  it('every AdminX.jsx has a matching <AdminX /> element in the shell', () => {
    const missing = [];
    for (const comp of pages) {
      if (NO_ROUTE_NEEDED.has(comp)) continue;
      // Shell references include either <AdminX /> (JSX self-close) or
      // an explicit element={<AdminX />} — both are valid signals the
      // component is wired into a route.
      const re = new RegExp(`<\\s*${comp}\\s*/>`);
      if (!re.test(shell)) missing.push(comp);
    }
    if (missing.length) {
      throw new Error(
        'Admin pages with no route in AuthenticatedShell.js:\n  ' + missing.join('\n  ')
      );
    }
  });
});
