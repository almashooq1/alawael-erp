/**
 * wave131-llm-registry.test.js — Wave 131 / cross-service LLM ops.
 *
 * Test sections:
 *   1. register/unregister/list/size
 *   2. _validate rejects bad inputs
 *   3. getAllTelemetry happy path — merges totals across services
 *   4. getAllTelemetry — service throwing is isolated
 *   5. getAllTelemetry — services returning ok:false skip aggregation
 *   6. Merged rates (cacheHitRate / fallbackRate / failureRate)
 *   7. Merged byReason + byIntent
 *   8. avgLatencyMs is call-count-weighted across services
 *   9. Default-registry singleton behavior
 */

'use strict';

const {
  createLlmRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
} = require('../intelligence/llm-registry.lib');
const { createLlmTelemetry } = require('../intelligence/llm-telemetry.lib');

const SILENT = { warn: () => {} };

function fakeService(getTelemetryImpl) {
  return { getTelemetry: getTelemetryImpl };
}

// ─── 1. register / unregister / list ───────────────────────────────

describe('createLlmRegistry — register/unregister/list', () => {
  test('register adds + list returns sorted names', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register(
      'beta',
      fakeService(() => ({ ok: true, totals: {} }))
    );
    reg.register(
      'alpha',
      fakeService(() => ({ ok: true, totals: {} }))
    );
    expect(reg.list()).toEqual(['alpha', 'beta']);
    expect(reg._size()).toBe(2);
  });

  test('unregister returns removed:true when present, false when missing', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register(
      'svc',
      fakeService(() => ({ ok: true, totals: {} }))
    );
    expect(reg.unregister('svc').removed).toBe(true);
    expect(reg.unregister('svc').removed).toBe(false);
  });

  test('getService returns the registered instance', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    const svc = fakeService(() => ({ ok: true, totals: {} }));
    reg.register('svc', svc);
    expect(reg.getService('svc')).toBe(svc);
    expect(reg.getService('missing')).toBeNull();
  });

  test('reset clears all', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register(
      'a',
      fakeService(() => ({ ok: true }))
    );
    reg.register(
      'b',
      fakeService(() => ({ ok: true }))
    );
    reg.reset();
    expect(reg._size()).toBe(0);
  });
});

// ─── 2. validation ─────────────────────────────────────────────────

describe('createLlmRegistry — validation', () => {
  test('rejects empty name', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    expect(() =>
      reg.register(
        '',
        fakeService(() => ({}))
      )
    ).toThrow(/name/);
  });

  test('rejects service without getTelemetry', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    expect(() => reg.register('svc', { foo: 1 })).toThrow(/getTelemetry/);
  });

  test('rejects non-function getTelemetry', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    expect(() => reg.register('svc', { getTelemetry: 'oops' })).toThrow(/getTelemetry/);
  });
});

// ─── 3. getAllTelemetry — happy path ───────────────────────────────

describe('createLlmRegistry — getAllTelemetry merges totals', () => {
  test('sums calls + tokens + cost across services', () => {
    const t1 = createLlmTelemetry();
    const t2 = createLlmTelemetry({ inputUsdPer1M: 15, outputUsdPer1M: 75 });
    t1.recordCall({ source: 'llm', success: true, tokensIn: 100, tokensOut: 50 });
    t2.recordCall({ source: 'llm', success: true, tokensIn: 200, tokensOut: 100 });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('chatbot', { getTelemetry: opts => t1.getTelemetry(opts) });
    reg.register('care-plan', { getTelemetry: opts => t2.getTelemetry(opts) });
    const r = reg.getAllTelemetry();
    expect(r.ok).toBe(true);
    expect(r.serviceCount).toBe(2);
    expect(r.merged.totals.calls).toBe(2);
    expect(r.merged.totals.tokensIn).toBe(300);
    expect(r.merged.totals.tokensOut).toBe(150);
    // chatbot Haiku: 100×$0.80/1M + 50×$4/1M = $0.00028
    // care-plan Opus: 200×$15/1M + 100×$75/1M = $0.0105
    // Total: $0.01078
    expect(r.merged.totals.costUsd).toBeCloseTo(0.01078, 4);
    expect(r.services.chatbot.ok).toBe(true);
    expect(r.services['care-plan'].ok).toBe(true);
  });

  test('empty registry returns zero totals + empty services', () => {
    const reg = createLlmRegistry({ logger: SILENT });
    const r = reg.getAllTelemetry();
    expect(r.ok).toBe(true);
    expect(r.serviceCount).toBe(0);
    expect(r.merged.totals.calls).toBe(0);
    expect(r.merged.totals.costUsd).toBe(0);
  });
});

// ─── 4. Isolation when a service throws ────────────────────────────

describe('createLlmRegistry — error isolation', () => {
  test('throwing service does not break the rest of the aggregation', () => {
    const t1 = createLlmTelemetry();
    t1.recordCall({ source: 'llm', success: true, tokensIn: 50, tokensOut: 25 });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('good', { getTelemetry: opts => t1.getTelemetry(opts) });
    reg.register('broken', {
      getTelemetry: () => {
        throw new Error('boom');
      },
    });
    const r = reg.getAllTelemetry();
    expect(r.serviceCount).toBe(2);
    expect(r.services.good.ok).toBe(true);
    expect(r.services.broken.ok).toBe(false);
    expect(r.services.broken.reason).toBe('TELEMETRY_THREW');
    expect(r.merged.totals.calls).toBe(1); // only good counted
  });
});

// ─── 5. ok:false services skipped from merge ───────────────────────

describe('createLlmRegistry — ok:false services', () => {
  test('services returning ok:false are surfaced but skipped from merge', () => {
    const t1 = createLlmTelemetry();
    t1.recordCall({ source: 'llm', success: true, tokensIn: 100, tokensOut: 50 });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('good', { getTelemetry: opts => t1.getTelemetry(opts) });
    reg.register('disabled', {
      getTelemetry: () => ({ ok: false, reason: 'LLM_UNAVAILABLE' }),
    });
    const r = reg.getAllTelemetry();
    expect(r.services.disabled.ok).toBe(false);
    expect(r.merged.totals.calls).toBe(1);
  });
});

// ─── 6. Merged rates ──────────────────────────────────────────────

describe('createLlmRegistry — merged rates', () => {
  test('cacheHitRate + fallbackRate + failureRate computed correctly', () => {
    const t1 = createLlmTelemetry();
    const t2 = createLlmTelemetry();
    t1.recordCall({ source: 'llm', success: true });
    t1.recordCall({ source: 'cache', success: true });
    t2.recordCall({ source: 'llm', success: false, reason: 'TIMEOUT' });
    t2.recordCall({ source: 'reject', success: false, reason: 'MISSING' });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('a', { getTelemetry: opts => t1.getTelemetry(opts) });
    reg.register('b', { getTelemetry: opts => t2.getTelemetry(opts) });
    const r = reg.getAllTelemetry();
    expect(r.merged.totals.calls).toBe(4);
    expect(r.merged.totals.cacheHits).toBe(1);
    expect(r.merged.totals.failures).toBe(1);
    expect(r.merged.totals.rejects).toBe(1);
    expect(r.merged.totals.cacheHitRate).toBeCloseTo(0.25, 4);
    expect(r.merged.totals.fallbackRate).toBeCloseTo(0.5, 4);
    expect(r.merged.totals.failureRate).toBeCloseTo(0.25, 4);
  });
});

// ─── 7. byReason + byIntent merged ────────────────────────────────

describe('createLlmRegistry — merged byReason + byIntent', () => {
  test('reasons sum across services', () => {
    const t1 = createLlmTelemetry();
    const t2 = createLlmTelemetry();
    t1.recordCall({ source: 'llm', success: false, reason: 'TIMEOUT' });
    t2.recordCall({ source: 'llm', success: false, reason: 'TIMEOUT' });
    t2.recordCall({ source: 'reject', success: false, reason: 'CLIENT_MISSING' });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('a', { getTelemetry: opts => t1.getTelemetry(opts) });
    reg.register('b', { getTelemetry: opts => t2.getTelemetry(opts) });
    const r = reg.getAllTelemetry();
    expect(r.merged.byReason.TIMEOUT).toBe(2);
    expect(r.merged.byReason.CLIENT_MISSING).toBe(1);
  });

  test('intents sum across services', () => {
    const t1 = createLlmTelemetry();
    const t2 = createLlmTelemetry();
    t1.recordCall({ source: 'llm', success: true, intent: 'greeting' });
    t2.recordCall({ source: 'llm', success: true, intent: 'greeting' });
    t2.recordCall({ source: 'llm', success: true, intent: 'appointment.next' });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('a', { getTelemetry: opts => t1.getTelemetry(opts) });
    reg.register('b', { getTelemetry: opts => t2.getTelemetry(opts) });
    const r = reg.getAllTelemetry();
    expect(r.merged.byIntent.greeting).toBe(2);
    expect(r.merged.byIntent['appointment.next']).toBe(1);
  });
});

// ─── 8. Call-count-weighted avgLatency ────────────────────────────

describe('createLlmRegistry — weighted avgLatency', () => {
  test('weighted by per-service llmCalls', () => {
    const t1 = createLlmTelemetry();
    const t2 = createLlmTelemetry();
    // chatbot: 3 calls @ 100ms each → avg 100, weight 3
    for (let i = 0; i < 3; i++) {
      t1.recordCall({ source: 'llm', success: true, elapsedMs: 100 });
    }
    // care-plan: 1 call @ 500ms → avg 500, weight 1
    t2.recordCall({ source: 'llm', success: true, elapsedMs: 500 });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('a', { getTelemetry: opts => t1.getTelemetry(opts) });
    reg.register('b', { getTelemetry: opts => t2.getTelemetry(opts) });
    const r = reg.getAllTelemetry();
    // weighted: (100*3 + 500*1) / 4 = 200
    expect(r.merged.totals.avgLatencyMs).toBe(200);
  });
});

// ─── 9. Default-registry singleton ────────────────────────────────

describe('getDefaultRegistry', () => {
  beforeEach(() => resetDefaultRegistry());

  test('returns the same instance on subsequent calls', () => {
    const a = getDefaultRegistry({ logger: SILENT });
    const b = getDefaultRegistry({ logger: SILENT });
    expect(a).toBe(b);
  });

  test('resetDefaultRegistry clears the singleton', () => {
    const a = getDefaultRegistry({ logger: SILENT });
    resetDefaultRegistry();
    const c = getDefaultRegistry({ logger: SILENT });
    expect(c).not.toBe(a);
  });
});
