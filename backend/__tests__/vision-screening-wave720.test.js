'use strict';

/**
 * Static drift guard — VisionScreening (W720).
 *
 * Mirrors the W670-W675 guards: asserts the model declares canonical enums, the
 * Wave-18 __invariants block with each required invalidate() call, canonical
 * refs, virtuals, and that the route wires the branch-scoped middleware stack +
 * the dualMountAuth registry contract.
 *
 * Static (source-text) only — jest.setup mocks mongoose. Behavioral counterpart
 * is vision-screening-behavioral-wave720.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'VisionScreening.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'vision-screening.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('VisionScreening model — W720 static drift guard', () => {
  test('declares canonical enums', () => {
    expect(MODEL_SRC).toMatch(/const METHODS = \[/);
    expect(MODEL_SRC).toMatch(/const ACUITY_LEVELS = \[/);
    expect(MODEL_SRC).toMatch(/const OUTCOMES = \[/);
    expect(MODEL_SRC).toMatch(/const CVI_SIGNS = \[/);
    expect(MODEL_SRC).toMatch(/const FUNCTIONAL_DOMAINS = \[/);
  });

  test('OUTCOMES are pass/monitor/refer (the screen triage)', () => {
    expect(MODEL_SRC).toMatch(/const OUTCOMES = \['pass', 'monitor', 'refer'\]/);
  });

  test('includes preferential-looking + observation methods for non-verbal kids', () => {
    expect(MODEL_SRC).toMatch(/teller_cardiff_cards/);
    expect(MODEL_SRC).toMatch(/observation_only/);
    expect(MODEL_SRC).toMatch(/fixation_following/);
  });

  test('CVI behavioural cluster present (colour preference + complexity + latency)', () => {
    expect(MODEL_SRC).toMatch(/colour_preference/);
    expect(MODEL_SRC).toMatch(/difficulty_with_complexity/);
    expect(MODEL_SRC).toMatch(/visual_latency/);
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

  test('enforces glassesPrescribed -> glassesDetail', () => {
    expect(MODEL_SRC).toMatch(/glassesDetail required when glassesPrescribed=true/);
  });

  test('enforces cviSuspected -> at least one cviSign', () => {
    expect(MODEL_SRC).toMatch(/at least one cviSign required when cviSuspected=true/);
  });

  test('enforces finalized -> screener + screenedAt', () => {
    expect(MODEL_SRC).toMatch(/screener required to finalize/);
    expect(MODEL_SRC).toMatch(/screenedAt required to finalize/);
  });

  test('declares needsReferral + cviSignCount virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\('needsReferral'\)/);
    expect(MODEL_SRC).toMatch(/virtual\('cviSignCount'\)/);
  });

  test('exports enums for route reuse', () => {
    expect(MODEL_SRC).toMatch(/module\.exports\.METHODS = METHODS/);
    expect(MODEL_SRC).toMatch(/module\.exports\.OUTCOMES = OUTCOMES/);
    expect(MODEL_SRC).toMatch(/module\.exports\.CVI_SIGNS = CVI_SIGNS/);
  });
});

describe('vision-screening routes — W720 static drift guard', () => {
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

describe('vision-screening registry wiring — W720', () => {
  const FLAT = REGISTRY_SRC.replace(/\s+/g, ' ');

  test('route is required from the canonical path', () => {
    expect(FLAT).toMatch(
      /visionScreeningRoutes = safeRequire\( ?'\.\.\/routes\/vision-screening\.routes'/
    );
  });

  test('route is dual-mounted with the real routes variable', () => {
    expect(FLAT).toMatch(
      /dualMountAuth\( ?app, 'vision-screening', visionScreeningRoutes, authenticate/
    );
  });
});
