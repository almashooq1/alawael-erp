'use strict';

/**
 * W461 drift guard — Decision Rights Matrix (CRPD Article 12 framework).
 *
 * Locks:
 *   • decision-rights.lib pure functions: validateCapacity, compositeScore,
 *     routeDecision, requiresAdvocate, interpretCapacity
 *   • 4-criterion framework (understanding / retention / weighing / communication)
 *   • 3-layer routing (autonomy ≥10 / supported 6-9 / substituted <6) +
 *     emergency override
 *   • DecisionRightsAssessment model with 12 decisionType values + capacity
 *     subdoc + computed compositeScore/routedLayer + supportArrangement/advocate
 *     invariants
 *
 * Pure-lib + static analysis. No DB.
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/decision-rights.lib');
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'DecisionRightsAssessment.js'),
  'utf8'
);

describe('W461 — decision-rights.lib surface', () => {
  it('exports the public API', () => {
    expect(typeof lib.validateCapacity).toBe('function');
    expect(typeof lib.compositeScore).toBe('function');
    expect(typeof lib.routeDecision).toBe('function');
    expect(typeof lib.requiresAdvocate).toBe('function');
    expect(typeof lib.interpretCapacity).toBe('function');
  });

  it('exposes CAPACITY_CRITERIA (4 criteria) + 2 thresholds', () => {
    expect(lib.CAPACITY_CRITERIA).toEqual([
      'understanding',
      'retention',
      'weighing',
      'communication',
    ]);
    expect(lib.LAYER_1_THRESHOLD).toBe(10);
    expect(lib.LAYER_2_THRESHOLD).toBe(6);
  });

  it('module export is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W461 — validateCapacity', () => {
  it('accepts valid assessment', () => {
    const r = lib.validateCapacity({
      understanding: 2,
      retention: 2,
      weighing: 2,
      communication: 2,
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects missing criteria', () => {
    const r = lib.validateCapacity({ understanding: 2 });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('MISSING_CRITERION:retention');
  });

  it('rejects out-of-range scores', () => {
    const r = lib.validateCapacity({
      understanding: 5,
      retention: 2,
      weighing: 2,
      communication: 2,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.startsWith('OUT_OF_RANGE:understanding:5'))).toBe(true);
  });

  it('rejects non-object', () => {
    expect(lib.validateCapacity(null).valid).toBe(false);
  });
});

describe('W461 — compositeScore', () => {
  it('sums 4 criteria', () => {
    expect(
      lib.compositeScore({ understanding: 3, retention: 3, weighing: 3, communication: 3 })
    ).toBe(12);
    expect(
      lib.compositeScore({ understanding: 2, retention: 2, weighing: 2, communication: 2 })
    ).toBe(8);
    expect(
      lib.compositeScore({ understanding: 0, retention: 0, weighing: 0, communication: 0 })
    ).toBe(0);
  });

  it('handles missing values as 0', () => {
    expect(lib.compositeScore({ understanding: 3 })).toBe(3);
  });

  it('returns 0 for null', () => {
    expect(lib.compositeScore(null)).toBe(0);
  });
});

describe('W461 — routeDecision', () => {
  it('routes to autonomy when composite ≥ 10', () => {
    const r = lib.routeDecision({
      understanding: 3,
      retention: 3,
      weighing: 2,
      communication: 2,
    });
    expect(r.layer).toBe('autonomy');
    expect(r.layerNumber).toBe(1);
    expect(r.score).toBe(10);
  });

  it('routes to supported when composite in [6, 9]', () => {
    const r = lib.routeDecision({
      understanding: 2,
      retention: 2,
      weighing: 2,
      communication: 2,
    });
    expect(r.layer).toBe('supported');
    expect(r.layerNumber).toBe(2);
    expect(r.score).toBe(8);
  });

  it('routes to substituted when composite < 6', () => {
    const r = lib.routeDecision({
      understanding: 1,
      retention: 1,
      weighing: 1,
      communication: 1,
    });
    expect(r.layer).toBe('substituted');
    expect(r.layerNumber).toBe(3);
    expect(r.score).toBe(4);
  });

  it('returns emergency layer when opts.emergency=true regardless of capacity', () => {
    const r = lib.routeDecision({}, { emergency: true });
    expect(r.layer).toBe('emergency');
    expect(r.layerNumber).toBe(4);
  });

  it('returns null layer for invalid input', () => {
    const r = lib.routeDecision({ understanding: 5 });
    expect(r.layer).toBeNull();
    expect(r.reasoning).toMatch(/invalid/);
  });

  it('reasoning text includes the score + threshold', () => {
    const r = lib.routeDecision({
      understanding: 3,
      retention: 3,
      weighing: 3,
      communication: 3,
    });
    expect(r.reasoning).toMatch(/12\/12/);
  });
});

describe('W461 — requiresAdvocate', () => {
  it('requires advocate for restraint regardless of layer', () => {
    expect(lib.requiresAdvocate('restraint', 'autonomy')).toBe(true);
    expect(lib.requiresAdvocate('restraint', 'supported')).toBe(true);
  });

  it('requires advocate for seclusion + research_consent + complaint', () => {
    expect(lib.requiresAdvocate('seclusion', 'autonomy')).toBe(true);
    expect(lib.requiresAdvocate('research_consent', 'autonomy')).toBe(true);
    expect(lib.requiresAdvocate('complaint', 'autonomy')).toBe(true);
  });

  it('requires advocate for substituted layer regardless of decision type', () => {
    expect(lib.requiresAdvocate('daily_preferences', 'substituted')).toBe(true);
  });

  it('requires advocate for emergency layer (post-hoc review)', () => {
    expect(lib.requiresAdvocate('any', 'emergency')).toBe(true);
  });

  it('does NOT require advocate for daily preferences at autonomy/supported', () => {
    expect(lib.requiresAdvocate('daily_preferences', 'autonomy')).toBe(false);
    expect(lib.requiresAdvocate('daily_preferences', 'supported')).toBe(false);
  });
});

describe('W461 — interpretCapacity', () => {
  it('returns Arabic + English interpretation for autonomy score', () => {
    const r = lib.interpretCapacity({
      understanding: 3,
      retention: 3,
      weighing: 3,
      communication: 3,
    });
    expect(r.composite).toBe(12);
    expect(r.interpretation.ar).toMatch(/استقلالية|كاملة/);
    expect(r.interpretation.en).toMatch(/independently/);
  });

  it('returns supported interpretation for mid score', () => {
    const r = lib.interpretCapacity({
      understanding: 2,
      retention: 2,
      weighing: 2,
      communication: 2,
    });
    expect(r.composite).toBe(8);
    expect(r.interpretation.ar).toMatch(/دعم/);
    expect(r.interpretation.en).toMatch(/support/);
  });

  it('returns substituted interpretation for low score', () => {
    const r = lib.interpretCapacity({
      understanding: 0,
      retention: 1,
      weighing: 0,
      communication: 1,
    });
    expect(r.composite).toBe(2);
    expect(r.interpretation.ar).toMatch(/المحامي المستقل|دعم كامل/);
    expect(r.interpretation.en).toMatch(/Independent Advocate|full support/);
  });

  it('returns per-criterion qualitative labels (strong/partial/limited)', () => {
    const r = lib.interpretCapacity({
      understanding: 3,
      retention: 1,
      weighing: 0,
      communication: 2,
    });
    expect(r.understanding).toBe('strong');
    expect(r.retention).toBe('partial');
    expect(r.weighing).toBe('limited');
    expect(r.communication).toBe('strong');
  });

  it('returns null for null input', () => {
    expect(lib.interpretCapacity(null)).toBeNull();
  });
});

describe('W461 — DecisionRightsAssessment model', () => {
  it('registers as model "DecisionRightsAssessment"', () => {
    expect(MODEL_SRC).toMatch(
      /mongoose\.models\.DecisionRightsAssessment\s*\|\|\s*mongoose\.model\(\s*['"]DecisionRightsAssessment['"]/
    );
  });

  it('uses canonical collection decision_rights_assessments', () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]decision_rights_assessments['"]/);
  });

  it('declares 12 decisionType enum values', () => {
    const block = MODEL_SRC.match(/decisionType\s*:\s*\{[\s\S]+?required:\s*true/)[0];
    const types = [
      'daily_preferences',
      'therapy_participation',
      'plan_change',
      'medication_change',
      'restraint',
      'seclusion',
      'research_consent',
      'complaint',
      'transition_intensity',
      'discharge',
      'data_sharing',
      'other',
    ];
    for (const t of types) {
      expect(block).toMatch(new RegExp(`'${t}'`));
    }
  });

  it('declares 4-criterion capacity subdoc with 0-3 bounds', () => {
    // capacity is a nested object — match each criterion line independently
    expect(MODEL_SRC).toMatch(/understanding\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*3/);
    expect(MODEL_SRC).toMatch(/retention\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*3/);
    expect(MODEL_SRC).toMatch(/weighing\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*3/);
    expect(MODEL_SRC).toMatch(/communication\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*3/);
  });

  it('declares routedLayer enum with 4 layer values', () => {
    expect(MODEL_SRC).toMatch(
      /routedLayer\s*:[\s\S]+?'autonomy'[\s\S]+?'supported'[\s\S]+?'substituted'[\s\S]+?'emergency'/
    );
  });

  it('declares assessedByRole with 5 expected roles', () => {
    const block = MODEL_SRC.match(/assessedByRole\s*:\s*\{[\s\S]+?required:\s*true/)[0];
    expect(block).toMatch(/'physician'/);
    expect(block).toMatch(/'psychologist'/);
    expect(block).toMatch(/'case_manager'/);
    expect(block).toMatch(/'advocate'/);
    expect(block).toMatch(/'mdt'/);
  });

  it('pre-save recomputes composite + routedLayer from decision-rights.lib', () => {
    expect(MODEL_SRC).toMatch(/require\(['"]\.\.\/intelligence\/decision-rights\.lib['"]\)/);
    expect(MODEL_SRC).toMatch(/lib\.compositeScore\(this\.capacity\)/);
    expect(MODEL_SRC).toMatch(/lib\.routeDecision\(this\.capacity\)/);
  });

  it('pre-save enforces supportArrangement on Layer 2/3 before finalization', () => {
    expect(MODEL_SRC).toMatch(/supportArrangement.*before finalization/);
  });

  it('pre-save enforces advocateInvolved on Layer 3 / restraint / seclusion / research / complaint', () => {
    expect(MODEL_SRC).toMatch(/advocateInvolved=true before finalization/);
  });
});
