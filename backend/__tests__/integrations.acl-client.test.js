/**
 * AclClient contract tests — verifies retry, timeout, circuit breaker,
 * and integration logging behavior against a stubbed global fetch.
 *
 * No network calls; no real adapter endpoints.
 */

'use strict';

const { AclClient, CircuitBreaker } = require('../integrations/_common/acl-client');
const { InMemoryIntegrationLog } = require('../integrations/_common/integration-log');

function makeFetchStub(responses) {
  let i = 0;
  return async (_url, _opts) => {
    const next = responses[i++];
    if (next === 'abort') {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    }
    if (next instanceof Error) throw next;
    return {
      status: next.status,
      headers: new Map(Object.entries(next.headers || {})),
      text: async () => next.body || '',
    };
  };
}

describe('AclClient — happy path', () => {
  test('returns response on first success', async () => {
    globalThis.fetch = makeFetchStub([{ status: 200, body: 'ok' }]);
    const log = new InMemoryIntegrationLog();
    const client = new AclClient({ name: 'test', baseUrl: 'https://test', integrationLog: log });
    const res = await client.request({ path: '/x' });
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
    const entries = log.recent();
    expect(entries.length).toBe(1);
    expect(entries[0].integration).toBe('test');
    expect(entries[0].status).toBe(200);
  });

  test('strips trailing slash from baseUrl', () => {
    const client = new AclClient({ name: 'x', baseUrl: 'https://test.com/' });
    expect(client.baseUrl).toBe('https://test.com');
  });

  test('throws if name missing', () => {
    expect(() => new AclClient({})).toThrow('name is required');
  });
});

describe('AclClient — retry on 5xx', () => {
  test('retries on 503 then succeeds', async () => {
    globalThis.fetch = makeFetchStub([
      { status: 503, body: '' },
      { status: 503, body: '' },
      { status: 200, body: 'done' },
    ]);
    const log = new InMemoryIntegrationLog();
    const client = new AclClient({
      name: 'gov',
      baseUrl: 'https://gov',
      retries: 3,
      integrationLog: log,
    });
    const res = await client.request({ path: '/' });
    expect(res.status).toBe(200);
    expect(log.recent().length).toBe(3);
  }, 20000);

  test('gives up after retries exhausted on persistent 500', async () => {
    globalThis.fetch = makeFetchStub([
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
    ]);
    const client = new AclClient({ name: 'gov', baseUrl: 'https://gov', retries: 2 });
    await expect(client.request({ path: '/' })).rejects.toThrow(/HTTP 500/);
  }, 20000);
});

describe('AclClient — circuit breaker', () => {
  test('returns CIRCUIT_OPEN once breaker opens', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, halfOpenAfterMs: 60_000 });
    // Force breaker open
    breaker.recordFailure();
    const client = new AclClient({ name: 'x', baseUrl: 'https://x', circuitBreaker: breaker });
    await expect(client.request({ path: '/' })).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
  });

  test('successful request resets failure counter', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    breaker.recordFailure();
    breaker.recordFailure();
    globalThis.fetch = makeFetchStub([{ status: 200 }]);
    const client = new AclClient({
      name: 'x',
      baseUrl: 'https://x',
      retries: 0,
      circuitBreaker: breaker,
    });
    await client.request({ path: '/' });
    expect(breaker.failures).toBe(0);
    expect(breaker.state).toBe('closed');
  });
});

describe('AclClient — headers + idempotency', () => {
  test('attaches User-Agent and Idempotency-Key when provided', async () => {
    let captured;
    globalThis.fetch = async (url, opts) => {
      captured = { url, headers: opts.headers };
      return { status: 200, headers: new Map(), text: async () => '' };
    };
    const client = new AclClient({ name: 'x', baseUrl: 'https://x' });
    await client.request({ path: '/p', idempotencyKey: 'idem-1', headers: { 'X-Custom': 'v' } });
    expect(captured.headers['User-Agent']).toMatch(/alawael-erp/);
    expect(captured.headers['Idempotency-Key']).toBe('idem-1');
    expect(captured.headers['X-Custom']).toBe('v');
    expect(captured.url).toBe('https://x/p');
  });
});
