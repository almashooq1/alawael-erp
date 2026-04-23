'use strict';

/**
 * quality-event-bus.test.js — Phase 13 Commit 5 (4.0.62).
 *
 * Pure in-memory tests for the QualityEventBus. No DB.
 */

process.env.NODE_ENV = 'test';

const { createQualityEventBus, _matches } = require('../services/quality/qualityEventBus.service');

describe('QualityEventBus _matches', () => {
  it('exact match', () => {
    expect(_matches('quality.review.closed', 'quality.review.closed')).toBe(true);
    expect(_matches('quality.review.closed', 'quality.review.open')).toBe(false);
  });

  it('star suffix matches prefix + descendants', () => {
    expect(_matches('quality.review.*', 'quality.review.closed')).toBe(true);
    expect(_matches('quality.review.*', 'quality.review.action.assigned')).toBe(true);
    expect(_matches('quality.review.*', 'quality.evidence.ingested')).toBe(false);
  });

  it('full wildcard matches everything', () => {
    expect(_matches('*', 'any.event.name')).toBe(true);
    expect(_matches('*', 'quality.x')).toBe(true);
  });

  it('prefix-only star matches top-level namespace', () => {
    expect(_matches('quality.*', 'quality.review.closed')).toBe(true);
    expect(_matches('quality.*', 'compliance.evidence.ingested')).toBe(false);
  });
});

describe('QualityEventBus', () => {
  it('delivers to exact-match subscriber', async () => {
    const bus = createQualityEventBus();
    const calls = [];
    bus.on('quality.review.closed', p => calls.push(p));
    await bus.emit('quality.review.closed', { id: 1 });
    await bus.flush();
    expect(calls).toEqual([{ id: 1 }]);
  });

  it('delivers to wildcard subscribers', async () => {
    const bus = createQualityEventBus();
    const allCalls = [];
    const reviewCalls = [];
    bus.on('*', p => allCalls.push(p));
    bus.on('quality.review.*', p => reviewCalls.push(p));
    await bus.emit('quality.review.closed', { id: 1 });
    await bus.emit('compliance.evidence.ingested', { id: 2 });
    await bus.flush();
    expect(allCalls).toHaveLength(2);
    expect(reviewCalls).toEqual([{ id: 1 }]);
  });

  it('unsubscribe stops delivery', async () => {
    const bus = createQualityEventBus();
    const calls = [];
    const off = bus.on('quality.review.closed', p => calls.push(p));
    await bus.emit('quality.review.closed', { id: 1 });
    off();
    await bus.emit('quality.review.closed', { id: 2 });
    await bus.flush();
    expect(calls).toEqual([{ id: 1 }]);
  });

  it('thrown listener does not break other listeners', async () => {
    const bus = createQualityEventBus({ logger: { warn: () => {}, info: () => {} } });
    const okCalls = [];
    bus.on('evt', () => {
      throw new Error('boom');
    });
    bus.on('evt', p => okCalls.push(p));
    await bus.emit('evt', { a: 1 });
    await bus.flush();
    expect(okCalls).toEqual([{ a: 1 }]);
  });

  it('flush awaits async listeners', async () => {
    const bus = createQualityEventBus();
    let done = false;
    bus.on('slow', async () => {
      await new Promise(r => setTimeout(r, 20));
      done = true;
    });
    await bus.emit('slow', {});
    await bus.flush();
    expect(done).toBe(true);
  });

  it('recent() returns newest-first + respects buffer size', async () => {
    const bus = createQualityEventBus({ recentBufferSize: 3 });
    await bus.emit('a', {});
    await bus.emit('b', {});
    await bus.emit('c', {});
    await bus.emit('d', {});
    const rec = bus.recent();
    expect(rec.map(r => r.name)).toEqual(['d', 'c', 'b']);
  });

  it('subscribers() reports current pattern counts', () => {
    const bus = createQualityEventBus();
    const o1 = bus.on('a.b', () => {});
    const o2 = bus.on('a.b', () => {});
    const o3 = bus.on('c.*', () => {});
    expect(bus.subscribers()).toEqual({ 'a.b': 2, 'c.*': 1 });
    o1();
    o2();
    o3();
    expect(bus.subscribers()).toEqual({});
  });

  it('drop-in dispatcher shape: emit returns { dispatched }', async () => {
    const bus = createQualityEventBus();
    bus.on('x', () => {});
    bus.on('x', () => {});
    const res = await bus.emit('x', {});
    expect(res).toEqual({ dispatched: 2 });
  });
});
