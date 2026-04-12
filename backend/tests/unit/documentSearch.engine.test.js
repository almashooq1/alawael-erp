/**
 * Unit Tests — documentSearch.engine.js
 * Heavy focus on pure internal helpers; async methods use jest.setup.js mock
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const engine = require('../../services/documents/documentSearch.engine');
const { SEARCH_CONFIG } = engine;

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
describe('SEARCH_CONFIG', () => {
  it('has expected defaults', () => {
    expect(SEARCH_CONFIG.maxResults).toBe(500);
    expect(SEARCH_CONFIG.defaultLimit).toBe(20);
    expect(SEARCH_CONFIG.minQueryLength).toBe(1);
  });

  it('has field weights', () => {
    expect(SEARCH_CONFIG.fieldWeights.title).toBe(10);
    expect(SEARCH_CONFIG.fieldWeights.tags).toBe(8);
    expect(SEARCH_CONFIG.fieldWeights.description).toBe(5);
  });

  it('has Arabic stop words', () => {
    expect(SEARCH_CONFIG.arabicStopWords).toBeInstanceOf(Set);
    expect(SEARCH_CONFIG.arabicStopWords.has('في')).toBe(true);
    expect(SEARCH_CONFIG.arabicStopWords.has('من')).toBe(true);
  });

  it('has English stop words', () => {
    expect(SEARCH_CONFIG.englishStopWords).toBeInstanceOf(Set);
    expect(SEARCH_CONFIG.englishStopWords.has('the')).toBe(true);
    expect(SEARCH_CONFIG.englishStopWords.has('is')).toBe(true);
  });
});

// ═══════════════════════════════════════
//  _cleanQuery
// ═══════════════════════════════════════
describe('_cleanQuery', () => {
  it('returns empty for falsy', () => {
    expect(engine._cleanQuery(null)).toBe('');
    expect(engine._cleanQuery(undefined)).toBe('');
    expect(engine._cleanQuery('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(engine._cleanQuery('  hello  ')).toBe('hello');
  });

  it('collapses multiple spaces', () => {
    expect(engine._cleanQuery('a   b   c')).toBe('a b c');
  });

  it('strips dangerous chars', () => {
    expect(engine._cleanQuery('test<script>alert')).toBe('testscriptalert');
    expect(engine._cleanQuery('foo{bar}baz')).toBe('foobarbaz');
  });

  it('truncates to 500 chars', () => {
    const long = 'a'.repeat(600);
    expect(engine._cleanQuery(long).length).toBe(500);
  });
});

// ═══════════════════════════════════════
//  _tokenize
// ═══════════════════════════════════════
describe('_tokenize', () => {
  it('returns empty for empty query', () => {
    expect(engine._tokenize('')).toEqual([]);
    expect(engine._tokenize(null)).toEqual([]);
  });

  it('splits by whitespace', () => {
    expect(engine._tokenize('تقرير طبي سنوي')).toEqual(['تقرير', 'طبي', 'سنوي']);
  });

  it('filters short words (len < 2)', () => {
    expect(engine._tokenize('a ب testing')).toEqual(['testing']);
  });

  it('removes Arabic stop words', () => {
    const tokens = engine._tokenize('في المستشفى من التقارير');
    expect(tokens).not.toContain('في');
    expect(tokens).not.toContain('من');
    expect(tokens).toContain('المستشفى');
    expect(tokens).toContain('التقارير');
  });

  it('removes English stop words', () => {
    const tokens = engine._tokenize('the report is about');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('is');
    expect(tokens).toContain('report');
    expect(tokens).toContain('about');
  });
});

// ═══════════════════════════════════════
//  _buildSort
// ═══════════════════════════════════════
describe('_buildSort', () => {
  it('returns newest by default', () => {
    expect(engine._buildSort(undefined)).toEqual({ createdAt: -1 });
  });

  it('returns relevance sort', () => {
    const s = engine._buildSort('relevance');
    expect(s.viewCount).toBe(-1);
    expect(s.downloadCount).toBe(-1);
  });

  it('returns newest', () => {
    expect(engine._buildSort('newest')).toEqual({ createdAt: -1 });
  });

  it('returns oldest', () => {
    expect(engine._buildSort('oldest')).toEqual({ createdAt: 1 });
  });

  it('returns nameAsc / nameDesc', () => {
    expect(engine._buildSort('nameAsc')).toEqual({ title: 1 });
    expect(engine._buildSort('nameDesc')).toEqual({ title: -1 });
  });

  it('returns size sorts', () => {
    expect(engine._buildSort('sizeAsc')).toEqual({ fileSize: 1 });
    expect(engine._buildSort('sizeDesc')).toEqual({ fileSize: -1 });
  });

  it('returns view/download sorts', () => {
    expect(engine._buildSort('mostViewed')).toEqual({ viewCount: -1 });
    expect(engine._buildSort('mostDownloaded')).toEqual({ downloadCount: -1 });
  });

  it('returns lastModified sort', () => {
    expect(engine._buildSort('lastModified')).toEqual({ lastModified: -1 });
  });

  it('defaults to newest for unknown', () => {
    expect(engine._buildSort('random_value')).toEqual({ createdAt: -1 });
  });
});

// ═══════════════════════════════════════
//  _calculateRelevance
// ═══════════════════════════════════════
describe('_calculateRelevance', () => {
  it('returns 0 for no tokens', () => {
    expect(engine._calculateRelevance({}, [])).toBe(0);
    expect(engine._calculateRelevance({}, null)).toBe(0);
  });

  it('scores title match', () => {
    const score = engine._calculateRelevance({ title: 'تقرير طبي' }, ['تقرير']);
    expect(score).toBeGreaterThanOrEqual(SEARCH_CONFIG.fieldWeights.title);
  });

  it('scores tag match', () => {
    const score = engine._calculateRelevance({ tags: ['medical', 'report'] }, ['medical']);
    expect(score).toBeGreaterThanOrEqual(SEARCH_CONFIG.fieldWeights.tags);
  });

  it('scores originalFileName match', () => {
    const score = engine._calculateRelevance({ originalFileName: 'report.pdf' }, ['report']);
    expect(score).toBeGreaterThanOrEqual(SEARCH_CONFIG.fieldWeights.originalFileName);
  });

  it('scores description match', () => {
    const score = engine._calculateRelevance({ description: 'monthly report' }, ['report']);
    expect(score).toBeGreaterThanOrEqual(SEARCH_CONFIG.fieldWeights.description);
  });

  it('scores extractedText match', () => {
    const score = engine._calculateRelevance({ extractedText: 'some medical text' }, ['medical']);
    expect(score).toBeGreaterThanOrEqual(SEARCH_CONFIG.fieldWeights.extractedText);
  });

  it('boosts recent documents', () => {
    const recent = engine._calculateRelevance({ title: 'test', createdAt: new Date() }, ['test']);
    const old = engine._calculateRelevance({ title: 'test', createdAt: new Date('2020-01-01') }, [
      'test',
    ]);
    expect(recent).toBeGreaterThan(old);
  });

  it('adds view/download bonus', () => {
    const withViews = engine._calculateRelevance(
      { title: 'test', viewCount: 500, downloadCount: 200 },
      ['test']
    );
    const noViews = engine._calculateRelevance({ title: 'test', viewCount: 0, downloadCount: 0 }, [
      'test',
    ]);
    expect(withViews).toBeGreaterThan(noViews);
  });
});

// ═══════════════════════════════════════
//  _highlightMatches
// ═══════════════════════════════════════
describe('_highlightMatches', () => {
  it('returns text if no query', () => {
    expect(engine._highlightMatches('hello', null)).toBe('hello');
    expect(engine._highlightMatches(null, 'query')).toBeNull();
  });

  it('wraps matched words in **', () => {
    const result = engine._highlightMatches('monthly report about sales', 'report');
    expect(result).toContain('**report**');
  });

  it('handles multiple words', () => {
    const result = engine._highlightMatches('medical report for review', 'medical review');
    expect(result).toContain('**medical**');
    expect(result).toContain('**review**');
  });
});

// ═══════════════════════════════════════
//  _extractSnippet
// ═══════════════════════════════════════
describe('_extractSnippet', () => {
  it('returns empty for no text', () => {
    expect(engine._extractSnippet(null, 'query')).toBe('');
    expect(engine._extractSnippet('', 'query')).toBe('');
  });

  it('returns start of text if no query', () => {
    expect(engine._extractSnippet('hello world', null)).toBe('');
  });

  it('extracts around match', () => {
    const text = 'x'.repeat(50) + 'MATCH' + 'y'.repeat(50);
    const snippet = engine._extractSnippet(text, 'MATCH', 30);
    expect(snippet).toContain('MATCH');
  });

  it('falls back to start if not found', () => {
    const text = 'some long text here';
    const snippet = engine._extractSnippet(text, 'zzzznotfound', 200);
    expect(snippet).toBe(text.substring(0, 200));
  });

  it('adds ellipsis when truncated', () => {
    const text = 'A'.repeat(100) + 'KEYWORD' + 'B'.repeat(100);
    const snippet = engine._extractSnippet(text, 'KEYWORD', 50);
    expect(snippet).toMatch(/\.\.\..*KEYWORD.*/);
  });
});

// ═══════════════════════════════════════
//  _generateSuggestions
// ═══════════════════════════════════════
describe('_generateSuggestions', () => {
  it('returns empty for no query', () => {
    expect(engine._generateSuggestions(null)).toEqual([]);
    expect(engine._generateSuggestions('')).toEqual([]);
  });

  it('returns array of tip objects', () => {
    const suggestions = engine._generateSuggestions('test');
    expect(suggestions.length).toBe(3);
    expect(suggestions[0].type).toBe('tip');
    expect(suggestions[0].icon).toBeTruthy();
    expect(suggestions[0].message).toBeTruthy();
  });
});

// ═══════════════════════════════════════
//  _generateAutocompleteSuggestions
// ═══════════════════════════════════════
describe('_generateAutocompleteSuggestions', () => {
  it('returns matching suggestions', () => {
    const result = engine._generateAutocompleteSuggestions('تقرير');
    expect(result.some(s => s.includes('تقرير'))).toBe(true);
  });

  it('returns empty for non-matching', () => {
    const result = engine._generateAutocompleteSuggestions('xyzunknown999');
    expect(result).toEqual([]);
  });

  it('limits to 5', () => {
    const result = engine._generateAutocompleteSuggestions('');
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

// ═══════════════════════════════════════
//  quickSearch (async)
// ═══════════════════════════════════════
describe('quickSearch', () => {
  it('returns empty for no query', async () => {
    const r = await engine.quickSearch('', 'user1');
    expect(r.results).toEqual([]);
    expect(r.suggestions).toEqual([]);
  });

  it('returns results array for valid query', async () => {
    const r = await engine.quickSearch('test', 'user1');
    expect(r).toHaveProperty('results');
    expect(r).toHaveProperty('suggestions');
    expect(Array.isArray(r.results)).toBe(true);
  });
});

// ═══════════════════════════════════════
//  search (async)
// ═══════════════════════════════════════
describe('search', () => {
  it('returns structured result', async () => {
    const r = await engine.search('test', {}, {});
    expect(r.success).toBe(true);
    expect(r).toHaveProperty('query');
    expect(r).toHaveProperty('tokens');
    expect(r).toHaveProperty('results');
    expect(r).toHaveProperty('pagination');
    expect(r).toHaveProperty('facets');
    expect(r).toHaveProperty('duration');
    expect(r.pagination).toHaveProperty('page');
    expect(r.pagination).toHaveProperty('total');
  });

  it('returns suggestions when no results', async () => {
    const r = await engine.search('nonexistent', {});
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('empty query works', async () => {
    const r = await engine.search('', {});
    expect(r.success).toBe(true);
    expect(r.query).toBe('');
  });
});

// ═══════════════════════════════════════
//  getSavedSearches (async)
// ═══════════════════════════════════════
describe('getSavedSearches', () => {
  it('returns array', async () => {
    const r = await engine.getSavedSearches('user1');
    expect(Array.isArray(r)).toBe(true);
  });
});
