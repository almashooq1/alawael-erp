/**
 * Unit Tests — searchEngine.js
 * In-memory full-text + fuzzy search engine
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

let engine;

beforeEach(() => {
  jest.isolateModules(() => {
    engine = require('../../services/searchEngine');
  });
});

const sampleDocs = [
  { _id: '1', name: 'Ahmed Mohamed', description: 'software engineer' },
  { _id: '2', name: 'Sara Ali', description: 'dentist doctor' },
  { _id: '3', name: 'Khaled Ahmed', description: 'network engineer' },
  { _id: '4', name: 'Fatima Hassan', description: 'financial accountant' },
  { _id: '5', name: 'Omar Khaled', description: 'software project manager' },
];

// ═══════════════════════════════════════
//  tokenize
// ═══════════════════════════════════════
describe('tokenize', () => {
  it('lowercases and splits on whitespace', () => {
    expect(engine.tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('strips non-word characters', () => {
    expect(engine.tokenize('test! @value#')).toEqual(['test', 'value']);
  });

  it('filters empty tokens', () => {
    expect(engine.tokenize('  ')).toEqual([]);
  });

  it('handles Arabic text', () => {
    const tokens = engine.tokenize('أحمد محمد');
    expect(Array.isArray(tokens)).toBe(true);
  });
});

// ═══════════════════════════════════════
//  levenshteinDistance
// ═══════════════════════════════════════
describe('levenshteinDistance', () => {
  it('identical strings → 0', () => {
    expect(engine.levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('one insertion → 1', () => {
    expect(engine.levenshteinDistance('cat', 'cats')).toBe(1);
  });

  it('one substitution → 1', () => {
    expect(engine.levenshteinDistance('cat', 'car')).toBe(1);
  });

  it('completely different → large distance', () => {
    expect(engine.levenshteinDistance('abc', 'xyz')).toBe(3);
  });

  it('empty vs non-empty', () => {
    expect(engine.levenshteinDistance('', 'abc')).toBe(3);
  });

  it('both empty → 0', () => {
    expect(engine.levenshteinDistance('', '')).toBe(0);
  });
});

// ═══════════════════════════════════════
//  buildIndex
// ═══════════════════════════════════════
describe('buildIndex', () => {
  it('returns true on success', () => {
    expect(engine.buildIndex('users', sampleDocs)).toBe(true);
  });

  it('builds index with default fields name + description', () => {
    engine.buildIndex('users', sampleDocs);
    const stats = engine.getStats();
    expect(stats.indexes).toBe(1);
    expect(stats.indexDetails[0].name).toBe('users');
    expect(stats.indexDetails[0].documents).toBe(5);
  });

  it('custom search fields', () => {
    engine.buildIndex('users', sampleDocs, ['name']);
    const stats = engine.getStats();
    expect(stats.indexDetails[0].documents).toBe(5);
  });

  it('empty documents array → still creates index', () => {
    expect(engine.buildIndex('empty', [])).toBe(true);
    expect(engine.getStats().indexes).toBe(1);
  });
});

// ═══════════════════════════════════════
//  fullTextSearch
// ═══════════════════════════════════════
describe('fullTextSearch', () => {
  beforeEach(() => {
    engine.buildIndex('users', sampleDocs);
  });

  it('returns empty for non-indexed collection', () => {
    expect(engine.fullTextSearch('test', 'nonexistent')).toEqual([]);
  });

  it('finds matching documents with relevance', () => {
    const results = engine.fullTextSearch('software', 'users');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toHaveProperty('relevance');
  });

  it('respects limit', () => {
    const results = engine.fullTextSearch('engineer', 'users', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('caches results', () => {
    engine.fullTextSearch('engineer', 'users');
    expect(engine.getStats().cacheSize).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════
//  fuzzySearch
// ═══════════════════════════════════════
describe('fuzzySearch', () => {
  beforeEach(() => {
    engine.buildIndex('items', [
      { _id: 'a', name: 'apple' },
      { _id: 'b', name: 'application' },
      { _id: 'c', name: 'banana' },
    ]);
  });

  it('returns empty for non-indexed collection', () => {
    expect(engine.fuzzySearch('test', 'unknown')).toEqual([]);
  });

  it('finds fuzzy matches with score', () => {
    const results = engine.fuzzySearch('aple', 'items');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toHaveProperty('score');
  });

  it('exact match scores highest', () => {
    const results = engine.fuzzySearch('apple', 'items');
    if (results.length > 0) {
      expect(results[0].name).toBe('apple');
    }
  });
});

// ═══════════════════════════════════════
//  advancedSearch
// ═══════════════════════════════════════
describe('advancedSearch', () => {
  beforeEach(() => {
    engine.buildIndex('products', [
      {
        _id: '1',
        name: 'laptop',
        description: 'powerful laptop',
        price: 1000,
        category: 'electronics',
      },
      { _id: '2', name: 'phone', description: 'smart phone', price: 500, category: 'electronics' },
      { _id: '3', name: 'book', description: 'programming book', price: 30, category: 'books' },
    ]);
  });

  it('returns {results, total} for non-indexed collection', () => {
    const r = engine.advancedSearch('test', 'nope');
    expect(r).toEqual({ results: [], total: 0 });
  });

  it('filters by exact value', () => {
    const r = engine.advancedSearch('laptop phone book', 'products', { category: 'books' });
    expect(r.results.every(d => d.category === 'books')).toBe(true);
  });

  it('filters by array (includes)', () => {
    const r = engine.advancedSearch('laptop phone', 'products', { category: ['electronics'] });
    expect(r.results.every(d => d.category === 'electronics')).toBe(true);
  });

  it('filters by $gte', () => {
    const r = engine.advancedSearch('laptop phone', 'products', { price: { $gte: 500 } });
    expect(r.results.every(d => d.price >= 500)).toBe(true);
  });

  it('paginates with offset and limit', () => {
    const r = engine.advancedSearch('laptop phone book', 'products', {}, { limit: 1, offset: 0 });
    expect(r.results.length).toBeLessThanOrEqual(1);
    expect(r.limit).toBe(1);
    expect(r.offset).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getSuggestions
// ═══════════════════════════════════════
describe('getSuggestions', () => {
  beforeEach(() => {
    engine.buildIndex('words', [
      { _id: '1', name: 'programming' },
      { _id: '2', name: 'program' },
      { _id: '3', name: 'progress' },
      { _id: '4', name: 'profit' },
    ]);
  });

  it('returns empty for non-indexed collection', () => {
    expect(engine.getSuggestions('pro', 'unknown')).toEqual([]);
  });

  it('returns suggestions starting with prefix', () => {
    const s = engine.getSuggestions('pro', 'words');
    expect(s.length).toBeGreaterThanOrEqual(1);
    expect(s[0]).toHaveProperty('suggestion');
    expect(s[0]).toHaveProperty('count');
  });

  it('respects limit', () => {
    const s = engine.getSuggestions('pro', 'words', 2);
    expect(s.length).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════
//  clearCache / getStats
// ═══════════════════════════════════════
describe('clearCache / getStats', () => {
  it('clearCache empties the cache', () => {
    engine.buildIndex('test', [{ _id: '1', name: 'hello' }]);
    engine.fullTextSearch('hello', 'test');
    expect(engine.getStats().cacheSize).toBeGreaterThan(0);
    engine.clearCache();
    expect(engine.getStats().cacheSize).toBe(0);
  });

  it('getStats returns correct structure', () => {
    const s = engine.getStats();
    expect(s).toHaveProperty('indexes');
    expect(s).toHaveProperty('cacheSize');
    expect(s).toHaveProperty('indexDetails');
    expect(Array.isArray(s.indexDetails)).toBe(true);
  });
});
