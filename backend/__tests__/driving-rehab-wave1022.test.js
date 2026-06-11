'use strict';

/**
 * W1022 drift guard — DrivingRehabAssessment + driving-rehab routes shape
 * integrity. Static analysis only (jest.setup mocks mongoose).
 *
 * Locks:
 *   • model registers as 'DrivingRehabAssessment' w/ canonical Beneficiary
 *     + Branch refs
 *   • RECOMMENDATIONS / READINESS_LEVELS / ADAPTIVE_EQUIPMENT / enums
 *     exported + don't shrink without a wave commit
 *   • Wave-18 invariants: enum gating, fit_with_adaptations ⇒ equipment,
 *     not_fit/further_training ⇒ nextReviewDue, finalized ⇒ finalizer +
 *     finalizedAt, nextReviewDue ≥ date
 *   • computeReadiness pure exported static
 *   • isFitToDrive + isReassessmentOverdue virtuals
 *   • route declares 11 endpoints, branch-scopes every query, mounts at
 *     /driving-rehab via dualMountAuth
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'DrivingRehabAssessment.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'driving-rehab.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/DrivingRehabAssessment');

describe('W1022 DrivingRehabAssessment — exports & enums', () => {
  it('exports the 5 RECOMMENDATIONS', () => {
    expect(model.RECOMMENDATIONS).toEqual([
      'fit_to_drive',
      'fit_with_adaptations',
      'not_fit_currently',
      'further_training',
      'refer_on_road_evaluation',
    ]);
  });

  it('exports READINESS_LEVELS', () => {
    expect(model.READINESS_LEVELS).toEqual([
      'not_ready',
      'further_assessment',
      'ready_with_adaptation',
      'ready',
    ]);
  });

  it('exports ONROAD_OUTCOMES + LICENSE_STATUSES', () => {
    expect(model.ONROAD_OUTCOMES).toContain('passed');
    expect(model.ONROAD_OUTCOMES).toContain('conditional');
    expect(model.LICENSE_STATUSES).toContain('learner');
  });

  it('exports a non-empty ADAPTIVE_EQUIPMENT catalog', () => {
    expect(Array.isArray(model.ADAPTIVE_EQUIPMENT)).toBe(true);
    expect(model.ADAPTIVE_EQUIPMENT.length).toBeGreaterThanOrEqual(8);
    expect(model.ADAPTIVE_EQUIPMENT).toContain('hand_controls');
    expect(model.ADAPTIVE_EQUIPMENT).toContain('wheelchair_accessible_vehicle');
  });

  it('exports a RESTRICTIONS catalog', () => {
    expect(model.RESTRICTIONS).toContain('automatic_transmission_only');
    expect(model.RESTRICTIONS).toContain('daytime_only');
  });
});

describe('W1022 DrivingRehabAssessment — schema refs', () => {
  it("registers as mongoose.model('DrivingRehabAssessment', ...)", () => {
    expect(MODEL_SRC).toMatch(/mongoose\.model\(\s*['"]DrivingRehabAssessment['"]/);
  });

  it("beneficiaryId ref:'Beneficiary' + branchId ref:'Branch'", () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId[\s\S]{0,120}ref:\s*['"]Beneficiary['"]/);
    expect(MODEL_SRC).toMatch(/branchId[\s\S]{0,120}ref:\s*['"]Branch['"]/);
  });

  it("collection is 'driving_rehab_assessments'", () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]driving_rehab_assessments['"]/);
  });
});

describe('W1022 DrivingRehabAssessment — Wave-18 invariants', () => {
  it('declares the __invariants path + validate()', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('gates recommendation / readinessLevel / onRoadAssessment enums', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]recommendation['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]readinessLevel['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]onRoadAssessment['"]/);
  });

  it('fit_with_adaptations ⇒ adaptiveEquipmentNeeded', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*\n?\s*['"]adaptiveEquipmentNeeded['"]/);
  });

  it('not_fit/further_training ⇒ nextReviewDue; finalized ⇒ finalizer + finalizedAt', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]nextReviewDue['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedBy['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedAt['"]/);
  });
});

describe('W1022 DrivingRehabAssessment — computeReadiness + virtuals', () => {
  it('computeReadiness is an exported function with conservative logic', () => {
    expect(typeof model.computeReadiness).toBe('function');
    expect(model.computeReadiness({})).toBe('not_ready');
    expect(
      model.computeReadiness({
        visionAdequate: true,
        cognitiveScreenLevel: 'pass',
        physicalControlLevel: 'adequate',
        seatingTransfersLevel: 'independent',
      })
    ).toBe('ready');
  });

  it('declares isFitToDrive + isReassessmentOverdue virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isFitToDrive['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isReassessmentOverdue['"]\)/);
  });
});

describe('W1022 driving-rehab routes — endpoint surface', () => {
  it('GET /fit-to-drive', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/fit-to-drive['"]/);
  });
  it('GET / (list)', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]/);
  });
  it('GET /by-beneficiary/:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/by-beneficiary\/:id['"]/);
  });
  it('GET /stats', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/stats['"]/);
  });
  it('GET /due', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/due['"]/);
  });
  it('GET /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]/);
  });
  it('POST / (create)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/finalize', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/finalize['"]/);
  });
  it('POST /:id/add-equipment', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/add-equipment['"]/);
  });
  it('PATCH /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.patch\(\s*['"]\/:id['"]/);
  });
  it('DELETE /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.delete\(\s*['"]\/:id['"]/);
  });

  it('authenticates + branch-scopes', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  it('every read query flows through branchFilter (no bare findById)', () => {
    expect(ROUTES_SRC).not.toMatch(/findById\(req\.params/);
    const branchFilterUses = ROUTES_SRC.match(/branchFilter\(req\)/g) || [];
    expect(branchFilterUses.length).toBeGreaterThanOrEqual(7);
  });

  it('blocks edits after finalize (409 in finalize + patch + add-equipment)', () => {
    const finalizedBlocks = ROUTES_SRC.match(/status\s*===\s*['"]finalized['"]/g) || [];
    expect(finalizedBlocks.length).toBeGreaterThanOrEqual(3);
  });

  it('server re-derives readiness via computeReadiness', () => {
    expect(ROUTES_SRC).toMatch(/computeReadiness\(/);
  });
});

describe('W1022 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/driving-rehab.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /drivingRehabRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/driving-rehab\.routes['"]\)/
    );
  });

  it('mounts at /driving-rehab via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]driving-rehab['"]\s*,\s*drivingRehabRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1022 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1022/);
    expect(REGISTRY_SRC).toMatch(/تقييم تأهيل القيادة/);
  });
});
