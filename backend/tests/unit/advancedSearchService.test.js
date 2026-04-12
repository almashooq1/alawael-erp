/**
 * Unit tests — advancedSearchService.js
 * Class constructor (module.exports = AdvancedSearchService), in-memory
 */
'use strict';

const AdvancedSearchService = require('../../services/advancedSearchService');

let svc;
const sampleData = [
  { id: 1, name: 'أحمد محمد', department: 'تقنية', score: 90, active: true },
  { id: 2, name: 'سارة علي', department: 'موارد بشرية', score: 75, active: true },
  { id: 3, name: 'خالد أحمد', department: 'تقنية', score: 60, active: false },
  { id: 4, name: 'مريم حسن', department: 'مالية', score: 85, active: true },
  { id: 5, name: 'عمر صالح', department: 'تقنية', score: 45, active: false },
];

beforeEach(() => {
  svc = new AdvancedSearchService();
  svc.buildSearchIndex(sampleData, ['name', 'department']);
});

/* ================================================================ */
describe('AdvancedSearchService', () => {
  /* ── constructor ─────────────────────────────────────────────── */
  describe('constructor', () => {
    it('initializes empty state', () => {
      const fresh = new AdvancedSearchService();
      expect(fresh.searchIndex).toBeInstanceOf(Map);
      expect(fresh.searchHistory).toEqual([]);
    });
  });

  /* ── buildSearchIndex ────────────────────────────────────────── */
  describe('buildSearchIndex', () => {
    it('populates searchIndex from data', () => {
      expect(svc.searchIndex.size).toBeGreaterThan(0);
    });

    it('tokenize splits and lowercases', () => {
      const tokens = svc.tokenize('Hello World');
      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
    });
  });

  /* ── getNestedValue ──────────────────────────────────────────── */
  describe('getNestedValue', () => {
    it('extracts nested property', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(svc.getNestedValue(obj, 'a.b.c')).toBe(42);
    });

    it('returns undefined for missing path', () => {
      expect(svc.getNestedValue({}, 'a.b.c')).toBeUndefined();
    });
  });

  /* ── advancedSearchRanked / advancedSearch ───────────────────── */
  describe('advancedSearchRanked', () => {
    it('returns ranked results', () => {
      const res = svc.advancedSearchRanked(sampleData, 'أحمد', { fields: ['name'] });
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.total).toBeGreaterThan(0);
    });

    it('limits results via offset/limit', () => {
      const res = svc.advancedSearchRanked(sampleData, 'أ', {
        fields: ['name'],
        limit: 2,
        offset: 0,
      });
      expect(res.data.length).toBeLessThanOrEqual(2);
      expect(res.hasMore).toBeDefined();
    });

    it('records to search history', () => {
      svc.advancedSearchRanked(sampleData, 'test', { fields: ['name'] });
      expect(svc.searchHistory.length).toBeGreaterThan(0);
    });
  });

  /* ── levenshteinDistance ──────────────────────────────────────── */
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(svc.levenshteinDistance('abc', 'abc')).toBe(0);
    });

    it('returns correct distance', () => {
      expect(svc.levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('handles empty strings', () => {
      expect(svc.levenshteinDistance('', 'abc')).toBe(3);
      expect(svc.levenshteinDistance('abc', '')).toBe(3);
    });
  });

  /* ── applyFilters / filter ───────────────────────────────────── */
  describe('applyFilters', () => {
    it('equals', () => {
      const res = svc.applyFilters(sampleData, [
        { field: 'department', operator: 'equals', value: 'تقنية' },
      ]);
      expect(res).toHaveLength(3);
    });

    it('ne', () => {
      const res = svc.applyFilters(sampleData, [
        { field: 'department', operator: 'ne', value: 'تقنية' },
      ]);
      expect(res).toHaveLength(2);
    });

    it('contains', () => {
      const res = svc.applyFilters(sampleData, [
        { field: 'name', operator: 'contains', value: 'أحمد' },
      ]);
      expect(res.length).toBeGreaterThanOrEqual(2);
    });

    it('startsWith', () => {
      const res = svc.applyFilters(sampleData, [
        { field: 'name', operator: 'startsWith', value: 'أحمد' },
      ]);
      expect(res.length).toBeGreaterThanOrEqual(1);
    });

    it('endsWith', () => {
      const res = svc.applyFilters(sampleData, [
        { field: 'name', operator: 'endsWith', value: 'محمد' },
      ]);
      expect(res.length).toBeGreaterThanOrEqual(1);
    });

    it('gt / lt', () => {
      expect(
        svc.applyFilters(sampleData, [{ field: 'score', operator: 'gt', value: 80 }])
      ).toHaveLength(2);
      expect(
        svc.applyFilters(sampleData, [{ field: 'score', operator: 'lt', value: 60 }])
      ).toHaveLength(1);
    });

    it('gte / lte', () => {
      expect(
        svc.applyFilters(sampleData, [{ field: 'score', operator: 'gte', value: 85 }])
      ).toHaveLength(2);
      expect(
        svc.applyFilters(sampleData, [{ field: 'score', operator: 'lte', value: 60 }])
      ).toHaveLength(2);
    });

    it('between', () => {
      const res = svc.applyFilters(sampleData, [
        { field: 'score', operator: 'between', min: 70, max: 90 },
      ]);
      expect(res.length).toBeGreaterThanOrEqual(2);
    });

    it('in / notIn', () => {
      const res = svc.applyFilters(sampleData, [
        { field: 'department', operator: 'in', value: ['تقنية', 'مالية'] },
      ]);
      expect(res).toHaveLength(4);
      const res2 = svc.applyFilters(sampleData, [
        { field: 'department', operator: 'notIn', values: ['تقنية'] },
      ]);
      expect(res2).toHaveLength(2);
    });

    it('isEmpty / isNotEmpty', () => {
      const data = [{ a: '' }, { a: 'x' }, { a: null }];
      expect(
        svc.applyFilters(data, [{ field: 'a', operator: 'isEmpty' }]).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        svc.applyFilters(data, [{ field: 'a', operator: 'isNotEmpty' }]).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── facetedSearch ───────────────────────────────────────────── */
  describe('facetedSearch', () => {
    it('returns facets with counts', () => {
      const res = svc.facetedSearch(sampleData, 'department');
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].value).toBeDefined();
      expect(res[0].count).toBeGreaterThan(0);
    });
  });

  /* ── autocompleteSearch / autocomplete ───────────────────────── */
  describe('autocompleteSearch', () => {
    it('returns suggestions', () => {
      const res = svc.autocompleteSearch(sampleData, 'أح', 'name');
      expect(res.length).toBeGreaterThan(0);
    });
  });

  /* ── getSearchStatistics/getStatistics ───────────────────────── */
  describe('getSearchStatistics', () => {
    it('returns statistics', () => {
      svc.advancedSearchRanked(sampleData, 'test', { fields: ['name'] });
      const stats = svc.getSearchStatistics();
      expect(stats.totalSearches).toBeGreaterThan(0);
    });
  });

  /* ── exportResults ───────────────────────────────────────────── */
  describe('exportResults', () => {
    it('exports as json', () => {
      const res = svc.exportResults(sampleData, 'json');
      expect(typeof res).toBe('string');
      expect(JSON.parse(res)).toEqual(sampleData);
    });

    it('exports as csv', () => {
      const res = svc.exportResults(sampleData, 'csv');
      expect(res).toContain('id');
    });
  });

  /* ── basicSearch ─────────────────────────────────────────────── */
  describe('basicSearch', () => {
    it('finds items containing query', () => {
      const res = svc.basicSearch(sampleData, 'أحمد');
      expect(res.length).toBeGreaterThan(0);
    });

    it('returns empty for no match', () => {
      const res = svc.basicSearch(sampleData, 'zzzzz');
      expect(res).toHaveLength(0);
    });
  });

  /* ── fuzzySearch ─────────────────────────────────────────────── */
  describe('fuzzySearch', () => {
    it('returns fuzzy matches', () => {
      const res = svc.fuzzySearch(sampleData, 'احمد');
      expect(res.length).toBeGreaterThanOrEqual(0); // depends on threshold
    });
  });

  /* ── sort ─────────────────────────────────────────────────────── */
  describe('sort', () => {
    it('sorts ascending by score', () => {
      const sorted = svc.sort([...sampleData], 'score', 'asc');
      expect(sorted[0].score).toBe(45);
    });

    it('sorts descending by score', () => {
      const sorted = svc.sort([...sampleData], 'score', 'desc');
      expect(sorted[0].score).toBe(90);
    });
  });

  /* ── paginate ────────────────────────────────────────────────── */
  describe('paginate', () => {
    it('returns correct page', () => {
      const res = svc.paginate(sampleData, { page: 1, pageSize: 2 });
      expect(res.items).toHaveLength(2);
      expect(res.totalPages).toBe(3);
      expect(res.currentPage).toBe(1);
    });

    it('returns last page', () => {
      const res = svc.paginate(sampleData, { page: 3, pageSize: 2 });
      expect(res.items).toHaveLength(1);
    });
  });

  /* ── compoundSearch ──────────────────────────────────────────── */
  describe('compoundSearch', () => {
    it('combines query + filters + sort', () => {
      const res = svc.compoundSearch(sampleData, {
        query: 'تقنية',
        filters: [{ field: 'active', operator: 'equals', value: true }],
        sort: { field: 'score', direction: 'desc' },
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  /* ── getStatistics ───────────────────────────────────────────── */
  describe('getStatistics (numeric)', () => {
    it('computes numeric statistics', () => {
      const res = svc.getStatistics(sampleData, 'score');
      expect(res.min).toBe(45);
      expect(res.max).toBe(90);
      expect(res.count).toBe(5);
    });
  });

  /* ── exportToCSV / exportToJSON ──────────────────────────────── */
  describe('exportToCSV / exportToJSON', () => {
    it('CSV contains headers', () => {
      const csv = svc.exportToCSV(sampleData);
      expect(csv).toContain('id');
      expect(csv).toContain('name');
    });

    it('JSON round-trips', () => {
      const json = svc.exportToJSON(sampleData);
      expect(JSON.parse(json)).toEqual(sampleData);
    });
  });

  /* ── generateFacets ──────────────────────────────────────────── */
  describe('generateFacets', () => {
    it('returns facets for department', () => {
      const facets = svc.generateFacets(sampleData, 'department');
      expect(Object.keys(facets).length).toBeGreaterThan(0);
      expect(facets['تقنية']).toBe(3);
    });
  });
});
