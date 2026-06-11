/**
 * W1202 — pure-helper tests for scripts/seed-hr-intelligence.js.
 * The deterministic level/band logic + catalog shape (no DB).
 */

'use strict';

const seed = require('../scripts/seed-hr-intelligence');

describe('W1202 seed-hr-intelligence — deterministic helpers', () => {
  test('hashInt is deterministic + stable across runs', () => {
    expect(seed.hashInt('emp1|perf')).toBe(seed.hashInt('emp1|perf'));
    expect(seed.hashInt('emp1|perf')).not.toBe(seed.hashInt('emp2|perf'));
    expect(typeof seed.hashInt('x')).toBe('number');
  });

  test('bandFor returns a 1-3 band, deterministic per (id,key)', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      const p = seed.bandFor(id, 'perf');
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThanOrEqual(3);
      expect(seed.bandFor(id, 'perf')).toBe(p); // stable
    }
  });

  test('currentLevelFor is clamped to [0,5] and creates a spread of gaps', () => {
    let met = 0;
    let gap = 0;
    for (let i = 0; i < 200; i++) {
      const lvl = seed.currentLevelFor(`emp${i}`, 'assessment', 4);
      expect(lvl).toBeGreaterThanOrEqual(0);
      expect(lvl).toBeLessThanOrEqual(5);
      if (lvl >= 4) met++;
      else gap++;
    }
    // realistic mix — neither all-met nor all-gap
    expect(met).toBeGreaterThan(0);
    expect(gap).toBeGreaterThan(0);
  });

  test('currentLevelFor never exceeds the required level (shortfall only)', () => {
    for (let i = 0; i < 100; i++) {
      expect(seed.currentLevelFor(`e${i}`, 'k', 3)).toBeLessThanOrEqual(3);
    }
  });
});

describe('W1202 seed-hr-intelligence — competency catalog', () => {
  test('every catalog entry is well-formed (key, required 1-5, valid criticality)', () => {
    const valid = new Set(['core', 'important', 'nice']);
    expect(seed.COMPETENCY_CATALOG.length).toBeGreaterThanOrEqual(4);
    for (const c of seed.COMPETENCY_CATALOG) {
      expect(c.competencyKey).toMatch(/^[a-z_]+$/);
      expect(c.competencyNameAr).toBeTruthy();
      expect(c.requiredLevel).toBeGreaterThanOrEqual(1);
      expect(c.requiredLevel).toBeLessThanOrEqual(5);
      expect(valid.has(c.criticality)).toBe(true);
    }
  });

  test('competency keys are unique', () => {
    const keys = seed.COMPETENCY_CATALOG.map(c => c.competencyKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
