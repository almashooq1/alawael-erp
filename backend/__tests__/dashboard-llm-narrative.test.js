/**
 * dashboard-llm-narrative.test.js — Phase 18 Commit 4.
 *
 * Exercises the LLM-backed narrative generator with a fully-mocked
 * Anthropic client. Verifies:
 *   - null client → null factory result (disabled path)
 *   - happy path merges deterministic rules + LLM text
 *   - malformed JSON → rule-based fallback
 *   - API error → rule-based fallback
 *   - PII redactor runs BEFORE the API call
 *   - cache hits skip the API call
 *   - facade selects LLM over rules when both succeed
 *   - facade falls back gracefully on any LLM error
 */

'use strict';

const {
  buildLlmNarrativeGenerator,
  _internals,
} = require('../services/llmNarrativeGenerator.service');
const { buildNarrativeFacade } = require('../services/dashboardNarrativeFacade.service');

function fakeClient(response) {
  return {
    messages: {
      create: jest.fn(async () => response),
    },
  };
}

function fakeErrorClient(message = 'upstream boom') {
  return {
    messages: {
      create: jest.fn(async () => {
        throw new Error(message);
      }),
    },
  };
}

const VALID_JSON_TEXT = JSON.stringify({
  headlineEn: 'Red breach on DSO — investigate collections pipeline',
  headlineAr: 'خرق في DSO — راجع خط التحصيل',
  paragraphsEn: [
    'Accounts receivable has climbed materially versus the prior period.',
    'Consider reviewing the top-five debtors before end of day.',
  ],
  paragraphsAr: [
    'ارتفعت الذمم المدينة بشكل ملموس مقارنة بالفترة السابقة.',
    'يُقترح مراجعة أكبر خمسة مدينين قبل نهاية اليوم.',
  ],
});

const VALID_RESPONSE = { content: [{ type: 'text', text: VALID_JSON_TEXT }] };

describe('buildLlmNarrativeGenerator — factory gating', () => {
  it('returns null when no client is injected', () => {
    const gen = buildLlmNarrativeGenerator({});
    expect(gen).toBeNull();
  });

  it('returns a generator with .generate() when client is present', () => {
    const gen = buildLlmNarrativeGenerator({ anthropicClient: fakeClient(VALID_RESPONSE) });
    expect(gen).toBeTruthy();
    expect(typeof gen.generate).toBe('function');
  });
});

describe('llmNarrative.generate — happy path', () => {
  const snapshots = [
    {
      id: 'finance.ar.dso.days',
      nameEn: 'DSO',
      nameAr: 'أيام التحصيل',
      classification: 'red',
      value: 95,
      delta: 0.2,
      unit: 'days',
      target: 45,
    },
  ];

  it('calls the Anthropic SDK exactly once for the first snapshot', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const gen = buildLlmNarrativeGenerator({ anthropicClient: client });
    await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  it('passes the configured model + max_tokens + cache_control system prompt', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const gen = buildLlmNarrativeGenerator({
      anthropicClient: client,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 256,
    });
    await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    const args = client.messages.create.mock.calls[0][0];
    expect(args.model).toBe('claude-haiku-4-5-20251001');
    expect(args.max_tokens).toBe(256);
    expect(Array.isArray(args.system)).toBe(true);
    expect(args.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('merges rules + refs + confidence from the deterministic engine', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const gen = buildLlmNarrativeGenerator({ anthropicClient: client });
    const result = await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).toBe('llm');
    expect(result.headlineEn).toMatch(/DSO/);
    expect(result.headlineAr.length).toBeGreaterThan(0);
    expect(result.paragraphsEn.length).toBe(result.paragraphsAr.length);
    expect(result.rulesFired).toEqual(expect.arrayContaining(['R-RED-KPI']));
    expect(result.refs).toEqual(expect.arrayContaining(['finance.ar.dso.days']));
  });

  it('serves cached response on second identical call', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const gen = buildLlmNarrativeGenerator({ anthropicClient: client });
    await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  it('uses distinct cache keys for different snapshot sets', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const gen = buildLlmNarrativeGenerator({ anthropicClient: client });
    await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    await gen.generate({
      dashboardId: 'executive',
      kpiSnapshots: [{ ...snapshots[0], value: 120 }],
    });
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });
});

describe('llmNarrative.generate — fallback paths', () => {
  const snapshots = [
    {
      id: 'finance.ar.dso.days',
      classification: 'red',
      value: 95,
      delta: 0.2,
      nameEn: 'DSO',
      nameAr: 'أيام التحصيل',
    },
  ];

  it('falls back to rule-based narrative when the SDK throws', async () => {
    const client = fakeErrorClient();
    const gen = buildLlmNarrativeGenerator({
      anthropicClient: client,
      logger: { warn: () => {} },
    });
    const result = await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).not.toBe('llm');
    expect(result.rulesFired).toEqual(expect.arrayContaining(['R-RED-KPI']));
  });

  it('falls back when the model returns malformed JSON', async () => {
    const client = fakeClient({ content: [{ type: 'text', text: 'not json at all' }] });
    const gen = buildLlmNarrativeGenerator({
      anthropicClient: client,
      logger: { warn: () => {} },
    });
    const result = await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).not.toBe('llm');
  });

  it('falls back when paragraphs arrays have mismatched lengths', async () => {
    const client = fakeClient({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            headlineEn: 'x',
            headlineAr: 'ش',
            paragraphsEn: ['a', 'b'],
            paragraphsAr: ['أ'],
          }),
        },
      ],
    });
    const gen = buildLlmNarrativeGenerator({
      anthropicClient: client,
      logger: { warn: () => {} },
    });
    const result = await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).not.toBe('llm');
  });

  it('tolerates markdown code-fenced responses', async () => {
    const client = fakeClient({
      content: [
        {
          type: 'text',
          text: '```json\n' + VALID_JSON_TEXT + '\n```',
        },
      ],
    });
    const gen = buildLlmNarrativeGenerator({ anthropicClient: client });
    const result = await gen.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).toBe('llm');
  });

  it('short-circuits on empty snapshots without calling the SDK', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const gen = buildLlmNarrativeGenerator({ anthropicClient: client });
    const result = await gen.generate({ dashboardId: 'executive', kpiSnapshots: [] });
    expect(client.messages.create).not.toHaveBeenCalled();
    expect(result.headlineEn).toMatch(/insufficient/i);
  });
});

describe('llmNarrative — PII redactor integration', () => {
  it('runs the redactor before building the API request', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const redactor = jest.fn(v => v);
    const gen = buildLlmNarrativeGenerator({
      anthropicClient: client,
      redactor,
    });
    await gen.generate({
      dashboardId: 'executive',
      kpiSnapshots: [{ id: 'finance.ar.dso.days', classification: 'red', value: 80, delta: 0.1 }],
    });
    expect(redactor).toHaveBeenCalled();
  });

  it('falls back to rules if the redactor itself throws', async () => {
    const client = fakeClient(VALID_RESPONSE);
    const gen = buildLlmNarrativeGenerator({
      anthropicClient: client,
      redactor: () => {
        throw new Error('redactor exploded');
      },
      logger: { warn: () => {} },
    });
    const result = await gen.generate({
      dashboardId: 'executive',
      kpiSnapshots: [{ id: 'finance.ar.dso.days', classification: 'red', value: 80, delta: 0.1 }],
    });
    expect(client.messages.create).not.toHaveBeenCalled();
    expect(result.source).not.toBe('llm');
  });
});

describe('llmNarrative — internals', () => {
  it('stableSnapshotHash is deterministic across KPI order', () => {
    const a = _internals.stableSnapshotHash({
      dashboardId: 'x',
      kpiSnapshots: [
        { id: 'a', value: 1, delta: 0.1, classification: 'green' },
        { id: 'b', value: 2, delta: 0.2, classification: 'red' },
      ],
    });
    const b = _internals.stableSnapshotHash({
      dashboardId: 'x',
      kpiSnapshots: [
        { id: 'b', value: 2, delta: 0.2, classification: 'red' },
        { id: 'a', value: 1, delta: 0.1, classification: 'green' },
      ],
    });
    expect(a).toBe(b);
  });

  it('stableSnapshotHash changes when any field changes', () => {
    const base = _internals.stableSnapshotHash({
      dashboardId: 'x',
      kpiSnapshots: [{ id: 'a', value: 1, delta: 0.1, classification: 'green' }],
    });
    const changed = _internals.stableSnapshotHash({
      dashboardId: 'x',
      kpiSnapshots: [{ id: 'a', value: 2, delta: 0.1, classification: 'green' }],
    });
    expect(base).not.toBe(changed);
  });

  it('parseModelJson rejects non-JSON payloads', () => {
    expect(_internals.parseModelJson('nope')).toBeNull();
    expect(_internals.parseModelJson('{"partial":true}')).toBeNull();
  });

  it('parseModelJson accepts the canonical shape', () => {
    const parsed = _internals.parseModelJson(VALID_JSON_TEXT);
    expect(parsed).toBeTruthy();
    expect(parsed.paragraphsEn.length).toBe(parsed.paragraphsAr.length);
  });

  it('extractTextFromResponse handles string and array content', () => {
    expect(_internals.extractTextFromResponse('plain')).toBe('plain');
    expect(_internals.extractTextFromResponse({ content: [{ type: 'text', text: 'x' }] })).toBe(
      'x'
    );
    expect(_internals.extractTextFromResponse(null)).toBeNull();
  });
});

describe('narrative facade', () => {
  const snapshots = [
    {
      id: 'finance.ar.dso.days',
      classification: 'red',
      value: 95,
      delta: 0.2,
      nameEn: 'DSO',
      nameAr: 'أيام التحصيل',
    },
  ];

  it('uses deterministic rules when no llmGenerator is injected', async () => {
    const facade = buildNarrativeFacade({});
    const result = await facade.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).toBeUndefined();
    expect(result.rulesFired).toEqual(expect.arrayContaining(['R-RED-KPI']));
    expect(facade.hasLlm).toBe(false);
  });

  it('uses the LLM when it returns a narrative', async () => {
    const gen = buildLlmNarrativeGenerator({ anthropicClient: fakeClient(VALID_RESPONSE) });
    const facade = buildNarrativeFacade({ llmGenerator: gen });
    const result = await facade.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).toBe('llm');
    expect(facade.hasLlm).toBe(true);
  });

  it('falls back to rules when the LLM generator throws', async () => {
    const facade = buildNarrativeFacade({
      llmGenerator: {
        async generate() {
          throw new Error('explode');
        },
      },
      logger: { warn: () => {} },
    });
    const result = await facade.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.source).toBeUndefined();
    expect(result.rulesFired).toEqual(expect.arrayContaining(['R-RED-KPI']));
  });

  it('falls back to rules when the LLM generator returns null', async () => {
    const facade = buildNarrativeFacade({
      llmGenerator: {
        async generate() {
          return null;
        },
      },
    });
    const result = await facade.generate({ dashboardId: 'executive', kpiSnapshots: snapshots });
    expect(result.rulesFired).toEqual(expect.arrayContaining(['R-RED-KPI']));
  });
});
