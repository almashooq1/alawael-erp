/**
 * wave126-parent-chatbot-telemetry.test.js — Wave 126 / P3.6 cost
 * + observability monitoring.
 *
 * Test sections:
 *   1. _recordCall semantics (success/cache/reject/failure)
 *   2. Rolling-window pruning (age + count)
 *   3. getTelemetry totals + cost estimate
 *   4. getTelemetry buckets
 *   5. resetTelemetry clears state
 *   6. Service-level passthrough (getLlmStats)
 *   7. getLlmStats degraded path when LLM not wired
 */

'use strict';

const reg = require('../intelligence/parent-chatbot.registry');
const { createParentChatbotLlmService } = require('../intelligence/parent-chatbot-llm.service');
const { createParentChatbotService } = require('../intelligence/parent-chatbot.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => state.t,
    advance: ms => {
      state.t += ms;
    },
  };
}

function mockClient(replies, errors = []) {
  let i = 0;
  return {
    messages: {
      create: jest.fn(async () => {
        if (errors[i]) {
          const e = errors[i++];
          throw e;
        }
        const r = replies[i] || {
          content: [{ type: 'text', text: '{"intent":"unknown","confidence":0.1}' }],
          usage: { input_tokens: 40, output_tokens: 10 },
        };
        i++;
        return r;
      }),
    },
  };
}

function buildSessionModel() {
  const store = [];
  function M(data) {
    Object.assign(this, data);
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.findOne = q => ({
    lean: async () => {
      const f = store.find(p => p.sessionId === q.sessionId);
      return f ? { ...f } : null;
    },
    then: resolve => resolve(store.find(p => p.sessionId === q.sessionId) || null),
  });
  M.updateOne = async () => ({ modifiedCount: 0 });
  return M;
}

// ─── 1. _recordCall semantics ──────────────────────────────────────

describe('telemetry — call classification', () => {
  test('successful LLM call records source=llm with token counts', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 50, output_tokens: 15 },
      },
    ]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hello');
    const t = svc.getTelemetry();
    expect(t.totals.llmCalls).toBe(1);
    expect(t.totals.tokensIn).toBe(50);
    expect(t.totals.tokensOut).toBe(15);
    expect(t.totals.failures).toBe(0);
  });

  test('cache hit on repeat records source=cache, no LLM call counted', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 50, output_tokens: 15 },
      },
    ]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hello');
    await svc.classify('hello'); // same → cache hit
    const t = svc.getTelemetry();
    expect(t.totals.llmCalls).toBe(1);
    expect(t.totals.cacheHits).toBe(1);
    expect(t.totals.calls).toBe(2);
  });

  test('empty message records as reject', async () => {
    const svc = createParentChatbotLlmService({ client: mockClient([]), logger: SILENT });
    await svc.classify('');
    const t = svc.getTelemetry();
    expect(t.totals.rejects).toBe(1);
    expect(t.byReason.MESSAGE_REQUIRED).toBe(1);
  });

  test('LLM error records as failure with reason', async () => {
    const client = mockClient([{ content: [{ type: 'text', text: 'malformed' }] }]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hello');
    const t = svc.getTelemetry();
    expect(t.totals.failures).toBe(1);
    expect(t.byReason.INVALID_RESPONSE).toBe(1);
  });

  test('CLIENT_MISSING (no client wired) records as reject', async () => {
    const svc = createParentChatbotLlmService({ logger: SILENT });
    await svc.classify('hello');
    const t = svc.getTelemetry();
    expect(t.totals.rejects).toBe(1);
    expect(t.byReason.CLIENT_MISSING).toBe(1);
  });
});

// ─── 2. Rolling-window pruning ─────────────────────────────────────

describe('telemetry — pruning', () => {
  test('age-based pruning drops entries older than telemetryWindowMs', async () => {
    const clock = makeClock();
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 30, output_tokens: 10 },
      },
      {
        content: [{ type: 'text', text: '{"intent":"clinic.hours","confidence":0.8}' }],
        usage: { input_tokens: 35, output_tokens: 12 },
      },
    ]);
    const svc = createParentChatbotLlmService({
      client,
      telemetryWindowMs: 1000,
      logger: SILENT,
      now: clock.now,
    });
    await svc.classify('hi');
    clock.advance(2000); // past window
    await svc.classify('hours');
    expect(svc._telemetrySize()).toBe(1); // first one pruned
  });

  test('count-based pruning enforces telemetryMaxCalls', async () => {
    const replies = Array.from({ length: 10 }, (_, i) => ({
      content: [{ type: 'text', text: `{"intent":"greeting","confidence":${0.5 + i * 0.04}}` }],
      usage: { input_tokens: 20, output_tokens: 5 },
    }));
    const svc = createParentChatbotLlmService({
      client: mockClient(replies),
      telemetryMaxCalls: 3,
      logger: SILENT,
    });
    for (let i = 0; i < 10; i++) {
      await svc.classify(`msg-${i}`); // unique messages — no cache reuse
    }
    expect(svc._telemetrySize()).toBe(3);
  });
});

// ─── 3. getTelemetry totals + cost ─────────────────────────────────

describe('telemetry — totals + cost', () => {
  test('cost estimate uses default Haiku pricing', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      },
    ]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hello');
    const t = svc.getTelemetry();
    // 1M input @ $0.80 + 1M output @ $4 = $4.80
    expect(t.totals.costUsd).toBeCloseTo(4.8, 4);
  });

  test('custom pricing is honored', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      },
    ]);
    const svc = createParentChatbotLlmService({
      client,
      inputUsdPer1M: 10,
      outputUsdPer1M: 100,
      logger: SILENT,
    });
    await svc.classify('hi');
    const t = svc.getTelemetry();
    // 100 * 10/1M + 50 * 100/1M = 0.001 + 0.005 = 0.006
    expect(t.totals.costUsd).toBeCloseTo(0.006, 6);
  });

  test('cacheHitRate + fallbackRate + failureRate computed correctly', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 20, output_tokens: 5 },
      },
      { content: [{ type: 'text', text: 'malformed' }] }, // INVALID_RESPONSE → failure
    ]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hello');
    await svc.classify('hello'); // cache hit
    await svc.classify('weird'); // failure
    await svc.classify(''); // reject
    const t = svc.getTelemetry();
    expect(t.totals.calls).toBe(4);
    expect(t.totals.cacheHits).toBe(1);
    expect(t.totals.failures).toBe(1);
    expect(t.totals.rejects).toBe(1);
    expect(t.totals.llmCalls).toBe(1);
    expect(t.totals.cacheHitRate).toBeCloseTo(0.25, 4);
    expect(t.totals.fallbackRate).toBeCloseTo(0.5, 4); // 2 of 4
    expect(t.totals.failureRate).toBeCloseTo(0.25, 4);
  });

  test('avgLatencyMs from successful LLM calls only', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      },
    ]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hello');
    const t = svc.getTelemetry();
    expect(t.totals.avgLatencyMs).toBeGreaterThanOrEqual(0);
  });

  test('byIntent counts intents seen across all sources', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 20, output_tokens: 5 },
      },
    ]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hello');
    await svc.classify('hello'); // cache hit — also has intent
    const t = svc.getTelemetry();
    expect(t.byIntent.greeting).toBe(2);
  });
});

// ─── 4. Buckets ────────────────────────────────────────────────────

describe('telemetry — buckets', () => {
  test('buckets group calls by hour', async () => {
    const clock = makeClock();
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 20, output_tokens: 5 },
      },
      {
        content: [{ type: 'text', text: '{"intent":"clinic.hours","confidence":0.85}' }],
        usage: { input_tokens: 30, output_tokens: 10 },
      },
    ]);
    const svc = createParentChatbotLlmService({
      client,
      logger: SILENT,
      now: clock.now,
    });
    await svc.classify('hi');
    clock.advance(2 * 3600 * 1000); // 2 hours later
    await svc.classify('hours');
    const t = svc.getTelemetry({ bucketHours: 1 });
    expect(t.buckets).toHaveLength(2);
    expect(t.buckets[0].calls).toBe(1);
    expect(t.buckets[1].calls).toBe(1);
  });

  test('bucket cost reflects its own calls only', async () => {
    const clock = makeClock();
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 1_000_000, output_tokens: 0 },
      },
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 0, output_tokens: 250_000 },
      },
    ]);
    const svc = createParentChatbotLlmService({
      client,
      logger: SILENT,
      now: clock.now,
    });
    await svc.classify('msg-a');
    clock.advance(2 * 3600 * 1000);
    await svc.classify('msg-b');
    const t = svc.getTelemetry({ bucketHours: 1 });
    expect(t.buckets[0].costUsd).toBeCloseTo(0.8, 4); // 1M * $0.80
    expect(t.buckets[1].costUsd).toBeCloseTo(1.0, 4); // 250K * $4 = $1.00
  });
});

// ─── 5. resetTelemetry ─────────────────────────────────────────────

describe('telemetry — reset', () => {
  test('resetTelemetry clears all entries', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 20, output_tokens: 5 },
      },
    ]);
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hi');
    expect(svc._telemetrySize()).toBeGreaterThan(0);
    svc.resetTelemetry();
    expect(svc._telemetrySize()).toBe(0);
  });
});

// ─── 6. Service-level passthrough ──────────────────────────────────

describe('chatbot.service.getLlmStats', () => {
  test('delegates to llmClassifier.getTelemetry when wired', async () => {
    const client = mockClient([
      {
        content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        usage: { input_tokens: 20, output_tokens: 5 },
      },
    ]);
    const llm = createParentChatbotLlmService({ client, logger: SILENT });
    await llm.classify('hi');
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      llmClassifier: llm,
      logger: SILENT,
    });
    const r = svc.getLlmStats();
    expect(r.ok).toBe(true);
    expect(r.totals.llmCalls).toBe(1);
  });

  test('returns LLM_UNAVAILABLE when no classifier wired', () => {
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      logger: SILENT,
    });
    const r = svc.getLlmStats();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('LLM_UNAVAILABLE');
  });
});
