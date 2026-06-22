'use strict';

/**
 * W1447 — CCTV event-bus wiring regression guard (W349 no-op class).
 *
 * BUG (pre-fix): 5 CCTV services bound `eventBus` to the MODULE EXPORT of
 * `services/quality/qualityEventBus.service` — which exposes `getDefault()`,
 * `createQualityEventBus()`, ... but NO `.emit` — then guarded every publish with
 * `if (eventBus?.emit) eventBus.emit('cctv.*', ...)`. Because the module has no
 * `.emit`, the optional chain was ALWAYS undefined → every CCTV emit was silently
 * skipped. This is the exact "W349" silent-no-op pattern documented in CLAUDE.md.
 *
 * FIX: resolve the singleton instance via `.getDefault()` (the pattern used by
 * blockchainCertService + the realtime gateway), so `eventBus.emit(...)` reaches the
 * bus every other quality producer/subscriber shares.
 */

const fs = require('fs');
const path = require('path');

const qm = require('../services/quality/qualityEventBus.service');

const CCTV_FILES = [
  'services/cctv/eventService.js',
  'services/cctv/alertService.js',
  'services/cctv/healthMonitor.service.js',
  'services/cctv/eventQueue.service.js',
  'services/cctv/ai/fallDetector.service.js',
];

describe('W1447 cctv event-bus wiring', () => {
  test('root cause: the module export has no .emit, but getDefault() returns a bus that does', () => {
    expect(typeof qm.emit).toBe('undefined'); // why the old `eventBus?.emit` was always falsy
    expect(typeof qm.getDefault).toBe('function');
    expect(typeof qm.getDefault().emit).toBe('function');
  });

  test('getDefault() bus actually delivers an emitted cctv.* event', async () => {
    const bus = qm.getDefault();
    const received = [];
    // QualityEventBus invokes listeners as fn(payload, name).
    const unsubscribe = bus.on('cctv.*', (payload, name) => received.push({ name, payload }));
    try {
      const res = await bus.emit('cctv.test.ping', { ok: true });
      expect(res.dispatched).toBeGreaterThanOrEqual(1);
      if (typeof bus.flush === 'function') await bus.flush();
    } finally {
      unsubscribe();
    }
    expect(received).toHaveLength(1);
    expect(received[0].name).toBe('cctv.test.ping');
    expect(received[0].payload).toEqual({ ok: true });
  });

  describe.each(CCTV_FILES)('%s', file => {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

    test('binds eventBus to the bus instance via getDefault()', () => {
      expect(src).toMatch(
        /eventBus\s*=\s*require\([^)]*qualityEventBus\.service['"]\)\.getDefault\(\)/
      );
    });

    test('does NOT bind eventBus to the bare module (the broken pattern)', () => {
      expect(src).not.toMatch(/eventBus\s*=\s*require\([^)]*qualityEventBus\.service['"]\)\s*;/);
    });
  });
});
