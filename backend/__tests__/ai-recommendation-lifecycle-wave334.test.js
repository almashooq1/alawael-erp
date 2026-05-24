'use strict';

/**
 * W334 Pass 1 drift guard — AiRecommendationBundle lifecycle + schema shape.
 *
 * Two halves (W325 P2 pattern):
 *   1) Pure-function tests of `backend/intelligence/ai-recommendation-lifecycle.lib.js`
 *      — 6-state DAG + confidence thresholds + reason codes + MFA gating.
 *   2) Static-analysis assertions on `backend/models/AiRecommendationBundle.js`
 *      for required fields + canonical refs.
 *
 * The lib has no mongoose dependency → testable under jest.mock(mongoose).
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/ai-recommendation-lifecycle.lib');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'AiRecommendationBundle.js'),
  'utf8'
);

// ═══════════════════════════════════════════════════════════════════════
// Lib — state machine
// ═══════════════════════════════════════════════════════════════════════

describe('W334 ai-recommendation-lifecycle — state machine', () => {
  it('exposes exactly 6 states', () => {
    expect(lib.LIFECYCLE_STATES).toEqual([
      'DRAFT',
      'DISCARDED',
      'PENDING_REVIEW',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
    ]);
  });

  it('VALID_TRANSITIONS is frozen and matches the DAG', () => {
    expect(Object.isFrozen(lib.VALID_TRANSITIONS)).toBe(true);
    expect(lib.VALID_TRANSITIONS.DRAFT).toEqual(['DISCARDED', 'PENDING_REVIEW']);
    expect(lib.VALID_TRANSITIONS.PENDING_REVIEW).toEqual(['APPROVED', 'REJECTED', 'EXPIRED']);
    expect(lib.VALID_TRANSITIONS.DISCARDED).toEqual([]);
    expect(lib.VALID_TRANSITIONS.APPROVED).toEqual([]);
    expect(lib.VALID_TRANSITIONS.REJECTED).toEqual([]);
    expect(lib.VALID_TRANSITIONS.EXPIRED).toEqual([]);
  });

  it('TERMINAL_STATES contains exactly the 4 terminal states', () => {
    expect(lib.TERMINAL_STATES.has('DISCARDED')).toBe(true);
    expect(lib.TERMINAL_STATES.has('APPROVED')).toBe(true);
    expect(lib.TERMINAL_STATES.has('REJECTED')).toBe(true);
    expect(lib.TERMINAL_STATES.has('EXPIRED')).toBe(true);
    expect(lib.TERMINAL_STATES.size).toBe(4);
    expect(lib.isTerminal('PENDING_REVIEW')).toBe(false);
    expect(lib.isTerminal('DRAFT')).toBe(false);
  });

  it('isValidLifecycleTransition allows the 5 forward edges', () => {
    expect(lib.isValidLifecycleTransition('DRAFT', 'DISCARDED')).toBe(true);
    expect(lib.isValidLifecycleTransition('DRAFT', 'PENDING_REVIEW')).toBe(true);
    expect(lib.isValidLifecycleTransition('PENDING_REVIEW', 'APPROVED')).toBe(true);
    expect(lib.isValidLifecycleTransition('PENDING_REVIEW', 'REJECTED')).toBe(true);
    expect(lib.isValidLifecycleTransition('PENDING_REVIEW', 'EXPIRED')).toBe(true);
  });

  it('isValidLifecycleTransition rejects all terminal exits + invalid shortcuts', () => {
    // All terminals have zero outbound
    for (const term of ['DISCARDED', 'APPROVED', 'REJECTED', 'EXPIRED']) {
      for (const target of lib.LIFECYCLE_STATES) {
        expect(lib.isValidLifecycleTransition(term, target)).toBe(false);
      }
    }
    // DRAFT cannot shortcut to APPROVED / REJECTED
    expect(lib.isValidLifecycleTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(lib.isValidLifecycleTransition('DRAFT', 'REJECTED')).toBe(false);
    expect(lib.isValidLifecycleTransition('DRAFT', 'EXPIRED')).toBe(false);
    // Self-transition is not a valid edge
    expect(lib.isValidLifecycleTransition('DRAFT', 'DRAFT')).toBe(false);
    expect(lib.isValidLifecycleTransition('PENDING_REVIEW', 'PENDING_REVIEW')).toBe(false);
  });

  it('isValidLifecycleTransition rejects unknown states', () => {
    expect(lib.isValidLifecycleTransition('FOO', 'APPROVED')).toBe(false);
    expect(lib.isValidLifecycleTransition('PENDING_REVIEW', 'BAR')).toBe(false);
    expect(lib.isValidLifecycleTransition(null, 'APPROVED')).toBe(false);
  });
});

describe('W334 ai-recommendation-lifecycle — confidence classification', () => {
  it('classifyByConfidence returns DISCARDED below 0.5', () => {
    expect(lib.classifyByConfidence(0)).toBe('DISCARDED');
    expect(lib.classifyByConfidence(0.49)).toBe('DISCARDED');
  });

  it('classifyByConfidence returns DRAFT in the [0.5, 0.7) tuning band', () => {
    expect(lib.classifyByConfidence(0.5)).toBe('DRAFT');
    expect(lib.classifyByConfidence(0.69)).toBe('DRAFT');
  });

  it('classifyByConfidence returns PENDING_REVIEW at/above 0.7', () => {
    expect(lib.classifyByConfidence(0.7)).toBe('PENDING_REVIEW');
    expect(lib.classifyByConfidence(0.95)).toBe('PENDING_REVIEW');
    expect(lib.classifyByConfidence(1)).toBe('PENDING_REVIEW');
  });

  it('classifyByConfidence falls back to DRAFT on invalid inputs', () => {
    expect(lib.classifyByConfidence(null)).toBe('DRAFT');
    expect(lib.classifyByConfidence(undefined)).toBe('DRAFT');
    expect(lib.classifyByConfidence(NaN)).toBe('DRAFT');
    expect(lib.classifyByConfidence('high')).toBe('DRAFT');
  });

  it('CONFIDENCE_THRESHOLDS are frozen with the documented values', () => {
    expect(Object.isFrozen(lib.CONFIDENCE_THRESHOLDS)).toBe(true);
    expect(lib.CONFIDENCE_THRESHOLDS.DISCARD_BELOW).toBe(0.5);
    expect(lib.CONFIDENCE_THRESHOLDS.REVIEW_AT_OR_ABOVE).toBe(0.7);
  });
});

describe('W334 ai-recommendation-lifecycle — reason codes & MFA', () => {
  it('reasonCodeRequired returns true ONLY for PENDING_REVIEW → REJECTED', () => {
    expect(lib.reasonCodeRequired('PENDING_REVIEW', 'REJECTED')).toBe(true);
    expect(lib.reasonCodeRequired('PENDING_REVIEW', 'APPROVED')).toBe(false);
    expect(lib.reasonCodeRequired('PENDING_REVIEW', 'EXPIRED')).toBe(false);
    expect(lib.reasonCodeRequired('DRAFT', 'PENDING_REVIEW')).toBe(false);
  });

  it('requiredMfaTier returns 2 for APPROVED, 1 for REJECTED', () => {
    expect(lib.requiredMfaTier('PENDING_REVIEW', 'APPROVED')).toBe(2);
    expect(lib.requiredMfaTier('PENDING_REVIEW', 'REJECTED')).toBe(1);
  });

  it('requiredMfaTier returns null for system-driven transitions (no MFA gate)', () => {
    expect(lib.requiredMfaTier('DRAFT', 'DISCARDED')).toBeNull();
    expect(lib.requiredMfaTier('DRAFT', 'PENDING_REVIEW')).toBeNull();
    expect(lib.requiredMfaTier('PENDING_REVIEW', 'EXPIRED')).toBeNull();
  });
});

describe('W334 ai-recommendation-lifecycle — validateTransition end-to-end', () => {
  it('approves a valid PENDING_REVIEW → APPROVED with MFA 2', () => {
    const r = lib.validateTransition({
      from: 'PENDING_REVIEW',
      to: 'APPROVED',
      actor: 'supervisor-1',
      mfaTier: 2,
    });
    expect(r.ok).toBe(true);
    expect(r.entry.fromStatus).toBe('PENDING_REVIEW');
    expect(r.entry.toStatus).toBe('APPROVED');
    expect(r.entry.actor).toBe('supervisor-1');
  });

  it('rejects PENDING_REVIEW → APPROVED without MFA tier 2', () => {
    const r = lib.validateTransition({
      from: 'PENDING_REVIEW',
      to: 'APPROVED',
      actor: 'supervisor-1',
      mfaTier: 1,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('MFA_TIER_INSUFFICIENT');
  });

  it('rejects PENDING_REVIEW → REJECTED without reasonCode', () => {
    const r = lib.validateTransition({
      from: 'PENDING_REVIEW',
      to: 'REJECTED',
      actor: 'supervisor-1',
      mfaTier: 1,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('REASON_CODE_REQUIRED');
  });

  it('approves PENDING_REVIEW → REJECTED with reasonCode + MFA 1', () => {
    const r = lib.validateTransition({
      from: 'PENDING_REVIEW',
      to: 'REJECTED',
      actor: 'supervisor-1',
      reasonCode: 'PLATEAU_FALSE_POSITIVE',
      mfaTier: 1,
    });
    expect(r.ok).toBe(true);
    expect(r.entry.reasonCode).toBe('PLATEAU_FALSE_POSITIVE');
  });

  it('rejects DRAFT → APPROVED (shortcut not allowed)', () => {
    const r = lib.validateTransition({
      from: 'DRAFT',
      to: 'APPROVED',
      actor: 'supervisor-1',
      mfaTier: 2,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_TRANSITION');
  });

  it('accepts system-driven DRAFT → DISCARDED (no MFA, no reason)', () => {
    const r = lib.validateTransition({
      from: 'DRAFT',
      to: 'DISCARDED',
      actor: 'system',
    });
    expect(r.ok).toBe(true);
  });
});

describe('W334 ai-recommendation-lifecycle — computeExpiry', () => {
  it('computes a 7-day expiry by default', () => {
    const base = new Date('2026-05-24T00:00:00Z');
    const exp = lib.computeExpiry(base);
    expect(exp.toISOString()).toBe('2026-05-31T00:00:00.000Z');
  });

  it('respects the override window', () => {
    const base = new Date('2026-05-24T00:00:00Z');
    expect(lib.computeExpiry(base, 14).toISOString()).toBe('2026-06-07T00:00:00.000Z');
  });
});

describe('W334 ai-recommendation-lifecycle — buildTransitionEntry purity', () => {
  it('returns a frozen object', () => {
    const e = lib.buildTransitionEntry({ from: 'DRAFT', to: 'PENDING_REVIEW' });
    expect(Object.isFrozen(e)).toBe(true);
    expect(() => {
      e.fromStatus = 'CHANGED';
    }).toThrow();
  });

  it('defaults missing fields to null + stamps `at` automatically', () => {
    const e = lib.buildTransitionEntry({ from: 'DRAFT', to: 'PENDING_REVIEW' });
    expect(e.actor).toBeNull();
    expect(e.reasonCode).toBeNull();
    expect(e.notes).toBeNull();
    expect(e.at).toBeInstanceOf(Date);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Schema shape — AiRecommendationBundle (static analysis)
// ═══════════════════════════════════════════════════════════════════════

function fieldBlock(src, name) {
  const re = new RegExp(`\\b${name}\\s*:\\s*\\{([^{}]*)\\}`);
  const m = src.match(re);
  return m ? m[1] : null;
}

describe('W334 AiRecommendationBundle schema canonical refs', () => {
  it('beneficiaryId refs the canonical Beneficiary model (W324+W329 compliant)', () => {
    const block = fieldBlock(MODEL_SRC, 'beneficiaryId');
    expect(block).not.toBeNull();
    expect(block).toMatch(/ref\s*:\s*'Beneficiary'/);
    expect(block).toMatch(/required\s*:\s*true/);
  });

  it('branchId refs Branch (W326 compliant — not Center)', () => {
    const block = fieldBlock(MODEL_SRC, 'branchId');
    expect(block).not.toBeNull();
    expect(block).toMatch(/ref\s*:\s*'Branch'/);
  });

  it('episodeId refs EpisodeOfCare', () => {
    const block = fieldBlock(MODEL_SRC, 'episodeId');
    expect(block).not.toBeNull();
    expect(block).toMatch(/ref\s*:\s*'EpisodeOfCare'/);
  });

  it('reviewedBy refs the canonical User (W327 compliant — not Admin)', () => {
    const block = fieldBlock(MODEL_SRC, 'reviewedBy');
    expect(block).not.toBeNull();
    expect(block).toMatch(/ref\s*:\s*'User'/);
  });

  it('llmTelemetryCallId refs LlmTelemetryCall (ADR-013 link)', () => {
    const block = fieldBlock(MODEL_SRC, 'llmTelemetryCallId');
    expect(block).not.toBeNull();
    expect(block).toMatch(/ref\s*:\s*'LlmTelemetryCall'/);
  });

  it('status field uses lib.LIFECYCLE_STATES (no hardcoded enum)', () => {
    expect(MODEL_SRC).toMatch(/status\s*:\s*\{[\s\S]{0,200}enum\s*:\s*lib\.LIFECYCLE_STATES/);
  });

  it('status default is DRAFT', () => {
    expect(MODEL_SRC).toMatch(/status\s*:\s*\{[\s\S]{0,300}default\s*:\s*'DRAFT'/);
  });

  it('confidence is required and bounded [0, 1]', () => {
    const block = fieldBlock(MODEL_SRC, 'confidence');
    expect(block).not.toBeNull();
    expect(block).toMatch(/min\s*:\s*0/);
    expect(block).toMatch(/max\s*:\s*1/);
    expect(block).toMatch(/required\s*:\s*true/);
  });

  it('declares 6 recommendation types (extensible enum)', () => {
    for (const t of [
      'INCREASE_DOSAGE_AND_REASSESS',
      'REVISE_GOAL',
      'ESCALATE_TO_QUALITY',
      'TRIGGER_REASSESSMENT',
      'ADJUST_HOME_PROGRAM',
      'PLAN_REVIEW_DUE',
    ]) {
      expect(MODEL_SRC).toMatch(new RegExp(`'${t}'`));
    }
  });
});
