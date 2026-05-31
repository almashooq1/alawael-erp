'use strict';

/**
 * W672 drift guard — PhysiotherapyAssessment + physiotherapy-assessment routes.
 *
 * Locks the W672 build (clinical gap closed: objective PT metrics — ROM /
 * Ashworth spasticity / MRC strength / gait — which generic TherapySession
 * logging never captured, blocking accreditation/insurance progress evidence):
 *   • model registers as 'PhysiotherapyAssessment' with canonical Beneficiary +
 *     Branch refs + CarePlanVersion cross-link
 *   • clinical value-sets (ASHWORTH_SCORES incl. '1+', STRENGTH_GRADES,
 *     MOBILITY_STATUS, GAIT_PATTERNS) don't shrink without a wave commit
 *   • Wave-18 invariants: assessmentType + mobilityStatus enums, embedded
 *     ashworth/strength grade value-sets, gaitAssessed⇒gaitPattern,
 *     discharge⇒goalsSummary, reassessmentDue>=date, finalized⇒assessor+date
 *   • jointsMeasured virtual present
 *   • route mounts at /physiotherapy-assessment via dualMountAuth + branch-scoped
 *
 * Static analysis (jest.setup.js mocks mongoose) + a model-load enum check.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'PhysiotherapyAssessment.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'physiotherapy-assessment.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/PhysiotherapyAssessment');

describe('W672 PhysiotherapyAssessment — exports & enums', () => {
  it('exports ASSESSMENT_TYPES (initial/progress/discharge — the pre/post axis)', () => {
    expect(model.ASSESSMENT_TYPES).toEqual(['initial', 'progress', 'discharge']);
  });

  it('exports ASHWORTH_SCORES including the distinct 1+ grade', () => {
    expect(model.ASHWORTH_SCORES).toEqual(['0', '1', '1+', '2', '3', '4']);
  });

  it('exports STRENGTH_GRADES (MRC/Oxford 0–5 with +/- steps)', () => {
    expect(model.STRENGTH_GRADES).toEqual(expect.arrayContaining(['0', '3', '3+', '4', '4+', '5']));
  });

  it('exports MOBILITY_STATUS ladder incl. non_ambulant + assist tiers', () => {
    expect(model.MOBILITY_STATUS).toEqual(
      expect.arrayContaining(['independent', 'minimal_assist', 'dependent', 'non_ambulant'])
    );
    expect(model.MOBILITY_STATUS.length).toBeGreaterThanOrEqual(8);
  });

  it('exports GAIT_PATTERNS incl. CP-relevant patterns', () => {
    expect(model.GAIT_PATTERNS).toEqual(
      expect.arrayContaining(['spastic_diplegic', 'crouch', 'toe_walking', 'ataxic'])
    );
  });

  it('exports STATUSES with draft/finalized', () => {
    expect(model.STATUSES).toEqual(['draft', 'finalized']);
  });
});

describe('W672 PhysiotherapyAssessment — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('carePlanVersionId refs CarePlanVersion', () => {
    expect(MODEL_SRC).toMatch(
      /carePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });
});

describe('W672 PhysiotherapyAssessment — Wave-18 invariants', () => {
  it('declares an __invariants validate block', () => {
    expect(MODEL_SRC).toMatch(/\.path\(['"]__invariants['"]\)\.validate/);
  });
  it('validates embedded ashworth grade value-set', () => {
    expect(MODEL_SRC).toMatch(/ASHWORTH_SCORES\.includes\(m\.ashworth\)/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]romMeasurements['"]/);
  });
  it('validates embedded strength grade value-set', () => {
    expect(MODEL_SRC).toMatch(/STRENGTH_GRADES\.includes\(s\.grade\)/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]strength['"]/);
  });
  it('gaitAssessed ⇒ gaitPattern required', () => {
    expect(MODEL_SRC).toMatch(/this\.gaitAssessed[\s\S]{0,120}invalidate\(\s*['"]gaitPattern['"]/);
  });
  it('discharge assessment ⇒ goalsSummary required', () => {
    expect(MODEL_SRC).toMatch(
      /assessmentType === 'discharge'[\s\S]{0,160}invalidate\(\s*['"]goalsSummary['"]/
    );
  });
  it('status=finalized ⇒ assessedBy + assessedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status === 'finalized'[\s\S]{0,300}invalidate\(\s*['"]assessedBy['"]/
    );
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]assessedAt['"]/);
  });
});

describe('W672 PhysiotherapyAssessment — virtual', () => {
  it('declares jointsMeasured virtual', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]jointsMeasured['"]\)/);
  });
});

describe('W672 physiotherapy-assessment routes — security + endpoints', () => {
  it('requires auth + branch scope + body beneficiary guard', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(bodyScopedBeneficiaryGuard\)/);
  });
  it('applies branchFilter (no cross-tenant IDOR)', () => {
    expect(ROUTES_SRC).toMatch(/branchFilter\(req\)/);
  });
  it('declares the core + due/finalize endpoints', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/today['"]/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/due['"]/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/by-beneficiary\/:id['"]/);
    expect(ROUTES_SRC).toMatch(/router\.post\(['"]\/:id\/finalize['"]/);
  });
});

describe('W672 registry — mounted via dualMountAuth (auth-required)', () => {
  it('safeRequires the route file', () => {
    expect(REGISTRY_SRC).toMatch(
      /physiotherapyAssessmentRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/physiotherapy-assessment\.routes['"]\)/
    );
  });
  it('mounts at physiotherapy-assessment via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(app,\s*['"]physiotherapy-assessment['"],\s*physiotherapyAssessmentRoutes,\s*authenticate\)/
    );
  });
});
