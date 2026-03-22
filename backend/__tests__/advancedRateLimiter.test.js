'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const {
  SlidingWindowLimiter,
  TokenBucket,
  IPReputationTracker,
  advancedRateLimiterMiddleware,
  createEndpointLimiter,
  loginRateLimiter,
  passwordResetLimiter,
  uploadRateLimiter,
  reportGenerationLimiter,
  dataExportLimiter,
  RATE_LIMIT_TIERS,
  ipReputation,
} = require('../middleware/advancedRateLimiter');

// ── helpers ──────────────────────────────────────────────────────────────────
const mockReq = (overrides = {}) => ({
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  user: null,
  headers: {},
  method: 'GET',
  ...overrides,
});

const mockRes = () => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

// ─────────────────────────────────────────────────────────────────────────────
describe('advancedRateLimiter', () => {
  // ── SlidingWindowLimiter ─────────────────────────────────────────────────
  describe('SlidingWindowLimiter', () => {
    let limiter;
    afterEach(() => { if (limiter) { limiter.destroy(); limiter = null; } });

    it('uses default config when no options provided', () => {
      limiter = new SlidingWindowLimiter();
      expect(limiter.windowMs).toBe(60000);
      expect(limiter.maxRequests).toBe(100);
    });

    it('allows requests under the limit', () => {
      limiter = new SlidingWindowLimiter({ windowMs: 60000, maxRequests: 5 });
      const r = limiter.check('u1');
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(4);
    });

    it('denies requests at the limit', () => {
      limiter = new SlidingWindowLimiter({ windowMs: 60000, maxRequests: 2 });
      limiter.check('u1');
      limiter.check('u1');
      const r = limiter.check('u1');
      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
      expect(r.retryAfterMs).toBeGreaterThan(0);
    });

    it('tracks remaining correctly across requests', () => {
      limiter = new SlidingWindowLimiter({ windowMs: 60000, maxRequests: 3 });
      expect(limiter.check('k').remaining).toBe(2);
      expect(limiter.check('k').remaining).toBe(1);
      expect(limiter.check('k').remaining).toBe(0);
      expect(limiter.check('k').allowed).toBe(false);
    });

    it('resets counters for a key', () => {
      limiter = new SlidingWindowLimiter({ windowMs: 60000, maxRequests: 1 });
      limiter.check('k');
      expect(limiter.check('k').allowed).toBe(false);
      limiter.reset('k');
      expect(limiter.check('k').allowed).toBe(true);
    });

    it('destroy clears all resources', () => {
      limiter = new SlidingWindowLimiter();
      limiter.check('a');
      limiter.check('b');
      limiter.destroy();
      expect(limiter._requests.size).toBe(0);
      limiter = null;
    });

    it('provides resetMs for denied requests', () => {
      limiter = new SlidingWindowLimiter({ windowMs: 60000, maxRequests: 1 });
      limiter.check('k');
      const r = limiter.check('k');
      expect(r.resetMs).toBeGreaterThan(0);
      expect(r.resetMs).toBeLessThanOrEqual(60000);
    });
  });

  // ── TokenBucket ──────────────────────────────────────────────────────────
  describe('TokenBucket', () => {
    it('uses default config', () => {
      const b = new TokenBucket();
      expect(b.capacity).toBe(50);
      expect(b.refillRate).toBe(10);
      expect(b.refillIntervalMs).toBe(1000);
    });

    it('allows consumption when tokens available', () => {
      const b = new TokenBucket({ capacity: 5, refillRate: 1, refillIntervalMs: 60000 });
      const r = b.consume('u');
      expect(r.allowed).toBe(true);
      expect(r.tokens).toBe(4);
    });

    it('denies when all tokens consumed', () => {
      const b = new TokenBucket({ capacity: 2, refillRate: 1, refillIntervalMs: 60000 });
      b.consume('u');
      b.consume('u');
      const r = b.consume('u');
      expect(r.allowed).toBe(false);
      expect(r.tokens).toBe(0);
    });

    it('tracks token count correctly', () => {
      const b = new TokenBucket({ capacity: 3, refillRate: 1, refillIntervalMs: 60000 });
      expect(b.consume('u').tokens).toBe(2);
      expect(b.consume('u').tokens).toBe(1);
      expect(b.consume('u').tokens).toBe(0);
      expect(b.consume('u').allowed).toBe(false);
    });

    it('resets a key', () => {
      const b = new TokenBucket({ capacity: 1, refillRate: 1, refillIntervalMs: 60000 });
      b.consume('u');
      expect(b.consume('u').allowed).toBe(false);
      b.reset('u');
      expect(b.consume('u').allowed).toBe(true);
    });
  });

  // ── IPReputationTracker ──────────────────────────────────────────────────
  describe('IPReputationTracker', () => {
    let tracker;
    afterEach(() => { if (tracker) { tracker.destroy(); tracker = null; } });

    it('starts with score 0 for unknown IP', () => {
      tracker = new IPReputationTracker();
      expect(tracker.getScore('1.2.3.4')).toBe(0);
    });

    it('records violations and increases score', () => {
      tracker = new IPReputationTracker();
      tracker.recordViolation('1.2.3.4', 3);
      expect(tracker.getScore('1.2.3.4')).toBe(3);
    });

    it('blocks IP when score reaches threshold', () => {
      tracker = new IPReputationTracker();
      expect(tracker.isBlocked('1.2.3.4')).toBe(false);
      tracker.recordViolation('1.2.3.4', 10);
      expect(tracker.isBlocked('1.2.3.4')).toBe(true);
    });

    it('accumulates violations across calls', () => {
      tracker = new IPReputationTracker();
      tracker.recordViolation('ip', 4);
      tracker.recordViolation('ip', 4);
      expect(tracker.getScore('ip')).toBe(8);
      expect(tracker.isBlocked('ip')).toBe(false);
      tracker.recordViolation('ip', 3);
      expect(tracker.isBlocked('ip')).toBe(true);
    });

    it('does not cross-contaminate different IPs', () => {
      tracker = new IPReputationTracker();
      tracker.recordViolation('1.1.1.1', 5);
      expect(tracker.getScore('2.2.2.2')).toBe(0);
    });
  });

  // ── RATE_LIMIT_TIERS ────────────────────────────────────────────────────
  describe('RATE_LIMIT_TIERS', () => {
    it('has all expected tier names', () => {
      ['anonymous', 'user', 'staff', 'admin', 'superadmin', 'api_key'].forEach(t =>
        expect(RATE_LIMIT_TIERS).toHaveProperty(t)
      );
    });

    it('has increasing maxRequests from anonymous → superadmin', () => {
      const order = ['anonymous', 'user', 'staff', 'admin', 'superadmin'];
      for (let i = 1; i < order.length; i++) {
        expect(RATE_LIMIT_TIERS[order[i]].maxRequests).toBeGreaterThan(
          RATE_LIMIT_TIERS[order[i - 1]].maxRequests
        );
      }
    });

    it('each tier has windowMs, maxRequests, burstCapacity, burstRefillRate', () => {
      Object.values(RATE_LIMIT_TIERS).forEach(tier => {
        expect(tier).toHaveProperty('windowMs');
        expect(tier).toHaveProperty('maxRequests');
        expect(tier).toHaveProperty('burstCapacity');
        expect(tier).toHaveProperty('burstRefillRate');
      });
    });
  });

  // ── advancedRateLimiterMiddleware ────────────────────────────────────────
  describe('advancedRateLimiterMiddleware', () => {
    it('skips in test environment by default', () => {
      const mw = advancedRateLimiterMiddleware();
      const next = jest.fn();
      mw(mockReq(), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('allows requests under limit when skipInTest=false', () => {
      const mw = advancedRateLimiterMiddleware({ skipInTest: false });
      const next = jest.fn();
      mw(mockReq({ ip: '10.0.0.1' }), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('sets rate-limit headers', () => {
      const mw = advancedRateLimiterMiddleware({ skipInTest: false });
      const res = mockRes();
      const next = jest.fn();
      mw(mockReq({ ip: '10.0.0.2' }), res, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', expect.any(String));
    });

    it('resolves anonymous tier for unauthenticated requests', () => {
      const mw = advancedRateLimiterMiddleware({ skipInTest: false });
      const res = mockRes();
      mw(mockReq({ ip: '10.0.0.3' }), res, jest.fn());
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'anonymous');
    });

    it('resolves api_key tier when x-api-key header present', () => {
      const mw = advancedRateLimiterMiddleware({ skipInTest: false });
      const res = mockRes();
      mw(mockReq({ ip: '10.0.0.4', headers: { 'x-api-key': 'abc12345xyz' } }), res, jest.fn());
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'api_key');
    });

    it('resolves admin tier for admin users', () => {
      const mw = advancedRateLimiterMiddleware({ skipInTest: false });
      const res = mockRes();
      mw(mockReq({ ip: '10.0.0.5', user: { id: 'u1', role: 'admin' } }), res, jest.fn());
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'admin');
    });

    it('resolves superadmin tier for super_admin role', () => {
      const mw = advancedRateLimiterMiddleware({ skipInTest: false });
      const res = mockRes();
      mw(mockReq({ ip: '10.0.0.6', user: { id: 'u2', role: 'super_admin' } }), res, jest.fn());
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'superadmin');
    });

    it('resolves staff tier for employee roles', () => {
      const mw = advancedRateLimiterMiddleware({ skipInTest: false });
      const res = mockRes();
      mw(mockReq({ ip: '10.0.0.7', user: { id: 'u3', role: 'teacher' } }), res, jest.fn());
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'staff');
    });
  });

  // ── createEndpointLimiter ────────────────────────────────────────────────
  describe('createEndpointLimiter', () => {
    it('returns a middleware function', () => {
      expect(typeof createEndpointLimiter({ windowMs: 60000, maxRequests: 10 })).toBe('function');
    });

    it('skips in test environment', () => {
      const mw = createEndpointLimiter({ windowMs: 60000, maxRequests: 10 });
      const next = jest.fn();
      mw({}, {}, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ── Pre-built limiters ──────────────────────────────────────────────────
  describe('Pre-built limiters', () => {
    it('exports all limiters as functions', () => {
      [loginRateLimiter, passwordResetLimiter, uploadRateLimiter,
       reportGenerationLimiter, dataExportLimiter].forEach(l =>
        expect(typeof l).toBe('function')
      );
    });

    it('loginRateLimiter skips in test env', () => {
      const next = jest.fn();
      loginRateLimiter({}, {}, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ── ipReputation singleton ───────────────────────────────────────────────
  describe('ipReputation singleton', () => {
    it('is a valid IPReputationTracker instance', () => {
      expect(ipReputation).toBeDefined();
      expect(typeof ipReputation.recordViolation).toBe('function');
      expect(typeof ipReputation.isBlocked).toBe('function');
      expect(typeof ipReputation.getScore).toBe('function');
    });
  });
});
