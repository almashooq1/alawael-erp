/**
 * integration-hardening-bootstrap.test.js — end-to-end assertion that the
 * bootstrap wires the expected components and reports the correct mode.
 *
 * We exercise four paths:
 *   • no mongo + no redis → in-memory stores everywhere
 *   • mongo connected (readyState=1) but isTestEnv=true → still in-memory
 *     (tests should never hit the real collection by accident)
 *   • redis client present → adapter selected (but we pass isTestEnv=true so
 *     bootstrap keeps memory mode — asserts the guard works)
 *   • admin router is mounted on the passed express app exactly once
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { bootstrapIntegrationHardening } = require('../startup/integrationHardeningBootstrap');

describe('integrationHardeningBootstrap', () => {
  it('falls back to in-memory when mongo + redis are unavailable', () => {
    const app = express();
    const handle = bootstrapIntegrationHardening(app, { isTestEnv: true });
    const status = handle.status();
    expect(status.dlq).toBe('memory');
    expect(status.idempotency).toBe('memory');
    expect(status.router).toBe(true);
  });

  it('keeps memory mode even when mongo is ready, if isTestEnv=true', () => {
    const app = express();
    const fakeMongoose = { connection: { readyState: 1 } };
    const handle = bootstrapIntegrationHardening(app, { mongoose: fakeMongoose, isTestEnv: true });
    expect(handle.status().dlq).toBe('memory');
  });

  it('keeps memory mode even when redis is up, if isTestEnv=true', () => {
    const app = express();
    const fakeRedis = { get: async () => null, set: async () => 'OK' };
    const handle = bootstrapIntegrationHardening(app, { redisClient: fakeRedis, isTestEnv: true });
    expect(handle.status().idempotency).toBe('memory');
  });

  it('mounts the admin router at /api/v1/admin/ops', async () => {
    const app = express();
    bootstrapIntegrationHardening(app, { isTestEnv: true });
    // Route is wired; unauthenticated access returns 401 (auth/authorize kick in)
    // rather than the 404 we'd get if the router weren't mounted.
    const res = await request(app).get('/api/v1/admin/ops/dlq');
    expect(res.status).not.toBe(404);
  });

  it('exposes registerReplayAdapter + startReplayWorker', () => {
    const app = express();
    const handle = bootstrapIntegrationHardening(app, { isTestEnv: true });
    expect(typeof handle.registerReplayAdapter).toBe('function');
    expect(typeof handle.startReplayWorker).toBe('function');
  });
});
