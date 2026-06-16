'use strict';

/**
 * W1375 — shared launch-readiness evaluator + read-only route.
 *
 *  1. BEHAVIORAL — evaluateLaunchReadiness against a FAKE db (no Mongo): drives
 *     every check via stubbed counts. Proves: GO iff zero NOT-YET; INFO
 *     (SMTP/demo) never blocks; model-true collection names are queried; the
 *     fix command rides each NOT-YET; summary tallies.
 *  2. STATIC — CLI + route both consume the service (DRY); route is read-only,
 *     admin-gated, registry-mounted.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(BACKEND, rel), 'utf8');
const { evaluateLaunchReadiness } = require('../services/launchReadiness.service');

// Fake mongoose db: counts keyed by collection name; supports the $regex/query
// args the evaluator passes (we only vary by collection name here).
function fakeDb(counts) {
  const queried = [];
  return {
    queried,
    collection(name) {
      queried.push(name);
      return {
        countDocuments: async () => {
          if (!(name in counts)) return null; // unknown collection → null (absent)
          return counts[name];
        },
      };
    },
  };
}

const FULL = {
  formtemplates: 83,
  measures_library: 8,
  goalbanks: 72,
  icfcodereferences: 105,
  branches: 4,
  users: 13,
  beneficiaries: 18, // also used for the demo regex query → returns 18 unless overridden
  clinical_sessions: 0,
  therapysessions: 19,
};

describe('W1375 evaluator — verdict semantics', () => {
  test('all seeded + no NOT-YET → GO; INFO items do not block', async () => {
    // beneficiaries query is used twice (active + demo-regex); keep both >0 so
    // "beneficiary registered" PASSes and "demo-data" INFOs.
    const r = await evaluateLaunchReadiness({
      db: fakeDb(FULL),
      env: { SMTP_USER: 'u', SMTP_PASS: 'p' },
    });
    expect(r.go).toBe(true);
    expect(r.summary.notYet).toBe(0);
    expect(r.summary.info).toBeGreaterThanOrEqual(1); // demo-data INFO at least
    expect(r.checks.find((c) => c.name.startsWith('mail')).status).toBe('PASS');
  });

  test('missing seeds → NOT-YET with a fix command each; verdict NOT-YET', async () => {
    const r = await evaluateLaunchReadiness({
      db: fakeDb({ ...FULL, formtemplates: 0, measures_library: 0, goalbanks: 0 }),
      env: { SMTP_USER: 'u', SMTP_PASS: 'p' },
    });
    expect(r.go).toBe(false);
    const notyets = r.checks.filter((c) => c.status === 'NOT-YET');
    expect(notyets.length).toBeGreaterThanOrEqual(3);
    for (const c of notyets) expect(typeof c.fix).toBe('string');
  });

  test('no SMTP → mail is INFO (owner-gated), NOT a blocker', async () => {
    const r = await evaluateLaunchReadiness({ db: fakeDb(FULL), env: {} });
    const mail = r.checks.find((c) => c.name.startsWith('mail'));
    expect(mail.status).toBe('INFO');
    // mail being unset must not flip GO on its own
    expect(r.go).toBe(true);
  });

  test('queries the model-true collection names (W1287 lesson)', async () => {
    const db = fakeDb(FULL);
    await evaluateLaunchReadiness({ db, env: {} });
    expect(db.queried).toContain('icfcodereferences');
    expect(db.queried).toContain('clinical_sessions');
    expect(db.queried).not.toContain('icfcodes');
    expect(db.queried).not.toContain('clinicalsessions');
  });

  test('session split: ClinicalSessions present but 0 projected → NOT-YET', async () => {
    const r = await evaluateLaunchReadiness({
      db: fakeDb({ ...FULL, clinical_sessions: 5, therapysessions: 0 }),
      env: { SMTP_USER: 'u', SMTP_PASS: 'p' },
    });
    const split = r.checks.find((c) => c.name.includes('session write/read split'));
    expect(split.status).toBe('NOT-YET');
    expect(r.go).toBe(false);
  });

  test('requires a db handle', async () => {
    await expect(evaluateLaunchReadiness({})).rejects.toThrow(/db handle/);
  });
});

describe('W1375 static wiring', () => {
  test('CLI consumes the shared service (DRY, no inline check duplication)', () => {
    const cli = read('scripts/launch-readiness.js');
    expect(cli).toMatch(/require\('\.\.\/services\/launchReadiness\.service'\)/);
    expect(cli).toMatch(/evaluateLaunchReadiness\(/);
    // the inline check helpers must be GONE from the CLI
    expect(cli).not.toMatch(/countSafe\('formtemplates'\)/);
  });

  test('route: read-only, admin-gated, consumes the service', () => {
    const r = read('routes/launch-readiness.routes.js');
    expect(r).not.toMatch(/router\.(post|put|patch|delete)\(/);
    expect(r).toMatch(/requireRole\(ADMIN_ROLES\)/);
    expect(r).toMatch(/evaluateLaunchReadiness\(/);
  });

  test('mounted via dualMountAuth in features.registry', () => {
    const reg = read('routes/registries/features.registry.js');
    expect(reg).toMatch(/safeRequire\('\.\.\/routes\/launch-readiness\.routes'\)/);
    expect(reg).toMatch(/dualMountAuth\(app, 'launch-readiness', launchReadinessRoutes, authenticate\)/);
  });
});
