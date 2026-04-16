/**
 * Unit tests for advancedSearchService.js
 * Class export (not singleton) — NO Mongoose, pure in-memory search/filter logic
 */

const AdvancedSearchService = require('../../services/advancedSearchService');

const SAMPLE_DATA = [
  { id: 1, name: 'Ahmad Ali', department: 'HR', age: 30, salary: 5000, joinDate: '2020-01-15' },
  { id: 2, name: 'Sara Khaled', department: 'IT', age: 25, salary: 7000, joinDate: '2019-06-01' },
  {
    id: 3,
    name: 'Mohammed Nasser',
    department: 'Finance',
    age: 35,
    salary: 8000,
    joinDate: '2018-03-20',
  },
  { id: 4, name: 'Fatima Omar', department: 'IT', age: 28, salary: 6500, joinDate: '2021-09-10' },
  {
    id: 5,
    name: 'Khalid Ibrahim',
    department: 'HR',
    age: 40,
    salary: 9000,
    joinDate: '2017-11-05',
  },
];

let svc;
beforeEach(() => {
  svc = new AdvancedSearchService();
});

describe('AdvancedSearchService', () => {
  /* ═══════ tokenize ═══════ */
  describe('tokenize', () => {
    it('splits on spaces, dashes, dots, underscores and Arabic commas', () => {
      const tokens = svc.tokenize('hello-world_test.me،here');
      expect(tokens).toEqual(expect.arrayContaining(['hello', 'world', 'test', 'me', 'here']));
    });
    it('lowercases tokens', () => {
      expect(svc.tokenize('ABC')).toEqual(['abc']);
    });
    it('filters empty tokens', () => {
      expect(svc.tokenize('  ')).toEqual([]);
    });
  });

  /* ═══════ getNestedValue ═══════ */
  describe('getNestedValue', () => {
    it('retrieves top-level field', () => {
      expect(svc.getNestedValue({ a: 1 }, 'a')).toBe(1);
    });
    it('retrieves nested field', () => {
      expect(svc.getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
    });
    it('returns undefined for missing path', () => {
      expect(svc.getNestedValue({}, 'x.y')).toBeUndefined();
    });
  });

  /* ═══════ buildSearchIndex ═══════ */
  describe('buildSearchIndex', () => {
    it('builds an index from data', () => {
      const idx = svc.buildSearchIndex(SAMPLE_DATA, ['name']);
      expect(idx.size).toBeGreaterThan(0);
      expect(idx.has('ahmad')).toBe(true);
    });
  });

  /* ═══════ levenshteinDistance ═══════ */
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(svc.levenshteinDistance('abc', 'abc')).toBe(0);
    });
    it('returns correct distance', () => {
      expect(svc.levenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });

  /* ═══════ advancedSearchRanked ═══════ */
  describe('advancedSearchRanked', () => {
    it('returns results with pagination info', () => {
      const result = svc.advancedSearchRanked(SAMPLE_DATA, 'Ahmad', { fields: ['name'] });
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
      expect(result).toHaveProperty('hasMore');
    });
    it('records in searchHistory', () => {
      svc.advancedSearchRanked(SAMPLE_DATA, 'test', { fields: ['name'] });
      expect(svc.searchHistory).toHaveLength(1);
    });
    it('respects pagination', () => {
      const result = svc.advancedSearchRanked(SAMPLE_DATA, 'a', {
        fields: ['name'],
        limit: 1,
        offset: 0,
      });
      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  /* ═══════ applyFilters ═══════ */
  describe('applyFilters', () => {
    it('filters by equals', () => {
      const r = svc.applyFilters(SAMPLE_DATA, [
        { field: 'department', operator: 'equals', value: 'IT' },
      ]);
      expect(r).toHaveLength(2);
    });
    it('filters by contains', () => {
      const r = svc.applyFilters(SAMPLE_DATA, [
        { field: 'name', operator: 'contains', value: 'Ahmad' },
      ]);
      expect(r).toHaveLength(1);
    });
    it('filters by greaterThan', () => {
      const r = svc.applyFilters(SAMPLE_DATA, [
        { field: 'salary', operator: 'greaterThan', value: 7000 },
      ]);
      expect(r.every(x => x.salary > 7000)).toBe(true);
    });
    it('filters by between', () => {
      const r = svc.applyFilters(SAMPLE_DATA, [
        { field: 'age', operator: 'between', min: 25, max: 30 },
      ]);
      expect(r.every(x => x.age >= 25 && x.age <= 30)).toBe(true);
    });
    it('filters by in', () => {
      const r = svc.applyFilters(SAMPLE_DATA, [
        { field: 'department', operator: 'in', value: ['HR', 'IT'] },
      ]);
      expect(r.length).toBeGreaterThanOrEqual(3);
    });
    it('filters by isEmpty', () => {
      const data = [{ x: '' }, { x: 'val' }];
      const r = svc.applyFilters(data, [{ field: 'x', operator: 'isEmpty' }]);
      expect(r).toHaveLength(1);
    });
  });

  /* ═══════ facetedSearch ═══════ */
  describe('facetedSearch', () => {
    it('returns facet counts with percentage', () => {
      const facets = svc.facetedSearch(SAMPLE_DATA, 'department');
      expect(facets.length).toBeGreaterThanOrEqual(2);
      const hrFacet = facets.find(f => f.value === 'HR');
      expect(hrFacet.count).toBe(2);
    });
  });

  /* ═══════ autocompleteSearch ═══════ */
  describe('autocompleteSearch', () => {
    it('returns matching values', () => {
      const r = svc.autocompleteSearch(SAMPLE_DATA, 'ah', 'name', 5);
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ═══════ getSearchStatistics ═══════ */
  describe('getSearchStatistics', () => {
    it('returns stats from empty history', () => {
      const s = svc.getSearchStatistics();
      expect(s.totalSearches).toBe(0);
    });
    it('returns stats after searches', () => {
      svc.advancedSearchRanked(SAMPLE_DATA, 'test', { fields: ['name'] });
      svc.advancedSearchRanked(SAMPLE_DATA, 'test', { fields: ['name'] });
      const s = svc.getSearchStatistics();
      expect(s.totalSearches).toBe(2);
      expect(s.topSearches.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ═══════ exportResults / convertToCSV / convertToExcel ═══════ */
  describe('export', () => {
    it('exports as JSON string', () => {
      const r = svc.exportResults(SAMPLE_DATA, 'json');
      expect(JSON.parse(r)).toEqual(SAMPLE_DATA);
    });
    it('exports as CSV', () => {
      const csv = svc.exportResults(SAMPLE_DATA, 'csv');
      expect(csv).toContain('id,name,department');
    });
    it('exports as excel object', () => {
      const r = svc.exportResults(SAMPLE_DATA, 'excel');
      expect(r.sheetName).toBe('Search Results');
    });
    it('convertToCSV returns empty string for empty array', () => {
      expect(svc.convertToCSV([])).toBe('');
    });
  });

  /* ═══════ basicSearch ═══════ */
  describe('basicSearch', () => {
    it('searches specific field', () => {
      const r = svc.basicSearch(SAMPLE_DATA, 'Ahmad', 'name');
      expect(r).toHaveLength(1);
    });
    it('searches all fields when no field specified', () => {
      const r = svc.basicSearch(SAMPLE_DATA, 'HR');
      expect(r.length).toBeGreaterThanOrEqual(2);
    });
    it('returns empty for null data', () => {
      expect(svc.basicSearch(null, 'x')).toEqual([]);
    });
  });

  /* ═══════ fuzzySearch ═══════ */
  describe('fuzzySearch', () => {
    it('finds fuzzy matches', () => {
      const r = svc.fuzzySearch(SAMPLE_DATA, 'Ahmd', 'name');
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it('returns scores when returnScore=true', () => {
      const r = svc.fuzzySearch(SAMPLE_DATA, 'Ahmad', 'name', true);
      if (r.length > 0) expect(r[0]).toHaveProperty('similarity');
    });
  });

  /* ═══════ advancedSearch (wrapper) ═══════ */
  describe('advancedSearch', () => {
    it('works with object options', () => {
      const r = svc.advancedSearch(SAMPLE_DATA, { query: 'Ahmad', fields: ['name'], fuzzy: false });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it('works with string query + options', () => {
      const r = svc.advancedSearch(SAMPLE_DATA, 'Ahmad', { fields: ['name'] });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it('returns empty for non-object/non-string', () => {
      expect(svc.advancedSearch(SAMPLE_DATA, 123)).toEqual([]);
    });
  });

  /* ═══════ filter (wrapper) ═══════ */
  describe('filter', () => {
    it('filters with operator equals', () => {
      const r = svc.filter(SAMPLE_DATA, [{ field: 'department', operator: 'equals', value: 'IT' }]);
      expect(r).toHaveLength(2);
    });
    it('returns full data for non-array filters', () => {
      expect(svc.filter(SAMPLE_DATA, null)).toEqual(SAMPLE_DATA);
    });
  });

  /* ═══════ generateFacets ═══════ */
  describe('generateFacets', () => {
    it('returns value counts', () => {
      const f = svc.generateFacets(SAMPLE_DATA, 'department');
      expect(f['IT']).toBe(2);
      expect(f['HR']).toBe(2);
    });
    it('handles range-based facets', () => {
      const f = svc.generateFacets(SAMPLE_DATA, 'salary', {
        type: 'range',
        ranges: [
          { min: 0, max: 6000 },
          { min: 6001, max: 10000 },
        ],
      });
      expect(f['0-6000']).toBeDefined();
    });
    it('returns empty for empty data', () => {
      expect(svc.generateFacets([], 'x')).toEqual({});
    });
  });

  /* ═══════ applyFacetFilter ═══════ */
  describe('applyFacetFilter', () => {
    it('filters by exact field value', () => {
      const r = svc.applyFacetFilter(SAMPLE_DATA, 'department', 'Finance');
      expect(r).toHaveLength(1);
    });
  });

  /* ═══════ autocomplete ═══════ */
  describe('autocomplete', () => {
    it('returns suggestions starting with query', () => {
      const r = svc.autocomplete(SAMPLE_DATA, 'Ah', 'name');
      expect(r).toContain('Ahmad Ali');
    });
    it('returns empty for empty query', () => {
      expect(svc.autocomplete(SAMPLE_DATA, '', 'name')).toEqual([]);
    });
  });

  /* ═══════ sort ═══════ */
  describe('sort', () => {
    it('sorts ascending by single field', () => {
      const r = svc.sort(SAMPLE_DATA, 'age', 'asc');
      expect(r[0].age).toBe(25);
    });
    it('sorts descending', () => {
      const r = svc.sort(SAMPLE_DATA, 'salary', 'desc');
      expect(r[0].salary).toBe(9000);
    });
    it('sorts by multiple fields', () => {
      const r = svc.sort(SAMPLE_DATA, ['department', 'age'], ['asc', 'asc']);
      expect(r).toBeDefined();
    });
  });

  /* ═══════ paginate ═══════ */
  describe('paginate', () => {
    it('returns paginated result', () => {
      const r = svc.paginate(SAMPLE_DATA, { page: 1, pageSize: 2 });
      expect(r.items).toHaveLength(2);
      expect(r.totalPages).toBe(3);
      expect(r.totalItems).toBe(5);
    });
    it('uses defaults', () => {
      const r = svc.paginate(SAMPLE_DATA);
      expect(r.currentPage).toBe(1);
      expect(r.pageSize).toBe(10);
    });
  });

  /* ═══════ compoundSearch ═══════ */
  describe('compoundSearch', () => {
    it('combines query + filters + sorting', () => {
      const r = svc.compoundSearch(SAMPLE_DATA, {
        query: 'a',
        fields: ['name'],
        filters: [{ field: 'department', operator: 'equals', value: 'HR' }],
        sort: { field: 'age', direction: 'asc' },
      });
      expect(r.length).toBeGreaterThanOrEqual(1);
      r.forEach(item => expect(item.department).toBe('HR'));
    });
    it('returns empty for non-array data', () => {
      expect(svc.compoundSearch(null)).toEqual([]);
    });
  });

  /* ═══════ getStatistics ═══════ */
  describe('getStatistics', () => {
    it('returns numeric stats', () => {
      const s = svc.getStatistics(SAMPLE_DATA, 'salary');
      expect(s.count).toBe(5);
      expect(s.min).toBe(5000);
      expect(s.max).toBe(9000);
      expect(s.average).toBeDefined();
    });
    it('returns string stats for non-numeric field', () => {
      const s = svc.getStatistics(SAMPLE_DATA, 'name');
      expect(s.count).toBe(5);
      expect(s).toHaveProperty('minLength');
    });
    it('returns empty for empty data', () => {
      expect(svc.getStatistics([], 'x')).toEqual({});
    });
  });

  /* ═══════ exportToCSV / exportToJSON ═══════ */
  describe('exportToCSV / exportToJSON', () => {
    it('exports CSV', () => {
      const csv = svc.exportToCSV(SAMPLE_DATA, ['id', 'name']);
      expect(csv).toContain('id,name');
    });
    it('exportToCSV returns empty for empty data', () => {
      expect(svc.exportToCSV([])).toBe('');
    });
    it('exports JSON', () => {
      const json = svc.exportToJSON(SAMPLE_DATA);
      expect(JSON.parse(json)).toEqual(SAMPLE_DATA);
    });
  });
});
