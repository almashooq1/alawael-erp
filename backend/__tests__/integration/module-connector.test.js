/**
 * Module Connector — Tests
 *
 * Tests service registration, invocation, circuit breaker,
 * health checks, and stats.
 */

'use strict';

const {
  ModuleConnector,
  CircuitBreaker,
  CIRCUIT_STATE,
  MODULE_STATUS,
} = require('../../integration/moduleConnector');

describe('ModuleConnector', () => {
  let connector;

  beforeEach(() => {
    connector = new ModuleConnector();
    connector.initialize();
  });

  // ─── Registration ─────────────────────────────────────────────────────

  describe('registerModule', () => {
    it('should register a module with services', () => {
      connector.registerModule('hr', {
        version: '1.0.0',
        services: {
          getEmployee: jest.fn(),
        },
      });

      const stats = connector.getStats();
      expect(stats.totalModules).toBe(1);
      expect(stats.totalServices).toBe(1);
    });

    it('should register multiple modules', () => {
      connector.registerModule('hr', {
        services: { getEmployee: jest.fn() },
      });
      connector.registerModule('finance', {
        services: { createInvoice: jest.fn(), getBalance: jest.fn() },
      });

      expect(connector.getStats().totalModules).toBe(2);
      expect(connector.getStats().totalServices).toBe(3);
    });

    it('should emit module:registered event', () => {
      const cb = jest.fn();
      connector.on('module:registered', cb);

      connector.registerModule('hr', {
        services: { getEmployee: jest.fn() },
      });

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ name: 'hr' }));
    });
  });

  // ─── Service Invocation ───────────────────────────────────────────────

  describe('invoke', () => {
    it('should invoke a registered service', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ id: 1, name: 'John' });

      connector.registerModule('hr', {
        services: { getEmployee: mockHandler },
      });

      const result = await connector.invoke('hr.getEmployee', { id: 1 });
      expect(result).toEqual({ id: 1, name: 'John' });
      expect(mockHandler).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw for unknown service', async () => {
      await expect(connector.invoke('unknown.service', {})).rejects.toThrow('not found');
    });

    it('should retry on failure when retries configured', async () => {
      let callCount = 0;
      const failThenSucceed = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) throw new Error('Temporary failure');
        return { ok: true };
      });

      connector.registerModule('hr', {
        services: { unstable: failThenSucceed },
        circuitOptions: { failureThreshold: 10 },
      });

      const result = await connector.invoke('hr.unstable', {}, { retries: 3, retryDelay: 10 });
      expect(result).toEqual({ ok: true });
      expect(failThenSucceed).toHaveBeenCalledTimes(3);
    });

    it('should timeout long-running services', async () => {
      const slowHandler = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => { setTimeout(resolve, 5000); }));

      connector.registerModule('hr', {
        services: { slow: slowHandler },
        circuitOptions: { failureThreshold: 10 },
      });

      await expect(connector.invoke('hr.slow', {}, { timeout: 50 })).rejects.toThrow('Timeout');
    }, 10000);
  });

  // ─── Service Discovery ────────────────────────────────────────────────

  describe('hasService / getModuleServices', () => {
    beforeEach(() => {
      connector.registerModule('hr', {
        services: { getEmployee: jest.fn(), listDepartments: jest.fn() },
      });
    });

    it('should check if service exists', () => {
      expect(connector.hasService('hr.getEmployee')).toBe(true);
      expect(connector.hasService('hr.unknown')).toBe(false);
    });

    it('should list module services', () => {
      const services = connector.getModuleServices('hr');
      expect(services).toContain('getEmployee');
      expect(services).toContain('listDepartments');
    });

    it('should return empty for unknown module', () => {
      expect(connector.getModuleServices('unknown')).toEqual([]);
    });
  });

  // ─── Health Check ────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('should report healthy for modules without health functions', async () => {
      connector.registerModule('hr', { services: { fn: jest.fn() } });

      const result = await connector.healthCheck();
      expect(result.status).toBe(MODULE_STATUS.HEALTHY);
      expect(result.modulesCount).toBe(1);
    });

    it('should report unhealthy when health function throws', async () => {
      connector.registerModule('hr', {
        services: { fn: jest.fn() },
        healthFn: async () => {
          throw new Error('DB down');
        },
      });

      const result = await connector.healthCheck();
      expect(result.status).toBe(MODULE_STATUS.UNHEALTHY);
      expect(result.modules.hr.error).toBe('DB down');
    });

    it('should aggregate status from all modules', async () => {
      connector.registerModule('hr', {
        services: { fn: jest.fn() },
        healthFn: async () => ({ status: MODULE_STATUS.HEALTHY }),
      });
      connector.registerModule('finance', {
        services: { fn: jest.fn() },
        healthFn: async () => ({ status: MODULE_STATUS.DEGRADED }),
      });

      const result = await connector.healthCheck();
      expect(result.status).toBe(MODULE_STATUS.DEGRADED);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Circuit Breaker
// ═══════════════════════════════════════════════════════════════════════════════

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 50,
    });
  });

  it('should start in CLOSED state', () => {
    expect(breaker.state).toBe(CIRCUIT_STATE.CLOSED);
  });

  it('should stay CLOSED on success', async () => {
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.state).toBe(CIRCUIT_STATE.CLOSED);
  });

  it('should OPEN after threshold failures', async () => {
    const fail = () => breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    await fail();
    await fail();
    await fail();

    expect(breaker.state).toBe(CIRCUIT_STATE.OPEN);
  });

  it('should reject requests when OPEN', async () => {
    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow('OPEN');
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    // Wait for timeout
    await new Promise(r => { setTimeout(r, 60); });

    // Should attempt (half-open)
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.state).toBe(CIRCUIT_STATE.HALF_OPEN);
  });

  it('should CLOSE after enough successes in HALF_OPEN', async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    await new Promise(r => { setTimeout(r, 60); });

    // Two successes should close it (successThreshold: 2)
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.resolve('ok'));

    expect(breaker.state).toBe(CIRCUIT_STATE.CLOSED);
  });

  it('should reset manually', async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(breaker.state).toBe(CIRCUIT_STATE.OPEN);

    breaker.reset();
    expect(breaker.state).toBe(CIRCUIT_STATE.CLOSED);
  });

  it('should track stats', async () => {
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    const status = breaker.getStatus();
    expect(status.totalCalls).toBe(2);
    expect(status.totalSuccesses).toBe(1);
    expect(status.totalFailures).toBe(1);
  });
});
