'use strict';

/**
 * W1010 drift guard — FallsRiskAssessment + falls-risk-assessment routes
 * shape integrity.
 *
 * Locks the shape of the W1010 build so future drift can't silently
 * degrade the design:
 *   • model registers as 'FallsRiskAssessment' with canonical Beneficiary
 *     + Branch refs (W324/W329 compliant)
 *   • enum constants + scoring helpers exported from the model and don't
 *     shrink without a wave commit updating this guard's baselines
 *   • Wave-18 invariants block: tool/riskLevel enums, high-risk ⇒ plan +
 *     review, post_fall ⇒ lastFallDate, fall history ⇒ lastFallDate,
 *     finalized ⇒ finalizer + finalizedAt, nextReviewDue ≥ date
 *   • computeRisk is a pure exported static with stable banding
 *   • isHighRisk + isReassessmentOverdue virtuals present
 *   • route file declares 11 endpoints, branch-scopes every query, mounts
 *     at /falls-risk-assessment via dualMountAuth (NOT plain dualMount)
 *
 * Static analysis only — backend/jest.setup.js mocks mongoose, so this
 * guard reads source as text rather than instantiating documents.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'FallsRiskAssessment.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'falls-risk-assessment.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/FallsRiskAssessment');

// ═══════════════════════════════════════════════════════════════════════
// Model — exports + enums
// ═══════════════════════════════════════════════════════════════════════

describe('W1010 FallsRiskAssessment — exports & enums', () => {
  it('exports TOOLS with the 4 recognized falls-risk tools', () => {
    expect(model.TOOLS).toEqual(['morse', 'humpty_dumpty', 'stratify', 'clinical_judgment']);
  });

  it('exports RISK_LEVELS low/moderate/high', () => {
    expect(model.RISK_LEVELS).toEqual(['low', 'moderate', 'high']);
  });

  it('exports ASSESSMENT_TYPES with the 5 review triggers', () => {
    expect(model.ASSESSMENT_TYPES).toEqual([
      'initial',
      'scheduled',
      'post_fall',
      'condition_change',
      'medication_change',
    ]);
  });

  it('exports GAIT_LEVELS, MOBILITY_AIDS, SUPERVISION_LEVELS, STATUSES', () => {
    expect(model.GAIT_LEVELS).toEqual(['none', 'mild', 'moderate', 'severe']);
    expect(model.MOBILITY_AIDS).toContain('furniture_surfing');
    expect(model.SUPERVISION_LEVELS).toContain('one_to_one');
    expect(model.STATUSES).toEqual(['draft', 'finalized']);
  });

  it('exports a non-empty INTERVENTIONS catalog', () => {
    expect(Array.isArray(model.INTERVENTIONS)).toBe(true);
    expect(model.INTERVENTIONS.length).toBeGreaterThanOrEqual(10);
    expect(model.INTERVENTIONS).toContain('supervision_increase');
    expect(model.INTERVENTIONS).toContain('medication_review');
  });

  it('exports the score thresholds (moderate=25, high=50)', () => {
    expect(model.SCORE_THRESHOLD_MODERATE).toBe(25);
    expect(model.SCORE_THRESHOLD_HIGH).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — canonical refs + collection
// ═══════════════════════════════════════════════════════════════════════

describe('W1010 FallsRiskAssessment — schema refs', () => {
  it("registers as mongoose.model('FallsRiskAssessment', ...)", () => {
    expect(MODEL_SRC).toMatch(/mongoose\.model\(\s*['"]FallsRiskAssessment['"]/);
  });

  it("beneficiaryId ref:'Beneficiary' (canonical, W324)", () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId[\s\S]{0,120}ref:\s*['"]Beneficiary['"]/);
  });

  it("branchId ref:'Branch' (canonical, W326)", () => {
    expect(MODEL_SRC).toMatch(/branchId[\s\S]{0,120}ref:\s*['"]Branch['"]/);
  });

  it("collection is 'falls_risk_assessments'", () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]falls_risk_assessments['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — Wave-18 invariants
// ═══════════════════════════════════════════════════════════════════════

describe('W1010 FallsRiskAssessment — Wave-18 invariants', () => {
  it('declares the __invariants path + validate()', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('invalidates tool + riskLevel against their enums', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]tool['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]riskLevel['"]/);
  });

  it('high-risk requires preventionInterventions + nextReviewDue', () => {
    expect(MODEL_SRC).toMatch(/riskLevel\s*===\s*['"]high['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*\n?\s*['"]preventionInterventions['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]nextReviewDue['"]/);
  });

  it('post_fall + fall-history require lastFallDate', () => {
    expect(MODEL_SRC).toMatch(/post_fall/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]lastFallDate['"]/);
  });

  it('finalized requires finalizer + finalizedAt', () => {
    expect(MODEL_SRC).toMatch(/status\s*===\s*['"]finalized['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedBy['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]finalizedAt['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — computeRisk pure static + virtuals
// ═══════════════════════════════════════════════════════════════════════

describe('W1010 FallsRiskAssessment — computeRisk + virtuals', () => {
  it('computeRisk is an exported function', () => {
    expect(typeof model.computeRisk).toBe('function');
  });

  it('computeRisk bands: 0→low, 25→moderate, 50+→high', () => {
    expect(model.computeRisk({}).level).toBe('low');
    expect(model.computeRisk({ historyOfFalling: true }).level).toBe('moderate');
    expect(
      model.computeRisk({ historyOfFalling: true, gaitBalanceImpairment: 'severe' }).level
    ).toBe('high');
  });

  it('declares isHighRisk + isReassessmentOverdue virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isHighRisk['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isReassessmentOverdue['"]\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Routes — endpoint surface + branch scoping
// ═══════════════════════════════════════════════════════════════════════

describe('W1010 falls-risk-assessment routes — endpoint surface', () => {
  it('GET /high-risk', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/high-risk['"]/);
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

  it('authenticates + branch-scopes (authenticateToken + requireBranchAccess)', () => {
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

  it('server re-derives score via computeRisk (no client-trusted score)', () => {
    expect(ROUTES_SRC).toMatch(/computeRisk\(/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// features.registry.js mount
// ═══════════════════════════════════════════════════════════════════════

describe('W1010 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/falls-risk-assessment.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /fallsRiskAssessmentRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/falls-risk-assessment\.routes['"]\)/
    );
  });

  it('mounts at /falls-risk-assessment via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]falls-risk-assessment['"]\s*,\s*fallsRiskAssessmentRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1010 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1010/);
    expect(REGISTRY_SRC).toMatch(/تقييم خطر السقوط/);
  });
});
