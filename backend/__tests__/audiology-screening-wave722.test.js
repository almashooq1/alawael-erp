'use strict';

/**
 * W722 drift guard — AudiologyScreening + audiology-screening routes.
 *
 * Functional hearing-screening surface (sibling of VisionScreening W720 on the
 * sensory axis). Static (source-as-text + export introspection); jest.setup
 * mocks mongoose. Behavioral counterpart in
 * `audiology-screening-behavioral-wave722.test.js`.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'AudiologyScreening.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'audiology-screening.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const CANONICAL_INDEX_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'intelligence', 'canonical', 'index.js'),
  'utf8'
);

const model = require('../models/AudiologyScreening');

describe('W722 AudiologyScreening — exports & enums', () => {
  it('exports METHODS (8 ability-graded screening methods)', () => {
    expect(model.METHODS).toEqual([
      'pure_tone_audiometry',
      'play_audiometry',
      'visual_reinforcement_audiometry',
      'otoacoustic_emissions',
      'auditory_brainstem_response',
      'tympanometry_only',
      'behavioral_observation',
      'otoscopy_only',
    ]);
  });
  it('exports HEARING_LEVELS with empty + 6 dB-HL bands + unable', () => {
    expect(model.HEARING_LEVELS[0]).toBe('');
    expect(model.HEARING_LEVELS).toEqual(
      expect.arrayContaining([
        'normal_le_25',
        'mild_26_40',
        'moderate_41_55',
        'moderately_severe_56_70',
        'severe_71_90',
        'profound_gt_90',
        'unable_to_assess',
      ])
    );
  });
  it('exports TYMPANOMETRY_TYPES (Jerger A/As/Ad/B/C + empty)', () => {
    expect(model.TYMPANOMETRY_TYPES).toEqual(['', 'A', 'As', 'Ad', 'B', 'C']);
  });
  it('exports LOSS_TYPES + OUTCOMES + STATUSES', () => {
    expect(model.LOSS_TYPES).toEqual(['none', 'conductive', 'sensorineural', 'mixed', 'unknown']);
    expect(model.OUTCOMES).toEqual(['pass', 'monitor', 'refer']);
    expect(model.STATUSES).toEqual(['draft', 'finalized']);
  });
  it('exports JCIH RISK_INDICATORS (multi-select cluster)', () => {
    expect(model.RISK_INDICATORS).toEqual(
      expect.arrayContaining([
        'no_startle_to_loud_sound',
        'family_history_of_hearing_loss',
        'frequent_ear_infections',
        'parent_caregiver_concern',
      ])
    );
  });
});

describe('W722 AudiologyScreening — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('carePlanVersionId refs CarePlanVersion; screenedBy refs User', () => {
    expect(MODEL_SRC).toMatch(
      /carePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
    expect(MODEL_SRC).toMatch(/screenedBy\s*:\s*\{[\s\S]{0,160}ref\s*:\s*['"]User['"]/);
  });
});

describe('W722 AudiologyScreening — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('refer outcome requires referralReason', () => {
    expect(MODEL_SRC).toMatch(
      /outcome\s*===\s*['"]refer['"][\s\S]{0,200}invalidate\(['"]referralReason['"]/
    );
  });
  it('amplificationRecommended requires amplificationDetail', () => {
    expect(MODEL_SRC).toMatch(
      /amplificationRecommended[\s\S]{0,200}invalidate\(\s*['"]amplificationDetail['"]/
    );
  });
  it('riskIndicatorsPresent requires at least one riskIndicator', () => {
    expect(MODEL_SRC).toMatch(
      /riskIndicatorsPresent[\s\S]{0,260}invalidate\(\s*['"]riskIndicators['"]/
    );
  });
  it('finalize requires screener + screenedAt', () => {
    expect(MODEL_SRC).toMatch(/status\s*===\s*['"]finalized['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(['"]screenedAt['"]/);
  });
});

describe('W722 AudiologyScreening — virtuals', () => {
  it('declares needsReferral + riskIndicatorCount + worseEarLevel', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]needsReferral['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]riskIndicatorCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]worseEarLevel['"]\)/);
  });
});

describe('W722 routes — endpoint surface', () => {
  const eps = [
    /router\.get\(\s*['"]\/today['"]/,
    /router\.get\(\s*['"]\/['"]/,
    /router\.get\(\s*['"]\/needs-referral['"]/,
    /router\.get\(\s*['"]\/due['"]/,
    /router\.get\(\s*['"]\/by-beneficiary\/:id['"]/,
    /router\.get\(\s*['"]\/stats['"]/,
    /router\.get\(\s*['"]\/:id['"]/,
    /router\.post\(\s*['"]\/['"]/,
    /router\.post\(\s*['"]\/:id\/finalize['"]/,
    /router\.patch\(\s*['"]\/:id['"]/,
    /router\.delete\(\s*['"]\/:id['"]/,
  ];
  it('declares all 11 endpoints', () => {
    for (const re of eps) expect(ROUTES_SRC).toMatch(re);
  });
  it('finalize is immutable-after (409 on re-finalize)', () => {
    expect(ROUTES_SRC).toMatch(/سبق وأن تم اعتماده[\s\S]{0,80}|\.status\(409\)/);
  });
  it('branch-scoped; no req.branchId leak; ObjectId-validated', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).toMatch(/branchFilter\(req\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
    expect(ROUTES_SRC).toMatch(/mongoose\.isValidObjectId/);
  });
  it('finalize restricted to FINALIZE_ROLES incl. audiologist', () => {
    expect(ROUTES_SRC).toMatch(/FINALIZE_ROLES\s*=\s*\[[\s\S]{0,200}audiologist/);
  });
});

describe('W722 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/audiology-screening.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /audiologyScreeningRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/audiology-screening\.routes['"]\)/
    );
  });
  it('mounts at /audiology-screening via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]audiology-screening['"]\s*,\s*audiologyScreeningRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W722 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 722/);
    expect(REGISTRY_SRC).toMatch(/فحص السمع/);
  });
  it('canonical index registers audiology-screening schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/audiology-screening\.canonical['"]\)/
    );
  });
});
