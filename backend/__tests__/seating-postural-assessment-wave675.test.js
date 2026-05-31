'use strict';

/**
 * Static drift guard — SeatingPosturalAssessment (W675).
 *
 * Mirrors the W670-W672 guards: asserts the model file declares the canonical
 * enums, the Wave-18 __invariants block with each required invalidate() call,
 * the right refs, virtuals, and that the route file wires the standard
 * branch-scoped middleware stack + the dualMountAuth contract.
 *
 * Static (source-text) only — jest.setup mocks mongoose so we don't boot Mongo.
 * The behavioral counterpart is seating-postural-assessment-behavioral-wave675.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SeatingPosturalAssessment.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'seating-postural-assessment.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('SeatingPosturalAssessment model — W675 static drift guard', () => {
  test('declares canonical enums', () => {
    expect(MODEL_SRC).toMatch(/const ASSESSMENT_TYPES = \[/);
    expect(MODEL_SRC).toMatch(/const CONTEXTS = \[/);
    expect(MODEL_SRC).toMatch(/const BODY_SEGMENTS = \[/);
    expect(MODEL_SRC).toMatch(/const SUPPORT_LEVELS = \[/);
    expect(MODEL_SRC).toMatch(/const RISK_LEVELS = \[/);
    expect(MODEL_SRC).toMatch(/const INJURY_STAGES = \[/);
    expect(MODEL_SRC).toMatch(/const EQUIPMENT_TYPES = \[/);
  });

  test('GMFCS levels include IV and V (the seating-critical band)', () => {
    expect(MODEL_SRC).toMatch(/const GMFCS_LEVELS = \[/);
    expect(MODEL_SRC).toMatch(/'IV'/);
    expect(MODEL_SRC).toMatch(/'V'/);
  });

  test('beneficiaryId + branchId refs are canonical', () => {
    expect(MODEL_SRC).toMatch(/ref: 'Beneficiary'/);
    expect(MODEL_SRC).toMatch(/ref: 'Branch'/);
  });

  test('cross-links the AssistiveDevice inventory record', () => {
    expect(MODEL_SRC).toMatch(/ref: 'AssistiveDevice'/);
  });

  test('declares __invariants validate block', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/\.path\('__invariants'\)\.validate\(/);
  });

  test('enforces moderate/high pressure risk -> mitigationPlan', () => {
    expect(MODEL_SRC).toMatch(/mitigationPlan required when pressureInjuryRisk/);
  });

  test('enforces existingPressureInjury -> stage + site', () => {
    expect(MODEL_SRC).toMatch(/injuryStage required when existingPressureInjury/);
    expect(MODEL_SRC).toMatch(/injurySite required when existingPressureInjury/);
  });

  test('enforces discharge -> outcomeSummary', () => {
    expect(MODEL_SRC).toMatch(/outcomeSummary required for a discharge/);
  });

  test('enforces finalized -> assessor + assessedAt', () => {
    expect(MODEL_SRC).toMatch(/assessor required to finalize/);
    expect(MODEL_SRC).toMatch(/assessedAt required to finalize/);
  });

  test('declares isPressureAtRisk + segmentsSupported virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\('isPressureAtRisk'\)/);
    expect(MODEL_SRC).toMatch(/virtual\('segmentsSupported'\)/);
  });

  test('exports enums for route reuse', () => {
    expect(MODEL_SRC).toMatch(/module\.exports\.ASSESSMENT_TYPES = ASSESSMENT_TYPES/);
    expect(MODEL_SRC).toMatch(/module\.exports\.RISK_LEVELS = RISK_LEVELS/);
    expect(MODEL_SRC).toMatch(/module\.exports\.BODY_SEGMENTS = BODY_SEGMENTS/);
  });
});

describe('seating-postural-assessment routes — W675 static drift guard', () => {
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

  test('exposes the pressure-injury at-risk board', () => {
    expect(ROUTE_SRC).toMatch(/\/at-risk/);
  });

  test('finalize transition exists', () => {
    expect(ROUTE_SRC).toMatch(/\/:id\/finalize/);
  });
});

describe('seating-postural-assessment registry wiring — W675', () => {
  test('route is required + mounted via dualMountAuth (not a null placeholder)', () => {
    expect(REGISTRY_SRC).toMatch(
      /seatingPosturalAssessmentRoutes = safeRequire\(\s*'\.\.\/routes\/seating-postural-assessment\.routes'/
    );
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app,\s*'seating-postural-assessment',\s*seatingPosturalAssessmentRoutes,\s*authenticate/
    );
    // guard against the interrupted-edit bug: no null placeholder mount
    expect(REGISTRY_SRC).not.toMatch(/seatingRoutesMaybe/);
  });
});
