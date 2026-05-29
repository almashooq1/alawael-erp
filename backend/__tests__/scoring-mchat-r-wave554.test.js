'use strict';

/**
 * scoring-mchat-r-wave554.test.js — W554.
 *
 * Frozen-fixture tests for the M-CHAT-R/F scoring module. Locks the
 * reverse-item handling (2/5/12), the three risk bands, and the item
 * bank shape. If the engine version ever bumps, these fixtures must be
 * re-frozen in the same PR (version-pinning contract).
 */

jest.setTimeout(15000);

const registry = require('../measures/scoring');
const mod = registry.resolve('M-CHAT-R');

// Helper: a 20-length response array. Default = all typical (low risk):
// "Yes"(1) for normal items, "No"(0) for reverse items 2/5/12.
function typical() {
  return Array.from({ length: 20 }, (_, i) => ([2, 5, 12].includes(i + 1) ? 0 : 1));
}

describe('W554 — M-CHAT-R registration + contract', () => {
  test('registered with item bank', () => {
    expect(mod).toBeTruthy();
    expect(mod.engineVersion).toBe('1.0.0');
    expect(mod.direction).toBe('lower_better');
    expect(mod.itemBank.items).toHaveLength(20);
    expect(mod.expectedItemCount).toBe(20);
  });

  test('reverse-scored flag set only on items 2, 5, 12', () => {
    const reverse = mod.itemBank.items.filter(i => i.reverseScored).map(i => i.number);
    expect(reverse.sort((a, b) => a - b)).toEqual([2, 5, 12]);
  });

  test('every item has Yes/No options with the at-risk side flagged', () => {
    for (const it of mod.itemBank.items) {
      expect(it.responseOptions).toHaveLength(2);
      const atRisk = it.responseOptions.filter(o => o.atRisk);
      expect(atRisk).toHaveLength(1);
      // reverse items: at-risk is Yes(1); others: No(0)
      expect(atRisk[0].value).toBe(it.reverseScored ? 1 : 0);
    }
  });
});

describe('W554 — validateRaw', () => {
  test('rejects wrong length', () => {
    expect(mod.validateRaw([1, 0, 1]).ok).toBe(false);
  });
  test('rejects values other than 0/1', () => {
    const items = typical();
    items[3] = 2;
    expect(mod.validateRaw(items).ok).toBe(false);
  });
  test('accepts a clean 20-length 0/1 array', () => {
    expect(mod.validateRaw(typical()).ok).toBe(true);
  });
});

describe('W554 — scoring fixtures', () => {
  test('all-typical = score 0 = low_risk', () => {
    const d = mod.computeDerived(typical());
    expect(d.value).toBe(0);
    expect(d.notes.flaggedItems).toEqual([]);
    expect(mod.interpret(d.value).band).toBe('low_risk');
    expect(mod.interpret(d.value).followUpRequired).toBe(false);
  });

  test('worst case = score 20 = high_risk (all items flagged)', () => {
    const worst = Array.from({ length: 20 }, (_, i) => ([2, 5, 12].includes(i + 1) ? 1 : 0));
    const d = mod.computeDerived(worst);
    expect(d.value).toBe(20);
    expect(d.notes.flaggedItems).toHaveLength(20);
    expect(mod.interpret(d.value).band).toBe('high_risk');
  });

  test('boundary 2 = low_risk; 3 = medium_risk (Follow-Up required)', () => {
    expect(mod.interpret(2).band).toBe('low_risk');
    const m = mod.interpret(3);
    expect(m.band).toBe('medium_risk');
    expect(m.followUpRequired).toBe(true);
  });

  test('boundary 7 = medium; 8 = high_risk', () => {
    expect(mod.interpret(7).band).toBe('medium_risk');
    expect(mod.interpret(8).band).toBe('high_risk');
  });

  test('reverse item 2 = "Yes" counts as at-risk', () => {
    const items = typical();
    items[1] = 1; // item 2 → Yes → at-risk
    const d = mod.computeDerived(items);
    expect(d.value).toBe(1);
    expect(d.notes.flaggedItems).toContain(2);
  });

  test('normal item 1 = "No" counts as at-risk', () => {
    const items = typical();
    items[0] = 0; // item 1 → No → at-risk
    const d = mod.computeDerived(items);
    expect(d.value).toBe(1);
    expect(d.notes.flaggedItems).toContain(1);
  });

  test('interpret rejects out-of-range derived value', () => {
    expect(() => mod.interpret(21)).toThrow();
    expect(() => mod.interpret(-1)).toThrow();
  });
});

describe('W554 — delta', () => {
  test('improvement (lower) flagged as improving + band change', () => {
    const d = mod.delta(8, 2, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.bandChange).toBe('high_to_low');
  });
  test('null when a side is missing', () => {
    expect(mod.delta(undefined, 2, {})).toBeNull();
  });
});
