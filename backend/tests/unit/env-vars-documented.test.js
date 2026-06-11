/**
 * env-vars-documented.test.js — drift guard.
 *
 * On 2026-05-02 we shipped 16 new env vars across DR, ops-alerter, ZATCA
 * SLA, and smoke probes — every single one of them was missing from
 * `.env.example`. An operator reading the example file to set up
 * production wouldn't even know the flags existed. Fixed in the same
 * commit; this guard makes sure new flags don't slip through silently.
 *
 * What we enforce:
 *   • Every `process.env.<NAME>` reference under
 *     `backend/services/`, `backend/scripts/`, `backend/startup/`
 *     resolves to either a documented entry in `.env.example` OR is on
 *     the explicit allow-list below (Node built-ins, test-only flags,
 *     vendor SDK conventions).
 *
 * What we don't enforce:
 *   • Frontend env vars (different file, different audience).
 *   • Inline defaults — `process.env.X || 'default'` is fine; the guard
 *     just wants the NAME to be discoverable.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
// The repo has TWO .env.example files (legacy split between backend +
// root). An operator looking up a flag may find it in either; the guard
// considers both as "documented".
const ENV_EXAMPLE_PATHS = [
  path.join(REPO_ROOT, '.env.example'),
  path.join(REPO_ROOT, 'backend', '.env.example'),
];

// Folders we scan. Tests + jest-cache + node_modules are skipped.
const SCAN_DIRS = [
  path.resolve(__dirname, '../../services'),
  path.resolve(__dirname, '../../scripts'),
  path.resolve(__dirname, '../../startup'),
  path.resolve(__dirname, '../../config'),
];

// Variables that are well-known and don't need .env.example documentation.
const ALLOW_LIST = new Set([
  // Node + npm conventions
  'NODE_ENV',
  'NODE_OPTIONS',
  'NODE_PATH',
  'TZ',
  'PORT',
  'HOST',
  'CI',
  'DEBUG',
  // OS conventions (home-dir resolution in scripts/check-memory-health.js)
  'HOME',
  'USERPROFILE',
  // Process/runtime introspection
  'npm_package_version',
  'npm_lifecycle_event',
  // Vendor SDKs that read their own envs
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  // Common build-time flags
  'GENERATE_SOURCEMAP',
  // Test-only — safe to skip
  'JEST_WORKER_ID',
  'USE_MOCK_DB',
]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))) {
      acc.push(full);
    }
  }
  return acc;
}

function extractEnvRefs(src) {
  // Captures `process.env.NAME` and `process.env['NAME']`.
  const refs = new Set();
  const re1 = /process\.env\.([A-Z][A-Z0-9_]+)/g;
  const re2 = /process\.env\[\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\]/g;
  let m;
  while ((m = re1.exec(src))) refs.add(m[1]);
  while ((m = re2.exec(src))) refs.add(m[1]);
  return refs;
}

function extractDocumentedVars(envText) {
  // Captures both `NAME=` and `# NAME=` (commented examples are still
  // documented — operators see them).
  // IMPORTANT: use [ \t] not \s — \s matches \n which lets the leading
  // whitespace span across lines and skip variables silently.
  const docs = new Set();
  const re = /^[ \t]*#?[ \t]*([A-Z][A-Z0-9_]+)[ \t]*=/gm;
  let m;
  while ((m = re.exec(envText))) docs.add(m[1]);
  return docs;
}

describe('env-vars-documented', () => {
  const documented = new Set();
  for (const p of ENV_EXAMPLE_PATHS) {
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const name of extractDocumentedVars(text)) documented.add(name);
  }

  test('parser sanity: .env.example exposes a non-trivial number of vars', () => {
    expect(documented.size).toBeGreaterThan(50);
    expect(documented.has('MONGODB_URI')).toBe(true);
  });

  // Baseline established 2026-05-02. The repo had ~250 env vars
  // referenced in code but undocumented in .env.example BEFORE this
  // session. Backfilled the same day from 164 → 0 in one batch
  // (164 vars indexed under "Backend env-var index" appendix in
  // root .env.example). Ceiling now strict — every new flag must be
  // documented at write time.
  const UNDOCUMENTED_CEILING = 0;

  test(`undocumented count stays at-or-below the baseline (${UNDOCUMENTED_CEILING})`, () => {
    const allRefs = new Set();
    for (const dir of SCAN_DIRS) {
      for (const file of walk(dir)) {
        const src = fs.readFileSync(file, 'utf8');
        for (const ref of extractEnvRefs(src)) allRefs.add(ref);
      }
    }

    const undocumented = [];
    for (const name of allRefs) {
      if (ALLOW_LIST.has(name)) continue;
      if (documented.has(name)) continue;
      undocumented.push(name);
    }

    if (undocumented.length > UNDOCUMENTED_CEILING) {
      const detail = undocumented
        .sort()
        .slice(0, 50)
        .map(n => `  • ${n}`)
        .join('\n');
      throw new Error(
        `Undocumented env-var count rose to ${undocumented.length} ` +
          `(ceiling ${UNDOCUMENTED_CEILING}).\n\n` +
          `First 50 offenders:\n${detail}\n\n` +
          `Either:\n` +
          `  1. Add the variable to .env.example, OR\n` +
          `  2. Add it to ALLOW_LIST in this test if it's a Node/SDK built-in.\n` +
          `\nNever raise UNDOCUMENTED_CEILING — drive it down by adding docs.`
      );
    }
    expect(undocumented.length).toBeLessThanOrEqual(UNDOCUMENTED_CEILING);
  });

  // Reverse direction: catch DEAD entries in .env.example that have
  // no `process.env.X` reference under any of the scanned dirs. Many
  // microservice ports + feature flags from older phases drift into
  // this list. Ratchet at 172 — drive down over time.
  // 2026-05-11: bumped 166→172 to admit 6 go-live operator flags
  // (BACKUP_ENCRYPTION_KEY, ENABLE_AUTO_BACKUP, DB_BACKUP_KEEP_DAYS,
  //  OPS_ALERT_EMAIL, OPS_ALERT_PHONE, NPHIES_RECON_ENABLED) that
  // are documented for operators but only consumed by scripts/seeds.
  // 2026-05-15: bumped 172→175 to admit 3 Phase 30 operator flags
  // documented for the Intelligent HR Platform (HR_WORKFLOW_CRON,
  // HR_WORKFLOW_DISABLED, ANTHROPIC_API_KEY). The HR_WORKFLOW_* pair
  // is read in startup/schedulers.js (in REVERSE_SCAN) but the
  // ANTHROPIC_API_KEY read lives in app.js (outside REVERSE_SCAN by
  // design — boot-time config). Documented so operators can wire
  // Copilot without spelunking the codebase.
  const DEAD_CEILING = 175;

  test(`dead documented vars stay at-or-below baseline (${DEAD_CEILING})`, () => {
    const allRefs = new Set();
    // Re-scan a wider net for the reverse direction — the env var may
    // be referenced anywhere, not just in services/scripts/startup/config.
    const REVERSE_SCAN = SCAN_DIRS.concat([
      path.resolve(__dirname, '../../routes'),
      path.resolve(__dirname, '../../middleware'),
      path.resolve(__dirname, '../../models'),
      path.resolve(__dirname, '../../utils'),
    ]);
    for (const dir of REVERSE_SCAN) {
      for (const file of walk(dir)) {
        const src = fs.readFileSync(file, 'utf8');
        for (const ref of extractEnvRefs(src)) allRefs.add(ref);
      }
    }
    const dead = Array.from(documented).filter(n => !allRefs.has(n));
    if (dead.length > DEAD_CEILING) {
      const detail = dead
        .sort()
        .slice(0, 50)
        .map(n => `  • ${n}`)
        .join('\n');
      throw new Error(
        `Dead documented var count rose to ${dead.length} ` +
          `(ceiling ${DEAD_CEILING}).\n\n` +
          `First 50:\n${detail}\n\n` +
          `Either remove the entry from .env.example OR wire it into code.\n` +
          `Never raise DEAD_CEILING — drive it down.`
      );
    }
    expect(dead.length).toBeLessThanOrEqual(DEAD_CEILING);
  });

  describe('session-2026-05-02 flags are documented', () => {
    const SESSION_FLAGS = [
      'BACKUP_ENCRYPTION_KEY',
      'DR_MIN_USERS',
      'DR_MIN_BENEFICIARIES',
      'DR_VERIFY_TIMEOUT_MS',
      'OPS_ALERT_EMAIL',
      'OPS_ALERT_PHONE',
      'OPS_ALERT_CHANNELS',
      'ZATCA_AUTOSUBMIT',
      'ZATCA_SLA_SWEEPER_ENABLED',
      'ZATCA_SLA_INTERVAL_MS',
      'ZATCA_SLA_BATCH_SIZE',
      'ZATCA_SLA_WARN_MS',
      'ZATCA_SLA_BREACH_MS',
      'SMOKE_BASE_URL',
      'SMOKE_AUTH_TOKEN',
    ];
    test.each(SESSION_FLAGS)('%s is in .env.example', name => {
      expect(documented.has(name)).toBe(true);
    });
  });
});
