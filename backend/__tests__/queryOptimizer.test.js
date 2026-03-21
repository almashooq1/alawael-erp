/**
 * Tests for queryOptimizer.js
 * Query optimization — select, pagination, sort, stats, QueryBuilder
 */

/* eslint-disable no-unused-vars */

jest.mock('mongoose', () => ({
  __esModule: false,
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const { queryOptimizer, QueryBuilder, query } = require('../utils/queryOptimizer');
const logger = require('../utils/logger');

describe('QueryOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryOptimizer.resetStats();
  });

  // ──────── optimizeSelect ────────
  describe('optimizeSelect', () => {
    it('should return empty object for no fields', () => {
      expect(queryOptimizer.optimizeSelect([])).toEqual({});
      expect(queryOptimizer.optimizeSelect()).toEqual({});
    });

    it('should create projection with _id included', () => {
      const proj = queryOptimizer.optimizeSelect(['name', 'email']);
      expect(proj).toEqual({ name: 1, email: 1, _id: 1 });
    });

    it('should not duplicate _id if already included', () => {
      const proj = queryOptimizer.optimizeSelect(['_id', 'name']);
      expect(proj).toEqual({ _id: 1, name: 1 });
    });

    it('should handle -_id exclusion', () => {
      const proj = queryOptimizer.optimizeSelect(['-_id', 'name']);
      expect(proj).toEqual({ '-_id': 1, name: 1 });
    });
  });

  // ──────── optimizePagination ────────
  describe('optimizePagination', () => {
    it('should return defaults for empty query', () => {
      const result = queryOptimizer.optimizePagination({});
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.skip).toBe(0);
    });

    it('should parse page and limit', () => {
      const result = queryOptimizer.optimizePagination({ page: '3', limit: '10' });
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.skip).toBe(20);
    });

    it('should clamp page to minimum 1', () => {
      const result = queryOptimizer.optimizePagination({ page: '-5' });
      expect(result.pagination.page).toBe(1);
    });

    it('should clamp limit to max 100', () => {
      const result = queryOptimizer.optimizePagination({ limit: '500' });
      expect(result.pagination.limit).toBe(100);
    });

    it('should fallback limit to 20 when 0 (falsy)', () => {
      const result = queryOptimizer.optimizePagination({ limit: '0' });
      expect(result.pagination.limit).toBe(20);
    });

    it('should extract remaining filters', () => {
      const result = queryOptimizer.optimizePagination({
        page: '1',
        limit: '10',
        sort: '-name',
        status: 'active',
      });
      expect(result.filters).toEqual({ status: 'active' });
    });
  });

  // ──────── parseSort ────────
  describe('parseSort', () => {
    it('should parse descending sort with - prefix', () => {
      expect(queryOptimizer.parseSort('-createdAt')).toEqual({ createdAt: -1 });
    });

    it('should parse ascending sort', () => {
      expect(queryOptimizer.parseSort('name')).toEqual({ name: 1 });
    });

    it('should parse comma-separated sort', () => {
      expect(queryOptimizer.parseSort('-createdAt,name')).toEqual({
        createdAt: -1,
        name: 1,
      });
    });

    it('should return object as-is if already an object', () => {
      const sortObj = { createdAt: -1 };
      expect(queryOptimizer.parseSort(sortObj)).toBe(sortObj);
    });
  });

  // ──────── recordQuery ────────
  describe('recordQuery', () => {
    it('should record query stats', () => {
      queryOptimizer.recordQuery('User', 50, { active: true });
      const stats = queryOptimizer.getStats();
      expect(stats.User).toBeDefined();
      expect(stats.User.totalQueries).toBe(1);
      expect(stats.User.averageTime).toBe(50);
    });

    it('should detect slow queries', () => {
      queryOptimizer.recordQuery('Order', 200, { status: 'pending' });
      const stats = queryOptimizer.getStats();
      expect(stats.Order.slowQueries).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow query'),
        expect.any(Object)
      );
    });

    it('should accumulate stats across multiple queries', () => {
      queryOptimizer.recordQuery('Item', 30, {});
      queryOptimizer.recordQuery('Item', 70, {});
      const stats = queryOptimizer.getStats();
      expect(stats.Item.totalQueries).toBe(2);
      expect(stats.Item.averageTime).toBe(50);
    });
  });

  // ──────── getStats ────────
  describe('getStats', () => {
    it('should return empty object when no queries recorded', () => {
      expect(queryOptimizer.getStats()).toEqual({});
    });

    it('should include slowQueryRate', () => {
      queryOptimizer.recordQuery('X', 200, {});
      const stats = queryOptimizer.getStats();
      expect(stats.X.slowQueryRate).toBe('100.00%');
    });

    it('should include topFilters', () => {
      queryOptimizer.recordQuery('Y', 10, { a: 1 });
      queryOptimizer.recordQuery('Y', 10, { a: 1 });
      queryOptimizer.recordQuery('Y', 10, { b: 2 });
      const stats = queryOptimizer.getStats();
      expect(stats.Y.topFilters.length).toBeGreaterThan(0);
    });
  });

  // ──────── resetStats ────────
  describe('resetStats', () => {
    it('should clear all query statistics', () => {
      queryOptimizer.recordQuery('Z', 10, {});
      queryOptimizer.resetStats();
      expect(queryOptimizer.getStats()).toEqual({});
    });
  });

  // ──────── optimizeLookup ────────
  describe('optimizeLookup', () => {
    it('should return $lookup stage', () => {
      const stages = queryOptimizer.optimizeLookup('orders', 'userId', '_id', 'userOrders');
      expect(stages[0]).toEqual({
        $lookup: {
          from: 'orders',
          localField: 'userId',
          foreignField: '_id',
          as: 'userOrders',
        },
      });
    });

    it('should add $unwind stage when unwind=true', () => {
      const stages = queryOptimizer.optimizeLookup('x', 'a', 'b', 'c', { unwind: true });
      expect(stages.length).toBe(2);
      expect(stages[1].$unwind).toBeDefined();
      expect(stages[1].$unwind.preserveNullAndEmptyArrays).toBe(true);
    });

    it('should add $project stage when project is provided', () => {
      const stages = queryOptimizer.optimizeLookup('x', 'a', 'b', 'result', {
        project: ['name', 'email'],
      });
      expect(stages.length).toBe(2);
      expect(stages[1].$project).toBeDefined();
      expect(stages[1].$project['result.name']).toBe(1);
      expect(stages[1].$project['result.email']).toBe(1);
    });
  });
});

// ──────── QueryBuilder ────────
describe('QueryBuilder', () => {
  it('should instantiate with Model', () => {
    const MockModel = { find: jest.fn() };
    const qb = new QueryBuilder(MockModel);
    expect(qb.Model).toBe(MockModel);
    expect(qb.filters).toEqual({});
  });

  it('should chain where() for equality', () => {
    const qb = new QueryBuilder({});
    qb.where('status', 'active');
    expect(qb.filters.status).toBe('active');
  });

  it('should chain where() with operator', () => {
    const qb = new QueryBuilder({});
    qb.where('age', '>', 18);
    expect(qb.filters.age).toEqual({ $gt: 18 });
  });

  it('should chain select()', () => {
    const qb = new QueryBuilder({});
    qb.select('name', 'email');
    expect(qb.selectFields).toEqual(['name', 'email']);
  });

  it('should chain sort()', () => {
    const qb = new QueryBuilder({});
    qb.sort('-updatedAt');
    expect(qb.sortOptions).toBe('-updatedAt');
  });

  it('should chain page()', () => {
    const qb = new QueryBuilder({});
    qb.page(3, 15);
    expect(qb.paginationOptions).toEqual({ page: 3, limit: 15 });
  });

  it('should chain lean()', () => {
    const qb = new QueryBuilder({});
    qb.lean(false);
    expect(qb.leanOption).toBe(false);
  });

  it('should chain populate() with select', () => {
    const qb = new QueryBuilder({});
    qb.populate('author', 'name email');
    expect(qb.populateFields).toEqual([{ path: 'author', select: 'name email' }]);
  });

  it('should chain populate() without select', () => {
    const qb = new QueryBuilder({});
    qb.populate('category');
    expect(qb.populateFields).toEqual(['category']);
  });
});

// ──────── query helper ────────
describe('query() helper', () => {
  it('should return a QueryBuilder instance', () => {
    const qb = query({});
    expect(qb).toBeInstanceOf(QueryBuilder);
  });
});
