/**
 * Config Module Tests
 * Tests for configuration files and database setup
 */

const inMemoryDB = require('../config/inMemoryDB');
const database = require('../config/database');
const performance = require('../config/performance');

describe('Configuration Modules', () => {
  describe('InMemoryDB Configuration', () => {
    beforeEach(() => {
      // Reset database before each test
      inMemoryDB.write({
        users: [],
        employees: [],
        attendances: [],
        leaves: [],
        finance: [],
      });
    });

    test('should read database', () => {
      const data = inMemoryDB.read();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('should write database', () => {
      const testData = { users: [{ id: 1, name: 'Test' }] };
      inMemoryDB.write(testData);
      const data = inMemoryDB.read();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Test');
    });

    test('should preserve existing collections on write', () => {
      const initial = inMemoryDB.read();
      initial.users = [{ id: 1 }];
      initial.employees = [{ id: 2 }];
      inMemoryDB.write(initial);

      const updated = inMemoryDB.read();
      expect(updated.users).toHaveLength(1);
      expect(updated.employees).toHaveLength(1);
    });

    test('should handle empty database', () => {
      inMemoryDB.write({});
      const data = inMemoryDB.read();
      expect(data).toBeDefined();
    });
  });

  describe('Database Configuration', () => {
    test('should export connectDB function', () => {
      expect(database.connectDB).toBeDefined();
      expect(typeof database.connectDB).toBe('function');
    });

    test('should skip MongoDB connection in test mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      // Should not throw in test mode
      await expect(database.connectDB()).resolves.not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle USE_MOCK_DB environment variable', async () => {
      const originalMockDB = process.env.USE_MOCK_DB;
      process.env.USE_MOCK_DB = 'true';

      await expect(database.connectDB()).resolves.not.toThrow();

      process.env.USE_MOCK_DB = originalMockDB;
    });
  });

  describe('Performance Configuration', () => {
    test('should export performance utilities', () => {
      expect(performance.initializeRedis).toBeDefined();
      expect(performance.compressionMiddleware).toBeDefined();
      expect(performance.requestTimerMiddleware).toBeDefined();
      expect(performance.cacheMiddleware).toBeDefined();
    });

    test('should have compression middleware', () => {
      expect(typeof performance.compressionMiddleware).toBe('function');
    });

    test('should have request timer middleware', () => {
      expect(typeof performance.requestTimerMiddleware).toBe('function');
    });

    test('should have cache middleware', () => {
      expect(typeof performance.cacheMiddleware).toBe('function');
    });

    test('initializeRedis should be a function', () => {
      expect(typeof performance.initializeRedis).toBe('function');
    });

    test('should return Redis client when initialized', () => {
      const redis = performance.initializeRedis();
      expect(redis).toBeDefined();
      // Clean up connection after test
      if (redis && typeof redis.disconnect === 'function') {
        redis.disconnect();
      }
    });
  });

  describe('Config Edge Cases', () => {
    test('should handle concurrent read operations', () => {
      const reads = Array(10)
        .fill(null)
        .map(() => inMemoryDB.read());
      reads.forEach(data => {
        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
      });
    });

    test('should handle large dataset writes', () => {
      const largeData = {
        users: Array(1000)
          .fill(null)
          .map((_, i) => ({ id: i, name: `User${i}` })),
      };
      expect(() => inMemoryDB.write(largeData)).not.toThrow();
      const data = inMemoryDB.read();
      expect(data.users).toHaveLength(1000);
    });

    test('should maintain data types on read/write', () => {
      const testData = {
        users: [{ id: 1, active: true, score: 95.5, tags: ['admin', 'manager'], meta: { created: new Date().toISOString() } }],
      };
      inMemoryDB.write(testData);
      const data = inMemoryDB.read();

      expect(typeof data.users[0].id).toBe('number');
      expect(typeof data.users[0].active).toBe('boolean');
      expect(typeof data.users[0].score).toBe('number');
      expect(Array.isArray(data.users[0].tags)).toBe(true);
      expect(typeof data.users[0].meta).toBe('object');
    });
  });

  describe('Config Module Exports', () => {
    test('inMemoryDB should export read and write', () => {
      expect(inMemoryDB).toHaveProperty('read');
      expect(inMemoryDB).toHaveProperty('write');
    });

    test('database should export connectDB', () => {
      expect(database).toHaveProperty('connectDB');
    });

    test('performance should export middleware functions', () => {
      expect(performance).toHaveProperty('initializeRedis');
      expect(performance).toHaveProperty('compressionMiddleware');
      expect(performance).toHaveProperty('requestTimerMiddleware');
      expect(performance).toHaveProperty('cacheMiddleware');
    });
  });
});
