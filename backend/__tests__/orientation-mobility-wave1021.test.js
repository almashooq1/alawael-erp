'use strict';

/**
 * W1021 drift guard — OrientationMobilityAssessment + orientation-mobility
 * routes shape integrity. Static analysis only (jest.setup mocks mongoose).
 *
 * Locks:
 *   • model registers as 'OrientationMobilityAssessment' w/ canonical
 *     Beneficiary + Branch refs + VisionScreening cross-link
 *   • VISION_STATUSES / MOBILITY_AIDS / PROFICIENCY_LEVELS /
 *     INDEPENDENCE_LEVELS / DOMAINS / TRAINING_GOALS exported + don't shrink
 *   • Wave-18 invariants: enum gating, dependent/emerging ⇒ trainingGoals,
 *     finalized ⇒ finalizer + finalizedAt, nextReviewDue ≥ date
 *   • computeIndependence pure exported static with stable banding
 *   • isIndependent + isReassessmentOverdue virtuals
 *   • route file declares 11 endpoints, branch-scopes every query, mounts
 *     at /orientation-mobility via dualMountAuth
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'OrientationMobilityAssessment.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'orientation-mobility.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/OrientationMobilityAssessment');

describe('W1021 OrientationMobilityAssessment — exports & enums', () => {
  it('exports VISION_STATUSES incl deafblind', () => {
    expect(model.VISION_STATUSES).toEqual([
      'blind',
      'low_vision',
      'functional_low_vision',
      'deafblind',
    ]);
  });

  it('exports MOBILITY_AIDS incl long_cane + guide_dog', () => {
    expect(model.MOBILITY_AIDS).toContain('long_cane');
    expect(model.MOBILITY_AIDS).toContain('guide_dog');
    expect(model.MOBILITY_AIDS).toContain('sighted_guide');
  });

  it('exports PROFICIENCY_LEVELS + INDEPENDENCE_LEVELS', () => {
    expect(model.PROFICIENCY_LEVELS).toEqual([
      'not_assessed',
      'dependent',
      'emerging',
      'developing',
      'independent',
    ]);
    expect(model.INDEPENDENCE_LEVELS).toEqual(['dependent', 'emerging', 'developing', 'independent']);
  });

  it('exports the 9 scored DOMAINS', () => {
    expect(Array.isArray(model.DOMAINS)).toBe(true);
    expect(model.DOMAINS.length).toBe(9);
    expect(model.DOMAINS).toContain('caneSkills');
    expect(model.DOMAINS).toContain('streetCrossing');
  });

  it('exports a non-empty TRAINING_GOALS catalog', () => {
    expect(Array.isArray(model.TRAINING_GOALS)).toBe(true);
    expect(model.TRAINING_GOALS.length).toBeGreaterThanOrEqual(10);
    expect(model.TRAINING_GOALS).toContain('cane_skills_indoor');
    expect(model.TRAINING_GOALS).toContain('public_transport');
  });
});

describe('W1021 OrientationMobilityAssessment — schema refs', () => {
  it("registers as mongoose.model('OrientationMobilityAssessment', ...)", () => {
    expect(MODEL_SRC).toMatch(/mongoose\.model\(\s*['"]OrientationMobilityAssessment['"]/);
  });

  it("beneficiaryId ref:'Beneficiary' + branchId ref:'Branch'", () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId[\s\S]{0,120}ref:\s*['"]Beneficiary['"]/);
    expect(MODEL_SRC).toMatch(/branchId[\s\S]{0,120}ref:\s*['"]Branch['"]/);
  });

  it("cross-links VisionScreening (W720)", () => {
    expect(MODEL_SRC).toMatch(/ref:\s*['"]VisionScreening['"]/);
  });

  it("collection is 'orientation_mobility_assessments'", () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]orientation_mobility_assessments['"]/);
  });
});

describe('W1021 OrientationMobilityAssessment — Wave-18 invariants', () => {
  it('declares the __invariants path + validate()', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('gates visionStatus / primaryMobilityAid / independenceLevel enums', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]visionStatus['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]primaryMobilityAid['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]independenceLevel['"]/);
  });

  it('dependent/emerging ⇒ trainingGoals', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*\n?\s*['"]trainingGoals['"]/);
  });

  it('finalized ⇒ finalizer + finalizedAt; nextReviewDue ≥ date', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedBy['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedAt['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]nextReviewDue['"]/);
  });
});

describe('W1021 OrientationMobilityAssessment — computeIndependence + virtuals', () => {
  it('computeIndependence is an exported function with correct bands', () => {
    expect(typeof model.computeIndependence).toBe('function');
    expect(model.computeIndependence({}).level).toBe('dependent');
    const allIndep = {};
    for (const d of model.DOMAINS) allIndep[d] = 'independent';
    expect(model.computeIndependence(allIndep)).toEqual({ score: 100, level: 'independent' });
  });

  it('declares isIndependent + isReassessmentOverdue virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isIndependent['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isReassessmentOverdue['"]\)/);
  });
});

describe('W1021 orientation-mobility routes — endpoint surface', () => {
  it('GET /needs-support', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/needs-support['"]/);
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
  it('POST /:id/add-goal', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/add-goal['"]/);
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

  it('blocks edits after finalize (409 in finalize + patch + add-goal)', () => {
    const finalizedBlocks = ROUTES_SRC.match(/status\s*===\s*['"]finalized['"]/g) || [];
    expect(finalizedBlocks.length).toBeGreaterThanOrEqual(3);
  });

  it('server re-derives independence via computeIndependence', () => {
    expect(ROUTES_SRC).toMatch(/computeIndependence\(/);
  });
});

describe('W1021 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/orientation-mobility.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /orientationMobilityRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/orientation-mobility\.routes['"]\)/
    );
  });

  it('mounts at /orientation-mobility via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]orientation-mobility['"]\s*,\s*orientationMobilityRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1021 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1021/);
    expect(REGISTRY_SRC).toMatch(/تقييم التوجّه والحركة/);
  });
});
