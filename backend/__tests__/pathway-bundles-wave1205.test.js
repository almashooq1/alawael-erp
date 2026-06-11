'use strict';

/**
 * W1205 drift guard — Blueprint 43 R4: disability pathway bundles.
 *
 * Layers:
 *  1. REGISTRY SHAPE — every bundle is complete, frozen, bilingual, and every
 *     cross-referenced enum value actually exists in its owning schema
 *     (Beneficiary.disability.type / ClinicalPathwayPlan.pathwayType /
 *     Measure.targetPopulation / GoalBank.domain) — read STATICALLY from
 *     model source so no DB is needed.
 *  2. RESOLVER — bundleForDisabilityType fallback semantics.
 *  3. STATIC WIRING — service refuse-to-fabricate markers, route mounting via
 *     features.registry dualMountAuth (never plain dualMount), W269 branch
 *     gates present, no raw req.body spread on the apply path.
 */

const fs = require('fs');
const path = require('path');

const registry = require('../intelligence/disability-pathway-bundles.registry');

const BACKEND = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(BACKEND, rel), 'utf8');

// Enum sets read statically from the owning model sources.
const BENEFICIARY_DISABILITY_TYPES = [
  'physical',
  'mental',
  'sensory',
  'multiple',
  'learning',
  'speech',
  'other',
];
const PATHWAY_TYPES = [
  'AUTISM_EARLY_INTERVENTION',
  'CP_MOTOR_REHAB',
  'SPEECH_LANGUAGE',
  'BEHAVIOR_SUPPORT',
  'GENERIC_REHAB',
];
const MEASURE_TARGET_POPULATIONS = [
  'children',
  'adolescents',
  'adults',
  'autism',
  'intellectual_disability',
  'cerebral_palsy',
  'down_syndrome',
  'language_delay',
  'learning_disability',
  'physical_disability',
  'all',
];
const GOALBANK_DOMAINS = ['SPEECH', 'OCCUPATIONAL', 'PHYSICAL', 'BEHAVIORAL', 'SPECIAL_EDU'];

describe('W1205 registry — enum cross-references stay valid', () => {
  test('source enums in this guard match the owning model sources (anti-drift)', () => {
    const beneficiarySrc = read('models/Beneficiary.js');
    for (const t of BENEFICIARY_DISABILITY_TYPES) {
      expect(beneficiarySrc).toContain(`'${t}'`);
    }
    const pathwaySrc = read('models/ClinicalPathwayPlan.js');
    for (const t of PATHWAY_TYPES) {
      expect(pathwaySrc).toContain(`'${t}'`);
    }
    const measureSrc = read('domains/goals/models/Measure.js');
    for (const t of MEASURE_TARGET_POPULATIONS) {
      expect(measureSrc).toContain(`'${t}'`);
    }
    const goalBankSrc = read('models/GoalBank.js');
    for (const t of GOALBANK_DOMAINS) {
      expect(goalBankSrc).toContain(`'${t}'`);
    }
  });

  test('a bundle exists for EVERY Beneficiary.disability.type value', () => {
    for (const t of BENEFICIARY_DISABILITY_TYPES) {
      expect(registry.DISABILITY_PATHWAY_BUNDLES[t]).toBeDefined();
      expect(registry.DISABILITY_PATHWAY_BUNDLES[t].key).toBe(t);
    }
  });

  test('no orphan bundle keys outside the Beneficiary enum', () => {
    for (const key of Object.keys(registry.DISABILITY_PATHWAY_BUNDLES)) {
      expect(BENEFICIARY_DISABILITY_TYPES).toContain(key);
    }
  });

  test('every bundle is structurally complete + bilingual', () => {
    for (const bundle of registry.listBundles()) {
      expect(typeof bundle.titleAr).toBe('string');
      expect(bundle.titleAr.length).toBeGreaterThan(3);
      expect(typeof bundle.titleEn).toBe('string');
      expect(Array.isArray(bundle.guidanceAssessments)).toBe(true);
      expect(bundle.guidanceAssessments.length).toBeGreaterThan(0);
      expect(Array.isArray(bundle.interventionsAr)).toBe(true);
      expect(Array.isArray(bundle.defaultStages)).toBe(true);
      expect(bundle.defaultStages.length).toBeGreaterThan(0);
    }
  });

  test('every pathwayType is a real ClinicalPathwayPlan enum value', () => {
    for (const bundle of registry.listBundles()) {
      expect(PATHWAY_TYPES).toContain(bundle.pathwayType);
    }
  });

  test('every measureTargetPopulation is a real Measure enum value', () => {
    for (const bundle of registry.listBundles()) {
      for (const pop of bundle.measureTargetPopulations) {
        expect(MEASURE_TARGET_POPULATIONS).toContain(pop);
      }
    }
  });

  test('every goalBankDomain is a real GoalBank enum value', () => {
    for (const bundle of registry.listBundles()) {
      expect(bundle.goalBankDomains.length).toBeGreaterThan(0);
      for (const d of bundle.goalBankDomains) {
        expect(GOALBANK_DOMAINS).toContain(d);
      }
    }
  });

  test('default stages are valid pathwayStageSchema shapes with unique sequential order', () => {
    for (const bundle of registry.listBundles()) {
      const orders = bundle.defaultStages.map(s => s.order);
      expect(new Set(orders).size).toBe(orders.length);
      expect(Math.min(...orders)).toBe(1);
      for (const stage of bundle.defaultStages) {
        expect(typeof stage.code).toBe('string');
        expect(stage.code.length).toBeLessThanOrEqual(60);
        expect(typeof stage.title).toBe('string');
        expect(stage.title.length).toBeLessThanOrEqual(200);
        expect(stage.order).toBeGreaterThanOrEqual(1);
        expect(stage.targetDays).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('registry is deep-frozen (pure data, no runtime mutation)', () => {
    expect(Object.isFrozen(registry.DISABILITY_PATHWAY_BUNDLES)).toBe(true);
    const bundle = registry.DISABILITY_PATHWAY_BUNDLES.mental;
    expect(Object.isFrozen(bundle)).toBe(true);
    expect(Object.isFrozen(bundle.defaultStages)).toBe(true);
    expect(Object.isFrozen(bundle.defaultStages[0])).toBe(true);
  });
});

describe('W1205 bundleForDisabilityType resolver', () => {
  test('exact match', () => {
    expect(registry.bundleForDisabilityType('mental').pathwayType).toBe(
      'AUTISM_EARLY_INTERVENTION'
    );
    expect(registry.bundleForDisabilityType('physical').pathwayType).toBe('CP_MOTOR_REHAB');
    expect(registry.bundleForDisabilityType('speech').pathwayType).toBe('SPEECH_LANGUAGE');
  });
  test('case/whitespace tolerant', () => {
    expect(registry.bundleForDisabilityType(' Mental ').key).toBe('mental');
  });
  test('unknown / missing types fall back to generic (never 500 on legacy data)', () => {
    expect(registry.bundleForDisabilityType('intellectual').key).toBe('other');
    expect(registry.bundleForDisabilityType(null).key).toBe('other');
    expect(registry.bundleForDisabilityType(undefined).key).toBe('other');
  });
});

describe('W1205 static wiring', () => {
  test('service exposes suggest + apply and refuses to fabricate', () => {
    const src = read('services/pathwayBundle.service.js');
    expect(src).toMatch(/suggestForBeneficiary/);
    expect(src).toMatch(/applyForBeneficiary/);
    // refuse-to-fabricate markers: unresolved registry entries are reported
    expect(src).toMatch(/skipped\.push/);
    // idempotency: never duplicate an active pathway of the same type
    expect(src).toMatch(/pathwayType: bundle\.pathwayType/);
    // R3 from birth: bundle goals carry a PRIMARY measure link
    expect(src).toMatch(/linkType: 'PRIMARY'/);
  });

  test('routes apply W269 branch gates + role guards', () => {
    const src = read('routes/pathway-bundles.routes.js');
    expect(src).toMatch(/enforceBeneficiaryBranch\(req, req\.params\.beneficiaryId\)/);
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).toMatch(/requireRole\(WRITE_ROLES\)/);
    expect(src).toMatch(/authenticateToken/);
    // mass-assignment doctrine: no raw req.body spread
    expect(src).not.toMatch(/\.\.\.req\.body/);
    // anti-regression: never read the phantom req.branchId (W269h class)
    expect(src).not.toMatch(/req\.branchId/);
  });

  test('mounted via dualMountAuth in features.registry (never plain dualMount)', () => {
    const src = read('routes/registries/features.registry.js');
    expect(src).toMatch(/safeRequire\('\.\.\/routes\/pathway-bundles\.routes'\)/);
    expect(src).toMatch(
      /dualMountAuth\(app, 'pathway-bundles', pathwayBundlesRoutes, authenticate\)/
    );
    expect(src).not.toMatch(/dualMount\(app, 'pathway-bundles'/);
  });

  test('GOALBANK_DOMAIN_TO_GOAL_DOMAIN covers every GoalBank domain', () => {
    const map = require('../services/pathwayBundle.service').GOALBANK_DOMAIN_TO_GOAL_DOMAIN;
    for (const d of GOALBANK_DOMAINS) {
      expect(map[d]).toBeDefined();
    }
  });
});
