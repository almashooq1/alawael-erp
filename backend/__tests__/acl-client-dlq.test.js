/**
 * acl-client-dlq.test.js — covers the AclClient ↔ Dead Letter Queue handoff.
 *
 * Scenarios:
 *   • success path → no DLQ park
 *   • all retries exhausted → parks once with the expected entry shape
 *   • parkOnFailure=false → exhaustion still throws, but never parks
 *   • PII in payload / headers / meta is redacted before parking
 *   • idempotencyKey is captured in the parked entry
 *   • DLQ store failure must not shadow the original network error
 *   • circuit-breaker-open short-circuits before any park attempt
 */

'use strict';

const { AclClient, CircuitBreaker } = require('../integrations/_common/acl-client');

function makeRecordingDlq() {
  const entries = [];
  return {
    entries,
    async park(entry) {
      entries.push(entry);
    },
  };
}

function withMockedFetch(impl) {
  const original = globalThis.fetch;
  globalThis.fetch = jest.fn(impl);
  return () => {
    globalThis.fetch = original;
  };
}

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

describe('AclClient ↔ DeadLetterQueue', () => {
  let restoreFetch;

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = null;
    }
    jest.restoreAllMocks();
  });

  it('does not park on a successful 2xx response', async () => {
    restoreFetch = withMockedFetch(async () => ({
      status: 200,
      headers: new Map(),
      text: async () => '{"ok":true}',
    }));
    const dlq = makeRecordingDlq();
    const client = new AclClient({
      name: 'unit-success',
      baseUrl: 'https://example.test',
      retries: 0,
      logger: silentLogger,
      deadLetterQueue: dlq,
    });

    const res = await client.request({ method: 'GET', path: '/ping' });
    expect(res.status).toBe(200);
    expect(dlq.entries).toHaveLength(0);
  });

  it('parks once after exhausting retries on persistent 5xx', async () => {
    restoreFetch = withMockedFetch(async () => ({
      status: 503,
      headers: new Map(),
      text: async () => 'upstream down',
    }));
    const dlq = makeRecordingDlq();
    const client = new AclClient({
      name: 'unit-5xx',
      baseUrl: 'https://example.test',
      retries: 0,
      logger: silentLogger,
      deadLetterQueue: dlq,
    });

    await expect(
      client.request({
        method: 'POST',
        path: '/v1/sign',
        body: { docId: 'IRP-1' },
        idempotencyKey: 'k-1',
        meta: { operation: 'sign', correlationId: 'corr-1' },
      })
    ).rejects.toThrow(/HTTP 503/);

    expect(dlq.entries).toHaveLength(1);
    const parked = dlq.entries[0];
    expect(parked.integration).toBe('unit-5xx');
    expect(parked.method).toBe('POST');
    expect(parked.endpoint).toBe('https://example.test/v1/sign');
    expect(parked.idempotencyKey).toBe('k-1');
    expect(parked.correlationId).toBe('corr-1');
    expect(parked.operation).toBe('sign');
    expect(parked.attempts).toBe(1);
    expect(parked.lastError).toBeInstanceOf(Error);
  });

  it('parks once after exhausting retries on a network throw', async () => {
    restoreFetch = withMockedFetch(async () => {
      throw new Error('ECONNRESET');
    });
    const dlq = makeRecordingDlq();
    const client = new AclClient({
      name: 'unit-econnreset',
      baseUrl: 'https://example.test',
      retries: 0,
      logger: silentLogger,
      deadLetterQueue: dlq,
    });

    await expect(client.request({ path: '/x' })).rejects.toThrow(/ECONNRESET/);
    expect(dlq.entries).toHaveLength(1);
    expect(dlq.entries[0].lastError.message).toBe('ECONNRESET');
  });

  it('does not park when parkOnFailure=false', async () => {
    restoreFetch = withMockedFetch(async () => {
      throw new Error('boom');
    });
    const dlq = makeRecordingDlq();
    const client = new AclClient({
      name: 'unit-noPark',
      baseUrl: 'https://example.test',
      retries: 0,
      parkOnFailure: false,
      logger: silentLogger,
      deadLetterQueue: dlq,
    });

    await expect(client.request({ path: '/y' })).rejects.toThrow(/boom/);
    expect(dlq.entries).toHaveLength(0);
  });

  it('redacts PII inside payload, headers, and meta before parking', async () => {
    restoreFetch = withMockedFetch(async () => {
      throw new Error('upstream-fail');
    });
    const dlq = makeRecordingDlq();
    const client = new AclClient({
      name: 'unit-redact',
      baseUrl: 'https://example.test',
      retries: 0,
      logger: silentLogger,
      deadLetterQueue: dlq,
    });

    await expect(
      client.request({
        path: '/v1/verify',
        method: 'POST',
        body: { nationalId: '1234567890', password: 'p@ssw0rd', name: 'Ali' },
        headers: { Authorization: 'Bearer secret-token-xyz' },
        meta: { operation: 'verify', accessToken: 'tok-123' },
      })
    ).rejects.toThrow();

    expect(dlq.entries).toHaveLength(1);
    const parked = dlq.entries[0];

    const payloadStr = JSON.stringify(parked.payload || {});
    expect(payloadStr).not.toContain('1234567890');
    expect(payloadStr).not.toContain('p@ssw0rd');

    const headersStr = JSON.stringify(parked.headers || {});
    expect(headersStr).not.toContain('Bearer secret-token-xyz');

    const metaStr = JSON.stringify(parked.meta || {});
    expect(metaStr).not.toContain('tok-123');
    expect(parked.operation).toBe('verify');
  });

  it('does not let DLQ store failures shadow the original error', async () => {
    restoreFetch = withMockedFetch(async () => {
      throw new Error('original-network-failure');
    });
    const flakyDlq = {
      async park() {
        throw new Error('dlq-storage-down');
      },
    };
    const client = new AclClient({
      name: 'unit-flakyDlq',
      baseUrl: 'https://example.test',
      retries: 0,
      logger: silentLogger,
      deadLetterQueue: flakyDlq,
    });

    await expect(client.request({ path: '/z' })).rejects.toThrow(/original-network-failure/);
  });

  it('throws CIRCUIT_OPEN without parking when breaker is already open', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    breaker.recordFailure();
    expect(breaker.state).toBe('open');

    const fetchSpy = jest.fn();
    restoreFetch = withMockedFetch(fetchSpy);

    const dlq = makeRecordingDlq();
    const client = new AclClient({
      name: 'unit-circuitOpen',
      baseUrl: 'https://example.test',
      retries: 0,
      circuitBreaker: breaker,
      logger: silentLogger,
      deadLetterQueue: dlq,
    });

    await expect(client.request({ path: '/q' })).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dlq.entries).toHaveLength(0);
  });
});
