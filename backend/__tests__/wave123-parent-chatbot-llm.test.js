/**
 * wave123-parent-chatbot-llm.test.js — Wave 123 / P3.6 Phase 2b.
 *
 * Test sections:
 *   1. _parseLlmResponse — JSON / markdown fences / prose-wrapped / malformed
 *   2. _coerceIntent — registry enum coercion
 *   3. _buildSystemPrompt — includes all intents
 *   4. classify — happy path
 *   5. classify — error paths (missing message, missing client, empty content,
 *      invalid JSON, 5xx retry, 4xx no retry, timeout)
 *   6. classify — cache (hit / TTL expiry / LRU eviction)
 *   7. Service integration — LLM preferred, falls back to rule-based on error
 */

'use strict';

const reg = require('../intelligence/parent-chatbot.registry');
const {
  createParentChatbotLlmService,
  _parseLlmResponse,
  _coerceIntent,
} = require('../intelligence/parent-chatbot-llm.service');
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

function mockClient({ replies = [], errors = [] } = {}) {
  let i = 0;
  const calls = [];
  return {
    calls,
    messages: {
      create: jest.fn(async args => {
        calls.push(args);
        if (errors[i]) {
          const e = errors[i];
          i++;
          throw e;
        }
        const reply = replies[i] || {
          content: [{ type: 'text', text: '{"intent":"unknown","confidence":0}' }],
          usage: { input_tokens: 50, output_tokens: 20 },
        };
        i++;
        return reply;
      }),
    },
  };
}

function buildSessionModel() {
  const store = [];
  function M(data) {
    Object.assign(this, data);
    this.save = async () => {
      const idx = store.findIndex(p => p.sessionId === this.sessionId);
      if (idx >= 0) store[idx] = { ...this };
      else store.push({ ...this });
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
  M.updateOne = async (filter, update) => {
    const idx = store.findIndex(p => p.sessionId === filter.sessionId);
    if (idx < 0) return { modifiedCount: 0 };
    Object.assign(store[idx], (update && update.$set) || {});
    return { modifiedCount: 1 };
  };
  M._store = store;
  return M;
}

// ─── 1. _parseLlmResponse ──────────────────────────────────────────

describe('_parseLlmResponse', () => {
  test('parses clean JSON', () => {
    expect(_parseLlmResponse('{"intent":"greeting","confidence":0.9}')).toEqual({
      intent: 'greeting',
      confidence: 0.9,
    });
  });

  test('strips markdown ```json fences', () => {
    expect(
      _parseLlmResponse('```json\n{"intent":"appointment.next","confidence":0.8}\n```')
    ).toEqual({ intent: 'appointment.next', confidence: 0.8 });
  });

  test('extracts JSON object from surrounding prose', () => {
    expect(
      _parseLlmResponse('Here is the result:\n{"intent":"clinic.hours","confidence":0.7}\nDone.')
    ).toEqual({ intent: 'clinic.hours', confidence: 0.7 });
  });

  test('clamps confidence to [0,1]', () => {
    expect(_parseLlmResponse('{"intent":"greeting","confidence":1.5}').confidence).toBe(1);
    expect(_parseLlmResponse('{"intent":"greeting","confidence":-0.3}').confidence).toBe(0);
  });

  test('returns null for malformed JSON', () => {
    expect(_parseLlmResponse('not json')).toBeNull();
    expect(_parseLlmResponse('{"intent": missing')).toBeNull();
  });

  test('returns null when required fields are missing', () => {
    expect(_parseLlmResponse('{"intent":"greeting"}')).toBeNull();
    expect(_parseLlmResponse('{"confidence":0.9}')).toBeNull();
    expect(_parseLlmResponse('{"intent":42,"confidence":0.5}')).toBeNull();
  });

  test('returns null for non-string input', () => {
    expect(_parseLlmResponse(null)).toBeNull();
    expect(_parseLlmResponse(undefined)).toBeNull();
    expect(_parseLlmResponse(42)).toBeNull();
  });
});

// ─── 2. _coerceIntent ──────────────────────────────────────────────

describe('_coerceIntent', () => {
  test('passes through valid registry intents', () => {
    expect(_coerceIntent('greeting')).toBe(reg.INTENT.GREETING);
    expect(_coerceIntent('appointment.next')).toBe(reg.INTENT.APPOINTMENT_NEXT);
  });

  test('coerces case-insensitive matches', () => {
    expect(_coerceIntent('GREETING')).toBe(reg.INTENT.GREETING);
    expect(_coerceIntent('Appointment.Next')).toBe(reg.INTENT.APPOINTMENT_NEXT);
  });

  test('returns UNKNOWN for unrecognized names', () => {
    expect(_coerceIntent('not-an-intent')).toBe(reg.INTENT.UNKNOWN);
    expect(_coerceIntent('')).toBe(reg.INTENT.UNKNOWN);
    expect(_coerceIntent(null)).toBe(reg.INTENT.UNKNOWN);
  });
});

// ─── 3. _buildSystemPrompt ─────────────────────────────────────────

describe('_buildSystemPrompt', () => {
  test('includes every registry intent except UNKNOWN', () => {
    const svc = createParentChatbotLlmService({
      client: mockClient(),
      logger: SILENT,
    });
    const prompt = svc._buildSystemPrompt();
    for (const intent of reg.INTENTS) {
      if (intent === reg.INTENT.UNKNOWN) continue;
      expect(prompt).toContain(intent);
    }
  });

  test('enforces JSON-only response schema', () => {
    const svc = createParentChatbotLlmService({
      client: mockClient(),
      logger: SILENT,
    });
    const prompt = svc._buildSystemPrompt();
    expect(prompt).toMatch(/SINGLE JSON object/);
    expect(prompt).toMatch(/intent/);
    expect(prompt).toMatch(/confidence/);
  });
});

// ─── 4. classify — happy path ──────────────────────────────────────

describe('classify — happy path', () => {
  test('returns LLM-classified intent + confidence + source', async () => {
    const client = mockClient({
      replies: [
        {
          content: [{ type: 'text', text: '{"intent":"appointment.next","confidence":0.92}' }],
          usage: { input_tokens: 60, output_tokens: 15 },
        },
      ],
    });
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    const r = await svc.classify('متى موعد ابني القادم؟');
    expect(r.ok).toBe(true);
    expect(r.intent).toBe(reg.INTENT.APPOINTMENT_NEXT);
    expect(r.confidence).toBe(0.92);
    expect(r.source).toBe('llm');
    expect(r.usage).toBeDefined();
    expect(client.calls).toHaveLength(1);
  });

  test('coerces unknown intent name to INTENT.UNKNOWN', async () => {
    const client = mockClient({
      replies: [
        {
          content: [{ type: 'text', text: '{"intent":"bogus.intent","confidence":0.6}' }],
        },
      ],
    });
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    const r = await svc.classify('weird message');
    expect(r.ok).toBe(true);
    expect(r.intent).toBe(reg.INTENT.UNKNOWN);
  });
});

// ─── 5. classify — error paths ─────────────────────────────────────

describe('classify — error paths', () => {
  test('empty message → MESSAGE_REQUIRED', async () => {
    const svc = createParentChatbotLlmService({
      client: mockClient(),
      logger: SILENT,
    });
    const r = await svc.classify('');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('MESSAGE_REQUIRED');
  });

  test('missing client → CLIENT_MISSING', async () => {
    const svc = createParentChatbotLlmService({ logger: SILENT });
    const r = await svc.classify('hello');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('CLIENT_MISSING');
  });

  test('empty content → EMPTY_RESPONSE', async () => {
    const client = mockClient({ replies: [{ content: [{ type: 'text', text: '' }] }] });
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    const r = await svc.classify('hello');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('EMPTY_RESPONSE');
  });

  test('malformed JSON response → INVALID_RESPONSE', async () => {
    const client = mockClient({
      replies: [{ content: [{ type: 'text', text: 'I think it is appointment.next' }] }],
    });
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    const r = await svc.classify('hello');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_RESPONSE');
    expect(r.raw).toContain('appointment.next');
  });

  test('5xx error retries and succeeds', async () => {
    const transient = Object.assign(new Error('upstream blip'), { status: 503 });
    const client = mockClient({
      replies: [
        null,
        {
          content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.95}' }],
        },
      ],
      errors: [transient, null],
    });
    const svc = createParentChatbotLlmService({
      client,
      maxRetries: 2,
      logger: SILENT,
    });
    const r = await svc.classify('hi there');
    expect(r.ok).toBe(true);
    expect(r.intent).toBe(reg.INTENT.GREETING);
    expect(client.calls).toHaveLength(2);
  });

  test('4xx error does NOT retry', async () => {
    const authErr = Object.assign(new Error('auth'), { status: 401 });
    const client = mockClient({
      replies: [null, null],
      errors: [authErr, authErr],
    });
    const svc = createParentChatbotLlmService({
      client,
      maxRetries: 3,
      logger: SILENT,
    });
    const r = await svc.classify('hello');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('CLIENT_THREW');
    expect(client.calls).toHaveLength(1);
  });

  test('timeout surfaces TIMEOUT reason', async () => {
    const client = {
      messages: {
        create: jest.fn(() => new Promise(() => {})), // never resolves
      },
    };
    const svc = createParentChatbotLlmService({
      client,
      timeoutMs: 30,
      maxRetries: 0,
      logger: SILENT,
    });
    const r = await svc.classify('slow query');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('TIMEOUT');
  });
});

// ─── 6. classify — cache ───────────────────────────────────────────

describe('classify — cache', () => {
  test('identical message after normalization hits the cache', async () => {
    const client = mockClient({
      replies: [
        {
          content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        },
      ],
    });
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    const first = await svc.classify('السلام عليكم');
    expect(first.source).toBe('llm');
    const second = await svc.classify('السَّلامُ عَلَيكُم'); // diacritics normalized away
    expect(second.ok).toBe(true);
    expect(second.intent).toBe(reg.INTENT.GREETING);
    expect(second.source).toBe('cache');
    expect(client.calls).toHaveLength(1); // single LLM call
  });

  test('TTL expiry forces a re-classify', async () => {
    const clock = makeClock();
    const client = mockClient({
      replies: [
        {
          content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        },
        {
          content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.85}' }],
        },
      ],
    });
    const svc = createParentChatbotLlmService({
      client,
      cacheTtlMs: 1000,
      logger: SILENT,
      now: clock.now,
    });
    await svc.classify('hello');
    clock.advance(2000); // past TTL
    const r = await svc.classify('hello');
    expect(r.source).toBe('llm');
    expect(client.calls).toHaveLength(2);
  });

  test('LRU evicts oldest when cache is full', async () => {
    const client = mockClient({
      replies: Array.from({ length: 5 }, (_, i) => ({
        content: [{ type: 'text', text: `{"intent":"greeting","confidence":${0.5 + i * 0.05}}` }],
      })),
    });
    const svc = createParentChatbotLlmService({
      client,
      cacheMaxEntries: 3,
      logger: SILENT,
    });
    await svc.classify('msg-a');
    await svc.classify('msg-b');
    await svc.classify('msg-c');
    await svc.classify('msg-d'); // evicts msg-a
    expect(svc._cacheSize()).toBe(3);
    // msg-a should re-call the LLM
    await svc.classify('msg-a');
    expect(client.calls).toHaveLength(5);
  });

  test('resetCache clears entries', async () => {
    const client = mockClient({
      replies: [
        {
          content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        },
        {
          content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        },
      ],
    });
    const svc = createParentChatbotLlmService({ client, logger: SILENT });
    await svc.classify('hi');
    svc.resetCache();
    expect(svc._cacheSize()).toBe(0);
    await svc.classify('hi');
    expect(client.calls).toHaveLength(2);
  });
});

// ─── 7. available() ────────────────────────────────────────────────

describe('available', () => {
  test('true when client has messages.create', () => {
    const svc = createParentChatbotLlmService({ client: mockClient(), logger: SILENT });
    expect(svc.available()).toBe(true);
  });

  test('false when client missing', () => {
    const svc = createParentChatbotLlmService({ logger: SILENT });
    expect(svc.available()).toBe(false);
  });

  test('false when client lacks messages.create', () => {
    const svc = createParentChatbotLlmService({ client: { foo: 1 }, logger: SILENT });
    expect(svc.available()).toBe(false);
  });
});

// ─── 8. Service integration ────────────────────────────────────────

describe('parent-chatbot.service integration', () => {
  test('LLM-preferred — ask() uses LLM classifier when available', async () => {
    const client = mockClient({
      replies: [
        {
          content: [{ type: 'text', text: '{"intent":"clinic.hours","confidence":0.92}' }],
        },
      ],
    });
    const llm = createParentChatbotLlmService({ client, logger: SILENT });
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      llmClassifier: llm,
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'when do you open' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe(reg.INTENT.CLINIC_HOURS);
    expect(r.confidence).toBe(0.92);
    expect(r.classifierSource).toBe('llm');
  });

  test('falls back to rule-based when LLM is unavailable', async () => {
    const llm = createParentChatbotLlmService({ logger: SILENT }); // no client
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      llmClassifier: llm,
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'متى موعدي القادم' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe(reg.INTENT.APPOINTMENT_NEXT);
    expect(r.classifierSource).toBe('rule');
  });

  test('falls back to rule-based when LLM returns invalid response', async () => {
    const client = mockClient({
      replies: [{ content: [{ type: 'text', text: 'completely malformed' }] }],
    });
    const llm = createParentChatbotLlmService({ client, logger: SILENT });
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      llmClassifier: llm,
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'متى موعدي القادم' });
    expect(r.ok).toBe(true);
    expect(r.intent).toBe(reg.INTENT.APPOINTMENT_NEXT);
    expect(r.classifierSource).toBe('rule');
  });

  test('reports classifierSource=llm-cache on cached classifications', async () => {
    const client = mockClient({
      replies: [
        {
          content: [{ type: 'text', text: '{"intent":"greeting","confidence":0.9}' }],
        },
      ],
    });
    const llm = createParentChatbotLlmService({ client, logger: SILENT });
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      llmClassifier: llm,
      logger: SILENT,
    });
    await svc.ask({ userId: 'u1', message: 'hello there' });
    const r = await svc.ask({ userId: 'u1', message: 'hello there' });
    expect(r.classifierSource).toBe('llm-cache');
    expect(client.calls).toHaveLength(1);
  });

  test('classifier throwing falls back gracefully', async () => {
    const explodingLlm = {
      classify: jest.fn(async () => {
        throw new Error('boom');
      }),
    };
    const svc = createParentChatbotService({
      sessionModel: buildSessionModel(),
      llmClassifier: explodingLlm,
      logger: SILENT,
    });
    const r = await svc.ask({ userId: 'u1', message: 'next appointment' });
    expect(r.ok).toBe(true);
    expect(r.classifierSource).toBe('rule');
    expect(r.intent).toBe(reg.INTENT.APPOINTMENT_NEXT);
  });
});
