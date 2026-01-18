/**
 * Advanced Search Service Tests
 * اختبارات الخدمة المتقدمة للبحث
 *
 * 40+ اختبار شامل
 */

const AdvancedSearchService = require('../../services/advancedSearchService');
const assert = require('assert');

describe('AdvancedSearchService Tests', () => {
  let searchService;
  let sampleData;

  beforeEach(() => {
    searchService = new AdvancedSearchService();

    // Sample data for testing
    sampleData = [
      {
        id: 1,
        name: 'Ahmed Hassan',
        email: 'ahmed@example.com',
        department: 'Engineering',
        status: 'active',
        salary: 5000,
        joinDate: '2023-01-15',
      },
      {
        id: 2,
        name: 'Fatima Mohammed',
        email: 'fatima@example.com',
        department: 'Marketing',
        status: 'active',
        salary: 4500,
        joinDate: '2023-03-20',
      },
      {
        id: 3,
        name: 'Omar Ali',
        email: 'omar@example.com',
        department: 'Engineering',
        status: 'inactive',
        salary: 5500,
        joinDate: '2022-06-10',
      },
    ];
  });

  // ============================================
  // BASIC SEARCH TESTS
  // ============================================
  describe('Basic Search Operations', () => {
    test('should search by single field', () => {
      const result = searchService.basicSearch(sampleData, 'Engineering', 'department');
      assert(result.length === 2, 'Should find 2 engineering department members');
      assert(result[0].department === 'Engineering');
    });

    test('should search by multiple fields', () => {
      const result = searchService.advancedSearch(sampleData, {
        fields: ['name', 'email'],
        query: 'Ahmed',
        fuzzy: false,
      });
      assert(result.length > 0, 'Should find Ahmed');
    });

    test('should return empty array when no matches', () => {
      const result = searchService.basicSearch(sampleData, 'NonExistent', 'department');
      assert(result.length === 0, 'Should return empty array for non-existent data');
    });

    test('should handle case insensitive search', () => {
      const result = searchService.basicSearch(sampleData, 'ENGINEERING', 'department');
      assert(result.length === 2, 'Should find matches regardless of case');
    });

    test('should search entire object when field is not specified', () => {
      const result = searchService.basicSearch(sampleData, 'Ahmed');
      assert(result.length > 0, 'Should find Ahmed in any field');
    });
  });

  // ============================================
  // FUZZY SEARCH TESTS
  // ============================================
  describe('Fuzzy Search Operations', () => {
    test('should perform fuzzy search with typos', () => {
      const result = searchService.fuzzySearch(sampleData, 'Ahmmed', 'name');
      assert(result.length > 0, 'Should find Ahmed despite typo');
    });

    test('should handle partial matches in fuzzy search', () => {
      const result = searchService.fuzzySearch(sampleData, 'Fati', 'name');
      assert(result.length > 0, 'Should find Fatima with partial name');
    });

    test('should calculate similarity score', () => {
      const result = searchService.fuzzySearch(sampleData, 'Ahmed', 'name', true);
      assert(result[0].similarity >= 0.8, 'Exact match should have high similarity');
    });

    test('should handle empty query in fuzzy search', () => {
      const result = searchService.fuzzySearch(sampleData, '', 'name');
      assert(result.length === 0, 'Empty query should return empty results');
    });
  });

  // ============================================
  // FILTER TESTS
  // ============================================
  describe('Filter Operations', () => {
    test('should filter by exact value', () => {
      const result = searchService.filter(sampleData, [{ field: 'status', operator: 'equals', value: 'active' }]);
      assert(result.length === 2, 'Should find 2 active users');
    });

    test('should filter with greater than operator', () => {
      const result = searchService.filter(sampleData, [{ field: 'salary', operator: 'gt', value: 4600 }]);
      assert(result.length === 2, 'Should find users with salary > 4600');
    });

    test('should filter with less than operator', () => {
      const result = searchService.filter(sampleData, [{ field: 'salary', operator: 'lt', value: 5000 }]);
      assert(result.length === 1, 'Should find users with salary < 5000');
    });

    test('should combine multiple filters (AND)', () => {
      const result = searchService.filter(sampleData, [
        { field: 'department', operator: 'equals', value: 'Engineering' },
        { field: 'status', operator: 'equals', value: 'active' },
      ]);
      assert(result.length === 1, 'Should find only Ahmed (Engineering AND active)');
    });

    test('should filter with IN operator', () => {
      const result = searchService.filter(sampleData, [{ field: 'department', operator: 'in', value: ['Engineering', 'Marketing'] }]);
      assert(result.length === 3, 'Should find all Engineering and Marketing members');
    });

    test('should filter with CONTAINS operator', () => {
      const result = searchService.filter(sampleData, [{ field: 'email', operator: 'contains', value: '@example.com' }]);
      assert(result.length === 3, 'Should find all with @example.com email');
    });

    test('should handle date range filter', () => {
      const result = searchService.filter(sampleData, [{ field: 'joinDate', operator: 'gte', value: '2023-01-01' }]);
      assert(result.length === 2, 'Should find users joined after 2023-01-01');
    });
  });

  // ============================================
  // FACET TESTS
  // ============================================
  describe('Faceted Search', () => {
    test('should generate facets for a field', () => {
      const facets = searchService.generateFacets(sampleData, 'department');
      assert(Object.keys(facets).length === 2, 'Should have 2 department facets');
      assert(facets.Engineering === 2, 'Engineering should have count of 2');
    });

    test('should generate numeric facets with ranges', () => {
      const facets = searchService.generateFacets(sampleData, 'salary', {
        type: 'range',
        ranges: [
          { min: 0, max: 4500 },
          { min: 4500, max: 5500 },
        ],
      });
      assert(Object.keys(facets).length === 2, 'Should have 2 salary ranges');
    });

    test('should handle empty facets', () => {
      const facets = searchService.generateFacets([], 'department');
      assert(Object.keys(facets).length === 0, 'Empty data should return empty facets');
    });

    test('should apply facet filters', () => {
      const filtered = searchService.applyFacetFilter(sampleData, 'department', 'Engineering');
      assert(filtered.length === 2, 'Should filter by selected facet');
    });
  });

  // ============================================
  // AUTOCOMPLETE TESTS
  // ============================================
  describe('Autocomplete', () => {
    test('should provide autocomplete suggestions', () => {
      const suggestions = searchService.autocomplete(sampleData, 'Ah', 'name');
      assert(suggestions.length > 0, 'Should suggest Ahmed');
      assert(suggestions.includes('Ahmed Hassan'));
    });

    test('should limit autocomplete results', () => {
      const suggestions = searchService.autocomplete(sampleData, 'a', 'name', { limit: 2 });
      assert(suggestions.length <= 2, 'Should respect result limit');
    });

    test('should return unique suggestions', () => {
      const duplicateData = [...sampleData, sampleData[0]];
      const suggestions = searchService.autocomplete(duplicateData, 'Ahmed', 'name');
      const unique = new Set(suggestions);
      assert(unique.size === suggestions.length, 'Should return unique suggestions');
    });

    test('should handle special characters in autocomplete', () => {
      const dataWithSpecial = [
        { id: 1, name: 'José García' },
        { id: 2, name: 'Juan Pérez' },
      ];
      const suggestions = searchService.autocomplete(dataWithSpecial, 'Jos', 'name');
      assert(suggestions.length > 0, 'Should handle special characters');
    });
  });

  // ============================================
  // SORTING TESTS
  // ============================================
  describe('Sorting', () => {
    test('should sort ascending', () => {
      const result = searchService.sort(sampleData, 'salary', 'asc');
      assert(result[0].salary === 4500, 'First should be lowest salary');
      assert(result[result.length - 1].salary === 5500, 'Last should be highest salary');
    });

    test('should sort descending', () => {
      const result = searchService.sort(sampleData, 'salary', 'desc');
      assert(result[0].salary === 5500, 'First should be highest salary');
    });

    test('should sort strings alphabetically', () => {
      const result = searchService.sort(sampleData, 'name', 'asc');
      assert(result[0].name === 'Ahmed Hassan', 'Should sort names alphabetically');
    });

    test('should handle multi-field sort', () => {
      const result = searchService.sort(sampleData, ['department', 'salary'], ['asc', 'desc']);
      assert(result[0].department === 'Engineering', 'Should sort by department first');
    });
  });

  // ============================================
  // PAGINATION TESTS
  // ============================================
  describe('Pagination', () => {
    test('should paginate results', () => {
      const result = searchService.paginate(sampleData, { page: 1, pageSize: 2 });
      assert(result.items.length === 2, 'Should return correct page size');
      assert(result.totalPages === 2, 'Should calculate total pages correctly');
    });

    test('should return correct page', () => {
      const result = searchService.paginate(sampleData, { page: 2, pageSize: 2 });
      assert(result.items[0].id === 3, 'Should return correct page');
      assert(result.currentPage === 2, 'Should track current page');
    });

    test('should handle out of bounds page', () => {
      const result = searchService.paginate(sampleData, { page: 100, pageSize: 2 });
      assert(result.items.length === 0, 'Should return empty for out of bounds page');
    });
  });

  // ============================================
  // COMPOUND SEARCH TESTS
  // ============================================
  describe('Compound Search', () => {
    test('should perform compound search with multiple criteria', () => {
      const result = searchService.compoundSearch(sampleData, {
        query: 'Ahmed',
        filters: [{ field: 'department', operator: 'equals', value: 'Engineering' }],
        fields: ['name', 'email'],
      });
      assert(result.length > 0, 'Should find Ahmed in Engineering');
    });

    test('should combine search with sorting', () => {
      const result = searchService.compoundSearch(sampleData, {
        query: '',
        filters: [{ field: 'status', operator: 'equals', value: 'active' }],
        sort: { field: 'salary', direction: 'desc' },
      });
      assert(result[0].salary >= result[1].salary, 'Should be sorted by salary descending');
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================
  describe('Search Statistics', () => {
    test('should calculate search statistics', () => {
      const stats = searchService.getStatistics(sampleData, 'salary');
      assert(stats.count === 3, 'Should count all items');
      assert(stats.average === (5000 + 4500 + 5500) / 3, 'Should calculate average');
      assert(stats.max === 5500, 'Should find maximum');
      assert(stats.min === 4500, 'Should find minimum');
    });

    test('should calculate string statistics', () => {
      const stats = searchService.getStatistics(sampleData, 'name');
      assert(stats.count === 3, 'Should count strings');
      assert(stats.minLength > 0, 'Should calculate minimum length');
      assert(stats.maxLength > 0, 'Should calculate maximum length');
    });
  });

  // ============================================
  // EXPORT TESTS
  // ============================================
  describe('Export Functionality', () => {
    test('should export to CSV', () => {
      const csv = searchService.exportToCSV(sampleData);
      assert(csv.includes('Ahmed Hassan'), 'CSV should contain data');
      assert(csv.includes(','), 'CSV should be comma-separated');
    });

    test('should export to JSON', () => {
      const json = searchService.exportToJSON(sampleData);
      const parsed = JSON.parse(json);
      assert(Array.isArray(parsed), 'Should export as valid JSON array');
      assert(parsed.length === 3, 'Should export all items');
    });

    test('should export selected fields only', () => {
      const csv = searchService.exportToCSV(sampleData, ['name', 'email']);
      assert(csv.includes('Ahmed Hassan'), 'Should include name');
      assert(!csv.includes('5000'), 'Should not include salary');
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('Error Handling', () => {
    test('should handle null data', () => {
      const result = searchService.basicSearch(null, 'query');
      assert(Array.isArray(result), 'Should return array even with null data');
    });

    test('should handle undefined query', () => {
      const result = searchService.basicSearch(sampleData, undefined);
      assert(Array.isArray(result), 'Should handle undefined query');
    });

    test('should handle invalid field name', () => {
      const result = searchService.basicSearch(sampleData, 'test', 'nonexistent');
      assert(result.length === 0, 'Should return empty for invalid field');
    });

    test('should handle circular references', () => {
      const circular = { id: 1, name: 'Test' };
      circular.self = circular;
      const result = searchService.exportToJSON([circular]);
      assert(result !== undefined, 'Should handle circular references gracefully');
    });
  });

  // ============================================
  // PERFORMANCE TESTS
  // ============================================
  describe('Performance', () => {
    test('should handle large dataset', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }));

      const start = Date.now();
      const result = searchService.basicSearch(largeData, 'User 5000', 'name');
      const duration = Date.now() - start;

      assert(result.length > 0, 'Should find in large dataset');
      assert(duration < 1000, 'Search should complete within 1 second');
    });

    test('should cache frequently used facets', () => {
      const result1 = searchService.generateFacets(sampleData, 'department');
      const result2 = searchService.generateFacets(sampleData, 'department');
      assert(JSON.stringify(result1) === JSON.stringify(result2), 'Should return consistent results');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    test('should handle empty string search', () => {
      const result = searchService.basicSearch(sampleData, '', 'name');
      assert(Array.isArray(result), 'Should handle empty string');
    });

    test('should handle very long query', () => {
      const longQuery = 'a'.repeat(1000);
      const result = searchService.basicSearch(sampleData, longQuery);
      assert(Array.isArray(result), 'Should handle long query');
    });

    test('should handle special regex characters', () => {
      const result = searchService.basicSearch([{ id: 1, name: '$100' }], '$100', 'name');
      assert(result.length > 0, 'Should handle special characters');
    });

    test('should handle unicode characters', () => {
      const unicodeData = [
        { id: 1, name: '李明' },
        { id: 2, name: '王芳' },
      ];
      const result = searchService.basicSearch(unicodeData, '李', 'name');
      assert(result.length > 0, 'Should handle unicode');
    });
  });
});
