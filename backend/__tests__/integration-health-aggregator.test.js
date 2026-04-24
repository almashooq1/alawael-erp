/**
 * integration-health-aggregator.test.js — covers the mission-control snapshot.
 *
 * Scenarios:
 *   • empty state: overall=healthy, all zeros, no open circuits
 *   • parked-net rises with park() and falls with resolve/discard
 *   • replay success/failure is counted correctly
 *   • idempotency totals + top-routes roll-up
 *   • overall=degraded on parkedNet >= 10
 *   • overall=critical on any open circuit
 *   • durationMs is recorded
 *   • adapter list covers all known providers
 */

'use strict';

const dlq = require('../infrastructure/deadLetterQueue');
const idemStore = require('../infrastructure/idempotencyStore');
const express = require('express');
const request = require('supertest');
const idempotency = require('../middleware/idempotency.middleware');

const { buildSnapshot, ADAPTER_NAMES } = require('../services/integrationHealthAggregator');

describe('integrationHealthAggregator', () => {
  beforeEach(() => {
    dlq.setStore(new dlq.InMemoryDeadLetterStore());
    dlq._resetCountersForTests();
    idemStore.setStore(new idemStore.InMemoryIdempotencyStore());
    idemStore._resetCountersForTests();
  });

  it('empty state — overall=healthy, all zeros', () => {
    const snap = buildSnapshot();
    expect(snap.overall).toBe('healthy');
    expect(snap.headline.parkedNet).toBe(0);
    expect(snap.headline.openCircuits).toBe(0);
    expect(snap.dlq.totals.parked).toBe(0);
    expect(snap.idempotency.totals.hit).toBe(0);
    expect(snap.idempotency.totals.miss).toBe(0);
    expect(snap.headline.dlqReplaySuccessRate).toBeNull();
    expect(snap.headline.idempotencyHitRate).toBeNull();
  });

  it('every known adapter is listed with mode + configured flag', () => {
    const snap = buildSnapshot();
    expect(snap.adapters).toHaveLength(ADAPTER_NAMES.length);
    const names = snap.adapters.map(a => a.name);
    for (const n of ADAPTER_NAMES) {
      expect(names).toContain(n);
    }
    for (const a of snap.adapters) {
      expect(typeof a.configured).toBe('boolean');
      expect(['mock', 'live', 'unknown']).toContain(a.mode);
    }
  });

  it('parkedNet = parked - resolved - discarded', async () => {
    for (let i = 0; i < 3; i++) await dlq.park({ integration: 'nafath', lastError: 'x' });
    let snap = buildSnapshot();
    expect(snap.dlq.totals.parked).toBe(3);
    expect(snap.headline.parkedNet).toBe(3);

    const parked = await dlq.park({ integration: 'nafath', lastError: 'y' });
    await dlq.replay(parked.id, async () => ({ ok: true }));
    snap = buildSnapshot();
    expect(snap.dlq.totals.resolved).toBe(1);
    expect(snap.dlq.totals.replay_success).toBe(1);
    expect(snap.headline.parkedNet).toBe(3); // 4 parked - 1 resolved
  });

  it('replay success rate is computed from replay_success vs replay_fail', async () => {
    const a = await dlq.park({ integration: 'zatca', lastError: 'x' });
    const b = await dlq.park({ integration: 'zatca', lastError: 'y' });
    const c = await dlq.park({ integration: 'zatca', lastError: 'z' });
    await dlq.replay(a.id, async () => ({ ok: true }));
    await dlq.replay(b.id, async () => ({ ok: true }));
    await dlq.replay(c.id, async () => {
      throw new Error('still down');
    });
    const snap = buildSnapshot();
    expect(snap.headline.dlqReplaySuccessRate).toBeCloseTo(2 / 3, 2);
  });

  it('overall=degraded once parkedNet crosses 10', async () => {
    for (let i = 0; i < 11; i++) await dlq.park({ integration: 'wasel', lastError: 'x' });
    const snap = buildSnapshot();
    expect(snap.overall).toBe('degraded');
  });

  it('overall=critical once parkedNet crosses 50', async () => {
    for (let i = 0; i < 51; i++) await dlq.park({ integration: 'wasel', lastError: 'x' });
    const snap = buildSnapshot();
    expect(snap.overall).toBe('critical');
  });

  it('idempotency counters roll up + topRoutes is sorted by traffic', async () => {
    const app = express();
    app.use(express.json());
    app.use(idempotency());
    app.post('/a', (_req, res) => res.status(201).json({ ok: true }));
    app.post('/b', (_req, res) => res.status(201).json({ ok: true }));

    const kA = 'key-a-aaaaaaaa';
    const kB = 'key-b-bbbbbbbb';
    // 3 traffic for /a (1 miss + 2 hits), 1 for /b
    await request(app).post('/a').set('Idempotency-Key', kA).send({});
    await request(app).post('/a').set('Idempotency-Key', kA).send({});
    await request(app).post('/a').set('Idempotency-Key', kA).send({});
    await request(app).post('/b').set('Idempotency-Key', kB).send({});

    const snap = buildSnapshot();
    expect(snap.idempotency.totals.hit + snap.idempotency.totals.miss).toBe(4);
    expect(snap.headline.idempotencyHitRate).toBeCloseTo(2 / 4, 2);
    expect(snap.idempotency.topRoutes[0].route).toMatch(/\/a$/);
  });

  it('durationMs is recorded and generatedAt is ISO', () => {
    const snap = buildSnapshot();
    expect(typeof snap.durationMs).toBe('number');
    expect(new Date(snap.generatedAt).toISOString()).toBe(snap.generatedAt);
  });
});
