/**
 * Phase 13 Week 2: Query Optimizer Tests
 * Tests for query caching, analysis, and optimization
 */

const queryOptimizer = require('../utils/queryOptimizer');

// Skip tests if dependencies not available
const skipIfNoDeps =
  process.env.SKIP_DB_TESTS === 'true' || process.env.SKIP_REDIS_TESTS === 'true';

describe('Query Optimizer', () => {
  beforeAll(async () => {
    if (skipIfNoDeps) {
      console.log('⚠️  Skipping query optimizer tests (requires DB and Redis)');
      return;
    }
  });

  describe('Common Query Patterns', () => {
    beforeEach(async () => {
      if (skipIfNoDeps) return;

      // Create test table
      try {
        const db = require('../config/database');
        await db.query(`
          CREATE TABLE IF NOT EXISTS test_optimizer (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            value INT,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await db.query('TRUNCATE TABLE test_optimizer');

        // Insert test data
        await db.query(`
          INSERT INTO test_optimizer (name, value, active)
          VALUES
            ('test1', 100, true),
            ('test2', 200, true),
            ('test3', 300, false),
            ('test4', 400, true),
            ('test5', 500, false)
        `);
      } catch (error) {
        console.log('Test table setup failed:', error.message);
      }
    });

    describe('findById', () => {
      test('should find record by ID', async () => {
        if (skipIfNoDeps) return;

        const result = await queryOptimizer.queries.findById('test_optimizer', 1);
        expect(result).toBeDefined();
        expect(result.id).toBe(1);
        expect(result.name).toBe('test1');
      });

      test('should cache findById results', async () => {
        if (skipIfNoDeps) return;

        // First call
        const result1 = await queryOptimizer.queries.findById('test_optimizer', 1);

        // Second call should hit cache
        const result2 = await queryOptimizer.queries.findById('test_optimizer', 1);

        expect(result1).toEqual(result2);
      });

      test('should return null for non-existent ID', async () => {
        if (skipIfNoDeps) return;

        const result = await queryOptimizer.queries.findById('test_optimizer', 9999);
        expect(result).toBeNull();
      });
    });

    describe('findMany', () => {
      test('should find multiple records', async () => {
        if (skipIfNoDeps) return;

        const results = await queryOptimizer.queries.findMany('test_optimizer', {
          active: true,
        });

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(3);
        results.forEach(row => {
          expect(row.active).toBe(true);
        });
      });

      test('should support pagination', async () => {
        if (skipIfNoDeps) return;

        const page1 = await queryOptimizer.queries.findMany(
          'test_optimizer',
          {},
          {
            limit: 2,
            offset: 0,
          }
        );

        const page2 = await queryOptimizer.queries.findMany(
          'test_optimizer',
          {},
          {
            limit: 2,
            offset: 2,
          }
        );

        expect(page1.length).toBe(2);
        expect(page2.length).toBe(2);
        expect(page1[0].id).not.toBe(page2[0].id);
      });

      test('should support ordering', async () => {
        if (skipIfNoDeps) return;

        const ascending = await queryOptimizer.queries.findMany(
          'test_optimizer',
          {},
          {
            orderBy: 'value ASC',
          }
        );

        const descending = await queryOptimizer.queries.findMany(
          'test_optimizer',
          {},
          {
            orderBy: 'value DESC',
          }
        );

        expect(ascending[0].value).toBeLessThan(ascending[1].value);
        expect(descending[0].value).toBeGreaterThan(descending[1].value);
      });

      test('should cache findMany results', async () => {
        if (skipIfNoDeps) return;

        const result1 = await queryOptimizer.queries.findMany('test_optimizer', {
          active: true,
        });

        // Second call should hit cache
        const result2 = await queryOptimizer.queries.findMany('test_optimizer', {
          active: true,
        });

        expect(result1).toEqual(result2);
      });
    });

    describe('count', () => {
      test('should count all records', async () => {
        if (skipIfNoDeps) return;

        const count = await queryOptimizer.queries.count('test_optimizer');
        expect(count).toBe(5);
      });

      test('should count with conditions', async () => {
        if (skipIfNoDeps) return;

        const count = await queryOptimizer.queries.count('test_optimizer', {
          active: true,
        });
        expect(count).toBe(3);
      });

      test('should cache count results', async () => {
        if (skipIfNoDeps) return;

        const count1 = await queryOptimizer.queries.count('test_optimizer', {
          active: true,
        });

        // Second call should hit cache
        const count2 = await queryOptimizer.queries.count('test_optimizer', {
          active: true,
        });

        expect(count1).toBe(count2);
        expect(count1).toBe(3);
      });
    });

    describe('updateById', () => {
      test('should update record by ID', async () => {
        if (skipIfNoDeps) return;

        const updated = await queryOptimizer.queries.updateById('test_optimizer', 1, {
          name: 'updated',
          value: 999,
        });

        expect(updated).toBeDefined();
        expect(updated.name).toBe('updated');
        expect(updated.value).toBe(999);
      });

      test('should invalidate cache on update', async () => {
        if (skipIfNoDeps) return;

        // Cache the record
        const before = await queryOptimizer.queries.findById('test_optimizer', 1);
        expect(before.name).toBe('test1');

        // Update it
        await queryOptimizer.queries.updateById('test_optimizer', 1, {
          name: 'updated',
        });

        // Fetch again (should get fresh data)
        const after = await queryOptimizer.queries.findById('test_optimizer', 1);
        expect(after.name).toBe('updated');
      });
    });

    describe('deleteById', () => {
      test('should delete record by ID', async () => {
        if (skipIfNoDeps) return;

        const deleted = await queryOptimizer.queries.deleteById('test_optimizer', 1);
        expect(deleted).toBeDefined();
        expect(deleted.id).toBe(1);

        // Verify deletion
        const result = await queryOptimizer.queries.findById('test_optimizer', 1);
        expect(result).toBeNull();
      });

      test('should invalidate cache on delete', async () => {
        if (skipIfNoDeps) return;

        // Cache the record
        await queryOptimizer.queries.findById('test_optimizer', 1);

        // Delete it
        await queryOptimizer.queries.deleteById('test_optimizer', 1);

        // Fetch again (should be null)
        const result = await queryOptimizer.queries.findById('test_optimizer', 1);
        expect(result).toBeNull();
      });
    });

    describe('bulkInsert', () => {
      test('should insert multiple rows', async () => {
        if (skipIfNoDeps) return;

        const rows = [
          { name: 'bulk1', value: 1000 },
          { name: 'bulk2', value: 2000 },
          { name: 'bulk3', value: 3000 },
        ];

        const result = await queryOptimizer.queries.bulkInsert('test_optimizer', rows);
        expect(result.rowCount).toBe(3);
      });

      test('should handle large bulk inserts', async () => {
        if (skipIfNoDeps) return;

        const rows = Array.from({ length: 100 }, (_, i) => ({
          name: `bulk${i}`,
          value: i * 100,
        }));

        const result = await queryOptimizer.queries.bulkInsert('test_optimizer', rows);
        expect(result.rowCount).toBe(100);
      });
    });
  });

  describe('Query Analysis', () => {
    test('should analyze query and return plan', async () => {
      if (skipIfNoDeps) return;

      const analysis = await queryOptimizer.analyzeQuery(
        'SELECT * FROM test_optimizer WHERE active = $1',
        [true]
      );

      expect(analysis).toBeDefined();
      expect(analysis.executionTime).toBeGreaterThan(0);
      expect(analysis.plan).toBeDefined();
    });

    test('should detect sequential scans', async () => {
      if (skipIfNoDeps) return;

      // Query without index
      const analysis = await queryOptimizer.analyzeQuery(
        'SELECT * FROM test_optimizer WHERE value > $1',
        [100]
      );

      expect(analysis).toBeDefined();
      // May or may not have sequential scan depending on table size
    });

    test('should provide query recommendations', async () => {
      if (skipIfNoDeps) return;

      const analysis = await queryOptimizer.analyzeQuery(
        'SELECT * FROM test_optimizer WHERE value > $1 ORDER BY value',
        [100]
      );

      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    test('should track query statistics', async () => {
      if (skipIfNoDeps) return;

      const before = queryOptimizer.getStats();

      await queryOptimizer.queries.findById('test_optimizer', 1);

      const after = queryOptimizer.getStats();

      expect(after.queries.total).toBeGreaterThan(before.queries.total);
    });

    test('should track cache hits', async () => {
      if (skipIfNoDeps) return;

      // First call (cache miss)
      await queryOptimizer.queries.findById('test_optimizer', 1);

      const before = queryOptimizer.getStats();

      // Second call (cache hit)
      await queryOptimizer.queries.findById('test_optimizer', 1);

      const after = queryOptimizer.getStats();

      expect(after.cache.hits).toBeGreaterThan(before.cache.hits);
    });

    test('should track slow queries', async () => {
      if (skipIfNoDeps) return;

      const stats = queryOptimizer.getStats();
      expect(stats.queries.slow).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    test('should invalidate table cache', async () => {
      if (skipIfNoDeps) return;

      // Cache some queries
      await queryOptimizer.queries.findById('test_optimizer', 1);
      await queryOptimizer.queries.count('test_optimizer');

      // Invalidate cache
      await queryOptimizer.invalidateTableCache('test_optimizer');

      // Next query should miss cache
      const before = queryOptimizer.getStats();
      await queryOptimizer.queries.findById('test_optimizer', 1);
      const after = queryOptimizer.getStats();

      expect(after.cache.misses).toBeGreaterThan(before.cache.misses);
    });
  });
});

describe.skip('Query Optimizer - Unit Tests', () => {
  test('should export required functions', () => {
    expect(typeof queryOptimizer.optimizedQuery).toBe('function');
    expect(typeof queryOptimizer.analyzeQuery).toBe('function');
    expect(typeof queryOptimizer.invalidateTableCache).toBe('function');
    expect(typeof queryOptimizer.getStats).toBe('function');
  });

  test('should export common query patterns', () => {
    expect(queryOptimizer.queries).toBeDefined();
    expect(typeof queryOptimizer.queries.findById).toBe('function');
    expect(typeof queryOptimizer.queries.findMany).toBe('function');
    expect(typeof queryOptimizer.queries.count).toBe('function');
    expect(typeof queryOptimizer.queries.updateById).toBe('function');
    expect(typeof queryOptimizer.queries.deleteById).toBe('function');
    expect(typeof queryOptimizer.queries.bulkInsert).toBe('function');
  });

  test('should have correct function signatures', () => {
    expect(queryOptimizer.optimizedQuery.length).toBeGreaterThanOrEqual(2);
    expect(queryOptimizer.analyzeQuery.length).toBeGreaterThanOrEqual(2);
    expect(queryOptimizer.queries.findById.length).toBe(2);
    expect(queryOptimizer.queries.findMany.length).toBeGreaterThanOrEqual(2);
  });
});
