'use strict';

/**
 * scoring-cfcs-edacs-wave567.test.js — W567.
 *
 * CFCS (communication function) + EDACS (eating & drinking ability) are
 * 5-level ordinal CP classifications, completing the GMFCS/MACS/CFCS/EDACS
 * functional-profile set. Modelled as 1-item ordinal picks (W566 pattern).
 */

jest.setTimeout(15000);

const registry = require('../measures/scoring');

describe.each([['CFCS'], ['EDACS']])('W567 — %s ordinal classification', (code) => {
  const mod = registry.resolve(code);

  test('registered with a 1-item bank, lower_better, range 1-5', () => {
    expect(mod).toBeTruthy();
    expect(mod.direction).toBe('lower_better');
    expect(mod.derivedType).toBe('lookup_table');
    expect(mod.expectedItemCount).toBe(1);
    expect(mod.scoreRange).toEqual({ min: 1, max: 5 });
    expect(mod.itemBank.items).toHaveLength(1);
    expect(mod.itemBank.items[0].responseOptions).toHaveLength(5);
  });

  test('validateRaw enforces a single level 1-5', () => {
    expect(mod.validateRaw([1]).ok).toBe(true);
    expect(mod.validateRaw([5]).ok).toBe(true);
    expect(mod.validateRaw([6]).ok).toBe(false);
    expect(mod.validateRaw([0]).ok).toBe(false);
    expect(mod.validateRaw([1, 2]).ok).toBe(false);
  });

  test('computeDerived returns the level + interpret escalates severity', () => {
    expect(mod.computeDerived([1]).value).toBe(1);
    expect(mod.interpret(1).severity).toBe('normal');
    expect(mod.interpret(1).band).toBe('level_1');
    expect(mod.interpret(3).severity).toBe('moderate');
    expect(mod.interpret(4).severity).toBe('severe');
    expect(mod.interpret(5).severity).toBe('critical');
    expect(() => mod.interpret(6)).toThrow();
  });

  test('every level option is bilingual', () => {
    for (const opt of mod.itemBank.items[0].responseOptions) {
      expect(opt.label_ar.length).toBeGreaterThan(0);
      expect(opt.label_en.length).toBeGreaterThan(0);
    }
  });

  test('delta flags level change (lower_better = improving when level drops)', () => {
    const d = mod.delta(4, 2, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.levelChange).toBe('4_to_2');
    expect(mod.delta(undefined, 2, {})).toBeNull();
  });
});

describe('W567 — CP functional classification set complete', () => {
  test('GMFCS + MACS + CFCS + EDACS all administrable', () => {
    const administrable = registry
      .list()
      .filter((m) => m.hasItemBank)
      .map((m) => m.measureCode);
    for (const code of ['GMFCS', 'MACS', 'CFCS', 'EDACS']) {
      expect(administrable).toContain(code);
    }
  });
});
