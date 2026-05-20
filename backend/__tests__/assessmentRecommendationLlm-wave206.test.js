'use strict';

/**
 * Wave 206 — assessmentRecommendationLlm smoke tests.
 *
 * Anthropic SDK is mocked. Exercises:
 *   • factory returns null when no client injected (fail-open contract)
 *   • happy path: model returns valid JSON → goals refined
 *   • timeout → falls back to original goals
 *   • parse failure → falls back to original goals
 *   • missing goal id in response → falls back to original
 *   • cache hit path
 */

const llm = require('../services/assessmentRecommendationLlm.service');

function makeGoal(domain, title, extras = {}) {
  return {
    domain,
    title,
    specific: 'spec-baseline',
    measurable: 'meas-baseline',
    achievable: 'ach-baseline',
    relevant: 'rel-baseline',
    timeBoundDays: 90,
    baseline: 'b',
    confidence: 'high',
    evidence: [{ measureKey: 'GMFCS', tier: '3', score: 3 }],
    ...extras,
  };
}

function fakeAnthropicResponse(refinedGoals) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ goals: refinedGoals }) }],
  };
}

describe('Wave 206 — assessmentRecommendationLlm', () => {
  test('factory returns null when no client injected (fail-open contract)', () => {
    expect(llm.buildLlmRefiner()).toBeNull();
    expect(llm.buildLlmRefiner({ anthropicClient: null })).toBeNull();
  });

  test('happy path: refines title + SMART fields, preserves evidence + confidence', async () => {
    const inputGoals = [
      makeGoal('motor', 'الهدف الأول'),
      makeGoal('communication', 'الهدف الثاني'),
    ];

    // Capture ids assigned by the refiner
    const withIds = llm._internals.attachIds(inputGoals);
    const ids = withIds.map(g => g._id);

    const client = {
      messages: {
        create: jest.fn().mockResolvedValue(
          fakeAnthropicResponse([
            {
              id: ids[0],
              title: 'هدف 1 مُحسَّن',
              specific: 'spec-refined-1',
              measurable: 'meas-refined-1',
              achievable: 'ach-refined-1',
              relevant: 'rel-refined-1',
            },
            {
              id: ids[1],
              title: 'هدف 2 مُحسَّن',
              specific: 'spec-refined-2',
              measurable: 'meas-refined-2',
              achievable: 'ach-refined-2',
              relevant: 'rel-refined-2',
            },
          ])
        ),
      },
    };

    const refiner = llm.buildLlmRefiner({ anthropicClient: client, timeoutMs: 1000 });
    const refined = await refiner.refineGoals(inputGoals);

    expect(refined).toHaveLength(2);
    expect(refined[0].title).toBe('هدف 1 مُحسَّن');
    expect(refined[0].specific).toBe('spec-refined-1');
    expect(refined[0].refinedByLlm).toBe(true);
    // Evidence + confidence + domain pass through unchanged
    expect(refined[0].domain).toBe('motor');
    expect(refined[0].confidence).toBe('high');
    expect(refined[0].evidence[0].measureKey).toBe('GMFCS');
    // _id is stripped from output
    expect(refined[0]._id).toBeUndefined();
  });

  test('LLM returns invalid JSON → fall back to deterministic goals', async () => {
    const inputGoals = [makeGoal('motor', 'الهدف')];
    const client = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'not json at all' }],
        }),
      },
    };
    const refiner = llm.buildLlmRefiner({
      anthropicClient: client,
      timeoutMs: 1000,
      logger: { warn: () => {} },
    });
    const refined = await refiner.refineGoals(inputGoals);
    expect(refined).toEqual(inputGoals); // identity fallback
  });

  test('LLM response missing required goal id → fall back', async () => {
    const inputGoals = [makeGoal('motor', 'الهدف')];
    const client = {
      messages: {
        create: jest.fn().mockResolvedValue(
          fakeAnthropicResponse([
            {
              id: 'wrong_id',
              title: 't',
              specific: 's',
              measurable: 'm',
              achievable: 'a',
              relevant: 'r',
            },
          ])
        ),
      },
    };
    const refiner = llm.buildLlmRefiner({
      anthropicClient: client,
      timeoutMs: 1000,
      logger: { warn: () => {} },
    });
    const refined = await refiner.refineGoals(inputGoals);
    expect(refined).toEqual(inputGoals);
  });

  test('timeout → fall back after retries exhausted', async () => {
    const inputGoals = [makeGoal('motor', 'الهدف')];
    const client = {
      messages: {
        create: jest.fn().mockImplementation(
          () =>
            new Promise(resolve => {
              setTimeout(resolve, 50); // longer than timeout
            })
        ),
      },
    };
    const refiner = llm.buildLlmRefiner({
      anthropicClient: client,
      timeoutMs: 10,
      maxRetries: 1,
      logger: { warn: () => {} },
    });
    const refined = await refiner.refineGoals(inputGoals);
    expect(refined).toEqual(inputGoals);
    // Retried once → 2 calls
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });

  test('empty input → empty output without calling LLM', async () => {
    const client = {
      messages: {
        create: jest.fn(),
      },
    };
    const refiner = llm.buildLlmRefiner({ anthropicClient: client });
    expect(await refiner.refineGoals([])).toEqual([]);
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  test('cache hit on second call with same payload', async () => {
    const inputGoals = [makeGoal('motor', 'الهدف')];
    const withIds = llm._internals.attachIds(inputGoals);
    const id = withIds[0]._id;

    const client = {
      messages: {
        create: jest.fn().mockResolvedValue(
          fakeAnthropicResponse([
            {
              id,
              title: 't',
              specific: 's',
              measurable: 'm',
              achievable: 'a',
              relevant: 'r',
            },
          ])
        ),
      },
    };
    const refiner = llm.buildLlmRefiner({ anthropicClient: client });
    await refiner.refineGoals(inputGoals);
    await refiner.refineGoals(inputGoals);
    // Only one network call due to cache
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  test('parseModelJson rejects malformed shapes', () => {
    const expected = new Set(['x']);
    expect(llm._internals.parseModelJson('', expected)).toBeNull();
    expect(llm._internals.parseModelJson('{}', expected)).toBeNull();
    expect(llm._internals.parseModelJson('{"goals": []}', expected)).toBeNull();
    expect(llm._internals.parseModelJson('{"goals":[{"id":"x"}]}', expected)).toBeNull(); // missing fields
  });
});
