'use strict';

/**
 * cctv-http-agent-pool.test.js — Phase 27 scale-up.
 *
 * Verifies that the HTTP agent pool returns the same Node http.Agent
 * for the same origin (so keep-alive sockets are actually reused) and
 * separate agents per origin.
 */

jest.resetModules();
process.env.NODE_ENV = 'test';

const httpAgentPool = require('../services/cctv/adapter/httpAgentPool');

describe('httpAgentPool', () => {
  afterAll(() => httpAgentPool.destroyAll());

  test('same origin returns the same agent', () => {
    const a = httpAgentPool.for('10.0.0.1', 80, false);
    const b = httpAgentPool.for('10.0.0.1', 80, false);
    expect(a).toBe(b);
  });

  test('different ports yield different agents', () => {
    const a = httpAgentPool.for('10.0.0.1', 80, false);
    const b = httpAgentPool.for('10.0.0.1', 8080, false);
    expect(a).not.toBe(b);
  });

  test('http and https on same host yield different agents', () => {
    const a = httpAgentPool.for('10.0.0.2', 80, false);
    const b = httpAgentPool.for('10.0.0.2', 443, true);
    expect(a).not.toBe(b);
  });

  test('agents have keep-alive enabled', () => {
    const a = httpAgentPool.for('10.0.0.3', 80, false);
    expect(a.keepAlive).toBe(true);
  });

  test('snapshot reports origin count and per-agent stats', () => {
    httpAgentPool.for('10.0.0.4', 80, false);
    httpAgentPool.for('10.0.0.5', 443, true);
    const s = httpAgentPool.snapshot();
    expect(s.origins).toBeGreaterThanOrEqual(2);
    expect(typeof s.maxSockets).toBe('number');
  });
});
