'use strict';

/**
 * scoring-sdq-wave565.test.js — W565.
 *
 * Locks the SDQ (Strengths and Difficulties Questionnaire) scoring module:
 *   • contract compliance + item bank (25 items, 5 domains)
 *   • reverse-scored items (7,11,14,21,25)
 *   • Total Difficulties = 4 subscales (prosocial excluded)
 *   • 3-band parent cutoffs (0–13 / 14–16 / 17–40)
 *   • direction lower_better + delta band-change
 */

const registry = require('../measures/scoring');
const { validateContract } = require('../measures/scoring/contract');
const sdq = require('../measures/scoring/sdq');

// helper — build a 25-length raw vector, all items = v.
const all = v => Array.from({ length: 25 }, () => v);

describe('W565 — SDQ contract + item bank', () => {
  test('passes the scoring contract', () => {
    expect(() => validateContract(sdq, 'sdq.js')).not.toThrow();
  });

  test('registry resolves SDQ with an item bank', () => {
    const bank = registry.getItemBank('SDQ');
    expect(bank).toBeTruthy();
    expect(bank.itemBank.items).toHaveLength(25);
    expect(bank.rawShape).toBe('item_array');
  });

  test('declares 5 subscale domains', () => {
    expect(sdq.itemBank.domains.map(d => d.key).sort()).toEqual([
      'conduct',
      'emotional',
      'hyperactivity',
      'peer',
      'prosocial',
    ]);
  });

  test('reverse-scored items expose atRisk on "Not True"', () => {
    const item7 = sdq.itemBank.items.find(i => i.number === 7); // reverse, conduct
    const opt0 = item7.responseOptions.find(o => o.value === 0);
    expect(item7.reverseScored).toBe(true);
    expect(opt0.atRisk).toBe(true);
  });
});

describe('W565 — SDQ scoring', () => {
  test('all "Not True" (0) → low total difficulties, close-to-average band', () => {
    const d = sdq.computeDerived(all(0));
    // reverse items (7,11,14,21,25) score 2 when answered "Not True".
    // Of those, 7(conduct) 11(peer) 14(peer) 21,25(hyperactivity) → all in
    // difficulty subscales → total = 5 * 2 = 10.
    expect(d.value).toBe(10);
    expect(sdq.interpret(d.value).band).toBe('close_to_average');
  });

  test('all "Certainly True" (2) on difficulty items maximizes total', () => {
    // Worst case for difficulties: non-reverse difficulty items = 2,
    // reverse items = 0. Construct it explicitly.
    const reverse = new Set([7, 11, 14, 21, 25]);
    const raw = Array.from({ length: 25 }, (_, i) => (reverse.has(i + 1) ? 0 : 2));
    const d = sdq.computeDerived(raw);
    // 20 difficulty items (24 - 4 prosocial... actually 20 difficulty items,
    // 5 are reverse) → 15 non-reverse difficulty items × 2 + 5 reverse × 2 = 40.
    expect(d.value).toBe(40);
    expect(sdq.interpret(d.value).band).toBe('high');
    expect(sdq.interpret(d.value).severity).toBe('severe');
  });

  test('prosocial subscale is reported but excluded from total', () => {
    const d = sdq.computeDerived(all(2));
    expect(typeof d.subscales.prosocial).toBe('number');
    expect(d.subscales.totalDifficulties).toBe(d.value);
    // total = emotional + conduct + hyperactivity + peer (no prosocial)
    const sum4 =
      d.subscales.emotional + d.subscales.conduct + d.subscales.hyperactivity + d.subscales.peer;
    expect(d.value).toBe(sum4);
  });

  test('borderline band at 14–16', () => {
    expect(sdq.interpret(14).band).toBe('slightly_raised');
    expect(sdq.interpret(16).band).toBe('slightly_raised');
    expect(sdq.interpret(13).band).toBe('close_to_average');
    expect(sdq.interpret(17).band).toBe('high');
  });

  test('lower_better delta flags band improvement', () => {
    const d = sdq.delta(25, 10, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.bandChange).toBe('high_to_normal');
  });

  test('validateRaw rejects wrong length + out-of-range values', () => {
    expect(sdq.validateRaw(all(0).slice(0, 24)).ok).toBe(false);
    expect(sdq.validateRaw(all(3)).ok).toBe(false);
    expect(sdq.validateRaw(all(1)).ok).toBe(true);
  });
});
