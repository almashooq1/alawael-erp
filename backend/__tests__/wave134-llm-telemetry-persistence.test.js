/**
 * wave134-llm-telemetry-persistence.test.js — Wave 134.
 *
 * Test sections:
 *   1. Persist-through: recordCall writes to model when configured
 *   2. Persist disabled when serviceName missing
 *   3. Persist failure does NOT block in-memory recording
 *   4. getPersistedTelemetry — aggregation over model rows
 *   5. getPersistedTelemetry — empty / since-only / until-only windows
 *   6. getPersistedTelemetry returns PERSIST_UNAVAILABLE when no model
 *   7. registry.getAllPersistedTelemetry — cross-service merge
 *   8. registry.getAllPersistedTelemetry — service without persistence
 *      surfaces as PERSIST_UNAVAILABLE in its slot
 *   9. Cost snapshot stored on each row matches service rates
 */

'use strict';

const { createLlmTelemetry } = require('../intelligence/llm-telemetry.lib');
const { createLlmRegistry } = require('../intelligence/llm-registry.lib');

const SILENT = { warn: () => {} };

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => state.t,
    advance: ms => {
      state.t += ms;
    },
  };
}

// Mock Mongoose-style model with `create` + `find`.
function buildPersistModel({ failOnCreate = false } = {}) {
  const store = [];
  return {
    create: async doc => {
      if (failOnCreate) throw new Error('forced create failure');
      store.push({ ...doc, _id: `id-${store.length + 1}` });
      return store[store.length - 1];
    },
    find: query => {
      let arr = store.slice();
      if (query?.serviceName) arr = arr.filter(r => r.serviceName === query.serviceName);
      if (query?.at?.$gte) {
        const min = new Date(query.at.$gte).getTime();
        arr = arr.filter(r => new Date(r.at).getTime() >= min);
      }
      if (query?.at?.$lte) {
        const max = new Date(query.at.$lte).getTime();
        arr = arr.filter(r => new Date(r.at).getTime() <= max);
      }
      return {
        lean: async () => arr.map(r => ({ ...r })),
        then: resolve => resolve(arr.map(r => ({ ...r }))),
      };
    },
    _store: store,
  };
}

// ─── 1. Persist-through ────────────────────────────────────────────

describe('createLlmTelemetry — persist-through', () => {
  test('recordCall also writes to model when configured', async () => {
    const model = buildPersistModel();
    const t = createLlmTelemetry({
      persistModel: model,
      serviceName: 'test-service',
      logger: SILENT,
    });
    t.recordCall({ source: 'llm', success: true, tokensIn: 100, tokensOut: 50 });
    // Persist is async — give it a tick.
    await new Promise(r => setImmediate(r));
    expect(model._store).toHaveLength(1);
    expect(model._store[0].serviceName).toBe('test-service');
    expect(model._store[0].source).toBe('llm');
    expect(model._store[0].tokensIn).toBe(100);
    expect(model._store[0].tokensOut).toBe(50);
    expect(model._store[0].costUsd).toBeCloseTo((100 * 0.8 + 50 * 4) / 1_000_000, 6);
  });

  test('persists each call variant (cache / reject / failure)', async () => {
    const model = buildPersistModel();
    const t = createLlmTelemetry({
      persistModel: model,
      serviceName: 'svc',
      logger: SILENT,
    });
    t.recordCall({ source: 'llm', success: true, tokensIn: 10, tokensOut: 5 });
    t.recordCall({ source: 'cache', success: true });
    t.recordCall({ source: 'reject', success: false, reason: 'MESSAGE_REQUIRED' });
    t.recordCall({ source: 'llm', success: false, reason: 'TIMEOUT' });
    await new Promise(r => setImmediate(r));
    expect(model._store).toHaveLength(4);
    expect(model._store.map(r => r.source)).toEqual(['llm', 'cache', 'reject', 'llm']);
    expect(model._store[2].reason).toBe('MESSAGE_REQUIRED');
    expect(model._store[3].reason).toBe('TIMEOUT');
  });
});

// ─── 2. Persist disabled when serviceName missing ─────────────────

describe('createLlmTelemetry — persist disabled', () => {
  test('does NOT write to model when serviceName is null', async () => {
    const model = buildPersistModel();
    const t = createLlmTelemetry({ persistModel: model, logger: SILENT });
    t.recordCall({ source: 'llm', success: true });
    await new Promise(r => setImmediate(r));
    expect(model._store).toHaveLength(0);
  });

  test('does NOT write when no model provided', async () => {
    const t = createLlmTelemetry({ serviceName: 'svc', logger: SILENT });
    expect(() => t.recordCall({ source: 'llm', success: true })).not.toThrow();
  });
});

// ─── 3. Persist failure isolation ─────────────────────────────────

describe('createLlmTelemetry — persist failure', () => {
  test('failing persist does NOT break in-memory recording', async () => {
    const model = buildPersistModel({ failOnCreate: true });
    const t = createLlmTelemetry({
      persistModel: model,
      serviceName: 'svc',
      logger: SILENT,
    });
    t.recordCall({ source: 'llm', success: true, tokensIn: 10, tokensOut: 5 });
    await new Promise(r => setImmediate(r));
    // In-memory still has the call.
    expect(t.size()).toBe(1);
    const r = t.getTelemetry();
    expect(r.totals.llmCalls).toBe(1);
  });
});

// ─── 4. getPersistedTelemetry aggregation ─────────────────────────

describe('getPersistedTelemetry — aggregation', () => {
  test('aggregates rows from the model', async () => {
    const clock = makeClock();
    const model = buildPersistModel();
    const t = createLlmTelemetry({
      persistModel: model,
      serviceName: 'svc',
      logger: SILENT,
      now: clock.now,
    });
    t.recordCall({ source: 'llm', success: true, tokensIn: 100, tokensOut: 50 });
    t.recordCall({ source: 'cache', success: true });
    t.recordCall({ source: 'llm', success: false, reason: 'TIMEOUT' });
    await new Promise(r => setImmediate(r));
    const result = await t.getPersistedTelemetry({});
    expect(result.ok).toBe(true);
    expect(result.totals.calls).toBe(3);
    expect(result.totals.llmCalls).toBe(1);
    expect(result.totals.cacheHits).toBe(1);
    expect(result.totals.failures).toBe(1);
    expect(result.byReason.TIMEOUT).toBe(1);
  });

  test('respects since + until window', async () => {
    const clock = makeClock();
    const model = buildPersistModel();
    const t = createLlmTelemetry({
      persistModel: model,
      serviceName: 'svc',
      logger: SILENT,
      now: clock.now,
    });
    t.recordCall({ source: 'llm', success: true, tokensIn: 50, tokensOut: 25 });
    clock.advance(5 * 3600 * 1000);
    const cutoff = new Date(clock.now()).toISOString();
    clock.advance(3600 * 1000);
    t.recordCall({ source: 'llm', success: true, tokensIn: 200, tokensOut: 100 });
    await new Promise(r => setImmediate(r));
    const result = await t.getPersistedTelemetry({ since: cutoff });
    expect(result.ok).toBe(true);
    expect(result.totals.calls).toBe(1);
    expect(result.totals.tokensIn).toBe(200);
  });
});

// ─── 5. getPersistedTelemetry empty ───────────────────────────────

describe('getPersistedTelemetry — empty / degraded', () => {
  test('empty result still returns ok:true with zero totals', async () => {
    const t = createLlmTelemetry({
      persistModel: buildPersistModel(),
      serviceName: 'svc',
      logger: SILENT,
    });
    const r = await t.getPersistedTelemetry({});
    expect(r.ok).toBe(true);
    expect(r.totals.calls).toBe(0);
    expect(r.totals.costUsd).toBe(0);
  });

  test('returns PERSIST_UNAVAILABLE when no model configured', async () => {
    const t = createLlmTelemetry({ logger: SILENT });
    const r = await t.getPersistedTelemetry({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('PERSIST_UNAVAILABLE');
  });

  test('returns PERSIST_QUERY_FAILED when model.find throws', async () => {
    const brokenModel = {
      create: async () => ({}),
      find: () => {
        throw new Error('db down');
      },
    };
    const t = createLlmTelemetry({
      persistModel: brokenModel,
      serviceName: 'svc',
      logger: SILENT,
    });
    const r = await t.getPersistedTelemetry({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('PERSIST_QUERY_FAILED');
  });
});

// ─── 6. Registry getAllPersistedTelemetry ─────────────────────────

describe('registry.getAllPersistedTelemetry', () => {
  test('cross-service merge over persisted storage', async () => {
    const m1 = buildPersistModel();
    const m2 = buildPersistModel();
    const t1 = createLlmTelemetry({
      persistModel: m1,
      serviceName: 'chatbot',
      logger: SILENT,
    });
    const t2 = createLlmTelemetry({
      persistModel: m2,
      serviceName: 'care-plan',
      inputUsdPer1M: 15,
      outputUsdPer1M: 75,
      logger: SILENT,
    });
    t1.recordCall({ source: 'llm', success: true, tokensIn: 100, tokensOut: 50 });
    t2.recordCall({ source: 'llm', success: true, tokensIn: 200, tokensOut: 100 });
    await new Promise(r => setImmediate(r));

    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('chatbot', t1);
    reg.register('care-plan', t2);
    const r = await reg.getAllPersistedTelemetry({});
    expect(r.ok).toBe(true);
    expect(r.source).toBe('persisted');
    expect(r.merged.totals.calls).toBe(2);
    expect(r.merged.totals.tokensIn).toBe(300);
    expect(r.services.chatbot.ok).toBe(true);
    expect(r.services['care-plan'].ok).toBe(true);
  });

  test('service without persistence surfaces as PERSIST_UNAVAILABLE', async () => {
    const inMemoryOnly = createLlmTelemetry({ logger: SILENT });
    inMemoryOnly.recordCall({ source: 'llm', success: true });
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('no-persist', inMemoryOnly);
    const r = await reg.getAllPersistedTelemetry({});
    expect(r.services['no-persist'].ok).toBe(false);
    expect(r.services['no-persist'].reason).toBe('PERSIST_UNAVAILABLE');
    expect(r.merged.totals.calls).toBe(0);
  });

  test('service missing getPersistedTelemetry surfaces as PERSIST_UNAVAILABLE', async () => {
    const oldService = {
      getTelemetry: () => ({ ok: true, totals: {} }),
      // No getPersistedTelemetry — pre-Wave-134 service.
    };
    const reg = createLlmRegistry({ logger: SILENT });
    reg.register('legacy', oldService);
    const r = await reg.getAllPersistedTelemetry({});
    expect(r.services.legacy.ok).toBe(false);
    expect(r.services.legacy.reason).toBe('PERSIST_UNAVAILABLE');
  });
});

// ─── 7. Cost snapshot ─────────────────────────────────────────────

describe('Cost snapshot on persisted rows', () => {
  test('cost is computed + stored at write-time using service rates', async () => {
    const model = buildPersistModel();
    const t = createLlmTelemetry({
      persistModel: model,
      serviceName: 'opus',
      inputUsdPer1M: 15,
      outputUsdPer1M: 75,
      logger: SILENT,
    });
    t.recordCall({ source: 'llm', success: true, tokensIn: 1_000_000, tokensOut: 500_000 });
    await new Promise(r => setImmediate(r));
    expect(model._store[0].costUsd).toBeCloseTo(15 + 37.5, 4);
  });
});
