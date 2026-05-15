'use strict';

/**
 * cctv-event-queue.test.js — Phase 27 scale-up.
 *
 * Verifies the batched ingestion queue: push/depth/capacity/snapshot/
 * backpressure. flush() is mocked end-to-end against a stubbed
 * CctvEvent.insertMany so we don't need MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';
process.env.CCTV_QUEUE_DISABLE = '1'; // we drive flush() manually
process.env.CCTV_QUEUE_CAPACITY = '50';
process.env.CCTV_QUEUE_BATCH = '5';

const eventQueue = require('../services/cctv/eventQueue.service');

describe('eventQueue', () => {
  beforeEach(() => eventQueue._reset());

  test('push appends to ring and bumps high watermark', () => {
    expect(eventQueue.depth()).toBe(0);
    for (let i = 0; i < 3; i++) {
      const r = eventQueue.push({
        eventId: `e${i}`,
        type: 'motion',
        cameraId: 'c',
        cameraCode: 'X',
        branchCode: 'B',
      });
      expect(r.ok).toBe(true);
    }
    expect(eventQueue.depth()).toBe(3);
    expect(eventQueue.snapshot().enqueued).toBe(3);
    expect(eventQueue.snapshot().highWatermark).toBe(3);
  });

  test('push refuses when capacity is reached and counts drops', () => {
    for (let i = 0; i < 50; i++) eventQueue.push({ eventId: `e${i}`, type: 'motion' });
    const r = eventQueue.push({ eventId: 'overflow', type: 'motion' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('QUEUE_FULL');
    expect(eventQueue.snapshot().dropped).toBe(1);
  });

  test('push rejects null docs without enqueueing', () => {
    const r = eventQueue.push(null);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NO_DOC');
    expect(eventQueue.depth()).toBe(0);
  });

  test('snapshot reflects env-driven config', () => {
    const s = eventQueue.snapshot();
    expect(s.capacity).toBe(50);
    expect(s.batchSize).toBe(5);
  });

  test('drain pops the ring without DB ready (errors swallowed)', async () => {
    for (let i = 0; i < 12; i++) eventQueue.push({ eventId: `e${i}`, type: 'motion' });
    await eventQueue.drain(10);
    // ring should be empty even though insertMany was unavailable
    expect(eventQueue.depth()).toBe(0);
  });
});
