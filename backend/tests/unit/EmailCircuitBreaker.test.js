/**
 * Unit Tests — EmailCircuitBreaker.js
 * Circuit breaker state machine — in-memory, mock logger only
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { EmailCircuitBreaker, STATE } = require('../../services/email/EmailCircuitBreaker');

// ═══════════════════════════════════════
//  STATE constant
// ═══════════════════════════════════════
describe('STATE', () => {
  it('has three states', () => {
    expect(STATE.CLOSED).toBe('CLOSED');
    expect(STATE.OPEN).toBe('OPEN');
    expect(STATE.HALF_OPEN).toBe('HALF_OPEN');
  });
  it('is frozen', () => {
    expect(Object.isFrozen(STATE)).toBe(true);
  });
});

// ═══════════════════════════════════════
//  Constructor defaults
// ═══════════════════════════════════════
describe('constructor', () => {
  it('defaults', () => {
    const cb = new EmailCircuitBreaker();
    expect(cb._failureThreshold).toBe(5);
    expect(cb._successThreshold).toBe(2);
    expect(cb._cooldownMs).toBe(60000);
    expect(cb._monitorWindow).toBe(120000);
    expect(cb._state).toBe('CLOSED');
    expect(cb._autoFailover).toBe(true);
  });

  it('custom options', () => {
    const cb = new EmailCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 1,
      cooldownMs: 5000,
      autoFailover: false,
    });
    expect(cb._failureThreshold).toBe(3);
    expect(cb._successThreshold).toBe(1);
    expect(cb._cooldownMs).toBe(5000);
    expect(cb._autoFailover).toBe(false);
  });
});

// ═══════════════════════════════════════
//  Getters
// ═══════════════════════════════════════
describe('getters', () => {
  it('state returns CLOSED initially', () => {
    const cb = new EmailCircuitBreaker();
    expect(cb.state).toBe('CLOSED');
  });

  it('isAllowed true when CLOSED', () => {
    const cb = new EmailCircuitBreaker();
    expect(cb.isAllowed).toBe(true);
  });

  it('stats includes all fields', () => {
    const cb = new EmailCircuitBreaker();
    const s = cb.stats;
    expect(s.state).toBe('CLOSED');
    expect(s.totalCalls).toBe(0);
    expect(s.totalSuccess).toBe(0);
    expect(s.failureThreshold).toBe(5);
    expect(s.fallbackProvidersCount).toBe(0);
  });
});

// ═══════════════════════════════════════
//  execute — CLOSED (success + failure)
// ═══════════════════════════════════════
describe('execute — CLOSED', () => {
  it('success increments stats', async () => {
    const cb = new EmailCircuitBreaker();
    const result = await cb.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.stats.totalCalls).toBe(1);
    expect(cb.stats.totalSuccess).toBe(1);
  });

  it('failure increments failure stats and re-throws', async () => {
    const cb = new EmailCircuitBreaker();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(cb.stats.totalFailed).toBe(1);
  });
});

// ═══════════════════════════════════════
//  State transitions: CLOSED → OPEN
// ═══════════════════════════════════════
describe('CLOSED → OPEN', () => {
  it('trips after failureThreshold failures', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 3 });
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('err'))).catch(() => {});
    }
    expect(cb._state).toBe('OPEN');
    expect(cb.stats.totalTrips).toBe(1);
  });

  it('does not trip below threshold', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 5 });
    for (let i = 0; i < 4; i++) {
      await cb.execute(() => Promise.reject(new Error('err'))).catch(() => {});
    }
    expect(cb._state).toBe('CLOSED');
  });
});

// ═══════════════════════════════════════
//  OPEN — rejects + fallback
// ═══════════════════════════════════════
describe('execute — OPEN', () => {
  let cb;
  beforeEach(async () => {
    cb = new EmailCircuitBreaker({ failureThreshold: 1, cooldownMs: 999999 });
    await cb.execute(() => Promise.reject(new Error('err'))).catch(() => {});
    expect(cb._state).toBe('OPEN');
  });

  it('rejects when OPEN with no fallback', async () => {
    await expect(cb.execute(() => Promise.resolve('x'))).rejects.toThrow('circuit breaker is OPEN');
    expect(cb.stats.totalRejected).toBe(1);
  });

  it('calls fallback function when OPEN', async () => {
    const result = await cb.execute(
      () => Promise.resolve('primary'),
      () => 'fallback-result'
    );
    expect(result).toBe('fallback-result');
  });

  it('uses auto-failover provider', async () => {
    cb.addFallbackProvider(() => Promise.resolve('backup'), 'backup-smtp');
    const result = await cb.execute(() => Promise.resolve('primary'));
    expect(result).toBe('backup');
    expect(cb.stats.totalFailovers).toBe(1);
    expect(cb.stats.activeProvider).toBe('backup-smtp');
  });
});

// ═══════════════════════════════════════
//  OPEN → HALF_OPEN (cooldown)
// ═══════════════════════════════════════
describe('OPEN → HALF_OPEN', () => {
  it('transitions after cooldown', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 1, cooldownMs: 1 });
    await cb.execute(() => Promise.reject(new Error('err'))).catch(() => {});
    expect(cb._state).toBe('OPEN');

    // Wait slightly longer than cooldown
    await new Promise(r => setTimeout(r, 10));

    // Accessing state triggers _checkCooldown
    expect(cb.state).toBe('HALF_OPEN');
  });
});

// ═══════════════════════════════════════
//  HALF_OPEN → CLOSED / OPEN
// ═══════════════════════════════════════
describe('HALF_OPEN transitions', () => {
  let cb;
  beforeEach(async () => {
    cb = new EmailCircuitBreaker({ failureThreshold: 1, cooldownMs: 1, successThreshold: 2 });
    await cb.execute(() => Promise.reject(new Error('err'))).catch(() => {});
    await new Promise(r => setTimeout(r, 10));
    expect(cb.state).toBe('HALF_OPEN');
  });

  it('HALF_OPEN → CLOSED after successThreshold probes', async () => {
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb._state).toBe('HALF_OPEN'); // need 2
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb._state).toBe('CLOSED');
    expect(cb.stats.activeProvider).toBe('primary');
  });

  it('HALF_OPEN → OPEN on probe failure', async () => {
    await cb.execute(() => Promise.reject(new Error('still down'))).catch(() => {});
    expect(cb._state).toBe('OPEN');
  });
});

// ═══════════════════════════════════════
//  addFallbackProvider
// ═══════════════════════════════════════
describe('addFallbackProvider', () => {
  it('adds to list', () => {
    const cb = new EmailCircuitBreaker();
    cb.addFallbackProvider(() => {}, 'ses');
    cb.addFallbackProvider(() => {}, 'mailgun');
    expect(cb._fallbackProviders).toHaveLength(2);
    expect(cb._fallbackProviders[0].name).toBe('ses');
  });
});

// ═══════════════════════════════════════
//  wrap
// ═══════════════════════════════════════
describe('wrap', () => {
  it('returns a function that routes through execute', async () => {
    const cb = new EmailCircuitBreaker();
    const wrapped = cb.wrap(async x => x * 2);
    expect(await wrapped(5)).toBe(10);
    expect(cb.stats.totalCalls).toBe(1);
  });
});

// ═══════════════════════════════════════
//  reset / trip
// ═══════════════════════════════════════
describe('reset', () => {
  it('forces CLOSED', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 1, cooldownMs: 999999 });
    await cb.execute(() => Promise.reject(new Error('err'))).catch(() => {});
    expect(cb._state).toBe('OPEN');
    cb.reset();
    expect(cb._state).toBe('CLOSED');
    expect(cb._failures).toHaveLength(0);
    expect(cb.stats.activeProvider).toBe('primary');
  });
});

describe('trip', () => {
  it('forces OPEN', () => {
    const cb = new EmailCircuitBreaker();
    expect(cb._state).toBe('CLOSED');
    cb.trip('maintenance');
    expect(cb._state).toBe('OPEN');
    expect(cb.stats.totalTrips).toBe(1);
  });
});

// ═══════════════════════════════════════
//  onStateChange callback
// ═══════════════════════════════════════
describe('onStateChange', () => {
  it('calls callback on transition', () => {
    const changes = [];
    const cb = new EmailCircuitBreaker({
      onStateChange: (from, to) => changes.push({ from, to }),
    });
    cb.trip('test');
    expect(changes).toEqual([{ from: 'CLOSED', to: 'OPEN' }]);
  });

  it('swallows callback errors', () => {
    const cb = new EmailCircuitBreaker({
      onStateChange: () => {
        throw new Error('kaboom');
      },
    });
    expect(() => cb.trip('test')).not.toThrow();
  });
});

// ═══════════════════════════════════════
//  Monitor window pruning
// ═══════════════════════════════════════
describe('monitor window', () => {
  it('prunes old failures', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 10, monitorWindow: 50 });
    // Add 3 failures
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('e'))).catch(() => {});
    }
    expect(cb._failures.length).toBe(3);
    // Wait for them to expire
    await new Promise(r => setTimeout(r, 60));
    // Add one more — old ones should be pruned
    await cb.execute(() => Promise.reject(new Error('e'))).catch(() => {});
    expect(cb._failures.length).toBe(1);
  });
});
