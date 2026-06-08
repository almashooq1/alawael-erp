'use strict';

/**
 * W1020 drift guard — SleepAssessment + sleep-assessment routes shape
 * integrity. Static analysis only (backend/jest.setup.js mocks mongoose).
 *
 * Locks:
 *   • model registers as 'SleepAssessment' with canonical Beneficiary +
 *     Branch refs
 *   • TOOLS / SEVERITY_LEVELS / REFERRAL_TARGETS / INTERVENTIONS /
 *     PROBLEM_FLAGS exported and don't shrink without a wave commit
 *   • Wave-18 invariants: enum gating, moderate/severe ⇒ interventions,
 *     severe ⇒ nextReviewDue, suspectedOSA ⇒ referral, referral ⇒ target,
 *     finalized ⇒ finalizer + finalizedAt, nextReviewDue ≥ date
 *   • computeSleepSeverity pure exported static with stable banding
 *   • isHighSeverity + isReassessmentOverdue virtuals
 *   • route file declares 11 endpoints, branch-scopes every query, mounts
 *     at /sleep-assessment via dualMountAuth
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SleepAssessment.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'sleep-assessment.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/SleepAssessment');

describe('W1020 SleepAssessment — exports & enums', () => {
  it('exports TOOLS with the 4 recognized sleep tools', () => {
    expect(model.TOOLS).toEqual(['cshq', 'sdsc', 'bears', 'clinical_judgment']);
  });

  it('exports SEVERITY_LEVELS none/mild/moderate/severe', () => {
    expect(model.SEVERITY_LEVELS).toEqual(['none', 'mild', 'moderate', 'severe']);
  });

  it('exports REFERRAL_TARGETS incl ent (OSA pathway)', () => {
    expect(model.REFERRAL_TARGETS).toContain('ent');
    expect(model.REFERRAL_TARGETS).toContain('sleep_clinic');
  });

  it('exports a non-empty INTERVENTIONS catalog', () => {
    expect(Array.isArray(model.INTERVENTIONS)).toBe(true);
    expect(model.INTERVENTIONS.length).toBeGreaterThanOrEqual(10);
    expect(model.INTERVENTIONS).toContain('consistent_bedtime_routine');
    expect(model.INTERVENTIONS).toContain('melatonin_review');
  });

  it('exports the 10 PROBLEM_FLAGS that feed the score', () => {
    expect(Array.isArray(model.PROBLEM_FLAGS)).toBe(true);
    expect(model.PROBLEM_FLAGS).toContain('snoring');
    expect(model.PROBLEM_FLAGS).toContain('frequentNightWakings');
    expect(model.PROBLEM_FLAGS.length).toBe(10);
  });
});

describe('W1020 SleepAssessment — schema refs', () => {
  it("registers as mongoose.model('SleepAssessment', ...)", () => {
    expect(MODEL_SRC).toMatch(/mongoose\.model\(\s*['"]SleepAssessment['"]/);
  });

  it("beneficiaryId ref:'Beneficiary' + branchId ref:'Branch'", () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId[\s\S]{0,120}ref:\s*['"]Beneficiary['"]/);
    expect(MODEL_SRC).toMatch(/branchId[\s\S]{0,120}ref:\s*['"]Branch['"]/);
  });

  it("collection is 'sleep_assessments'", () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]sleep_assessments['"]/);
  });
});

describe('W1020 SleepAssessment — Wave-18 invariants', () => {
  it('declares the __invariants path + validate()', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('gates tool + problemSeverity enums', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]tool['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]problemSeverity['"]/);
  });

  it('moderate/severe ⇒ interventions; severe ⇒ nextReviewDue', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*\n?\s*['"]sleepHygieneInterventions['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]nextReviewDue['"]/);
  });

  it('suspectedOSA ⇒ referralMade; referralMade ⇒ referralTarget', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]referralMade['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]referralTarget['"]/);
  });

  it('finalized ⇒ finalizer + finalizedAt', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedBy['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedAt['"]/);
  });
});

describe('W1020 SleepAssessment — computeSleepSeverity + virtuals', () => {
  it('computeSleepSeverity is an exported function with correct bands', () => {
    expect(typeof model.computeSleepSeverity).toBe('function');
    expect(model.computeSleepSeverity({}).level).toBe('none');
    expect(model.computeSleepSeverity({ snoring: true }).level).toBe('mild');
    expect(
      model.computeSleepSeverity({
        bedtimeResistance: true,
        sleepOnsetDelay: true,
        frequentNightWakings: true,
        earlyMorningWaking: true,
        daytimeSleepiness: true,
        snoring: true,
      }).level
    ).toBe('severe');
  });

  it('declares isHighSeverity + isReassessmentOverdue virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isHighSeverity['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isReassessmentOverdue['"]\)/);
  });
});

describe('W1020 sleep-assessment routes — endpoint surface', () => {
  it('GET /high-severity', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/high-severity['"]/);
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
  it('POST /:id/add-intervention', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/add-intervention['"]/);
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

  it('blocks edits after finalize (409 in finalize + patch + add-intervention)', () => {
    const finalizedBlocks = ROUTES_SRC.match(/status\s*===\s*['"]finalized['"]/g) || [];
    expect(finalizedBlocks.length).toBeGreaterThanOrEqual(3);
  });

  it('server re-derives severity via computeSleepSeverity', () => {
    expect(ROUTES_SRC).toMatch(/computeSleepSeverity\(/);
  });
});

describe('W1020 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/sleep-assessment.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /sleepAssessmentRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/sleep-assessment\.routes['"]\)/
    );
  });

  it('mounts at /sleep-assessment via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]sleep-assessment['"]\s*,\s*sleepAssessmentRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1020 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1020/);
    expect(REGISTRY_SRC).toMatch(/تقييم النوم/);
  });
});
