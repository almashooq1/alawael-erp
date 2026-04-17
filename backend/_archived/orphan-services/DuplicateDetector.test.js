/**
 * Unit Tests — DuplicateDetector.js
 * Duplicate detection — class, NO mocks needed
 */
'use strict';

const DuplicateDetector = require('../../services/migration/DuplicateDetector');

let dd;
beforeEach(() => {
  dd = new DuplicateDetector({ threshold: 0.85, matchFields: ['name', 'phone'] });
});

// ═══════════════════════════════════════
//  Constructor
// ═══════════════════════════════════════
describe('constructor', () => {
  it('sets defaults', () => {
    const d = new DuplicateDetector();
    expect(d.options.threshold).toBe(0.85);
    expect(d.options.matchFields).toEqual([]);
    expect(d.options.exactMatchFields).toEqual([]);
    expect(d.options.fuzzyMatchFields).toEqual([]);
  });

  it('accepts custom options', () => {
    const d = new DuplicateDetector({
      threshold: 0.9,
      matchFields: ['email'],
      exactMatchFields: ['id'],
      fuzzyMatchFields: ['name'],
    });
    expect(d.options.threshold).toBe(0.9);
    expect(d.options.matchFields).toEqual(['email']);
    expect(d.options.exactMatchFields).toEqual(['id']);
    expect(d.options.fuzzyMatchFields).toEqual(['name']);
  });
});

// ═══════════════════════════════════════
//  levenshteinDistance
// ═══════════════════════════════════════
describe('levenshteinDistance', () => {
  it('identical strings = 0', () => {
    expect(dd.levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('one empty = length of other', () => {
    expect(dd.levenshteinDistance('', 'abc')).toBe(3);
    expect(dd.levenshteinDistance('abc', '')).toBe(3);
  });

  it('both empty = 0', () => {
    expect(dd.levenshteinDistance('', '')).toBe(0);
  });

  it('single edit = 1', () => {
    expect(dd.levenshteinDistance('kitten', 'sitten')).toBe(1);
  });

  it('multiple edits', () => {
    expect(dd.levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('handles Arabic', () => {
    expect(dd.levenshteinDistance('أحمد', 'أحمد')).toBe(0);
    expect(dd.levenshteinDistance('أحمد', 'محمد')).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
//  calculateSimilarity
// ═══════════════════════════════════════
describe('calculateSimilarity', () => {
  it('identical = 1.0', () => {
    expect(dd.calculateSimilarity('hello', 'hello')).toBe(1.0);
  });

  it('both empty = 1.0', () => {
    expect(dd.calculateSimilarity('', '')).toBe(1.0);
  });

  it('completely different < 1', () => {
    expect(dd.calculateSimilarity('abc', 'xyz')).toBeLessThan(1);
  });

  it('similar strings high similarity', () => {
    expect(dd.calculateSimilarity('Ahmad', 'Ahmed')).toBeGreaterThan(0.5);
  });

  it('returns between 0 and 1', () => {
    const s = dd.calculateSimilarity('test', 'xxxxxxx');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════
//  isExactMatch
// ═══════════════════════════════════════
describe('isExactMatch', () => {
  it('identical objects (no fields) → true', () => {
    expect(dd.isExactMatch({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('different objects (no fields) → false', () => {
    expect(dd.isExactMatch({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('matches on specific fields', () => {
    const r1 = { name: 'Ahmad', phone: '123', age: 25 };
    const r2 = { name: 'Ahmad', phone: '123', age: 30 };
    expect(dd.isExactMatch(r1, r2, ['name', 'phone'])).toBe(true);
  });

  it('fails when field differs', () => {
    const r1 = { name: 'Ahmad', phone: '123' };
    const r2 = { name: 'Ahmed', phone: '123' };
    expect(dd.isExactMatch(r1, r2, ['name', 'phone'])).toBe(false);
  });
});

// ═══════════════════════════════════════
//  isFuzzyMatch
// ═══════════════════════════════════════
describe('isFuzzyMatch', () => {
  it('very similar = match', () => {
    const r1 = { name: 'Ahmad Ali' };
    const r2 = { name: 'Ahmad Aly' };
    expect(dd.isFuzzyMatch(r1, r2, ['name'], 0.7)).toBe(true);
  });

  it('very different = no match', () => {
    const r1 = { name: 'Ahmad' };
    const r2 = { name: 'Zainab' };
    expect(dd.isFuzzyMatch(r1, r2, ['name'], 0.85)).toBe(false);
  });

  it('all fields must meet threshold', () => {
    const r1 = { name: 'Ahmad', city: 'Riyadh' };
    const r2 = { name: 'Ahmad', city: 'Jeddah' };
    expect(dd.isFuzzyMatch(r1, r2, ['name', 'city'], 0.85)).toBe(false);
  });
});

// ═══════════════════════════════════════
//  generateRecordKey
// ═══════════════════════════════════════
describe('generateRecordKey', () => {
  it('no fields → JSON stringify', () => {
    const key = dd.generateRecordKey({ a: 1, b: 2 });
    expect(key).toBe(JSON.stringify({ a: 1, b: 2 }));
  });

  it('with fields → "field:value|..." format', () => {
    const key = dd.generateRecordKey({ name: 'Ahmad', age: 25, city: 'X' }, ['name', 'age']);
    expect(key).toContain('name:Ahmad');
    expect(key).toContain('age:25');
    expect(key).toContain('|');
  });
});

// ═══════════════════════════════════════
//  findDuplicatesByField
// ═══════════════════════════════════════
describe('findDuplicatesByField', () => {
  it('identifies duplicates by specific field', () => {
    const data = [
      { name: 'Ahmad', phone: '123' },
      { name: 'Sara', phone: '456' },
      { name: 'Ahmad', phone: '789' },
    ];
    const r = dd.findDuplicatesByField(data, 'name');
    expect(r.field).toBe('name');
    expect(r.duplicateCount).toBeGreaterThan(0);
    expect(r.duplicates).toBeDefined();
    expect(r.uniqueValues).toBeDefined();
  });

  it('no duplicates', () => {
    const data = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const r = dd.findDuplicatesByField(data, 'name');
    expect(r.duplicateCount).toBe(0);
  });
});

// ═══════════════════════════════════════
//  identifyMergeCandidates
// ═══════════════════════════════════════
describe('identifyMergeCandidates', () => {
  it('creates merge candidate pairs', () => {
    const duplicates = [
      { record: { id: 2, name: 'Ahmad' }, matchedRecord: { id: 1, name: 'Ahmad' } },
    ];
    const r = dd.identifyMergeCandidates(duplicates);
    expect(r).toHaveLength(1);
    expect(r[0].primary).toBeDefined();
    expect(r[0].secondary).toBeDefined();
    expect(r[0].reason).toContain('duplicate');
    expect(r[0].suggestedMergeStrategy).toBe('keep-first');
  });

  it('empty duplicates = empty candidates', () => {
    expect(dd.identifyMergeCandidates([])).toEqual([]);
  });
});

// ═══════════════════════════════════════
//  mergeDuplicates
// ═══════════════════════════════════════
describe('mergeDuplicates', () => {
  it('keep-first: returns r1', () => {
    const r = dd.mergeDuplicates({ a: 1, b: 2 }, { a: 3, b: 4 }, 'keep-first');
    expect(r.a).toBe(1);
    expect(r.b).toBe(2);
  });

  it('keep-all: fills empty from r2', () => {
    const r = dd.mergeDuplicates({ a: 1, b: null }, { a: 99, b: 'filled' }, 'keep-all');
    expect(r.a).toBe(1); // r1 value kept
    expect(r.b).toBe('filled'); // r2 fills empty
  });

  it('prefer-newer: uses more recent updatedAt', () => {
    const older = { a: 'old', updatedAt: '2024-01-01' };
    const newer = { a: 'new', updatedAt: '2025-06-01' };
    const r = dd.mergeDuplicates(older, newer, 'prefer-newer');
    expect(r.a).toBe('new');
  });

  it('defaults to keep-all', () => {
    const r = dd.mergeDuplicates({ a: 1, b: null }, { a: 2, b: 'x' });
    expect(r.b).toBe('x'); // keep-all behavior
  });
});

// ═══════════════════════════════════════
//  registerStrategy / useStrategy
// ═══════════════════════════════════════
describe('registerStrategy', () => {
  it('registers a custom strategy', () => {
    const fn = jest.fn();
    dd.registerStrategy('custom', fn);
    expect(dd.detectionStrategies.has('custom')).toBe(true);
  });

  it('throws for non-function', () => {
    expect(() => dd.registerStrategy('bad', 'not a function')).toThrow();
  });
});

describe('useStrategy', () => {
  it('calls registered strategy', async () => {
    const fn = jest.fn().mockResolvedValue({ duplicates: [] });
    dd.registerStrategy('myStrat', fn);
    const result = await dd.useStrategy('myStrat', [{ a: 1 }]);
    expect(fn).toHaveBeenCalledWith([{ a: 1 }]);
    expect(result).toEqual({ duplicates: [] });
  });

  it('throws for unregistered strategy', async () => {
    await expect(dd.useStrategy('nonexistent', [])).rejects.toThrow();
  });
});

// ═══════════════════════════════════════
//  generateReport / getRecommendations
// ═══════════════════════════════════════
describe('generateReport', () => {
  it('creates report structure', () => {
    const result = { count: 3, duplicates: [1, 2, 3], totalRecords: 100, duplicatePercentage: 3 };
    const r = dd.generateReport(result);
    expect(r).toHaveProperty('summary');
    expect(r).toHaveProperty('duplicates');
    expect(r).toHaveProperty('timestamp');
    expect(r).toHaveProperty('recommendations');
    expect(r.duplicates.length).toBeLessThanOrEqual(20);
  });
});

describe('getRecommendations', () => {
  it('returns recommendations array', () => {
    const result = { count: 5, duplicatePercentage: 10 };
    const r = dd.getRecommendations(result);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });

  it('zero duplicates → different recommendations', () => {
    const r = dd.getRecommendations({ count: 0, duplicatePercentage: 0 });
    expect(Array.isArray(r)).toBe(true);
  });
});

// ═══════════════════════════════════════
//  detectDuplicates (async)
// ═══════════════════════════════════════
describe('detectDuplicates', () => {
  it('exact strategy finds duplicates', async () => {
    const data = [
      { name: 'Ahmad', phone: '123' },
      { name: 'Sara', phone: '456' },
      { name: 'Ahmad', phone: '123' },
    ];
    const r = await dd.detectDuplicates(data, {
      strategy: 'exact',
      matchFields: ['name', 'phone'],
    });
    expect(r.count).toBeGreaterThan(0);
    expect(r.totalRecords).toBe(3);
    expect(r.uniqueCount).toBeLessThanOrEqual(3);
    expect(r.duplicatePercentage).toBe('33.33%');
  });

  it('no duplicates', async () => {
    const data = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const r = await dd.detectDuplicates(data, { strategy: 'exact', matchFields: ['name'] });
    expect(r.count).toBe(0);
    expect(r.uniqueCount).toBe(3);
  });

  it('fuzzy strategy', async () => {
    const d = new DuplicateDetector({ threshold: 0.7, fuzzyMatchFields: ['name'] });
    const data = [{ name: 'Ahmad Ali' }, { name: 'Ahmed Aly' }, { name: 'Sara' }];
    const r = await d.detectDuplicates(data, { strategy: 'fuzzy', matchFields: ['name'] });
    expect(r.totalRecords).toBe(3);
  });
});

// ═══════════════════════════════════════
//  detectNearDuplicates (async)
// ═══════════════════════════════════════
describe('detectNearDuplicates', () => {
  it('finds near-duplicates', async () => {
    const data = [
      { name: 'Ahmad Ali', phone: '0501111111' },
      { name: 'Ahmed Aly', phone: '0501111112' },
      { name: 'Sara Khalid', phone: '0559999999' },
    ];
    const r = await dd.detectNearDuplicates(data, ['name'], 0.7);
    expect(r).toHaveProperty('count');
    expect(r).toHaveProperty('nearDuplicates');
    expect(r).toHaveProperty('threshold');
  });
});
