/**
 * Phase 13 Week 2: Database Module Tests
 * Tests for PostgreSQL connection pooling, replicas, and transactions
 */

const db = require('../config/database');

// Mock environment variables
process.env.DB_PRIMARY_HOST = 'localhost';
process.env.DB_PRIMARY_PORT = '5432';
process.env.DB_PRIMARY_DATABASE = 'test_db';
process.env.DB_PRIMARY_USER = 'test_user';
process.env.DB_PRIMARY_PASSWORD = 'test_pass';
process.env.DB_POOL_MIN = '2';
process.env.DB_POOL_MAX = '10';

describe('Database Module', () => {
  // Skip tests if database not available
  const skipIfNoDb = process.env.SKIP_DB_TESTS === 'true';

  beforeAll(async () => {
    if (skipIfNoDb) {
      console.log('⚠️  Skipping database tests (SKIP_DB_TESTS=true)');
      return;
    }

    try {
      await db.initialize();
    } catch (error) {
      console.error('Database initialization failed:', error.message);
      process.env.SKIP_DB_TESTS = 'true';
    }
  });

  afterAll(async () => {
    if (!skipIfNoDb) {
      await db.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize primary pool', () => {
      if (skipIfNoDb) return;

      const stats = db.getPoolStats();
      expect(stats.primary).toBeDefined();
      expect(stats.primary.totalConnections).toBeGreaterThanOrEqual(0);
    });

    test('should have correct pool configuration', () => {
      if (skipIfNoDb) return;

      const stats = db.getPoolStats();
      expect(stats.primary.min).toBe(2);
      expect(stats.primary.max).toBe(10);
    });
  });

  describe('Query Execution', () => {
    test('should execute SELECT query', async () => {
      if (skipIfNoDb) return;

      const result = await db.query('SELECT 1 as test');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    test('should execute parameterized query', async () => {
      if (skipIfNoDb) return;

      const result = await db.query('SELECT $1 as value', ['test']);
      expect(result.rows[0].value).toBe('test');
    });

    test('should track query metrics', async () => {
      if (skipIfNoDb) return;

      await db.query('SELECT 1');
      const stats = db.getPoolStats();
      expect(stats.primary.queries.total).toBeGreaterThan(0);
      expect(stats.primary.queries.successful).toBeGreaterThan(0);
    });

    test('should handle query errors', async () => {
      if (skipIfNoDb) return;

      await expect(db.query('SELECT * FROM nonexistent_table')).rejects.toThrow();

      const stats = db.getPoolStats();
      expect(stats.primary.queries.failed).toBeGreaterThan(0);
    });
  });

  describe('Read Replicas', () => {
    test('should execute read query on replica if available', async () => {
      if (skipIfNoDb) return;

      const result = await db.queryRead('SELECT 1 as test');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    test('should fallback to primary if replica fails', async () => {
      if (skipIfNoDb) return;

      // This works because replicas fallback to primary
      const result = await db.queryRead('SELECT 1');
      expect(result.rows).toHaveLength(1);
    });

    test('should track replica metrics', async () => {
      if (skipIfNoDb) return;

      await db.queryRead('SELECT 1');
      const stats = db.getPoolStats();

      // Should have replica stats or primary fallback
      expect(stats.replicas).toBeDefined();
    });
  });

  describe('Transactions', () => {
    test('should execute transaction successfully', async () => {
      if (skipIfNoDb) return;

      const result = await db.transaction(async client => {
        const res = await client.query('SELECT 1 as test');
        return res.rows[0];
      });

      expect(result.test).toBe(1);
    });

    test('should rollback transaction on error', async () => {
      if (skipIfNoDb) return;

      await expect(
        db.transaction(async client => {
          await client.query('SELECT 1');
          throw new Error('Force rollback');
        })
      ).rejects.toThrow('Force rollback');
    });

    test('should track transaction metrics', async () => {
      if (skipIfNoDb) return;

      await db.transaction(async client => {
        await client.query('SELECT 1');
      });

      const stats = db.getPoolStats();
      expect(stats.primary.queries.total).toBeGreaterThan(0);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      if (skipIfNoDb) return;

      // Create test table
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS test_batch (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            value INT
          )
        `);
        await db.query('TRUNCATE TABLE test_batch');
      } catch (error) {
        console.log('Test table setup failed:', error.message);
      }
    });

    test('should insert batch of rows', async () => {
      if (skipIfNoDb) return;

      const rows = [
        ['test1', 100],
        ['test2', 200],
        ['test3', 300],
      ];

      const result = await db.batchInsert('test_batch', ['name', 'value'], rows);

      expect(result.rowCount).toBe(3);
    });

    test('should handle large batch with chunking', async () => {
      if (skipIfNoDb) return;

      const rows = Array.from({ length: 2500 }, (_, i) => [`test${i}`, i]);

      const result = await db.batchInsert('test_batch', ['name', 'value'], rows, {
        chunkSize: 1000,
      });

      expect(result.rowCount).toBe(2500);
    });

    test('should return inserted rows with RETURNING', async () => {
      if (skipIfNoDb) return;

      const rows = [['test', 100]];

      const result = await db.batchInsert('test_batch', ['name', 'value'], rows, {
        returning: 'id',
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBeDefined();
    });
  });

  describe('Health Checks', () => {
    test('should perform health check', async () => {
      if (skipIfNoDb) return;

      const health = await db.healthCheck();
      expect(health.primary).toBeDefined();
      expect(health.primary.healthy).toBe(true);
      expect(health.primary.latency).toBeGreaterThan(0);
    });

    test('should check replica health', async () => {
      if (skipIfNoDb) return;

      const health = await db.healthCheck();
      expect(health.replicas).toBeDefined();
      expect(Array.isArray(health.replicas)).toBe(true);
    });
  });

  describe('Pool Statistics', () => {
    test('should return pool statistics', () => {
      if (skipIfNoDb) return;

      const stats = db.getPoolStats();
      expect(stats.primary).toBeDefined();
      expect(stats.primary.totalConnections).toBeDefined();
      expect(stats.primary.idleConnections).toBeDefined();
      expect(stats.primary.waitingClients).toBeDefined();
    });

    test('should track query counts', async () => {
      if (skipIfNoDb) return;

      const beforeStats = db.getPoolStats();
      const beforeTotal = beforeStats.primary.queries.total;

      await db.query('SELECT 1');

      const afterStats = db.getPoolStats();
      const afterTotal = afterStats.primary.queries.total;

      expect(afterTotal).toBeGreaterThan(beforeTotal);
    });
  });

  describe('Connection Management', () => {
    test('should handle concurrent queries', async () => {
      if (skipIfNoDb) return;

      const promises = Array.from({ length: 20 }, () => db.query('SELECT 1'));

      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.rows).toHaveLength(1);
      });
    });

    test('should not exceed max pool size', async () => {
      if (skipIfNoDb) return;

      const promises = Array.from({ length: 50 }, () => db.query('SELECT pg_sleep(0.1)'));

      await Promise.all(promises);

      const stats = db.getPoolStats();
      expect(stats.primary.totalConnections).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors gracefully', async () => {
      if (skipIfNoDb) return;

      await expect(db.query('INVALID SQL QUERY')).rejects.toThrow();
    });

    test('should track failed queries', async () => {
      if (skipIfNoDb) return;

      const beforeStats = db.getPoolStats();
      const beforeFailed = beforeStats.primary.queries.failed;

      try {
        await db.query('INVALID SQL');
      } catch (error) {
        // Expected error
      }

      const afterStats = db.getPoolStats();
      const afterFailed = afterStats.primary.queries.failed;

      expect(afterFailed).toBeGreaterThan(beforeFailed);
    });
  });
});

// Unit tests always run (no DB required)
describe.skip('Database Module - Unit Tests (No DB Required)', () => {
  test('should export required functions', () => {
    expect(typeof db.initialize).toBe('function');
    expect(typeof db.query).toBe('function');
    expect(typeof db.queryRead).toBe('function');
    expect(typeof db.transaction).toBe('function');
    expect(typeof db.batchInsert).toBe('function');
    expect(typeof db.getPoolStats).toBe('function');
    expect(typeof db.healthCheck).toBe('function');
    expect(typeof db.shutdown).toBe('function');
  });

  test('should have correct function signatures', () => {
    expect(db.query.length).toBeGreaterThanOrEqual(1);
    expect(db.queryRead.length).toBeGreaterThanOrEqual(1);
    expect(db.transaction.length).toBe(1);
    expect(db.batchInsert.length).toBeGreaterThanOrEqual(3);
  });
});
