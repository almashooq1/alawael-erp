'use strict';

/**
 * W1576 drift guard — every `unifiedRouteRegistry` `file:` MUST resolve.
 *
 * WHY (incident): 2026-07-01 P0 outage took down ALL platform login. The
 * registry declared `/api/auth` + `/api/v1/auth` with `file: 'routes/auth.routes'`,
 * but the auth router lives at `api/routes/auth.routes` (the `api/` prefix was
 * dropped in the legacy `_registry.js` -> `unifiedRouteRegistry` migration).
 * `mountRegistry`'s `safeRequire` failed SILENTLY, the mount was skipped, and
 * `POST /api/v1/auth/login` returned 404 platform-wide. Fixed in W1572 (#848).
 *
 * This guard makes that class fail at push/CI: every route entry's `file` must
 * resolve to a real module, mirroring `mountRegistry`'s own resolution
 * (`path.resolve(__dirname, '..', file)` against `backend/`).
 *
 * Two known, NON-login-critical mounts remain unresolved and are baselined
 * below. Ratchet-DOWN (W325c lineage): when a mount is fixed/removed, its
 * baseline entry MUST be pruned in the same commit, or the stale-baseline
 * test fails.
 *
 * Static: only `require`s the registry (pure data + fn defs) and calls
 * `require.resolve` (path check, no module execution). No mongoose, no DB.
 */

const path = require('path');

// backend/ — matches the registry's own `path.resolve(__dirname, '..', file)`
// where its __dirname is backend/config.
const BACKEND_ROOT = path.join(__dirname, '..');

const { ROUTES } = require('../config/unifiedRouteRegistry');

// Registry `file:` targets that currently do NOT resolve. NON-login-critical.
// Ratchet-DOWN: when the underlying mount is fixed/removed, delete its entry.
const KNOWN_MISSING_FILES = new Set([
  // `/api/docs` — Swagger docs. Several candidate files exist
  // (config/swagger.js, ./swagger.js); the intended one has not been wired.
  'routes/swagger',
  // `/api/v1/admin/beneficiaries` — legacy. The beneficiary admin surface
  // moved to `/api/v1/core/beneficiaries` (W1457). Repointing this at
  // domains/core/routes/beneficiary.routes WITHOUT the beneficiaryId
  // ownership hook could reintroduce the W1146/W1160 IDOR — deliberately
  // left unmounted until decided.
  'routes/beneficiary.routes',
]);

function resolvesToModule(file) {
  try {
    require.resolve(path.join(BACKEND_ROOT, file));
    return true;
  } catch {
    return false;
  }
}

describe('unifiedRouteRegistry — every mounted file resolves (W1576)', () => {
  test('ROUTES export is a populated array', () => {
    expect(Array.isArray(ROUTES)).toBe(true);
    expect(ROUTES.length).toBeGreaterThan(300);
  });

  test('no NEW registry entry points at a missing file (silent-404 class — W1572)', () => {
    const broken = ROUTES.filter(
      r => r.file && !resolvesToModule(r.file) && !KNOWN_MISSING_FILES.has(r.file)
    ).map(r => `${r.path} <- ${r.file}`);
    // If this fails: the named mount silently 404s. Point `file` at the real
    // module path (e.g. add the missing `api/` prefix), or wire the file.
    expect(broken).toEqual([]);
  });

  test('auth login mount resolves — W1572 regression sentinel', () => {
    const authEntries = ROUTES.filter(r => r.path === '/api/v1/auth' || r.path === '/api/auth');
    expect(authEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of authEntries) {
      expect(entry.file).toBe('api/routes/auth.routes');
      expect(resolvesToModule(entry.file)).toBe(true);
    }
  });

  test('KNOWN_MISSING_FILES ratchet-DOWN — a now-resolvable baseline entry must be pruned', () => {
    const nowResolvable = [...KNOWN_MISSING_FILES].filter(f => resolvesToModule(f));
    expect(nowResolvable).toEqual([]);
  });

  test('every KNOWN_MISSING_FILES entry is still referenced by the registry (no typo/stale)', () => {
    const referenced = new Set(ROUTES.map(r => r.file));
    const orphaned = [...KNOWN_MISSING_FILES].filter(f => !referenced.has(f));
    expect(orphaned).toEqual([]);
  });
});
