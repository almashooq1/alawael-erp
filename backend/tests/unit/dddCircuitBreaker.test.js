'use strict';

const chain = () => {
  const c = {};
  ['findOne', 'findOneAndUpdate', 'create'].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDCircuitState = makeModel();
const mockDDDCircuitEvent = makeModel();

jest.mock('../../models/DddCircuitBreaker', () => ({
  DDDCircuitState: mockDDDCircuitState,
  DDDCircuitEvent: mockDDDCircuitEvent,
}));

/* The module exports `new CircuitBreaker()` with no serviceName.
   We import the class by reading the singleton's constructor. */
const service = require('../../services/dddCircuitBreaker');

beforeEach(() => {
  // Reset service state for each test
  service.serviceName = 'test-svc';
  service.state = 'closed';
  service.failureCount = 0;
  service.successCount = 0;
  service.halfOpenSuccesses = 0;
  service.lastFailure = null;
  service.lastError = null;
  service._initialized = true; // skip _init DB fetch

  // Clear mock history
  [mockDDDCircuitState, mockDDDCircuitEvent].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });

  // Default persistence mock
  mockDDDCircuitState.findOneAndUpdate.mockResolvedValue({});
  mockDDDCircuitEvent.create.mockResolvedValue({});
});

describe('dddCircuitBreaker', () => {
  /* ── constructor defaults ── */
  describe('constructor', () => {
    it('has default config values', () => {
      expect(service.config.failureThreshold).toBe(5);
      expect(service.config.resetTimeoutMs).toBe(30000);
      expect(service.config.halfOpenRequests).toBe(3);
    });
  });

  /* ── _init ── */
  describe('_init', () => {
    it('loads stored state from DB', async () => {
      service._initialized = false;
      mockDDDCircuitState.findOne.mockResolvedValue({
        state: 'open',
        failureCount: 3,
        successCount: 10,
        halfOpenSuccesses: 0,
        lastFailure: new Date(),
        lastError: 'timeout',
      });
      await service._init();
      expect(service.state).toBe('open');
      expect(service.failureCount).toBe(3);
      expect(service._initialized).toBe(true);
    });

    it('handles no stored state gracefully', async () => {
      service._initialized = false;
      mockDDDCircuitState.findOne.mockResolvedValue(null);
      await service._init();
      expect(service._initialized).toBe(true);
    });

    it('skips when already initialized', async () => {
      await service._init();
      expect(mockDDDCircuitState.findOne).not.toHaveBeenCalled();
    });

    it('handles DB error gracefully', async () => {
      service._initialized = false;
      mockDDDCircuitState.findOne.mockRejectedValue(new Error('DB down'));
      await service._init();
      expect(service._initialized).toBe(true);
    });
  });

  /* ── execute (closed circuit) ── */
  describe('execute — closed circuit', () => {
    it('executes fn and returns result', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const r = await service.execute(fn);
      expect(r).toBe('ok');
      expect(fn).toHaveBeenCalled();
    });

    it('increments successCount on success', async () => {
      await service.execute(() => Promise.resolve('ok'));
      expect(service.successCount).toBe(1);
    });

    it('re-throws error when no fallback', async () => {
      const err = new Error('fail');
      await expect(
        service.execute(() => {
          throw err;
        })
      ).rejects.toThrow('fail');
    });

    it('uses fallback on error', async () => {
      const fallback = jest.fn().mockReturnValue('fallback-val');
      const r = await service.execute(() => {
        throw new Error('fail');
      }, fallback);
      expect(r).toBe('fallback-val');
    });

    it('increments failureCount on failure', async () => {
      try {
        await service.execute(() => {
          throw new Error('x');
        });
      } catch {}
      expect(service.failureCount).toBe(1);
    });

    it('opens circuit after reaching threshold', async () => {
      service.failureCount = 4; // one more failure will trip
      try {
        await service.execute(() => {
          throw new Error('x');
        });
      } catch {}
      expect(service.state).toBe('open');
    });
  });

  /* ── execute (open circuit) ── */
  describe('execute — open circuit', () => {
    beforeEach(() => {
      service.state = 'open';
      service.lastFailure = new Date(); // just now
    });

    it('throws circuit breaker OPEN error', async () => {
      await expect(service.execute(() => {})).rejects.toThrow(/Circuit breaker OPEN/);
    });

    it('uses fallback when circuit is open', async () => {
      const fb = jest.fn().mockReturnValue('fb');
      const r = await service.execute(() => {}, fb);
      expect(r).toBe('fb');
    });

    it('transitions to half-open after timeout elapsed', async () => {
      service.lastFailure = new Date(Date.now() - 60000); // 60s ago, > 30s timeout
      const fn = jest.fn().mockResolvedValue('ok');
      await service.execute(fn);
      // After timeout, should have transitioned to half-open then succeeded
      expect(fn).toHaveBeenCalled();
    });
  });

  /* ── execute (half-open circuit) ── */
  describe('execute — half-open circuit', () => {
    beforeEach(() => {
      service.state = 'half-open';
      service.halfOpenSuccesses = 0;
    });

    it('closes circuit after enough successes', async () => {
      service.halfOpenSuccesses = 2; // needs 3 total
      await service.execute(() => Promise.resolve('ok'));
      expect(service.state).toBe('closed');
      expect(service.failureCount).toBe(0);
    });

    it('trips back to open on failure', async () => {
      try {
        await service.execute(() => {
          throw new Error('fail');
        });
      } catch {}
      expect(service.state).toBe('open');
    });
  });

  /* ── reset ── */
  describe('reset', () => {
    it('resets all state to closed', async () => {
      service.state = 'open';
      service.failureCount = 5;
      service.successCount = 10;
      service.lastError = 'something';
      await service.reset();
      expect(service.state).toBe('closed');
      expect(service.failureCount).toBe(0);
      expect(service.successCount).toBe(0);
      expect(service.lastError).toBeNull();
    });

    it('persists manual-reset event', async () => {
      await service.reset();
      expect(mockDDDCircuitState.findOneAndUpdate).toHaveBeenCalled();
      expect(mockDDDCircuitEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'manual-reset' })
      );
    });
  });

  /* ── getStatus ── */
  describe('getStatus', () => {
    it('returns current status snapshot', () => {
      service.state = 'open';
      service.failureCount = 3;
      const s = service.getStatus();
      expect(s).toEqual({
        serviceName: 'test-svc',
        state: 'open',
        failureCount: 3,
        successCount: 0,
        config: service.config,
        lastFailure: null,
        lastError: null,
      });
    });
  });

  /* ── _persist ── */
  describe('_persist', () => {
    it('handles persistence error gracefully', async () => {
      mockDDDCircuitState.findOneAndUpdate.mockRejectedValue(new Error('DB down'));
      // Should not throw
      await expect(service._persist('test')).resolves.not.toThrow();
    });
  });
});
