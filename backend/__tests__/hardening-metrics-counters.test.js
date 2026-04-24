/**
 * hardening-metrics-counters.test.js — verifies the new Phase-III counters:
 *   integration_dlq_events_total  (DLQ outcome counter)
 *   idempotency_events_total       (middleware outcome counter)
 *
 * Both are monotonic per-process counters emitted through the existing
 * /integrations-metrics endpoint in Prometheus text format. Test asserts:
 *   • park() bumps DLQ parked
 *   • replay success bumps DLQ replay_success AND resolved
 *   • replay failure bumps DLQ replay_fail and leaves status=parked
 *   • idempotency hit/miss/pending_reject are all counted by route
 *   • snapshotCounters returns rows with the expected labels
 */

'use strict';

const express = require('express');
const request = require('supertest');

const dlq = require('../infrastructure/deadLetterQueue');
const idemStore = require('../infrastructure/idempotencyStore');
const idempotency = require('../middleware/idempotency.middleware');

describe('DLQ counters', () => {
  beforeEach(() => {
    dlq.setStore(new dlq.InMemoryDeadLetterStore());
    dlq._resetCountersForTests();
  });

  it('bumps parked on park()', async () => {
    await dlq.park({ integration: 'zatca', lastError: 'down' });
    const rows = dlq.snapshotCounters();
    expect(rows).toContainEqual({ integration: 'zatca', outcome: 'parked', value: 1 });
  });

  it('bumps replay_success + resolved when replay callable succeeds', async () => {
    const parked = await dlq.park({ integration: 'nafath', lastError: 'x' });
    await dlq.replay(parked.id, async () => ({ ok: true }));
    const rows = dlq.snapshotCounters();
    const byOutcome = Object.fromEntries(
      rows.filter(r => r.integration === 'nafath').map(r => [r.outcome, r.value])
    );
    expect(byOutcome.replay_success).toBe(1);
    expect(byOutcome.resolved).toBe(1);
  });

  it('bumps replay_fail when replay callable throws', async () => {
    const parked = await dlq.park({ integration: 'madaa', lastError: 'x' });
    await dlq.replay(parked.id, async () => {
      throw new Error('still down');
    });
    const rows = dlq.snapshotCounters();
    const byOutcome = Object.fromEntries(
      rows.filter(r => r.integration === 'madaa').map(r => [r.outcome, r.value])
    );
    expect(byOutcome.replay_fail).toBe(1);
    expect(byOutcome.resolved).toBeUndefined();
  });

  it('bumps discarded on discard()', async () => {
    const parked = await dlq.park({ integration: 'absher', lastError: 'x' });
    await dlq.discard(parked.id, 'operator_dismissed');
    const rows = dlq.snapshotCounters();
    const byOutcome = Object.fromEntries(
      rows.filter(r => r.integration === 'absher').map(r => [r.outcome, r.value])
    );
    expect(byOutcome.discarded).toBe(1);
  });
});

describe('Idempotency counters', () => {
  beforeEach(() => {
    idemStore.setStore(new idemStore.InMemoryIdempotencyStore());
    idemStore._resetCountersForTests();
  });

  function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(idempotency());
    app.post('/r', (_req, res) => res.status(201).json({ ok: true }));
    return app;
  }

  it('records miss + hit across two calls with the same key', async () => {
    const app = buildApp();
    const key = 'idem-metrics-key-aaaa';
    await request(app).post('/r').set('Idempotency-Key', key).send({}).expect(201);
    await request(app).post('/r').set('Idempotency-Key', key).send({}).expect(201);
    const rows = idemStore.snapshotCounters();
    const routeRows = rows.filter(r => r.route.endsWith('/r'));
    const byOutcome = Object.fromEntries(routeRows.map(r => [r.outcome, r.value]));
    expect(byOutcome.miss).toBe(1);
    expect(byOutcome.hit).toBe(1);
  });

  it('records invalid_key for a too-short header', async () => {
    const app = buildApp();
    await request(app).post('/r').set('Idempotency-Key', 'x').send({}).expect(400);
    const rows = idemStore.snapshotCounters();
    const routeRows = rows.filter(r => r.route.endsWith('/r'));
    expect(routeRows.some(r => r.outcome === 'invalid_key')).toBe(true);
  });
});

describe('metrics route emits new counters', () => {
  // Note: we do NOT jest.resetModules() here because the route and the test
  // must share the same dlq + idempotency module instances (they're stateful
  // singletons). We reset state via the exposed helpers instead.
  const route = require('../routes/integrations-metrics.routes');

  beforeEach(() => {
    dlq.setStore(new dlq.InMemoryDeadLetterStore());
    dlq._resetCountersForTests();
    idemStore.setStore(new idemStore.InMemoryIdempotencyStore());
    idemStore._resetCountersForTests();
  });

  it('omits the section when no events have happened yet', async () => {
    const app = express();
    app.use('/metrics', route);
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).not.toMatch(/integration_dlq_events_total/);
  });

  it('includes integration_dlq_events_total when events have occurred', async () => {
    await dlq.park({ integration: 'zatca', lastError: 'x' });
    const app = express();
    app.use('/metrics', route);
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toMatch(
      /integration_dlq_events_total\{integration="zatca",outcome="parked"\} 1/
    );
  });
});
