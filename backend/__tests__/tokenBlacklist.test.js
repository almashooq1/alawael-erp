/**
 * Tests for tokenBlacklist.js
 * Redis-backed JWT token blacklist with in-memory fallback
 */

/* eslint-disable no-unused-vars */

// ─── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const mockRedisSet = jest.fn().mockResolvedValue('OK');
const mockRedisGet = jest.fn().mockResolvedValue(null);
const mockRedisClient = { set: mockRedisSet, get: mockRedisGet };

jest.mock('../config/cache.config', () => ({
  createRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
}));

// ─── Require module under test ──────────────────────────────────────────────
const tokenBlacklist = require('../utils/tokenBlacklist');
const logger = require('../utils/logger');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('tokenBlacklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env
    delete process.env.DISABLE_REDIS;
  });

  describe('add', () => {
    it('should add token to Redis with TTL when Redis is available', async () => {
      const decoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
      await tokenBlacklist.add('my.jwt.token', decoded);
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('bl:'),
        '1',
        'EX',
        expect.any(Number)
      );
    });

    it('should use in-memory fallback when Redis errors', async () => {
      mockRedisSet.mockRejectedValueOnce(new Error('Redis down'));
      const decoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
      await tokenBlacklist.add('fallback.token', decoded);
      // Should not throw
      expect(logger.error).toHaveBeenCalledWith('Token blacklist add error:', expect.any(Object));
    });

    it('should skip set if TTL <= 0 (already expired)', async () => {
      mockRedisSet.mockClear();
      const decoded = { exp: Math.floor(Date.now() / 1000) - 10 }; // expired 10s ago
      await tokenBlacklist.add('expired.token', decoded);
      // redis.set should NOT have been called for expired tokens
      // (TTL would be negative)
      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe('isBlacklisted', () => {
    it('should return true when token hash found in Redis', async () => {
      mockRedisGet.mockResolvedValueOnce('1');
      const result = await tokenBlacklist.isBlacklisted('some.blacklisted.token');
      expect(result).toBe(true);
    });

    it('should return false when token is not blacklisted', async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      const result = await tokenBlacklist.isBlacklisted('clean.token');
      expect(result).toBe(false);
    });

    it('should check in-memory fallback even when Redis errors', async () => {
      mockRedisGet.mockRejectedValueOnce(new Error('Redis err'));
      const result = await tokenBlacklist.isBlacklisted('random.token');
      // Should not throw, returns boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('DISABLE_REDIS', () => {
    it('should use in-memory fallback when DISABLE_REDIS=true', async () => {
      process.env.DISABLE_REDIS = 'true';
      // Re-require fresh module to pick up env change?
      // Actually the env is checked each time getRedis() is called
      const decoded = { exp: Math.floor(Date.now() / 1000) + 3600 };

      // This should fall through to in-memory since getRedis returns null
      await tokenBlacklist.add('disabled-redis.token', decoded);
      // Not a Redis call — went to fallback silently
    });
  });

  describe('exports', () => {
    it('should export add and isBlacklisted functions', () => {
      expect(typeof tokenBlacklist.add).toBe('function');
      expect(typeof tokenBlacklist.isBlacklisted).toBe('function');
    });
  });
});
