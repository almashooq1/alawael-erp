'use strict';

/**
 * W358 drift guard — CommunicationAidProfile + communication-aid routes.
 *
 * Locks W358 build shape:
 *   • model registers as 'CommunicationAidProfile' with canonical refs +
 *     unique beneficiaryId index (one profile per beneficiary)
 *   • MODALITY_TIERS / MODALITIES / SYMBOL_SETS / VOCABULARY_LEVELS /
 *     INDEPENDENCE_LEVELS / LIFECYCLE_STATUSES enums frozen
 *   • Wave-18 invariants: active⇒primaryModality+activeModalities,
 *     primaryModality∈activeModalities, tools require name+tier+at,
 *     non-draft⇒assessedBy+assessedAt
 *   • virtuals: hasHighTechTool + reassessmentOverdue
 *   • 11 endpoints + dualMountAuth at /communication-aid
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'CommunicationAidProfile.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'communication-aid.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/CommunicationAidProfile');

describe('W358 CommunicationAidProfile — exports & enums', () => {
  it('exports MODALITY_TIERS aligned with ASHA (unaided / low-tech / high-tech)', () => {
    expect(model.MODALITY_TIERS).toEqual(['unaided', 'low_tech_aided', 'high_tech_aided']);
  });

  it('exports MODALITIES with PECS + SGD entries (covering low + high-tech)', () => {
    expect(model.MODALITIES).toEqual(
      expect.arrayContaining([
        'speech',
        'sign_language_arabic',
        'pecs',
        'communication_board',
        'sgd_dedicated',
        'sgd_tablet_app',
        'eye_gaze',
        'switch_scanning',
      ])
    );
  });

  it('exports SYMBOL_SETS with the canonical 8 entries', () => {
    expect(model.SYMBOL_SETS).toEqual(
      expect.arrayContaining([
        'pcs',
        'symbolstix',
        'widgit',
        'mayer_johnson',
        'arasaac',
        'photographs',
        'custom',
        'none',
      ])
    );
    expect(model.SYMBOL_SETS.length).toBe(8);
  });

  it('exports VOCABULARY_LEVELS with the 5-tier developmental scale', () => {
    expect(model.VOCABULARY_LEVELS).toEqual([
      'pre_symbolic',
      'single_word',
      'multi_word',
      'sentence',
      'conversational',
    ]);
  });

  it('exports INDEPENDENCE_LEVELS with the 5-tier prompt scale', () => {
    expect(model.INDEPENDENCE_LEVELS).toEqual([
      'full_physical_prompt',
      'partial_physical_prompt',
      'gestural_prompt',
      'verbal_prompt',
      'independent',
    ]);
  });

  it('exports LIFECYCLE_STATUSES with draft/active/paused/retired', () => {
    expect(model.LIFECYCLE_STATUSES).toEqual(['draft', 'active', 'paused', 'retired']);
  });
});

describe('W358 CommunicationAidProfile — canonical refs + uniqueness', () => {
  it('beneficiaryId refs Beneficiary AND is unique', () => {
    expect(MODEL_SRC).toMatch(
      /beneficiaryId\s*:\s*\{[\s\S]{0,300}ref\s*:\s*['"]Beneficiary['"][\s\S]{0,300}unique\s*:\s*true/
    );
  });

  it('branchId refs Branch (W326)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('carePlanVersionId refs CarePlanVersion (W41 canonical link)', () => {
    expect(MODEL_SRC).toMatch(
      /carePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });

  it('assessedBy + snapshotByUserId ref User', () => {
    expect(MODEL_SRC).toMatch(/assessedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/snapshotByUserId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });
});

describe('W358 CommunicationAidProfile — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('active requires primaryModality', () => {
    expect(MODEL_SRC).toMatch(
      /lifecycleStatus\s*===\s*['"]active['"][\s\S]{0,300}invalidate\(\s*['"]primaryModality['"]/
    );
  });

  it('active requires at least one activeModality', () => {
    expect(MODEL_SRC).toMatch(
      /lifecycleStatus\s*===\s*['"]active['"][\s\S]{0,500}invalidate\(\s*['"]activeModalities['"]/
    );
  });

  it('primaryModality must appear in activeModalities[]', () => {
    expect(MODEL_SRC).toMatch(
      /primaryModality[\s\S]{0,300}!this\.activeModalities\.includes\(this\.primaryModality\)/
    );
  });

  it('each tool requires name + tier + introducedAt', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(`activeTools\.\$\{i\}\.name`/);
    expect(MODEL_SRC).toMatch(/invalidate\(`activeTools\.\$\{i\}\.tier`/);
    expect(MODEL_SRC).toMatch(/invalidate\(`activeTools\.\$\{i\}\.introducedAt`/);
  });

  it('non-draft requires assessedBy + assessedAt', () => {
    expect(MODEL_SRC).toMatch(
      /lifecycleStatus\s*!==\s*['"]draft['"][\s\S]{0,400}invalidate\(\s*['"]assessedBy['"]/
    );
    expect(MODEL_SRC).toMatch(
      /lifecycleStatus\s*!==\s*['"]draft['"][\s\S]{0,600}invalidate\(\s*['"]assessedAt['"]/
    );
  });
});

describe('W358 CommunicationAidProfile — virtuals', () => {
  it('hasHighTechTool virtual present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]hasHighTechTool['"]\)/);
    expect(MODEL_SRC).toMatch(/tier\s*===\s*['"]high_tech_aided['"]/);
  });

  it('reassessmentOverdue virtual present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]reassessmentOverdue['"]\)/);
    expect(MODEL_SRC).toMatch(/nextReassessmentDue/);
  });
});

describe('W358 communication-aid routes — endpoint surface', () => {
  const endpoints = [
    ['get', '/'],
    ['get', '/by-beneficiary/:id'],
    ['get', '/due-reassessment'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['post', '/:id/activate'],
    ['post', '/:id/snapshot'],
    ['post', '/:id/tools'],
    ['delete', '/:id/tools/:toolId'],
    ['patch', '/:id'],
    ['delete', '/:id'],
  ];

  for (const [verb, p] of endpoints) {
    it(`${verb.toUpperCase()} ${p}`, () => {
      const escaped = p.replace(/\//g, '\\/');
      const re = new RegExp(`router\\.${verb}\\(\\s*['"]${escaped}['"]`);
      expect(ROUTES_SRC).toMatch(re);
    });
  }

  it('authenticates via router.use(authenticateToken)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('POST / returns 409 on dup beneficiaryId (unique constraint)', () => {
    expect(ROUTES_SRC).toMatch(/existing[\s\S]{0,200}status\(409\)/);
  });

  it('activate blocks if missing primaryModality', () => {
    expect(ROUTES_SRC).toMatch(/!row\.primaryModality[\s\S]{0,200}status\(400\)/);
  });
});

describe('W358 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/communication-aid.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /communicationAidRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/communication-aid\.routes['"]\)/
    );
  });

  it('mounts at /communication-aid via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]communication-aid['"]\s*,\s*communicationAidRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W358 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 358/);
    expect(REGISTRY_SRC).toMatch(/ملف التواصل/);
  });
});
