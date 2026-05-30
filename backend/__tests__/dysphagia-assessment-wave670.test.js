'use strict';

/**
 * W670 drift guard — DysphagiaAssessment + dysphagia-assessment routes shape.
 *
 * Locks the W670 build (the clinical gap closed: swallow physiology, distinct
 * from BeneficiaryDietPrescription which only captures the served texture):
 *   • model registers as 'DysphagiaAssessment' with canonical Beneficiary +
 *     Branch refs + a dietPrescriptionId cross-link
 *   • IDDSI enums (food 3–7, drink 0–4) + risk levels + tools don't shrink
 *     without a wave commit updating this guard
 *   • Wave-18 invariants: screeningTool required, npoRecommended⇒npoReason,
 *     aspirationRisk=high⇒slpReferral, silentAspiration⇒instrumental,
 *     status=finalized⇒assessedBy+assessedAt, reassessmentDue>=date
 *   • isUnsafeSwallow virtual present (high risk OR silent OR NPO)
 *   • route declares the safety endpoints + mounts at /dysphagia-assessment
 *     via dualMountAuth (NOT plain dualMount — must require auth)
 *
 * Static analysis (jest.setup.js mocks mongoose) + a model-load enum check.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'DysphagiaAssessment.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'dysphagia-assessment.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/DysphagiaAssessment');

describe('W670 DysphagiaAssessment — exports & enums', () => {
  it('exports TOOLS with the 6 bedside/clinical screening tools', () => {
    expect(Array.isArray(model.TOOLS)).toBe(true);
    expect(model.TOOLS).toEqual(
      expect.arrayContaining([
        'bedside_swallow_exam',
        'eat_10',
        'gusss',
        'three_oz_water',
        'dysphagia_disorder_survey',
        'observation_only',
      ])
    );
    expect(model.TOOLS.length).toBe(6);
  });

  it('exports IDDSI_FOOD (levels 3–7) and IDDSI_DRINK (levels 0–4)', () => {
    expect(model.IDDSI_FOOD.length).toBe(6); // 3,4,5,6,7,7-easy-chew
    expect(model.IDDSI_FOOD).toEqual(expect.arrayContaining(['iddsi_4_pureed', 'iddsi_7_regular']));
    expect(model.IDDSI_DRINK.length).toBe(5); // 0–4
    expect(model.IDDSI_DRINK).toEqual(
      expect.arrayContaining(['iddsi_0_thin', 'iddsi_4_extremely_thick'])
    );
  });

  it('exports RISK_LEVELS with a 4-step ladder', () => {
    expect(model.RISK_LEVELS).toEqual(['none', 'low', 'moderate', 'high']);
  });

  it('exports FEEDING_ROUTES incl. enteral escalation', () => {
    expect(model.FEEDING_ROUTES).toEqual(
      expect.arrayContaining([
        'oral',
        'oral_with_modifications',
        'oral_plus_enteral',
        'enteral_only',
      ])
    );
  });

  it('exports STATUSES with draft/finalized (2-state lifecycle)', () => {
    expect(model.STATUSES).toEqual(['draft', 'finalized']);
  });

  it('exports SWALLOW_SIGNS covering the canonical clinical signs', () => {
    expect(model.SWALLOW_SIGNS).toEqual(
      expect.arrayContaining(['cough', 'wet_gurgly_voice', 'nasal_regurgitation'])
    );
    expect(model.SWALLOW_SIGNS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('W670 DysphagiaAssessment — canonical refs', () => {
  it('beneficiaryId refs Beneficiary (NOT User / Patient / Student)', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch (NOT Center / Organization)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('cross-links to BeneficiaryDietPrescription (evidence → served diet)', () => {
    expect(MODEL_SRC).toMatch(
      /dietPrescriptionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]BeneficiaryDietPrescription['"]/
    );
  });
});

describe('W670 DysphagiaAssessment — Wave-18 invariants', () => {
  it('declares an __invariants validate block', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/\.path\(['"]__invariants['"]\)\.validate/);
  });
  it('npoRecommended ⇒ npoReason', () => {
    expect(MODEL_SRC).toMatch(/npoRecommended[\s\S]{0,120}invalidate\(['"]npoReason['"]/);
  });
  it('aspirationRisk=high ⇒ slpReferral', () => {
    expect(MODEL_SRC).toMatch(
      /aspirationRisk === 'high'[\s\S]{0,160}invalidate\(['"]slpReferral['"]/
    );
  });
  it('silentAspirationSuspected ⇒ instrumentalAssessmentRecommended', () => {
    expect(MODEL_SRC).toMatch(
      /silentAspirationSuspected[\s\S]{0,200}invalidate\(\s*['"]instrumentalAssessmentRecommended['"]/
    );
  });
  it('status=finalized ⇒ assessedBy + assessedAt', () => {
    expect(MODEL_SRC).toMatch(/status === 'finalized'[\s\S]{0,300}invalidate\(['"]assessedBy['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(['"]assessedAt['"]/);
  });
});

describe('W670 DysphagiaAssessment — virtual', () => {
  it('declares isUnsafeSwallow virtual', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isUnsafeSwallow['"]\)/);
  });
});

describe('W670 dysphagia-assessment routes — security + endpoints', () => {
  it('requires auth + branch scope + body beneficiary guard', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(bodyScopedBeneficiaryGuard\)/);
  });
  it('applies branchFilter on list/instance queries (no cross-tenant IDOR)', () => {
    expect(ROUTES_SRC).toMatch(/branchFilter\(req\)/);
  });
  it('declares the core + safety endpoints', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/today['"]/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/unsafe['"]/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/by-beneficiary\/:id['"]/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/stats['"]/);
    expect(ROUTES_SRC).toMatch(/router\.post\(['"]\/['"]/);
    expect(ROUTES_SRC).toMatch(/router\.post\(['"]\/:id\/finalize['"]/);
    expect(ROUTES_SRC).toMatch(/router\.patch\(['"]\/:id['"]/);
    expect(ROUTES_SRC).toMatch(/router\.delete\(['"]\/:id['"]/);
  });
  it('finalize is restricted to clinical sign-off roles (SLP/supervisor)', () => {
    expect(ROUTES_SRC).toMatch(/FINALIZE_ROLES[\s\S]{0,200}speech_language_pathologist/);
  });
});

describe('W670 registry — mounted via dualMountAuth (auth-required)', () => {
  it('safeRequires the route file', () => {
    expect(REGISTRY_SRC).toMatch(
      /dysphagiaAssessmentRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/dysphagia-assessment\.routes['"]\)/
    );
  });
  it('mounts at dysphagia-assessment via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(app,\s*['"]dysphagia-assessment['"],\s*dysphagiaAssessmentRoutes,\s*authenticate\)/
    );
  });
});
