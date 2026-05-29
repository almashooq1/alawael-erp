'use strict';

/**
 * scoring-cars2-pedsql-wave555.test.js — W555.
 *
 * Frozen-fixture tests for CARS-2 (autism severity, 15 items × 1-4) and
 * PedsQL 4.0 (HRQOL, 23 items × 0-4 → 0-100 transform with 4 domains +
 * 2 summary scores).
 */

jest.setTimeout(15000);

const registry = require('../measures/scoring');

describe('W555 — CARS-2 (Standard Version)', () => {
  const cars = registry.resolve('CARS-2');

  test('registered with 15-item bank, lower_better', () => {
    expect(cars).toBeTruthy();
    expect(cars.direction).toBe('lower_better');
    expect(cars.itemBank.items).toHaveLength(15);
    expect(cars.scoreRange).toEqual({ min: 15, max: 60 });
  });

  test('validateRaw enforces 15 items in {1,1.5,...,4}', () => {
    expect(cars.validateRaw(Array(14).fill(1)).ok).toBe(false);
    expect(cars.validateRaw(Array(15).fill(2.2)).ok).toBe(false); // not on the 0.5 grid
    expect(cars.validateRaw(Array(15).fill(4)).ok).toBe(true);
  });

  test('all-1 = 15 = minimal_to_none', () => {
    const d = cars.computeDerived(Array(15).fill(1));
    expect(d.value).toBe(15);
    expect(cars.interpret(d.value).band).toBe('minimal_to_none');
  });

  test('boundary 29.5 minimal; 30 mild_to_moderate; 36.5 mild; 37 severe', () => {
    expect(cars.interpret(29.5).band).toBe('minimal_to_none');
    expect(cars.interpret(30).band).toBe('mild_to_moderate');
    expect(cars.interpret(36.5).band).toBe('mild_to_moderate');
    expect(cars.interpret(37).band).toBe('severe');
  });

  test('all-3 = 45 = severe; itemsRatedHigh captured', () => {
    const d = cars.computeDerived(Array(15).fill(3));
    expect(d.value).toBe(45);
    expect(d.notes.itemsRatedHigh).toHaveLength(15);
    expect(cars.interpret(45).band).toBe('severe');
  });

  test('delta improvement crossing bands', () => {
    const d = cars.delta(45, 28, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.bandChange).toBe('severe_to_minimal');
  });
});

describe('W555 — PedsQL 4.0 Generic Core', () => {
  const p = registry.resolve('PEDSQL');

  test('registered with 23-item bank + 4 domains, higher_better', () => {
    expect(p).toBeTruthy();
    expect(p.direction).toBe('higher_better');
    expect(p.itemBank.items).toHaveLength(23);
    expect(p.itemBank.domains.map(d => d.key)).toEqual([
      'physical',
      'emotional',
      'social',
      'school',
    ]);
  });

  test('domain assignment: 8 physical / 5 emotional / 5 social / 5 school', () => {
    const counts = p.itemBank.items.reduce((acc, it) => {
      acc[it.domain] = (acc[it.domain] || 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ physical: 8, emotional: 5, social: 5, school: 5 });
  });

  test('validateRaw enforces 23 integers 0-4', () => {
    expect(p.validateRaw(Array(22).fill(0)).ok).toBe(false);
    expect(p.validateRaw(Array(23).fill(5)).ok).toBe(false);
    expect(p.validateRaw(Array(23).fill(2.5)).ok).toBe(false);
    expect(p.validateRaw(Array(23).fill(0)).ok).toBe(true);
  });

  test('all-0 (no problems) = 100 = good; subscales all 100', () => {
    const d = p.computeDerived(Array(23).fill(0));
    expect(d.value).toBe(100);
    expect(d.subscales.physical).toBe(100);
    expect(d.subscales.psychosocialHealth).toBe(100);
    expect(p.interpret(d.value).band).toBe('good');
  });

  test('all-4 (max problems) = 0 = impaired', () => {
    const d = p.computeDerived(Array(23).fill(4));
    expect(d.value).toBe(0);
    expect(p.interpret(d.value).band).toBe('impaired');
  });

  test('transform 0→100,1→75,2→50,3→25,4→0 (all-2 = 50)', () => {
    const d = p.computeDerived(Array(23).fill(2));
    expect(d.value).toBe(50);
  });

  test('psychosocial = mean of emotional+social+school only', () => {
    // physical items (1-8) = 0 → transformed 100; rest (9-23) = 4 → 0
    const items = Array(23)
      .fill(0)
      .map((_, i) => (i < 8 ? 0 : 4));
    const d = p.computeDerived(items);
    expect(d.subscales.physical).toBe(100);
    expect(d.subscales.psychosocialHealth).toBe(0);
  });

  test('band boundaries 81 good / 70 borderline / 69.9 impaired', () => {
    expect(p.interpret(81).band).toBe('good');
    expect(p.interpret(80.9).band).toBe('borderline');
    expect(p.interpret(70).band).toBe('borderline');
    expect(p.interpret(69.9).band).toBe('impaired');
  });

  test('delta improvement higher_better', () => {
    const d = p.delta(50, 85, { interpretation: {} });
    expect(d.direction).toBe('improving');
    expect(d.bandChange).toBe('impaired_to_good');
  });
});
