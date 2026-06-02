/**
 * dual-mount-auth-locked.test.js — guard the dualMountAuth invariant
 * established by commit 501420d66.
 *
 * Context (2026-05-20): `dualMount(app, path, handler)` does NOT add
 * `authenticate` middleware. 17 domain routes were mounted via plain
 * `dualMount` and returned 200 with real data anonymously. The fix
 * introduced `dualMountAuth(app, path, handler)` and converted those 17.
 *
 * This test locks the conversion in place. If a future edit reverts any
 * of these mounts back to `dualMount`, the test fails — preventing the
 * silent regression that landed the original bug.
 *
 * Approach (static text scan, modelled on
 * admin-routes-auth-wiring.test.js): the runtime test app injects a
 * mock admin user in test mode, so a runtime no-auth probe is useless.
 * Instead, scan the registry source and assert the mount call shape.
 *
 * To intentionally make a route public, REMOVE it from the set below
 * and document in the commit message why.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REGISTRY_FILES = [
  '../routes/_registry.js',
  '../routes/registries/phases.registry.js', // W779: system-settings lives here post-W775
  '../routes/registries/features.registry.js',
  '../routes/registries/government.registry.js',
  '../routes/registries/clinical-assessment.registry.js',
].map(p => path.join(__dirname, p));

// The 17 paths converted to dualMountAuth in commit 501420d66. Every
// one of these returns clinical / HR / audit / governance data and
// MUST gate on `authenticate`.
const REQUIRES_AUTH = new Set([
  'assessments',
  'care-plans',
  'dashboards',
  'hr',
  'research',
  'sessions',
  'therapy-sessions',
  'reports',
  'system-settings',
  'rehab-templates',
  'form-templates',
  'programs',
  'tasks',
  'tele-rehab',
  'ar-vr',
  'icf-assessments',
  'approvals',
  'audit-logs',
]);

// Paths from REQUIRES_AUTH that may ALSO be mounted via plain `dualMount`
// because the underlying router file applies `authenticate` inline on
// every handler (so plain dualMount is safe there). Verified once at
// mount-time. Map: path → router source file applying internal auth.
const INTERNAL_AUTH_ROUTERS = {
  reports: '../routes/reports-analytics-module.routes.js', // 30+ inline `authenticate` applications
};

function normalize(src) {
  // Strip block comments + line comments so doc-text doesn't false-match.
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

// Match `dualMount(app, 'PATH', ...)` and `dualMountAuth(app, 'PATH', ...)`.
const MOUNT_CALL = /\b(dualMount|dualMountAuth)\(\s*app\s*,\s*['"]([a-zA-Z0-9_/-]+)['"]/g;

function collectMounts() {
  const mounts = []; // { fn, path, file }
  for (const file of REGISTRY_FILES) {
    const src = normalize(fs.readFileSync(file, 'utf8'));
    let m;
    while ((m = MOUNT_CALL.exec(src)) !== null) {
      mounts.push({ fn: m[1], path: m[2], file: path.basename(file) });
    }
  }
  return mounts;
}

describe('dualMountAuth invariant (commit 501420d66)', () => {
  const mounts = collectMounts();

  it('sanity: at least 50 mounts scanned across the registry files', () => {
    expect(mounts.length).toBeGreaterThanOrEqual(50);
  });

  for (const required of REQUIRES_AUTH) {
    it(`/api/v1/${required} is mounted via dualMountAuth (or a router with verified internal auth)`, () => {
      const calls = mounts.filter(m => m.path === required);
      expect(calls.length).toBeGreaterThan(0); // path is still mounted somewhere

      // At least one mount must be auth-gated.
      const hasAuthMount = calls.some(c => c.fn === 'dualMountAuth');
      const internalAuthFile = INTERNAL_AUTH_ROUTERS[required];

      if (!hasAuthMount && !internalAuthFile) {
        throw new Error(
          `'${required}' has no dualMountAuth mount and is not in INTERNAL_AUTH_ROUTERS. ` +
            `Found mounts: ${calls.map(c => `${c.fn}@${c.file}`).join(', ')}. ` +
            `See memory/project_auth_bypass_close_2026-05-20.md.`
        );
      }

      // If the path has an INTERNAL_AUTH_ROUTERS entry, verify that file
      // still imports `authenticate`. If a future edit removes it,
      // the contract breaks.
      if (internalAuthFile) {
        const fp = path.join(__dirname, internalAuthFile);
        const src = fs.readFileSync(fp, 'utf8');
        const hasImport = /require\(['"][^'"]*middleware\/auth['"]\)/.test(src);
        const hasUse = /\bauthenticate\b/.test(src);
        expect(hasImport && hasUse).toBe(true);
      }
    });
  }
});
