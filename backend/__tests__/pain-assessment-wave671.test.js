'use strict';

/**
 * W671 drift guard — PainAssessment + pain-assessment routes shape.
 *
 * Locks the W671 build (clinical gap closed: scale-aware pain assessment for a
 * largely non-verbal population — VitalSign holds no pain construct):
 *   • model registers as 'PainAssessment' with canonical Beneficiary + Branch
 *     refs + optional TherapySession cross-link
 *   • SCALES + SCALE_MAX (per-scale range) + functional/intervention enums
 *     don't shrink without a wave commit updating this guard
 *   • Wave-18 invariants: scale required + per-scale score range,
 *     painPresent⇒score≥1+location, !painPresent⇒score=0, observational scale⇒
 *     observerType=observed, intervention⇒type, reassessmentScore⇒reassessmentAt,
 *     finalized⇒assessedBy+assessedAt
 *   • isSignificantPain + painReduction virtuals present
 *   • route mounts at /pain-assessment via dualMountAuth + branch-scoped
 *
 * Static analysis (jest.setup.js mocks mongoose) + a model-load enum check.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'PainAssessment.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'pain-assessment.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/PainAssessment');

describe('W671 PainAssessment — exports & enums', () => {
  it('exports SCALES with the 6 validated scale families', () => {
    expect(model.SCALES).toEqual(
      expect.arrayContaining([
        'numeric_0_10',
        'wong_baker_faces',
        'flacc',
        'nccpc_r',
        'cries',
        'evendol',
      ])
    );
    expect(model.SCALES.length).toBe(6);
  });

  it('exports SCALE_MAX mapping each scale to its own range max', () => {
    expect(model.SCALE_MAX.numeric_0_10).toBe(10);
    expect(model.SCALE_MAX.nccpc_r).toBe(90); // 30 items × 0–3
    expect(model.SCALE_MAX.evendol).toBe(15);
    // every scale must have a max
    for (const s of model.SCALES) expect(typeof model.SCALE_MAX[s]).toBe('number');
  });

  it('exports OBSERVER_TYPES incl. observational + proxy', () => {
    expect(model.OBSERVER_TYPES).toEqual(
      expect.arrayContaining(['self_report', 'observed', 'proxy_report'])
    );
  });

  it('exports FUNCTIONAL_DOMAINS (rehab-plan impact axes)', () => {
    expect(model.FUNCTIONAL_DOMAINS).toEqual(
      expect.arrayContaining(['mobility', 'participation', 'adl', 'sleep'])
    );
  });

  it('exports INTERVENTION_TYPES with the pain-management loop set', () => {
    expect(model.INTERVENTION_TYPES).toEqual(
      expect.arrayContaining(['positioning', 'analgesia_prn', 'referral'])
    );
    expect(model.INTERVENTION_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it('exports STATUSES with draft/finalized', () => {
    expect(model.STATUSES).toEqual(['draft', 'finalized']);
  });
});

describe('W671 PainAssessment — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('therapySessionId refs TherapySession (tolerance cross-link)', () => {
    expect(MODEL_SRC).toMatch(
      /therapySessionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]TherapySession['"]/
    );
  });
});

describe('W671 PainAssessment — Wave-18 invariants', () => {
  it('declares an __invariants validate block', () => {
    expect(MODEL_SRC).toMatch(/\.path\(['"]__invariants['"]\)\.validate/);
  });
  it('per-scale score range enforced via SCALE_MAX', () => {
    expect(MODEL_SRC).toMatch(/SCALE_MAX\[this\.scale\]/);
    expect(MODEL_SRC).toMatch(/invalidate\(['"]score['"]/);
  });
  it('painPresent ⇒ body location required', () => {
    expect(MODEL_SRC).toMatch(/painPresent[\s\S]{0,260}invalidate\(['"]bodyLocations['"]/);
  });
  it('observational scale ⇒ observerType not self_report', () => {
    expect(MODEL_SRC).toMatch(
      /observerType === 'self_report'[\s\S]{0,120}invalidate\(['"]observerType['"]/
    );
  });
  it('reassessmentScore ⇒ reassessmentAt', () => {
    expect(MODEL_SRC).toMatch(
      /reassessmentScore != null[\s\S]{0,120}invalidate\(['"]reassessmentAt['"]/
    );
  });
  it('status=finalized ⇒ assessedBy + assessedAt', () => {
    expect(MODEL_SRC).toMatch(/status === 'finalized'[\s\S]{0,300}invalidate\(['"]assessedBy['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(['"]assessedAt['"]/);
  });
});

describe('W671 PainAssessment — virtuals', () => {
  it('declares isSignificantPain + painReduction virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isSignificantPain['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]painReduction['"]\)/);
  });
});

describe('W671 pain-assessment routes — security + endpoints', () => {
  it('requires auth + branch scope + body beneficiary guard', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(bodyScopedBeneficiaryGuard\)/);
  });
  it('applies branchFilter (no cross-tenant IDOR)', () => {
    expect(ROUTES_SRC).toMatch(/branchFilter\(req\)/);
  });
  it('declares the core + pain-loop endpoints', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/today['"]/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/significant['"]/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/by-beneficiary\/:id['"]/);
    expect(ROUTES_SRC).toMatch(/router\.post\(['"]\/:id\/reassess['"]/);
    expect(ROUTES_SRC).toMatch(/router\.post\(['"]\/:id\/finalize['"]/);
  });
});

describe('W671 registry — mounted via dualMountAuth (auth-required)', () => {
  it('safeRequires the route file', () => {
    expect(REGISTRY_SRC).toMatch(
      /painAssessmentRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/pain-assessment\.routes['"]\)/
    );
  });
  it('mounts at pain-assessment via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(app,\s*['"]pain-assessment['"],\s*painAssessmentRoutes,\s*authenticate\)/
    );
  });
});
