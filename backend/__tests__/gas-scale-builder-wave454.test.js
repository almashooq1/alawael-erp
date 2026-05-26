'use strict';

/**
 * W454 drift guard — GAS scale AI-assisted construction helper.
 *
 * Locks:
 *   • Pure-lib gas-scale-builder.lib.js exists with the documented API.
 *   • Heuristic proposes a 5-level scale (-2..+2) from any goal text.
 *   • Arabic + English language auto-detection.
 *   • Action verb extraction matches common rehab vocabulary.
 *   • Proposed scale validates against the W264 GAS scale shape.
 *   • Edge cases: empty text, very short text, non-string input.
 *
 * Pure-lib tests only. No mongoose, no DB, no integration with the W264
 * gas.service (that integration arrives in W459 Phase A E2E smoke).
 */

const lib = require('../intelligence/gas-scale-builder.lib');

describe('W454 — module exports', () => {
  it('exports the documented public API', () => {
    expect(typeof lib.proposeScaleHeuristic).toBe('function');
    expect(typeof lib.validateProposal).toBe('function');
    expect(typeof lib.detectLanguage).toBe('function');
    expect(typeof lib.extractAction).toBe('function');
    expect(typeof lib.extractObject).toBe('function');
    expect(Array.isArray(lib.VALID_LEVELS)).toBe(true);
    expect(lib.VALID_LEVELS).toEqual(['minus2', 'minus1', 'zero', 'plus1', 'plus2']);
  });

  it('module export is frozen (immutable surface)', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W454 — detectLanguage', () => {
  it('detects Arabic text', () => {
    expect(lib.detectLanguage('يستطيع الطفل المشي ٥ خطوات')).toBe('ar');
  });

  it('detects English text', () => {
    expect(lib.detectLanguage('Child walks 5 steps independently')).toBe('en');
  });

  it('defaults to Arabic on empty/null input', () => {
    expect(lib.detectLanguage('')).toBe('ar');
    expect(lib.detectLanguage(null)).toBe('ar');
    expect(lib.detectLanguage(undefined)).toBe('ar');
  });

  it('handles mixed Arabic + English (Arabic dominant)', () => {
    expect(lib.detectLanguage('يمشي 5 steps خطوات')).toBe('ar');
  });
});

describe('W454 — extractAction', () => {
  it('extracts Arabic verb', () => {
    const v = lib.extractAction('يمشي الطفل عشر خطوات', 'ar');
    expect(v).toBe('يمشي');
  });

  it('extracts English verb', () => {
    const v = lib.extractAction('Child walks ten steps independently', 'en');
    expect(v).toBe('walks');
  });

  it('returns null when no known verb found', () => {
    expect(lib.extractAction('random text', 'en')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(lib.extractAction('', 'ar')).toBeNull();
    expect(lib.extractAction(null, 'en')).toBeNull();
  });
});

describe('W454 — extractObject', () => {
  it('extracts portion after the action verb', () => {
    const obj = lib.extractObject('يمشي الطفل عشر خطوات', 'يمشي', 'ar');
    expect(obj).toContain('الطفل');
  });

  it('truncates long objects to ≤60 chars', () => {
    const longGoal = 'walks ' + 'x'.repeat(200);
    const obj = lib.extractObject(longGoal, 'walks', 'en');
    expect(obj.length).toBeLessThanOrEqual(63); // 60 + '...'
  });

  it('falls back gracefully when no action provided', () => {
    const obj = lib.extractObject('some random text', null, 'en');
    expect(obj).toBeTruthy();
  });

  it('returns default when text is empty', () => {
    const obj = lib.extractObject('', null, 'ar');
    expect(obj).toBe('الهدف');
    const objEn = lib.extractObject('', null, 'en');
    expect(objEn).toBe('the task');
  });
});

describe('W454 — proposeScaleHeuristic — Arabic goal', () => {
  let result;
  beforeAll(() => {
    result = lib.proposeScaleHeuristic('يمشي الطفل عشر خطوات بدون مساعدة');
  });

  it('returns a non-null proposal', () => {
    expect(result.proposal).not.toBeNull();
  });

  it('proposal contains all 5 levels', () => {
    for (const level of lib.VALID_LEVELS) {
      expect(result.proposal[level]).toBeDefined();
      expect(typeof result.proposal[level]).toBe('string');
      expect(result.proposal[level].length).toBeGreaterThan(5);
    }
  });

  it('zero level equals the goal text verbatim', () => {
    expect(result.proposal.zero).toBe('يمشي الطفل عشر خطوات بدون مساعدة');
  });

  it('declares method as heuristic-v1', () => {
    expect(result.method).toBe('heuristic-v1');
  });

  it('detected language is ar', () => {
    expect(result.signals.detectedLanguage).toBe('ar');
  });

  it('extracted Arabic verb', () => {
    expect(result.signals.extractedAction).toBe('يمشي');
  });

  it('confidence is medium when action extracted', () => {
    expect(result.confidence).toBe('medium');
  });

  it('weight defaults to 1', () => {
    expect(result.proposal.weight).toBe(1);
  });
});

describe('W454 — proposeScaleHeuristic — English goal', () => {
  let result;
  beforeAll(() => {
    result = lib.proposeScaleHeuristic('Child walks ten steps independently');
  });

  it('detected language is en', () => {
    expect(result.signals.detectedLanguage).toBe('en');
  });

  it('extracted English verb', () => {
    expect(result.signals.extractedAction).toBe('walks');
  });

  it('proposal anchors contain English template strings', () => {
    expect(result.proposal.minus2).toMatch(/Cannot/);
    expect(result.proposal.plus2).toMatch(/Significantly exceeds/);
  });
});

describe('W454 — proposeScaleHeuristic — weight option', () => {
  it('accepts weight 1-3', () => {
    const r2 = lib.proposeScaleHeuristic('Child walks', { weight: 2 });
    expect(r2.proposal.weight).toBe(2);
    const r3 = lib.proposeScaleHeuristic('Child walks', { weight: 3 });
    expect(r3.proposal.weight).toBe(3);
  });

  it('clamps weight outside 1-3', () => {
    const r0 = lib.proposeScaleHeuristic('Child walks', { weight: 0 });
    expect(r0.proposal.weight).toBe(1);
    const r5 = lib.proposeScaleHeuristic('Child walks', { weight: 5 });
    expect(r5.proposal.weight).toBe(3);
  });
});

describe('W454 — proposeScaleHeuristic — edge cases', () => {
  it('returns null proposal for empty text', () => {
    const r = lib.proposeScaleHeuristic('');
    expect(r.proposal).toBeNull();
    expect(r.signals.reason).toBe('GOAL_TEXT_TOO_SHORT');
  });

  it('returns null for non-string', () => {
    const r = lib.proposeScaleHeuristic(null);
    expect(r.proposal).toBeNull();
  });

  it('returns low confidence when no verb extracted', () => {
    const r = lib.proposeScaleHeuristic('random gibberish text here');
    expect(r.confidence).toBe('low');
  });

  it('honors explicit language override', () => {
    const r = lib.proposeScaleHeuristic('walks ten steps', { language: 'ar' });
    expect(r.signals.detectedLanguage).toBe('ar');
  });
});

describe('W454 — validateProposal', () => {
  it('accepts a valid 5-level proposal', () => {
    const result = lib.validateProposal({
      minus2: 'Cannot walk even with help',
      minus1: 'Walks with significant help',
      zero: 'Walks 10 steps independently',
      plus1: 'Walks 15 steps independently',
      plus2: 'Walks 20+ steps and generalizes',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects missing level', () => {
    const result = lib.validateProposal({
      minus2: 'a description here',
      minus1: 'another description',
      zero: 'the goal',
      plus1: 'better than expected',
      // plus2 missing
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('MISSING_LEVEL:plus2');
  });

  it('rejects too-short level (< 5 chars)', () => {
    const result = lib.validateProposal({
      minus2: 'a',
      minus1: 'another description',
      zero: 'the goal',
      plus1: 'better than expected',
      plus2: 'significantly better',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('LEVEL_TOO_SHORT'))).toBe(true);
  });

  it('rejects duplicate anchors', () => {
    const result = lib.validateProposal({
      minus2: 'same text everywhere here',
      minus1: 'same text everywhere here',
      zero: 'unique here',
      plus1: 'another unique',
      plus2: 'final unique',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('DUPLICATE_ANCHOR'))).toBe(true);
  });

  it('rejects non-object', () => {
    expect(lib.validateProposal(null).valid).toBe(false);
    expect(lib.validateProposal('string').valid).toBe(false);
  });
});
