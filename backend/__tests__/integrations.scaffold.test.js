/**
 * Smoke tests for the 5 scaffolded Saudi gov integration adapters.
 * Verifies each adapter module loads, exports the expected public API,
 * and that madaa.buildPayload produces a valid file format.
 */

describe('integrations scaffold — public API shape', () => {
  const adapters = [
    ['nafath', ['createSignatureRequest', 'verifySignature', 'exchangeAuthCode']],
    ['absher', ['verifyIdentity']],
    ['yakeen', ['lookupPerson', 'verifyGuardianship']],
    ['wasel', ['checkCoverage', 'submitClaim', 'getClaimStatus']],
    ['madaa', ['buildPayload', 'uploadPayload']],
  ];

  test.each(adapters)('%s exports expected functions', (name, fnNames) => {
    const mod = require(`../integrations/${name}`);
    expect(mod.config).toBeDefined();
    expect(mod.integrationLog).toBeDefined();
    for (const fn of fnNames) {
      expect(typeof mod[fn]).toBe('function');
    }
  });
});

describe('madaa.buildPayload', () => {
  const { buildPayload } = require('../integrations/madaa');

  test('produces header + detail + footer lines', () => {
    const { filename, content } = buildPayload({
      runId: 'RUN-2026-04',
      employees: [
        { id: 'E-1', iqama: '2000000001', accountNumber: 'SA12-01', amount: 5000 },
        { id: 'E-2', iqama: '2000000002', accountNumber: 'SA12-02', amount: 7500, currency: 'SAR' },
      ],
    });
    expect(filename).toBe('madaa-RUN-2026-04.txt');
    const lines = content.split('\n');
    expect(lines[0]).toMatch(/^H\|RUN-2026-04\|2\|/);
    expect(lines[1]).toMatch(/^D\|E-1\|2000000001\|SA12-01\|5000\|SAR$/);
    expect(lines[2]).toMatch(/^D\|E-2\|2000000002\|SA12-02\|7500\|SAR$/);
    expect(lines[3]).toBe('F|RUN-2026-04|2');
  });

  test('rejects missing arguments', () => {
    expect(() => buildPayload({})).toThrow('runId required');
    expect(() => buildPayload({ runId: 'R' })).toThrow('employees required');
  });
});

describe('AclClient circuit breaker', () => {
  const { CircuitBreaker } = require('../integrations/_common/acl-client');

  test('opens after threshold failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    expect(cb.canPass()).toBe(true);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.canPass()).toBe(false);
    expect(cb.state).toBe('open');
  });

  test('resets on success', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.failures).toBe(0);
    expect(cb.state).toBe('closed');
  });
});
