'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('mongoose', () => ({
  connection: {
    readyState: 1,
    db: {
      admin: jest.fn(() => ({
        ping: jest.fn().mockResolvedValue({ ok: 1 }),
      })),
    },
    name: 'alawael_erp',
    host: 'localhost',
  },
}));

jest.mock('../config/redis', () => ({
  isReady: true,
  ping: jest.fn().mockResolvedValue('PONG'),
}));

jest.mock('express', () => {
  const mockRouter = { get: jest.fn().mockReturnThis() };
  return { Router: jest.fn(() => mockRouter) };
});

const mongoose = require('mongoose');
const redisClient = require('../config/redis');

const {
  checkMongoHealth,
  checkRedisHealth,
  checkMemory,
  checkUptime,
  performHealthCheck,
  checkReadiness,
  checkLiveness,
  healthRoutes,
} = require('../utils/healthCheck');

// ─────────────────────────────────────────────────────────────────────────────
describe('healthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mongoose mock state
    mongoose.connection.readyState = 1;
    mongoose.connection.db.admin.mockImplementation(() => ({
      ping: jest.fn().mockResolvedValue({ ok: 1 }),
    }));
    // Reset redis mock state
    redisClient.isReady = true;
    redisClient.ping.mockResolvedValue('PONG');
    delete process.env.DISABLE_REDIS;
  });

  // ── checkMongoHealth ─────────────────────────────────────────────────────
  describe('checkMongoHealth', () => {
    it('returns healthy when connected and ping succeeds', async () => {
      const r = await checkMongoHealth();
      expect(r.status).toBe('healthy');
      expect(r.details.state).toBe('connected');
    });

    it('returns unhealthy when disconnected', async () => {
      mongoose.connection.readyState = 0;
      const r = await checkMongoHealth();
      expect(r.status).toBe('unhealthy');
      expect(r.details.state).toBe('disconnected');
    });

    it('returns unhealthy on ping error', async () => {
      mongoose.connection.db.admin.mockImplementation(() => ({
        ping: jest.fn().mockRejectedValue(new Error('timeout')),
      }));
      const r = await checkMongoHealth();
      expect(r.status).toBe('unhealthy');
    });
  });

  // ── checkRedisHealth ─────────────────────────────────────────────────────
  describe('checkRedisHealth', () => {
    it('returns healthy when Redis is ready', async () => {
      const r = await checkRedisHealth();
      expect(r.status).toBe('healthy');
    });

    it('returns unhealthy when Redis is not ready', async () => {
      redisClient.isReady = false;
      const r = await checkRedisHealth();
      expect(r.status).toBe('unhealthy');
    });

    it('returns disabled when DISABLE_REDIS is true', async () => {
      process.env.DISABLE_REDIS = 'true';
      const r = await checkRedisHealth();
      expect(r.status).toBe('disabled');
    });

    it('returns unhealthy on ping error', async () => {
      redisClient.ping.mockRejectedValue(new Error('connection reset'));
      const r = await checkRedisHealth();
      expect(r.status).toBe('unhealthy');
    });
  });

  // ── checkMemory ──────────────────────────────────────────────────────────
  describe('checkMemory', () => {
    it('returns status and memory details', () => {
      const r = checkMemory();
      expect(['healthy', 'warning']).toContain(r.status);
      expect(r.details).toHaveProperty('total');
      expect(r.details).toHaveProperty('used');
      expect(r.details).toHaveProperty('percentage');
    });
  });

  // ── checkUptime ──────────────────────────────────────────────────────────
  describe('checkUptime', () => {
    it('returns healthy with uptime details', () => {
      const r = checkUptime();
      expect(r.status).toBe('healthy');
      expect(r.details).toHaveProperty('uptime');
      expect(r.details).toHaveProperty('uptimeSeconds');
    });
  });

  // ── performHealthCheck ───────────────────────────────────────────────────
  describe('performHealthCheck', () => {
    it('returns healthy when all checks pass', async () => {
      const h = await performHealthCheck();
      expect(h.status).toBe('healthy');
      expect(h).toHaveProperty('timestamp');
      expect(h).toHaveProperty('checks');
      expect(h.checks).toHaveProperty('database');
      expect(h.checks).toHaveProperty('cache');
      expect(h.checks).toHaveProperty('memory');
      expect(h.checks).toHaveProperty('uptime');
    });

    it('returns degraded in test mode when mongo is unhealthy', async () => {
      mongoose.connection.readyState = 0;
      const h = await performHealthCheck();
      // In test mode (NODE_ENV=test), mongo unhealthy → degraded not unhealthy
      expect(h.status).toBe('degraded');
    });

    it('returns degraded when redis is disabled', async () => {
      process.env.DISABLE_REDIS = 'true';
      const h = await performHealthCheck();
      // DISABLE_REDIS makes redis status 'disabled', not 'unhealthy'
      // All other checks healthy → overall healthy (disabled ≠ unhealthy/warning)
      expect(['healthy', 'degraded']).toContain(h.status);
    });
  });

  // ── checkReadiness ───────────────────────────────────────────────────────
  describe('checkReadiness', () => {
    it('returns ready when MongoDB is healthy', async () => {
      const r = await checkReadiness();
      expect(r.ready).toBe(true);
    });

    it('returns not ready when MongoDB is down', async () => {
      mongoose.connection.readyState = 0;
      const r = await checkReadiness();
      expect(r.ready).toBe(false);
      expect(r.reason).toBeDefined();
    });
  });

  // ── checkLiveness ────────────────────────────────────────────────────────
  describe('checkLiveness', () => {
    it('always returns alive', () => {
      const r = checkLiveness();
      expect(r.alive).toBe(true);
      expect(r).toHaveProperty('timestamp');
      expect(r).toHaveProperty('uptime');
    });
  });

  // ── healthRoutes ─────────────────────────────────────────────────────────
  describe('healthRoutes', () => {
    it('returns a router with registered routes', () => {
      const router = healthRoutes();
      expect(router).toBeDefined();
      expect(router.get).toHaveBeenCalled();
    });
  });
});
