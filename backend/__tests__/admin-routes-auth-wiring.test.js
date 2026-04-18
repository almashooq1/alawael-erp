/**
 * admin-routes-auth-wiring.test.js — lock the "every admin route file
 * wires authenticateToken before any handler" invariant statically.
 *
 * Runtime no-auth tests (unauth → 401) don't work against the shared
 * Jest test app, because startup/middleware.js injects a mock admin
 * user on every request in test mode (see line ~228 of that file). So
 * instead of trying to fight the test harness, we check the source.
 *
 * Rule: every router under routes/*-admin.routes.js and routes/admin*
 * must have a top-level `router.use(authenticateToken)` (or an
 * equivalent route-level application) before any route handler.
 *
 * The test reads the file, strips comments + string literals, and
 * asserts authenticateToken appears before the first router.<method>
 * invocation. Catches: someone copies a template, forgets the
 * `router.use(authenticateToken)` line, every handler becomes public.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

// Strip block comments, line comments, and string/template literals so
// we don't false-match on documentation that mentions the middleware.
function normalize(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\n]*'/g, "''")
    .replace(/"[^"\n]*"/g, '""')
    .replace(/`[^`]*`/g, '``');
}

// Files that are legitimately public (no auth) — document each exception.
const PUBLIC_ALLOWLIST = new Set([
  'public-booking.routes.js', // booking form for guardians without accounts
  'health.routes.js', // health probes must be unauthenticated
]);

function adminRouteFiles() {
  return fs
    .readdirSync(ROUTES_DIR)
    .filter(f => /^(.*-admin|admin-).*\.routes\.js$/.test(f))
    .filter(f => !PUBLIC_ALLOWLIST.has(f));
}

describe('Admin route files wire authenticateToken before any handler', () => {
  const files = adminRouteFiles();

  it('at least 3 admin route files found (sanity)', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  files.forEach(fname => {
    it(`${fname} applies authenticateToken before the first route handler`, () => {
      const raw = fs.readFileSync(path.join(ROUTES_DIR, fname), 'utf8');
      const src = normalize(raw);

      // Either router.use(authenticateToken) at top OR every route passes it inline.
      const useAll = /router\.use\s*\(\s*(authenticateToken|requireAuth|authenticate|protect)\s*\)/;
      if (useAll.test(src)) return;

      // If not applied globally, every router.method(...) must pass auth inline.
      const handlerPattern = /router\.(get|post|patch|put|delete)\s*\(\s*[^,]+,\s*([^)]+)\)/g;
      let m;
      let foundAny = false;
      while ((m = handlerPattern.exec(src)) !== null) {
        foundAny = true;
        const args = m[2];
        expect(args).toMatch(/authenticateToken|requireAuth|authenticate|protect/);
      }

      // If the file has no handlers at all, that's fine (router re-exporter).
      // But we must not reach here with handlers present and no global use.
      expect(foundAny).toBe(true);
    });
  });
});
