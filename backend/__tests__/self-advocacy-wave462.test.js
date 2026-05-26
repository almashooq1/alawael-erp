'use strict';

/**
 * W462 drift guard — Self-advocacy training curriculum + plan.
 *
 * Locks:
 *   • self-advocacy-curriculum.lib pure functions (selectTrack /
 *     generateCurriculum / completionRate)
 *   • 4 tracks (track_early / track_primary / track_teen / track_adult)
 *   • 5 RIGHTS with CRPD article references
 *   • Age + cognitive-tier routing logic
 *   • SelfAdvocacyTrainingPlan model with 5-module subdoc + completion
 *     percentage auto-compute + skip-reason invariant
 *
 * Pure-lib + static analysis. No DB.
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/self-advocacy-curriculum.lib');
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SelfAdvocacyTrainingPlan.js'),
  'utf8'
);

describe('W462 — curriculum lib surface', () => {
  it('exports public API', () => {
    expect(typeof lib.selectTrack).toBe('function');
    expect(typeof lib.generateCurriculum).toBe('function');
    expect(typeof lib.completionRate).toBe('function');
  });

  it('exports 4 TRACKS', () => {
    expect(lib.TRACKS).toEqual(['track_early', 'track_primary', 'track_teen', 'track_adult']);
  });

  it('exports 5 RIGHTS with CRPD article references', () => {
    expect(lib.RIGHTS).toHaveLength(5);
    for (const r of lib.RIGHTS) {
      expect(r.code).toMatch(/^(be_heard|consent|refuse|complain|community)$/);
      expect(typeof r.titleAr).toBe('string');
      expect(typeof r.titleEn).toBe('string');
      expect(Array.isArray(r.crpdArticles)).toBe(true);
      expect(r.crpdArticles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('module export is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W462 — selectTrack age routing', () => {
  it('< 72 months → track_early', () => {
    expect(lib.selectTrack({ ageMonths: 48 }).track).toBe('track_early');
  });
  it('72-143 months → track_primary', () => {
    expect(lib.selectTrack({ ageMonths: 120 }).track).toBe('track_primary');
  });
  it('144-215 months → track_teen', () => {
    expect(lib.selectTrack({ ageMonths: 180 }).track).toBe('track_teen');
  });
  it('≥ 216 months → track_adult', () => {
    expect(lib.selectTrack({ ageMonths: 300 }).track).toBe('track_adult');
  });
  it('returns null when ageMonths missing', () => {
    expect(lib.selectTrack({}).track).toBeNull();
  });

  it('routes profound + no AAC to track_early regardless of age', () => {
    const r = lib.selectTrack({ ageMonths: 240, cognitiveTier: 'profound', usesAAC: false });
    expect(r.track).toBe('track_early');
    expect(r.reasoning).toMatch(/Profound/);
  });

  it('routes profound + AAC normally by age', () => {
    const r = lib.selectTrack({ ageMonths: 240, cognitiveTier: 'profound', usesAAC: true });
    expect(r.track).toBe('track_adult');
  });
});

describe('W462 — generateCurriculum', () => {
  it('produces 5 modules for valid track', () => {
    const r = lib.generateCurriculum('track_primary');
    expect(r.track).toBe('track_primary');
    expect(r.modules).toHaveLength(5);
    expect(r.totalModules).toBe(5);
  });

  it('every module carries rightCode + titleAr/En + crpdArticles + modality + duration', () => {
    const r = lib.generateCurriculum('track_teen');
    for (const m of r.modules) {
      expect(m.rightCode).toBeDefined();
      expect(m.titleAr).toBeDefined();
      expect(m.titleEn).toBeDefined();
      expect(Array.isArray(m.crpdArticles)).toBe(true);
      expect(m.modality).toBeDefined();
      expect(typeof m.durationMinutes).toBe('number');
      expect(Array.isArray(m.materialsNeeded)).toBe(true);
    }
  });

  it('each track has distinct modality', () => {
    const early = lib.generateCurriculum('track_early').modules[0].modality;
    const primary = lib.generateCurriculum('track_primary').modules[0].modality;
    const teen = lib.generateCurriculum('track_teen').modules[0].modality;
    const adult = lib.generateCurriculum('track_adult').modules[0].modality;
    expect(new Set([early, primary, teen, adult]).size).toBe(4);
  });

  it('duration increases with age track', () => {
    const e = lib.generateCurriculum('track_early').modules[0].durationMinutes;
    const a = lib.generateCurriculum('track_adult').modules[0].durationMinutes;
    expect(a).toBeGreaterThan(e);
  });

  it('returns empty modules for invalid track', () => {
    const r = lib.generateCurriculum('random');
    expect(r.modules).toEqual([]);
  });
});

describe('W462 — completionRate', () => {
  it('returns 100 when all 5 rights completed', () => {
    expect(
      lib.completionRate('track_primary', [
        'be_heard',
        'consent',
        'refuse',
        'complain',
        'community',
      ])
    ).toBe(100);
  });

  it('returns 60 when 3 of 5 completed', () => {
    expect(lib.completionRate('track_primary', ['be_heard', 'consent', 'refuse'])).toBe(60);
  });

  it('returns 0 when none completed', () => {
    expect(lib.completionRate('track_primary', [])).toBe(0);
  });

  it('returns 0 for invalid track', () => {
    expect(lib.completionRate('random', ['be_heard'])).toBe(0);
  });

  it('ignores unknown right codes (does not inflate %)', () => {
    expect(lib.completionRate('track_primary', ['be_heard', 'random_code'])).toBe(20);
  });
});

describe('W462 — SelfAdvocacyTrainingPlan model', () => {
  it('registers as model "SelfAdvocacyTrainingPlan"', () => {
    expect(MODEL_SRC).toMatch(
      /mongoose\.models\.SelfAdvocacyTrainingPlan\s*\|\|\s*mongoose\.model\(\s*['"]SelfAdvocacyTrainingPlan['"]/
    );
  });

  it('uses canonical collection self_advocacy_training_plans', () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]self_advocacy_training_plans['"]/);
  });

  it('beneficiaryId is required + unique (one plan per beneficiary)', () => {
    expect(MODEL_SRC).toMatch(
      /beneficiaryId\s*:\s*\{[\s\S]+?required:\s*true[\s\S]+?unique:\s*true/
    );
  });

  it('track enum: 4 tracks', () => {
    expect(MODEL_SRC).toMatch(/'track_early'/);
    expect(MODEL_SRC).toMatch(/'track_primary'/);
    expect(MODEL_SRC).toMatch(/'track_teen'/);
    expect(MODEL_SRC).toMatch(/'track_adult'/);
  });

  it('declares ModuleCompletionSchema with rightCode + status enum + sessions tracking', () => {
    expect(MODEL_SRC).toMatch(/ModuleCompletionSchema/);
    expect(MODEL_SRC).toMatch(/rightCode\s*:\s*\{[^}]*'be_heard'/);
    expect(MODEL_SRC).toMatch(/status\s*:\s*\{[^}]*'not_started'[^}]*'completed'/);
    expect(MODEL_SRC).toMatch(/sessionsRequired/);
    expect(MODEL_SRC).toMatch(/sessionsCompleted/);
  });

  it('declares deliveredByRole with 5 values', () => {
    expect(MODEL_SRC).toMatch(/'advocate'/);
    expect(MODEL_SRC).toMatch(/'therapist'/);
    expect(MODEL_SRC).toMatch(/'case_manager'/);
    expect(MODEL_SRC).toMatch(/'family'/);
    expect(MODEL_SRC).toMatch(/'peer'/);
  });

  it('declares completionPercentage 0-100', () => {
    expect(MODEL_SRC).toMatch(/completionPercentage\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
  });

  it('declares reasonableAdjustments string array', () => {
    expect(MODEL_SRC).toMatch(/reasonableAdjustments\s*:\s*\[/);
  });

  it('pre-save uses self-advocacy-curriculum.lib for completion%', () => {
    expect(MODEL_SRC).toMatch(
      /require\(['"]\.\.\/intelligence\/self-advocacy-curriculum\.lib['"]\)/
    );
    expect(MODEL_SRC).toMatch(/curriculum\.completionRate/);
  });

  it('pre-save auto-finalizes to completed when 100%', () => {
    expect(MODEL_SRC).toMatch(/completionPercentage === 100[\s\S]+?status\s*=\s*['"]completed['"]/);
  });

  it('pre-save enforces skipReason on skipped modules', () => {
    expect(MODEL_SRC).toMatch(/skipped requires skipReason/);
  });
});
