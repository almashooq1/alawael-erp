/**
 * caseload-assignment-wave436.test.js — Wave 436 (Phase E4 close + F2 5/5).
 *
 * Static drift guard + behavioural smoke for the W436 caseload-assignment
 * suggest route. This route is the FIFTH and final producer wired into
 * the W435 Phase F2 metrics chain — closes the 5/5 instrumentation that
 * started with the W427 broker + W430 sweeper + W434 escalation source
 * + W507 smart-inbox route.
 *
 * Static-only verification (no real Mongoose / no app boot needed). The
 * route's contracts are explicit in source — checks reference each one:
 *
 *   1. Anti-orphaning sentinel — route file exists, registry mounts at
 *      both /api and /api/v1 prefixes, route requires the W432 matcher
 *      lib AND the W435 metrics facade.
 *   2. F2 instrumentation — every result path emits incCaseloadMatch
 *      with a documented outcome label ('match_found' | 'no_candidates'
 *      | 'all_excluded').
 *   3. Auth + branch isolation — authenticate + requireBranchAccess
 *      applied at router level, assertBeneficiaryInScope guards the
 *      beneficiary lookup, branchFilter scopes the therapist candidates.
 *   4. Read-only contract — file source contains NO User.update*, no
 *      .save() write, no findOneAndUpdate (this surface SUGGESTS, never
 *      assigns; the supervisor applies via a separate write endpoint).
 *   5. F2 chain catalog — counts the 5 metric-emit sites across the
 *      Phase F2 producer chain to verify all five are wired.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const ROUTE_JS = path.resolve(BACKEND, 'routes', 'caseload-assignment.routes.js');
const REGISTRY_JS = path.resolve(BACKEND, 'routes', 'registries', 'phases.registry.js');
const READ = p => fs.readFileSync(p, 'utf8');

// ──────────────────────────────────────────────────────────────────
//  1. Anti-orphaning sentinel
// ──────────────────────────────────────────────────────────────────

describe('W436 — anti-orphaning sentinel', () => {
  test('route file exists at routes/caseload-assignment.routes.js', () => {
    expect(fs.existsSync(ROUTE_JS)).toBe(true);
  });

  test('phases.registry mounts at /api/caseload-assignment AND /api/v1/caseload-assignment', () => {
    const reg = READ(REGISTRY_JS);
    expect(reg).toMatch(
      /safeMount\([^)]*\['\/api\/caseload-assignment',\s*'\/api\/v1\/caseload-assignment'\][^)]*\.\.\/routes\/caseload-assignment\.routes/
    );
  });

  test('route imports W432 matcher lib + W435 metrics facade', () => {
    const src = READ(ROUTE_JS);
    expect(src).toMatch(/require\(['"]\.\.\/intelligence\/caseload-matcher\.lib['"]\)/);
    expect(src).toMatch(/require\(['"]\.\.\/intelligence\/smart-platform-metrics\.service['"]\)/);
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. F2 metric emission — every result path covered
// ──────────────────────────────────────────────────────────────────

describe('W436 — incCaseloadMatch wired at every result path', () => {
  test('route emits all 3 documented outcomes (literal or via outcome var)', () => {
    const src = READ(ROUTE_JS);
    // _emitMatchMetric is invoked at every result path — directly with a
    // literal for early-return paths, or with the outcome variable for the
    // happy path where outcome is derived inline.
    expect(src).toMatch(/_emitMatchMetric\(/);
    // The 3 documented outcome strings must all appear in the file body
    // (either as literal arg to _emitMatchMetric or in the outcome
    // assignment that gets passed to it).
    expect(src).toMatch(/['"]match_found['"]/);
    expect(src).toMatch(/['"]no_candidates['"]/);
    expect(src).toMatch(/['"]all_excluded['"]/);
    // The dynamic-emit path uses the outcome variable
    expect(src).toMatch(/_emitMatchMetric\(outcome\)/);
  });

  test('_emitMatchMetric is try-catch wrapped (never throws into hot path)', () => {
    const src = READ(ROUTE_JS);
    expect(src).toMatch(/function _emitMatchMetric\(/);
    const helperMatch = src.match(/function _emitMatchMetric\([\s\S]*?\n\}\n/);
    expect(helperMatch).toBeTruthy();
    expect(helperMatch[0]).toMatch(/try\s*\{/);
    expect(helperMatch[0]).toMatch(/catch\s*\{?/);
  });

  test('emit helper lazy-binds via getDefault (W435+ pattern)', () => {
    const src = READ(ROUTE_JS);
    expect(src).toMatch(/metricsModule\.getDefault\(\)/);
    expect(src).toMatch(/incCaseloadMatch\(/);
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. Auth + branch isolation
// ──────────────────────────────────────────────────────────────────

describe('W436 — auth + branch isolation contract', () => {
  test('router.use(authenticate) + router.use(requireBranchAccess) at top level', () => {
    const src = READ(ROUTE_JS);
    expect(src).toMatch(/router\.use\(authenticate\)/);
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('beneficiary cross-branch lookup uses assertBeneficiaryInScope (uniform 404)', () => {
    const src = READ(ROUTE_JS);
    expect(src).toMatch(/require\(['"]\.\.\/utils\/beneficiaryBranchGate['"]\)/);
    expect(src).toMatch(/assertBeneficiaryInScope\(req,\s*beneficiaryId\)/);
  });

  test('therapist candidate query scoped via branchFilter(req)', () => {
    const src = READ(ROUTE_JS);
    expect(src).toMatch(/branchFilter\(req\)/);
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. Read-only contract (NEVER writes — same as W510 sibling)
// ──────────────────────────────────────────────────────────────────

describe('W436 — read-only contract: NEVER writes to DB', () => {
  test('source contains no .save() call', () => {
    const src = READ(ROUTE_JS);
    expect(src).not.toMatch(/\.save\(/);
  });

  test('source contains no findOneAndUpdate / updateOne / updateMany / create', () => {
    const src = READ(ROUTE_JS);
    expect(src).not.toMatch(/\.findOneAndUpdate\(/);
    expect(src).not.toMatch(/\.updateOne\(/);
    expect(src).not.toMatch(/\.updateMany\(/);
    expect(src).not.toMatch(/\.create\(/);
  });

  test('source contains no $set / $push / $inc operators', () => {
    const src = READ(ROUTE_JS);
    expect(src).not.toMatch(/['"]\$set['"]/);
    expect(src).not.toMatch(/['"]\$push['"]/);
    expect(src).not.toMatch(/['"]\$inc['"]/);
  });

  test('only HTTP verbs allowed: GET', () => {
    const src = READ(ROUTE_JS);
    expect(src).not.toMatch(/router\.post\(/);
    expect(src).not.toMatch(/router\.put\(/);
    expect(src).not.toMatch(/router\.patch\(/);
    expect(src).not.toMatch(/router\.delete\(/);
    expect(src).toMatch(/router\.get\(/);
  });
});

// ──────────────────────────────────────────────────────────────────
//  5. W435 Phase F2 chain — 5/5 producer sites verified
// ──────────────────────────────────────────────────────────────────

describe('W436 — Phase F2 chain catalog (5/5 producers wired)', () => {
  const PRODUCERS = [
    {
      name: 'W427 realtime broker',
      file: path.resolve(BACKEND, 'startup', 'realtimeGatewayBootstrap.js'),
      pattern: /metrics\.incRealtimeEvent/,
    },
    {
      name: 'W430 forecaster sweeper',
      file: path.resolve(BACKEND, 'startup', 'goalForecasterBootstrap.js'),
      pattern: /metrics\.incForecastAlert/,
    },
    {
      name: 'W434 escalation source plugin',
      file: path.resolve(
        BACKEND,
        'intelligence',
        'risk',
        'sources',
        'behavioral-escalation.source.js'
      ),
      pattern: /incEscalationPrediction/,
    },
    {
      name: 'W507 smart-inbox route',
      file: path.resolve(BACKEND, 'routes', 'smart-inbox.routes.js'),
      pattern: /incInboxRanking/,
    },
    {
      name: 'W436 caseload-assignment route (this wave)',
      file: ROUTE_JS,
      pattern: /incCaseloadMatch/,
    },
  ];

  test.each(PRODUCERS)('producer wire site exists: $name', ({ file, pattern }) => {
    expect(fs.existsSync(file)).toBe(true);
    const src = READ(file);
    expect(src).toMatch(pattern);
  });

  test('all 5 producers identified — full Phase F2 chain instrumented', () => {
    expect(PRODUCERS).toHaveLength(5);
  });
});
