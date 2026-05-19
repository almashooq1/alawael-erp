/**
 * wave135-realtime-event-broker.test.js — Wave 135.
 *
 * In-process pub/sub broker + SSE adapter.
 */

'use strict';

const { createRealtimeEventBroker } = require('../intelligence/realtime-event-broker.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── subscribe + publish ───────────────────────────────────────

describe('realtime-event-broker — subscribe + publish', () => {
  test('publishes to a single matching subscriber', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const received = [];
    broker.subscribe({
      filter: { topic: 'attendance.daily-rollup' },
      onEvent: e => received.push(e),
    });
    const r = broker.publish({
      eventId: 'e1',
      topic: 'attendance.daily-rollup',
      payload: { employeeId: 'emp-1' },
    });
    expect(r.ok).toBe(true);
    expect(r.delivered).toBe(1);
    expect(received).toHaveLength(1);
    expect(received[0].payload.employeeId).toBe('emp-1');
  });

  test('non-matching topic filter drops the event for that sub', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const received = [];
    broker.subscribe({
      filter: { topic: 'attendance.exception.opened' },
      onEvent: e => received.push(e),
    });
    broker.publish({
      eventId: 'e1',
      topic: 'attendance.daily-rollup',
      payload: { x: 1 },
    });
    expect(received).toHaveLength(0);
  });

  test('branch filter narrows delivery', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const br1 = [];
    const br2 = [];
    broker.subscribe({
      filter: { branchId: 'br-1' },
      onEvent: e => br1.push(e),
    });
    broker.subscribe({
      filter: { branchId: 'br-2' },
      onEvent: e => br2.push(e),
    });
    broker.publish({
      eventId: 'e1',
      topic: 'X',
      payload: {},
      meta: { branchId: 'br-1' },
    });
    expect(br1).toHaveLength(1);
    expect(br2).toHaveLength(0);
  });

  test('multi-topic filter (array) accepts any of the listed topics', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const received = [];
    broker.subscribe({
      filter: { topic: ['a', 'b', 'c'] },
      onEvent: e => received.push(e),
    });
    broker.publish({ eventId: 'e1', topic: 'b', payload: {} });
    broker.publish({ eventId: 'e2', topic: 'z', payload: {} });
    expect(received).toHaveLength(1);
    expect(received[0].topic).toBe('b');
  });

  test('idempotent: same eventId publish twice → no double delivery', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const received = [];
    broker.subscribe({ onEvent: e => received.push(e) });
    const r1 = broker.publish({ eventId: 'e1', topic: 'X', payload: {} });
    const r2 = broker.publish({ eventId: 'e1', topic: 'X', payload: {} });
    expect(r1.delivered).toBe(1);
    expect(r2.idempotent).toBe(true);
    expect(r2.delivered).toBe(0);
    expect(received).toHaveLength(1);
  });

  test('subscriber with no filter receives everything', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const received = [];
    broker.subscribe({ onEvent: e => received.push(e) });
    broker.publish({ eventId: 'e1', topic: 't1', payload: {} });
    broker.publish({ eventId: 'e2', topic: 't2', payload: {} });
    expect(received).toHaveLength(2);
  });

  test('unsubscribe removes the subscriber', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const received = [];
    const { subscription } = broker.subscribe({ onEvent: e => received.push(e) });
    broker.publish({ eventId: 'e1', topic: 't', payload: {} });
    broker.unsubscribe(subscription);
    broker.publish({ eventId: 'e2', topic: 't', payload: {} });
    expect(received).toHaveLength(1);
  });

  test('missing onEvent rejected', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const r = broker.subscribe({ filter: { topic: 't' } });
    expect(r.ok).toBe(false);
  });

  test('missing topic on publish rejected', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const r = broker.publish({ eventId: 'e1', payload: {} });
    expect(r.ok).toBe(false);
  });
});

// ─── overflow backpressure ─────────────────────────────────────

describe('realtime-event-broker — buffer overflow', () => {
  test('overflow emits synthetic __overflow event', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT, bufferSize: 3 });
    const received = [];
    broker.subscribe({ onEvent: e => received.push(e) });
    for (let i = 0; i < 5; i++) {
      broker.publish({ eventId: `e-${i}`, topic: 't', payload: { i } });
    }
    // 5 published; buffer 3; 2 overflow events emitted alongside the normal ones.
    const overflows = received.filter(e => e.topic === '__overflow');
    expect(overflows.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── stats ──────────────────────────────────────────────────────

describe('realtime-event-broker — stats', () => {
  test('reports active subscriptions + recent event cache size', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    broker.subscribe({ onEvent: () => {} });
    broker.subscribe({ onEvent: () => {} });
    broker.publish({ eventId: 'e1', topic: 't', payload: {} });
    broker.publish({ eventId: 'e2', topic: 't', payload: {} });
    const s = broker.stats();
    expect(s.activeSubscriptions).toBe(2);
    expect(s.recentEventCacheSize).toBe(2);
  });
});

// ─── SSE adapter ───────────────────────────────────────────────

describe('realtime-event-broker — toSseHandler', () => {
  function buildFakeRes() {
    const chunks = [];
    return {
      statusCode: null,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      flushHeaders() {},
      write(s) {
        chunks.push(s);
      },
      end() {
        chunks.push('__END__');
      },
      _chunks: chunks,
    };
  }
  function buildFakeReq(query = {}) {
    return {
      query,
      _listeners: {},
      on(ev, cb) {
        this._listeners[ev] = cb;
      },
      _emit(ev) {
        if (this._listeners[ev]) this._listeners[ev]();
      },
    };
  }

  test('opens stream + writes headers + initial comment', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const handler = broker.toSseHandler({ heartbeatSeconds: 60 });
    const req = buildFakeReq({});
    const res = buildFakeRes();
    handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res._chunks[0]).toContain('stream-opened');
    req._emit('close');
  });

  test('publishes event arrives as SSE frame on the response', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const handler = broker.toSseHandler({ heartbeatSeconds: 60 });
    const req = buildFakeReq({});
    const res = buildFakeRes();
    handler(req, res);
    broker.publish({
      eventId: 'e-frame',
      topic: 'attendance.daily-rollup',
      payload: { employeeId: 'emp-1' },
    });
    const sseFrames = res._chunks.filter(c => typeof c === 'string' && c.startsWith('id:'));
    expect(sseFrames).toHaveLength(1);
    expect(sseFrames[0]).toContain('id: e-frame');
    expect(sseFrames[0]).toContain('event: attendance.daily-rollup');
    expect(sseFrames[0]).toContain('"employeeId":"emp-1"');
    req._emit('close');
  });

  test('authorize=false closes with 403', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const handler = broker.toSseHandler({ authorize: () => false });
    const req = buildFakeReq({});
    const res = buildFakeRes();
    handler(req, res);
    expect(res.statusCode).toBe(403);
    expect(res._chunks[res._chunks.length - 1]).toBe('__END__');
  });

  test('query topic filter applied to subscription', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const handler = broker.toSseHandler({ heartbeatSeconds: 60 });
    const req = buildFakeReq({ topic: 'attendance.exception.opened' });
    const res = buildFakeRes();
    handler(req, res);
    broker.publish({
      eventId: 'e1',
      topic: 'attendance.daily-rollup', // wrong topic
      payload: {},
    });
    broker.publish({
      eventId: 'e2',
      topic: 'attendance.exception.opened', // matches filter
      payload: {},
    });
    const frames = res._chunks.filter(c => typeof c === 'string' && c.startsWith('id:'));
    expect(frames).toHaveLength(1);
    expect(frames[0]).toContain('id: e2');
    req._emit('close');
  });

  test('req close triggers cleanup', () => {
    const broker = createRealtimeEventBroker({ logger: SILENT });
    const handler = broker.toSseHandler({ heartbeatSeconds: 60 });
    const req = buildFakeReq({});
    const res = buildFakeRes();
    handler(req, res);
    expect(broker.stats().activeSubscriptions).toBe(1);
    req._emit('close');
    expect(broker.stats().activeSubscriptions).toBe(0);
  });
});
