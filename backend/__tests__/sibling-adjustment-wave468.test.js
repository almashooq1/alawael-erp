'use strict';

/**
 * W468 drift guard — Sibling adjustment SDQ scoring + record model.
 *
 * Locks the validated SDQ (Goodman, 1997) implementation + the sibling
 * record model that feeds WBCI's siblingAdjustment component (W467).
 *
 * Pure-lib + static analysis. No DB.
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/sdq-scoring.lib');
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SiblingAdjustmentRecord.js'),
  'utf8'
);

describe('W468 — sdq-scoring.lib surface', () => {
  it('exports public API', () => {
    expect(typeof lib.validateScores).toBe('function');
    expect(typeof lib.totalDifficulties).toBe('function');
    expect(typeof lib.bandSubscale).toBe('function');
    expect(typeof lib.scoreSDQ).toBe('function');
  });

  it('exposes 5 SUBSCALES + CUTOFFS', () => {
    expect(lib.SUBSCALES).toHaveLength(5);
    expect(lib.CUTOFFS).toBeDefined();
  });

  it('SUBSCALES include the 5 canonical SDQ scales', () => {
    const codes = lib.SUBSCALES.map(s => s.code);
    expect(codes).toEqual(['emotional', 'conduct', 'hyperactivity', 'peer', 'prosocial']);
  });

  it('prosocial subscale marked as reverse-scored', () => {
    const prosocial = lib.SUBSCALES.find(s => s.code === 'prosocial');
    expect(prosocial.isReversed).toBe(true);
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });

  it('bilingual labels for all 5 subscales', () => {
    for (const sub of lib.SUBSCALES) {
      expect(typeof sub.titleAr).toBe('string');
      expect(typeof sub.titleEn).toBe('string');
    }
  });
});

describe('W468 — validateScores', () => {
  it('accepts valid 5-subscale scores', () => {
    const r = lib.validateScores({
      emotional: 3,
      conduct: 2,
      hyperactivity: 5,
      peer: 4,
      prosocial: 7,
    });
    expect(r.valid).toBe(true);
  });

  it('rejects missing subscale', () => {
    const r = lib.validateScores({ emotional: 3 });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('MISSING_SUBSCALE:conduct');
  });

  it('rejects out-of-range (>10)', () => {
    const r = lib.validateScores({
      emotional: 15,
      conduct: 2,
      hyperactivity: 5,
      peer: 4,
      prosocial: 7,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.startsWith('OUT_OF_RANGE:emotional'))).toBe(true);
  });

  it('rejects non-object', () => {
    expect(lib.validateScores(null).valid).toBe(false);
  });
});

describe('W468 — totalDifficulties (excludes prosocial)', () => {
  it('sums 4 problem subscales', () => {
    const t = lib.totalDifficulties({
      emotional: 3,
      conduct: 2,
      hyperactivity: 5,
      peer: 4,
      prosocial: 7,
    });
    expect(t).toBe(14); // 3+2+5+4 — prosocial excluded
  });

  it('returns null for null scores', () => {
    expect(lib.totalDifficulties(null)).toBeNull();
  });
});

describe('W468 — bandSubscale', () => {
  it('total 0-13 → close_to_average', () => {
    expect(lib.bandSubscale('total', 10)).toBe('close_to_average');
  });
  it('total 14-16 → slightly_raised', () => {
    expect(lib.bandSubscale('total', 15)).toBe('slightly_raised');
  });
  it('total 17-19 → high', () => {
    expect(lib.bandSubscale('total', 18)).toBe('high');
  });
  it('total ≥20 → very_high', () => {
    expect(lib.bandSubscale('total', 25)).toBe('very_high');
  });
  it('prosocial uses inverse cutoffs (low = worse)', () => {
    expect(lib.bandSubscale('prosocial', 8)).toBe('close_to_average');
    expect(lib.bandSubscale('prosocial', 2)).toBe('very_high');
  });
});

describe('W468 — scoreSDQ composite', () => {
  it('returns full shape on valid input', () => {
    const r = lib.scoreSDQ({
      emotional: 2,
      conduct: 2,
      hyperactivity: 3,
      peer: 1,
      prosocial: 8,
    });
    expect(r.valid).toBe(true);
    expect(r.total).toBe(8);
    expect(r.totalBand).toBe('close_to_average');
    expect(r.breakdown.emotional).toMatchObject({ score: 2, band: expect.any(String) });
    expect(typeof r.wellbeing).toBe('number');
    expect(r.wellbeing).toBeGreaterThanOrEqual(0);
    expect(r.wellbeing).toBeLessThanOrEqual(100);
  });

  it('wellbeing decreases with higher difficulties', () => {
    const low = lib.scoreSDQ({
      emotional: 0,
      conduct: 0,
      hyperactivity: 0,
      peer: 0,
      prosocial: 10,
    });
    const high = lib.scoreSDQ({
      emotional: 10,
      conduct: 10,
      hyperactivity: 10,
      peer: 10,
      prosocial: 0,
    });
    expect(low.wellbeing).toBeGreaterThan(high.wellbeing);
  });

  it('adds prosocial bonus when prosocial ≥7', () => {
    const a = lib.scoreSDQ({
      emotional: 0,
      conduct: 0,
      hyperactivity: 0,
      peer: 0,
      prosocial: 8,
    });
    const b = lib.scoreSDQ({
      emotional: 0,
      conduct: 0,
      hyperactivity: 0,
      peer: 0,
      prosocial: 3,
    });
    expect(a.wellbeing).toBeGreaterThanOrEqual(b.wellbeing);
  });

  it('returns valid:false on invalid input', () => {
    const r = lib.scoreSDQ({ emotional: 3 });
    expect(r.valid).toBe(false);
  });

  it('interpretation includes Arabic + English', () => {
    const r = lib.scoreSDQ({
      emotional: 2,
      conduct: 2,
      hyperactivity: 2,
      peer: 2,
      prosocial: 6,
    });
    expect(r.interpretation.ar).toBeDefined();
    expect(r.interpretation.en).toBeDefined();
  });

  it('produces "very_high" total band + clinical referral interpretation', () => {
    const r = lib.scoreSDQ({
      emotional: 8,
      conduct: 7,
      hyperactivity: 9,
      peer: 7,
      prosocial: 2,
    });
    expect(r.totalBand).toBe('very_high');
    expect(r.interpretation.ar).toMatch(/شديدة|إحالة/);
    expect(r.interpretation.en).toMatch(/Severe|referral/i);
  });
});

describe('W468 — SiblingAdjustmentRecord model', () => {
  it('registers as model "SiblingAdjustmentRecord"', () => {
    expect(MODEL_SRC).toMatch(
      /mongoose\.models\.SiblingAdjustmentRecord\s*\|\|\s*mongoose\.model\(\s*['"]SiblingAdjustmentRecord['"]/
    );
  });

  it('uses canonical collection sibling_adjustment_records', () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]sibling_adjustment_records['"]/);
  });

  it('declares 5 assessmentType enum values', () => {
    expect(MODEL_SRC).toMatch(/'baseline'/);
    expect(MODEL_SRC).toMatch(/'periodic'/);
    expect(MODEL_SRC).toMatch(/'event_triggered'/);
    expect(MODEL_SRC).toMatch(/'pre_intervention'/);
    expect(MODEL_SRC).toMatch(/'post_intervention'/);
  });

  it('declares 3 raterType values (SDQ-validated rater perspectives)', () => {
    expect(MODEL_SRC).toMatch(/'parent'/);
    expect(MODEL_SRC).toMatch(/'teacher'/);
    expect(MODEL_SRC).toMatch(/'self'/);
  });

  it('declares 5-subscale scores subdoc with 0-10 bounds + required', () => {
    expect(MODEL_SRC).toMatch(/emotional\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*10[^}]*required:\s*true/);
    expect(MODEL_SRC).toMatch(/conduct\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*10[^}]*required:\s*true/);
    expect(MODEL_SRC).toMatch(
      /hyperactivity\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*10[^}]*required:\s*true/
    );
    expect(MODEL_SRC).toMatch(/peer\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*10[^}]*required:\s*true/);
    expect(MODEL_SRC).toMatch(/prosocial\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*10[^}]*required:\s*true/);
  });

  it('declares 4 totalBand values + unknown fallback', () => {
    expect(MODEL_SRC).toMatch(/'close_to_average'/);
    expect(MODEL_SRC).toMatch(/'slightly_raised'/);
    expect(MODEL_SRC).toMatch(/'high'/);
    expect(MODEL_SRC).toMatch(/'very_high'/);
    expect(MODEL_SRC).toMatch(/'unknown'/);
  });

  it('declares totalDifficulties 0-40 + wellbeing 0-100', () => {
    expect(MODEL_SRC).toMatch(/totalDifficulties\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*40/);
    expect(MODEL_SRC).toMatch(/wellbeing\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
  });

  it('declares siblingAgeMonths 36-252 (SDQ-validated 3-17 yr)', () => {
    expect(MODEL_SRC).toMatch(/siblingAgeMonths\s*:[\s\S]+?min:\s*36[\s\S]+?max:\s*252/);
  });

  it('pre-save uses sdq-scoring.lib + auto-flags referralRecommended', () => {
    expect(MODEL_SRC).toMatch(/require\(['"]\.\.\/intelligence\/sdq-scoring\.lib['"]\)/);
    expect(MODEL_SRC).toMatch(/lib\.scoreSDQ/);
    expect(MODEL_SRC).toMatch(/referralRecommended\s*=\s*true/);
    expect(MODEL_SRC).toMatch(/very_high.*clinical referral indicated/);
  });

  it('beneficiaryId is required + indexed', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:[\s\S]+?required:\s*true[\s\S]+?index:\s*true/);
  });

  it('siblingId ref to Beneficiary (sibling registration)', () => {
    expect(MODEL_SRC).toMatch(/siblingId\s*:[\s\S]+?ref:\s*['"]Beneficiary['"]/);
  });
});
