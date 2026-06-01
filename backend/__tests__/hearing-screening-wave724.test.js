'use strict';

/**
 * Static drift guard — HearingScreening (W724).
 *
 * Mirrors the W720 vision guard: asserts the model declares canonical enums, the
 * Wave-18 __invariants block with each required invalidate() call, canonical
 * refs, virtuals, and that the route wires the branch-scoped middleware stack +
 * the dualMountAuth registry contract. Static (source-text) only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'HearingScreening.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'hearing-screening.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('HearingScreening model — W724 static drift guard', () => {
  test('declares canonical enums', () => {
    expect(MODEL_SRC).toMatch(/const METHODS = \[/);
    expect(MODEL_SRC).toMatch(/const THRESHOLD_BANDS = \[/);
    expect(MODEL_SRC).toMatch(/const OUTCOMES = \[/);
    expect(MODEL_SRC).toMatch(/const LOSS_TYPES = \[/);
    expect(MODEL_SRC).toMatch(/const SEVERITY = \[/);
    expect(MODEL_SRC).toMatch(/const FUNCTIONAL_DOMAINS = \[/);
  });

  test('OUTCOMES are pass/monitor/refer (the screen triage)', () => {
    expect(MODEL_SRC).toMatch(/const OUTCOMES = \['pass', 'monitor', 'refer'\]/);
  });

  test('includes age-appropriate methods for non-verbal kids', () => {
    expect(MODEL_SRC).toMatch(/'oae'/);
    expect(MODEL_SRC).toMatch(/'vra'/);
    expect(MODEL_SRC).toMatch(/'play_audiometry'/);
    expect(MODEL_SRC).toMatch(/'observation_only'/);
  });

  test('WHO threshold bands span normal..complete', () => {
    expect(MODEL_SRC).toMatch(/normal_lt_20/);
    expect(MODEL_SRC).toMatch(/profound_80_94/);
    expect(MODEL_SRC).toMatch(/complete_gte_95/);
  });

  test('loss types cover conductive/sensorineural/mixed/auditory_neuropathy', () => {
    expect(MODEL_SRC).toMatch(/conductive/);
    expect(MODEL_SRC).toMatch(/sensorineural/);
    expect(MODEL_SRC).toMatch(/auditory_neuropathy/);
  });

  test('beneficiaryId + branchId refs are canonical', () => {
    expect(MODEL_SRC).toMatch(/ref: 'Beneficiary'/);
    expect(MODEL_SRC).toMatch(/ref: 'Branch'/);
  });

  test('declares __invariants validate block', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/\.path\('__invariants'\)\.validate\(/);
  });

  test('enforces outcome=refer -> referralReason', () => {
    expect(MODEL_SRC).toMatch(/referralReason required when outcome=refer/);
  });

  test('enforces hearingAidRecommended -> hearingAidDetail', () => {
    expect(MODEL_SRC).toMatch(/hearingAidDetail required when hearingAidRecommended=true/);
  });

  test('enforces lossDetected -> at least one affected ear', () => {
    expect(MODEL_SRC).toMatch(/at least one ear .* required when lossDetected=true/);
  });

  test('enforces finalized -> screener + screenedAt', () => {
    expect(MODEL_SRC).toMatch(/screener required to finalize/);
    expect(MODEL_SRC).toMatch(/screenedAt required to finalize/);
  });

  test('declares needsReferral + isBilateral virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\('needsReferral'\)/);
    expect(MODEL_SRC).toMatch(/virtual\('isBilateral'\)/);
  });

  test('exports enums for route reuse', () => {
    expect(MODEL_SRC).toMatch(/module\.exports\.METHODS = METHODS/);
    expect(MODEL_SRC).toMatch(/module\.exports\.THRESHOLD_BANDS = THRESHOLD_BANDS/);
    expect(MODEL_SRC).toMatch(/module\.exports\.LOSS_TYPES = LOSS_TYPES/);
  });
});

describe('hearing-screening routes — W724 static drift guard', () => {
  test('mounts the branch-scoped middleware stack', () => {
    expect(ROUTE_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTE_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTE_SRC).toMatch(/router\.use\(bodyScopedBeneficiaryGuard\)/);
  });

  test('every query is branch-filtered (W445)', () => {
    expect(ROUTE_SRC).toMatch(/branchFilter\(req\)/);
    const finds = (ROUTE_SRC.match(/\.find\(/g) || []).length;
    const filters = (ROUTE_SRC.match(/branchFilter\(req\)/g) || []).length;
    expect(filters).toBeGreaterThanOrEqual(Math.min(5, finds));
  });

  test('validates ObjectId on :id routes', () => {
    expect(ROUTE_SRC).toMatch(/isValidObjectId/);
  });

  test('exposes the needs-referral board', () => {
    expect(ROUTE_SRC).toMatch(/\/needs-referral/);
  });

  test('finalize transition exists', () => {
    expect(ROUTE_SRC).toMatch(/\/:id\/finalize/);
  });
});

describe('hearing-screening registry wiring — W724', () => {
  const FLAT = REGISTRY_SRC.replace(/\s+/g, ' ');

  test('route is required from the canonical path', () => {
    expect(FLAT).toMatch(
      /hearingScreeningRoutes = safeRequire\( ?'\.\.\/routes\/hearing-screening\.routes'/
    );
  });

  test('route is dual-mounted with the real routes variable', () => {
    expect(FLAT).toMatch(
      /dualMountAuth\( ?app, 'hearing-screening', hearingScreeningRoutes, authenticate/
    );
  });
});
