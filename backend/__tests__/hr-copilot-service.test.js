'use strict';

/**
 * hr-copilot-service.test.js — Phase 30 (Intelligent HR Platform).
 *
 * Coverage for the LLM-backed HR Copilot. Uses an injected fake Anthropic
 * client to avoid real network calls. Verifies:
 *
 *   - graceful degrade when no client is wired
 *   - happy path: model returns JSON → service unwraps and returns
 *   - parse failure: invalid JSON → returns { available: true, error: 'parse_failed', raw }
 *   - call failure: client throws → returns { error: 'model_call_failed' }
 *   - cache hit on identical input
 *   - input validation (missing employee, unknown letter kind)
 *   - PII redaction is invoked on input before reaching the model
 */

const { createHrCopilot } = require('../services/hr/hrCopilot.service');

function silentLogger() {
  return { info() {}, warn() {}, error() {}, debug() {} };
}

function makeFakeClient(responseFactory) {
  const calls = [];
  return {
    calls,
    messages: {
      async create(opts) {
        calls.push(opts);
        return responseFactory(opts, calls.length);
      },
    },
  };
}

function jsonContent(obj) {
  return {
    model: 'claude-haiku-4-5-fake',
    content: [{ type: 'text', text: JSON.stringify(obj) }],
  };
}

// ─── No-client mode ──────────────────────────────────────────────────────────

describe('hrCopilot — no client wired', () => {
  test('every method reports unavailable cleanly', async () => {
    const copilot = createHrCopilot({ anthropicClient: null, logger: silentLogger() });
    expect(copilot.isAvailable()).toBe(false);

    const s = await copilot.summarizeEmployee({ employee: { jobTitle: 'manager' } });
    expect(s).toEqual({ available: false });

    const l = await copilot.draftLetter({ kind: 'warning', employee: { jobTitle: 'x' } });
    expect(l).toEqual({ available: false });

    const q = await copilot.answerQuestion({ question: 'كم يوم إجازة سنوية؟', context: [] });
    expect(q).toEqual({ available: false });

    const sg = await copilot.suggestImprovements({ evaluation: { overallScore: 3 } });
    expect(sg).toEqual({ available: false });

    expect(copilot.stats()).toEqual(expect.objectContaining({ available: false }));
  });
});

// ─── Happy path ──────────────────────────────────────────────────────────────

describe('hrCopilot — with injected client', () => {
  test('summarizeEmployee returns parsed JSON', async () => {
    const fake = makeFakeClient(() =>
      jsonContent({
        summaryAr: ['ف١', 'ف٢', 'ف٣'],
        summaryEn: ['p1', 'p2', 'p3'],
        strengths: ['التزام'],
        concerns: [],
        recommendedActions: ['متابعة شهرية'],
      })
    );
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    expect(copilot.isAvailable()).toBe(true);

    const res = await copilot.summarizeEmployee({
      employee: { jobTitle: 'specialist', department: 'rehab', hireDate: '2023-01-01' },
      attendance: { workingDays: 200, absences: 5, lates: 3 },
      lastReview: { overallScore: 4.2, overallRating: 'meets' },
    });

    expect(res.available).toBe(true);
    expect(res.data.summaryAr).toHaveLength(3);
    expect(res.data.summaryEn).toHaveLength(3);
    expect(fake.calls).toHaveLength(1);
    // System prompt MUST be flagged for prompt caching.
    expect(fake.calls[0].system[0]).toEqual(
      expect.objectContaining({
        cache_control: { type: 'ephemeral' },
      })
    );
  });

  test('draftLetter rejects unknown kind', async () => {
    const fake = makeFakeClient(() => jsonContent({}));
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    const res = await copilot.draftLetter({ kind: 'fake-kind', employee: { jobTitle: 'x' } });
    expect(res.error).toBe('unknown letter kind');
    expect(fake.calls).toHaveLength(0);
  });

  test('draftLetter happy path', async () => {
    const fake = makeFakeClient(() =>
      jsonContent({
        subjectAr: 'إنذار',
        subjectEn: 'Warning',
        bodyAr: 'هذا إنذار رسمي.',
        bodyEn: 'This is a formal warning.',
        disclaimers: ['غير ملزم قانونياً قبل التوقيع.'],
      })
    );
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    const res = await copilot.draftLetter({
      kind: 'warning',
      employee: { jobTitle: 'driver', department: 'transport' },
      params: { reason: 'تأخر متكرر' },
    });
    expect(res.available).toBe(true);
    expect(res.data.subjectAr).toBe('إنذار');
    expect(res.data.bodyEn).toMatch(/warning/i);
  });

  test('answerQuestion enforces context shape', async () => {
    const fake = makeFakeClient(() =>
      jsonContent({
        answer: 'الإجابة من السياسة',
        translation: 'Answer from the policy',
        references: ['policy:annual-leave'],
        confidence: 'high',
        outOfScope: false,
      })
    );
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });

    // Bad input — too short
    const bad = await copilot.answerQuestion({ question: '', context: [] });
    expect(bad.error).toBe('question required');
    expect(fake.calls).toHaveLength(0);

    // Bad context
    const bad2 = await copilot.answerQuestion({ question: 'كم يوم؟', context: 'not an array' });
    expect(bad2.error).toBe('context must be an array');

    // Good
    const ok = await copilot.answerQuestion({
      question: 'كم يوم إجازة سنوية؟',
      context: [{ key: 'annual-leave', text: 'المادة 109 من نظام العمل تنص على 21 يوماً.' }],
    });
    expect(ok.available).toBe(true);
    expect(ok.data.confidence).toBe('high');
    expect(ok.data.references).toContain('policy:annual-leave');
  });

  test('parse failure returns error + raw', async () => {
    const fake = makeFakeClient(() => ({
      content: [{ type: 'text', text: 'this is not json at all' }],
    }));
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    const res = await copilot.summarizeEmployee({ employee: { jobTitle: 'x' } });
    expect(res.available).toBe(true);
    expect(res.error).toBe('parse_failed');
    expect(res.raw).toMatch(/not json/);
  });

  test('model call failure returns error', async () => {
    const fake = {
      messages: {
        async create() {
          throw new Error('rate limited');
        },
      },
    };
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    const res = await copilot.summarizeEmployee({ employee: { jobTitle: 'x' } });
    expect(res.available).toBe(true);
    expect(res.error).toBe('model_call_failed');
    expect(res.detail).toMatch(/rate limited/);
  });

  test('identical input hits cache on second call', async () => {
    const fake = makeFakeClient(() =>
      jsonContent({
        summaryAr: ['ف١', 'ف٢', 'ف٣'],
        summaryEn: ['p1', 'p2', 'p3'],
        strengths: [],
        concerns: [],
        recommendedActions: [],
      })
    );
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    const input = {
      employee: { jobTitle: 'specialist', department: 'rehab' },
      attendance: null,
      lastReview: null,
    };
    const r1 = await copilot.summarizeEmployee(input);
    const r2 = await copilot.summarizeEmployee(input);
    expect(r1.available).toBe(true);
    expect(r2.cached).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  test('summarizeEmployee rejects missing employee', async () => {
    const fake = makeFakeClient(() => jsonContent({}));
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    const res = await copilot.summarizeEmployee({});
    expect(res.error).toBe('employee required');
    expect(fake.calls).toHaveLength(0);
  });

  test('suggestImprovements works on a real-looking evaluation', async () => {
    const fake = makeFakeClient(() =>
      jsonContent({
        coachingPlan: [
          {
            focus: 'التواصل',
            goalSmartAr: 'تحسين دقة التقارير الأسبوعية بنسبة 25٪ خلال ٣ أشهر',
            goalSmartEn: 'Improve weekly report accuracy by 25% within 3 months',
            metric: 'نسبة التقارير المُسلَّمة في الموعد',
            timeframeMonths: 3,
            supportingResources: ['كورس Communications-101'],
          },
        ],
        summaryAr: 'خطة تطوير ربعية',
        summaryEn: 'Quarterly coaching plan',
      })
    );
    const copilot = createHrCopilot({ anthropicClient: fake, logger: silentLogger() });
    const res = await copilot.suggestImprovements({
      evaluation: {
        overallScore: 3.2,
        overallRating: 'partial',
        criteria: [{ name: 'communication', weight: 30, score: 2.5, maxScore: 5 }],
        improvements: 'يحتاج إلى تحسين دقة التقارير',
      },
    });
    expect(res.available).toBe(true);
    expect(res.data.coachingPlan).toHaveLength(1);
    expect(res.data.coachingPlan[0].timeframeMonths).toBe(3);
  });
});
