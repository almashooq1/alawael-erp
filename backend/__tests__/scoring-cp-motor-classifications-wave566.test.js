'use strict';

/**
 * scoring-cp-motor-classifications-wave566.test.js — W566.
 *
 * GMFCS-E&R + MACS are 5-level ordinal classifications for cerebral palsy
 * modelled inside the item-bank framework as 1-item ordinal picks
 * (response value = level 1–5). Tests lock the level→band mapping,
 * lower_better direction, single-item validation, and item-bank shape.
 */

jest.setTimeout(15000);

const registry = require('../measures/scoring');

describe.each([
  ['GMFCS', 'walks'],
  ['MACS', 'handles objects'],
])('W566 — %s ordinal classification', code => {
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
    expect(mod.validateRaw([2.5]).ok).toBe(false);
  });

  test('computeDerived returns the level as the value', () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      expect(mod.computeDerived([lvl]).value).toBe(lvl);
    }
  });

  test('interpret maps levels to escalating severity', () => {
    expect(mod.interpret(1).severity).toBe('normal');
    expect(mod.interpret(1).band).toBe('level_1');
    expect(mod.interpret(3).severity).toBe('moderate');
    expect(mod.interpret(4).severity).toBe('severe');
    expect(mod.interpret(5).severity).toBe('critical');
    expect(() => mod.interpret(6)).toThrow();
  });

  test('every level option + interpretation is bilingual', () => {
    for (const opt of mod.itemBank.items[0].responseOptions) {
      expect(opt.label_ar.length).toBeGreaterThan(0);
      expect(opt.label_en.length).toBeGreaterThan(0);
    }
    const i = mod.interpret(3);
    expect(typeof i.label_ar).toBe('string');
    expect(typeof i.label_en).toBe('string');
  });

  test('delta flags a level change (lower_better = improving when level drops)', () => {
    const d = mod.delta(4, 2, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.levelChange).toBe('4_to_2');
    expect(mod.delta(undefined, 2, {})).toBeNull();
  });
});
