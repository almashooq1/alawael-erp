'use strict';

/**
 * W325 Pass 2 lib unit tests + schema shape drift guard.
 *
 * Two halves:
 *   1) Pure-function tests of backend/intelligence/measure-lifecycle.lib.js
 *      — the state machine + reason-code + MFA-tier + cycle-prevention logic.
 *   2) Static-analysis assertions on MeasurementMaster.model.js for the 3
 *      new fields (lifecycleHistory[], scoringType, compositeOf[]).
 *
 * The lib has no mongoose dependency so we can exercise it directly even
 * with jest.mock('mongoose') in setup. The schema fields are checked via
 * source regex (W324 / W325 Pass 1 pattern).
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/measure-lifecycle.lib');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'measurement', 'MeasurementMaster.model.js'),
  'utf8'
);

function fieldBlock(src, name) {
  const re = new RegExp(`\\b${name}\\s*:\\s*\\{([^{}]*)\\}`);
  const m = src.match(re);
  return m ? m[1] : null;
}

// Balanced-bracket scanner: handles nested {} inside an array-of-subdoc field
// (e.g. lifecycleHistory has fromStatus:{...}, toStatus:{...}, actor:{...}).
// Returns the slice between the OUTER `[` and matching `]`.
function arrayBlock(src, name) {
  const start = new RegExp(`\\b${name}\\s*:\\s*\\[`).exec(src);
  if (!start) return null;
  let i = start.index + start[0].length;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const ch = src[i++];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
  }
  return depth === 0 ? src.slice(start.index + start[0].length, i - 1) : null;
}

// ═══════════════════════════════════════════════════════════════════════
// Lib — state machine
// ═══════════════════════════════════════════════════════════════════════

describe('W325 Pass 2 lifecycle lib — state machine', () => {
  it('exposes exactly 4 states', () => {
    expect(lib.LIFECYCLE_STATES).toEqual(['DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED']);
  });

  it('VALID_TRANSITIONS is frozen and matches the DAG', () => {
    expect(Object.isFrozen(lib.VALID_TRANSITIONS)).toBe(true);
    expect(lib.VALID_TRANSITIONS.DRAFT).toEqual(['ACTIVE']);
    expect(lib.VALID_TRANSITIONS.ACTIVE).toEqual(['DEPRECATED']);
    expect(lib.VALID_TRANSITIONS.DEPRECATED).toEqual(['ACTIVE', 'RETIRED']);
    expect(lib.VALID_TRANSITIONS.RETIRED).toEqual([]);
  });

  it('isValidLifecycleTransition allows all 4 forward edges', () => {
    expect(lib.isValidLifecycleTransition('DRAFT', 'ACTIVE')).toBe(true);
    expect(lib.isValidLifecycleTransition('ACTIVE', 'DEPRECATED')).toBe(true);
    expect(lib.isValidLifecycleTransition('DEPRECATED', 'ACTIVE')).toBe(true);
    expect(lib.isValidLifecycleTransition('DEPRECATED', 'RETIRED')).toBe(true);
  });

  it('isValidLifecycleTransition rejects the forbidden edges', () => {
    // Can never un-publish to DRAFT
    expect(lib.isValidLifecycleTransition('ACTIVE', 'DRAFT')).toBe(false);
    expect(lib.isValidLifecycleTransition('DEPRECATED', 'DRAFT')).toBe(false);
    expect(lib.isValidLifecycleTransition('RETIRED', 'DRAFT')).toBe(false);
    // RETIRED is terminal
    expect(lib.isValidLifecycleTransition('RETIRED', 'ACTIVE')).toBe(false);
    expect(lib.isValidLifecycleTransition('RETIRED', 'DEPRECATED')).toBe(false);
    // Must go through ACTIVE first
    expect(lib.isValidLifecycleTransition('DRAFT', 'DEPRECATED')).toBe(false);
    expect(lib.isValidLifecycleTransition('DRAFT', 'RETIRED')).toBe(false);
    // Must go through DEPRECATED first
    expect(lib.isValidLifecycleTransition('ACTIVE', 'RETIRED')).toBe(false);
    // Self-transition is not a valid edge
    expect(lib.isValidLifecycleTransition('ACTIVE', 'ACTIVE')).toBe(false);
  });

  it('isValidLifecycleTransition rejects unknown states', () => {
    expect(lib.isValidLifecycleTransition('FOO', 'ACTIVE')).toBe(false);
    expect(lib.isValidLifecycleTransition('ACTIVE', 'BAR')).toBe(false);
    expect(lib.isValidLifecycleTransition(null, 'ACTIVE')).toBe(false);
    expect(lib.isValidLifecycleTransition('ACTIVE', undefined)).toBe(false);
  });
});

describe('W325 Pass 2 lifecycle lib — reason codes', () => {
  it('reasonCodeRequired returns true ONLY for ACTIVE↔DEPRECATED edges', () => {
    expect(lib.reasonCodeRequired('ACTIVE', 'DEPRECATED')).toBe(true);
    expect(lib.reasonCodeRequired('DEPRECATED', 'ACTIVE')).toBe(true);
    expect(lib.reasonCodeRequired('DRAFT', 'ACTIVE')).toBe(false);
    expect(lib.reasonCodeRequired('DEPRECATED', 'RETIRED')).toBe(false);
  });
});

describe('W325 Pass 2 lifecycle lib — MFA tier gating', () => {
  it('requiredMfaTier returns 2 for the publish + deprecate + restore edges', () => {
    expect(lib.requiredMfaTier('DRAFT', 'ACTIVE')).toBe(2);
    expect(lib.requiredMfaTier('ACTIVE', 'DEPRECATED')).toBe(2);
    expect(lib.requiredMfaTier('DEPRECATED', 'ACTIVE')).toBe(2);
  });

  it('requiredMfaTier returns 1 for the retire edge (low risk, terminal)', () => {
    expect(lib.requiredMfaTier('DEPRECATED', 'RETIRED')).toBe(1);
  });

  it('requiredMfaTier returns null for unknown transitions', () => {
    expect(lib.requiredMfaTier('ACTIVE', 'DRAFT')).toBeNull();
    expect(lib.requiredMfaTier('FOO', 'BAR')).toBeNull();
  });
});

describe('W325 Pass 2 lifecycle lib — validateTransition end-to-end', () => {
  it('returns ok:true + entry for a valid DRAFT→ACTIVE with sufficient MFA', () => {
    const result = lib.validateTransition({
      from: 'DRAFT',
      to: 'ACTIVE',
      actor: 'user-1',
      mfaTier: 2,
    });
    expect(result.ok).toBe(true);
    expect(result.entry.fromStatus).toBe('DRAFT');
    expect(result.entry.toStatus).toBe('ACTIVE');
    expect(result.entry.actor).toBe('user-1');
    expect(result.entry.at).toBeInstanceOf(Date);
  });

  it('rejects an invalid edge with INVALID_TRANSITION', () => {
    const result = lib.validateTransition({
      from: 'ACTIVE',
      to: 'DRAFT',
      actor: 'user-1',
      mfaTier: 2,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_TRANSITION');
  });

  it('rejects ACTIVE→DEPRECATED without reasonCode', () => {
    const result = lib.validateTransition({
      from: 'ACTIVE',
      to: 'DEPRECATED',
      actor: 'u',
      mfaTier: 2,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('REASON_CODE_REQUIRED');
  });

  it('accepts ACTIVE→DEPRECATED WITH reasonCode + sufficient MFA', () => {
    const result = lib.validateTransition({
      from: 'ACTIVE',
      to: 'DEPRECATED',
      actor: 'u',
      reasonCode: 'TOOL_VERSION_SUPERSEDED',
      mfaTier: 2,
    });
    expect(result.ok).toBe(true);
    expect(result.entry.reasonCode).toBe('TOOL_VERSION_SUPERSEDED');
  });

  it('rejects DRAFT→ACTIVE with insufficient MFA tier', () => {
    const result = lib.validateTransition({
      from: 'DRAFT',
      to: 'ACTIVE',
      actor: 'u',
      mfaTier: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('MFA_TIER_INSUFFICIENT');
  });

  it('rejects when mfaTier is missing entirely', () => {
    const result = lib.validateTransition({ from: 'DRAFT', to: 'ACTIVE', actor: 'u' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('MFA_TIER_INSUFFICIENT');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Lib — composite cycle prevention
// ═══════════════════════════════════════════════════════════════════════

describe('W325 Pass 2 lifecycle lib — composite self-reference', () => {
  it('passes empty / missing compositeOf', () => {
    expect(lib.checkCompositeNoSelfReference({ selfId: 'A', compositeOf: [] }).ok).toBe(true);
    expect(lib.checkCompositeNoSelfReference({ selfId: 'A', compositeOf: undefined }).ok).toBe(
      true
    );
  });

  it('passes when references are unrelated', () => {
    const result = lib.checkCompositeNoSelfReference({
      selfId: 'A',
      compositeOf: [{ measureId: 'B' }, { measureId: 'C' }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects direct self-reference', () => {
    const result = lib.checkCompositeNoSelfReference({
      selfId: 'A',
      compositeOf: [{ measureId: 'A' }],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('SELF_REFERENCE');
    expect(result.offender).toBe('A');
  });

  it('handles ObjectId-like .toString()', () => {
    const oid = { toString: () => 'X' };
    const result = lib.checkCompositeNoSelfReference({
      selfId: 'X',
      compositeOf: [{ measureId: oid }],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('SELF_REFERENCE');
  });
});

describe('W325 Pass 2 lifecycle lib — buildTransitionEntry purity', () => {
  it('returns a frozen object', () => {
    const entry = lib.buildTransitionEntry({
      from: 'DRAFT',
      to: 'ACTIVE',
      actor: 'u',
      reasonCode: null,
      notes: null,
    });
    expect(Object.isFrozen(entry)).toBe(true);
    expect(() => {
      entry.fromStatus = 'CHANGED';
    }).toThrow();
  });

  it('defaults missing fields to null and stamps `at` automatically', () => {
    const entry = lib.buildTransitionEntry({ from: 'DRAFT', to: 'ACTIVE' });
    expect(entry.actor).toBeNull();
    expect(entry.reasonCode).toBeNull();
    expect(entry.notes).toBeNull();
    expect(entry.at).toBeInstanceOf(Date);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Schema shape — new fields on MeasurementMaster (static analysis)
// ═══════════════════════════════════════════════════════════════════════

describe('W325 Pass 2 MeasurementMaster schema additions', () => {
  it('declares `lifecycleHistory` as array of audit-entry sub-docs', () => {
    const block = arrayBlock(MODEL_SRC, 'lifecycleHistory');
    expect(block).not.toBeNull();
    // 6 expected fields inside the sub-doc
    expect(block).toMatch(/\bfromStatus\b/);
    expect(block).toMatch(/\btoStatus\b/);
    expect(block).toMatch(/\bactor\b/);
    expect(block).toMatch(/\breasonCode\b/);
    expect(block).toMatch(/\bnotes\b/);
    expect(block).toMatch(/\bat\b/);
    // toStatus is required (we always know where we're going)
    expect(block).toMatch(/toStatus[\s\S]{0,120}required\s*:\s*true/);
    // actor refs User
    expect(block).toMatch(/actor[\s\S]{0,160}ref\s*:\s*'User'/);
  });

  it('declares `scoringType` with 10 enum values including GAS_LINKED and COMPOSITE', () => {
    const block = fieldBlock(MODEL_SRC, 'scoringType');
    expect(block).not.toBeNull();
    for (const v of [
      'NUMERIC_TOTAL',
      'SUBSCALES',
      'PERCENTAGE',
      'ORDINAL',
      'CHECKLIST',
      'FREQUENCY_COUNT',
      'SEVERITY_BAND',
      'NARRATIVE',
      'GAS_LINKED',
      'COMPOSITE',
    ]) {
      expect(block).toMatch(new RegExp(`'${v}'`));
    }
  });

  it('declares `compositeOf` as array of {measureId ref MeasurementMaster, weight 0-1}', () => {
    const block = arrayBlock(MODEL_SRC, 'compositeOf');
    expect(block).not.toBeNull();
    expect(block).toMatch(/measureId[\s\S]{0,160}ref\s*:\s*'MeasurementMaster'/);
    expect(block).toMatch(/weight[\s\S]{0,120}min\s*:\s*0/);
    expect(block).toMatch(/weight[\s\S]{0,120}max\s*:\s*1/);
  });

  it('Pass 2 schema additions stay non-breaking (no required:true on the array fields themselves)', () => {
    // The array fields lifecycleHistory and compositeOf must allow empty/undefined.
    // Only the *inner* toStatus on history is required (that's by design).
    // We assert that the OUTER declarations don't carry `required: true` immediately
    // before the `[` — i.e. there's no `lifecycleHistory: { required: true }` form.
    expect(MODEL_SRC).not.toMatch(/lifecycleHistory\s*:\s*\{[\s\S]{0,80}required\s*:\s*true/);
    expect(MODEL_SRC).not.toMatch(/compositeOf\s*:\s*\{[\s\S]{0,80}required\s*:\s*true/);
    expect(MODEL_SRC).not.toMatch(/scoringType\s*:\s*\{[\s\S]{0,200}required\s*:\s*true/);
  });
});
