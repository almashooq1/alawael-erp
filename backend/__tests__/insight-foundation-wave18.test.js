/**
 * insight-foundation-wave18.test.js — Wave 18.
 *
 * Tests the Intelligence Layer foundation:
 *
 *   1. `insight.model.js` — schema enforces the 5 G-guarantees
 *      (G1: reasoning bullets, G2: facts, G3: confidence factors,
 *      G4: deepLink-or-action, G5: input digest format).
 *   2. `insights.service.js` — upsert dedup, confirm/dismiss
 *      idempotency, generator scoreboard math.
 *   3. `generators/base.js` — defineGenerator validation,
 *      buildPayload boilerplate, digest stability.
 *   4. `generators/care-gap.generator.js` — happy path + edge cases
 *      (no gaps, multiple gaps, missing data).
 *
 * No Mongo: model tests use validateSync(); service tests inject
 * a chainable-thenable fake AlertModel-style stub.
 */

'use strict';

// Opt out of the global mongoose mock (jest.setup.js:19) so that
// `mongoose.model('Insight', InsightSchema)` returns a real
// constructor — without this, `new Insight(...)` throws
// "Insight is not a constructor" because the global mock returns a
// plain object instead of a Model class. Documented pattern, see
// jest.setup.js:420 + the unmock callsites in __tests__/*-wave*.test.js.
jest.unmock('mongoose');

const mongoose = require('mongoose');
const insightModelExports = require('../intelligence/insight.model');
const { InsightSchema, INSIGHT_KINDS, INSIGHT_SEVERITIES } = insightModelExports;

const { createInsightsService, computeInputDigest } = require('../intelligence/insights.service');
const {
  defineGenerator,
  buildPayload,
  digestOf,
  severityFromScore,
  confidenceLevelFromScore,
} = require('../intelligence/generators/base');
const careGapGenerator = require('../intelligence/generators/care-gap.generator');

// Reuse the canonical model (matches the Wave 17 hotfix pattern).
const Insight = insightModelExports.model;

// ─── Helpers ─────────────────────────────────────────────────────

function basePayload(overrides = {}) {
  return {
    kind: 'care-gap',
    severity: 'medium',
    category: 'clinical',
    scope: 'entity',
    titleAr: 'فجوة رعاية للمستفيد x',
    titleEn: 'Care gap for beneficiary x',
    summaryAr: 'يحتاج المستفيد لمراجعة سريرية شاملة.',
    summaryEn: 'Beneficiary needs comprehensive clinical review.',
    reasoning: {
      bulletsAr: ['فجوة في خطة الرعاية', 'مراجعة الخطة متأخرة'],
      bulletsEn: ['Care plan gap', 'Plan review overdue'],
      supportingFacts: [
        {
          labelAr: 'أيام التأخير',
          labelEn: 'Days overdue',
          value: 12,
          unit: 'days',
        },
      ],
    },
    confidence: {
      level: 'medium',
      score: 0.75,
      factors: ['يوجد تقييم حديث يدعم البيانات'],
    },
    source: {
      type: 'rule',
      detail: 'care-gap.v1',
      generatorId: 'care-gap.v1',
      inputDigest: 'a'.repeat(40), // 40-char SHA1 hex
    },
    deepLink: '/beneficiary-portal/b1',
    ...overrides,
  };
}

// ─── G1: reasoning bullets ───────────────────────────────────────
describe('Insight schema — G1: reasoning bullets', () => {
  test('rejects insight with < 2 bullets', () => {
    const doc = new Insight(
      basePayload({
        reasoning: {
          bulletsAr: ['only one'],
          bulletsEn: ['only one'],
          supportingFacts: basePayload().reasoning.supportingFacts,
        },
      })
    );
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/G1/);
  });

  test('rejects mismatched bullet counts (AR=3, EN=2)', () => {
    const doc = new Insight(
      basePayload({
        reasoning: {
          bulletsAr: ['a', 'b', 'c'],
          bulletsEn: ['a', 'b'],
          supportingFacts: basePayload().reasoning.supportingFacts,
        },
      })
    );
    expect(doc.validateSync()).toBeTruthy();
  });

  test('accepts ≥ 2 matching bullets', () => {
    const doc = new Insight(basePayload());
    expect(doc.validateSync()).toBeFalsy();
  });
});

// ─── G2: supporting facts ────────────────────────────────────────
describe('Insight schema — G2: supporting facts', () => {
  test('rejects insight with empty facts[]', () => {
    const doc = new Insight(
      basePayload({
        reasoning: {
          bulletsAr: ['a', 'b'],
          bulletsEn: ['a', 'b'],
          supportingFacts: [],
        },
      })
    );
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/G2/);
  });

  test('accepts facts with numeric value=0 (falsy but valid)', () => {
    const doc = new Insight(
      basePayload({
        reasoning: {
          bulletsAr: ['a', 'b'],
          bulletsEn: ['a', 'b'],
          supportingFacts: [{ labelAr: 'عدد', labelEn: 'Count', value: 0, unit: 'count' }],
        },
      })
    );
    expect(doc.validateSync()).toBeFalsy();
  });
});

// ─── G3: confidence factors ──────────────────────────────────────
describe('Insight schema — G3: confidence factors', () => {
  test('rejects empty factors[]', () => {
    const doc = new Insight(
      basePayload({
        confidence: { level: 'medium', score: 0.7, factors: [] },
      })
    );
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/G3/);
  });

  test('rejects factors with strings < 5 chars', () => {
    const doc = new Insight(
      basePayload({
        confidence: { level: 'medium', score: 0.7, factors: ['ok', 'why'] },
      })
    );
    expect(doc.validateSync()).toBeTruthy();
  });
});

// ─── G4: deepLink or actions ────────────────────────────────────
describe('Insight schema — G4: deepLink or suggestedActions', () => {
  test('rejects when both deepLink and suggestedActions are empty', () => {
    const doc = new Insight(basePayload({ deepLink: null, suggestedActions: [] }));
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/G4/);
  });

  test('accepts when only suggestedActions is set', () => {
    const doc = new Insight(
      basePayload({
        deepLink: null,
        suggestedActions: [
          {
            titleAr: 'افتح الملف',
            titleEn: 'Open file',
            deepLink: '/somewhere',
          },
        ],
      })
    );
    expect(doc.validateSync()).toBeFalsy();
  });

  test('accepts when only deepLink is set', () => {
    const doc = new Insight(basePayload({ suggestedActions: [] }));
    expect(doc.validateSync()).toBeFalsy();
  });
});

// ─── G5: input digest format ────────────────────────────────────
describe('Insight schema — G5: source.inputDigest', () => {
  test('rejects non-hex digest', () => {
    const doc = new Insight(
      basePayload({
        source: { ...basePayload().source, inputDigest: 'not-a-hash!' },
      })
    );
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/G5/);
  });

  test('accepts SHA-1 (40 chars) and SHA-256 (64 chars)', () => {
    const sha1 = new Insight(
      basePayload({
        source: { ...basePayload().source, inputDigest: 'a'.repeat(40) },
      })
    );
    const sha256 = new Insight(
      basePayload({
        source: { ...basePayload().source, inputDigest: 'b'.repeat(64) },
      })
    );
    expect(sha1.validateSync()).toBeFalsy();
    expect(sha256.validateSync()).toBeFalsy();
  });

  test('rejects digest below 16 chars', () => {
    const doc = new Insight(
      basePayload({
        source: { ...basePayload().source, inputDigest: 'a'.repeat(8) },
      })
    );
    expect(doc.validateSync()).toBeTruthy();
  });
});

// ─── Severity derivation from score ─────────────────────────────
describe('Insight schema — confidence level derivation', () => {
  test('derives level=high when score ≥ 0.85', () => {
    const doc = new Insight(
      basePayload({
        confidence: {
          score: 0.9,
          factors: ['z-score = 3.4σ (strong signal)'],
        },
      })
    );
    expect(doc.validateSync()).toBeFalsy();
    expect(doc.confidence.level).toBe('high');
  });

  test('honors caller-provided level + records override in factors', () => {
    const doc = new Insight(
      basePayload({
        confidence: {
          level: 'low',
          score: 0.9,
          factors: ['expert overrode after sample-size review'],
        },
      })
    );
    expect(doc.validateSync()).toBeFalsy();
    expect(doc.confidence.level).toBe('low');
    // Override note is appended to factors
    expect(doc.confidence.factors.some(f => f.includes('overrides'))).toBe(true);
  });
});

// ─── Schema enums ────────────────────────────────────────────────
describe('Insight schema — enum coverage', () => {
  test('accepts every documented kind', () => {
    for (const k of INSIGHT_KINDS) {
      const doc = new Insight(basePayload({ kind: k }));
      expect(doc.validateSync()).toBeFalsy();
    }
  });

  test('accepts every documented severity', () => {
    for (const s of INSIGHT_SEVERITIES) {
      const doc = new Insight(basePayload({ severity: s }));
      expect(doc.validateSync()).toBeFalsy();
    }
  });

  test('rejects unknown kind', () => {
    const doc = new Insight(basePayload({ kind: 'bogus-kind' }));
    expect(doc.validateSync()).toBeTruthy();
  });
});

// ─── insightsService — dedup ────────────────────────────────────
describe('insightsService — upsert dedup', () => {
  function fakeModel(rows = []) {
    return {
      model: {
        findOne: jest.fn(async () => rows[0] || null),
        create: jest.fn(async payload => ({ _id: 'new-1', ...payload, save: async () => {} })),
      },
    };
  }

  test('returns deduped:true when same (generatorId, inputDigest) exists active', async () => {
    const existing = { _id: 'i-1', save: async () => {} };
    const svc = createInsightsService({ insightModel: fakeModel([existing]) });
    const result = await svc.upsertInsight(basePayload());
    expect(result.ok).toBe(true);
    expect(result.deduped).toBe(true);
    expect(result.insight).toBe(existing);
  });

  test('creates when no existing match', async () => {
    const svc = createInsightsService({ insightModel: fakeModel([]) });
    const result = await svc.upsertInsight(basePayload());
    expect(result.ok).toBe(true);
    expect(result.insight._id).toBe('new-1');
  });

  test('rejects invalid payload (missing source.generatorId)', async () => {
    const svc = createInsightsService({ insightModel: fakeModel([]) });
    const result = await svc.upsertInsight({
      ...basePayload(),
      source: { ...basePayload().source, generatorId: '' },
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('INVALID_PAYLOAD');
  });
});

// ─── insightsService — auto-promote ─────────────────────────────
describe('insightsService — auto-promote to alert', () => {
  function fakeModel() {
    return {
      model: {
        findOne: jest.fn(async () => null),
        create: jest.fn(async payload => {
          const doc = {
            _id: 'new-1',
            ...payload,
            save: jest.fn(async function () {
              return this;
            }),
          };
          return doc;
        }),
      },
    };
  }

  test('critical severity triggers promoteToAlert + cross-link is saved', async () => {
    const promoteToAlert = jest.fn(async () => ({ _id: 'alert-9' }));
    const svc = createInsightsService({ insightModel: fakeModel(), promoteToAlert });

    const result = await svc.upsertInsight(basePayload({ severity: 'critical' }));
    expect(promoteToAlert).toHaveBeenCalledTimes(1);
    expect(result.insight.promotedToAlertId).toBe('alert-9');
  });

  test('non-critical severity does not promote', async () => {
    const promoteToAlert = jest.fn(async () => ({ _id: 'alert-9' }));
    const svc = createInsightsService({ insightModel: fakeModel(), promoteToAlert });
    await svc.upsertInsight(basePayload({ severity: 'medium' }));
    expect(promoteToAlert).not.toHaveBeenCalled();
  });
});

// ─── insightsService — feedback ─────────────────────────────────
describe('insightsService — feedback actions', () => {
  function makeFakeInsight(initial = {}) {
    const doc = {
      _id: 'i-1',
      kind: 'care-gap',
      state: 'active',
      feedback: {
        confirmCount: 0,
        dismissCount: 0,
        confirmedBy: [],
        dismissedBy: [],
        dismissReasons: [],
        userNotes: [],
      },
      ...initial,
      save: jest.fn(async function () {
        return this;
      }),
    };
    return doc;
  }

  test('confirm appends + flips state', async () => {
    const insight = makeFakeInsight();
    const svc = createInsightsService({
      insightModel: { model: { findById: async () => insight } },
    });
    const r = await svc.confirmInsight({
      insightId: 'i-1',
      actor: { userId: 'u-1', role: 'manager' },
    });
    expect(r.ok).toBe(true);
    expect(insight.feedback.confirmCount).toBe(1);
    expect(insight.feedback.confirmedBy).toEqual(['u-1']);
    expect(insight.state).toBe('confirmed');
  });

  test('confirm is idempotent for the same user', async () => {
    const insight = makeFakeInsight({
      feedback: {
        confirmCount: 1,
        dismissCount: 0,
        confirmedBy: ['u-1'],
        dismissedBy: [],
        dismissReasons: [],
        userNotes: [],
      },
      state: 'confirmed',
    });
    const svc = createInsightsService({
      insightModel: { model: { findById: async () => insight } },
    });
    const r = await svc.confirmInsight({
      insightId: 'i-1',
      actor: { userId: 'u-1' },
    });
    expect(r.noop).toBe(true);
    expect(insight.feedback.confirmCount).toBe(1);
  });

  test('dismiss requires valid reasonCode', async () => {
    const insight = makeFakeInsight();
    const svc = createInsightsService({
      insightModel: { model: { findById: async () => insight } },
    });
    const r = await svc.dismissInsight({
      insightId: 'i-1',
      reasonCode: 'invalid-code',
      actor: { userId: 'u-1' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_REASON_CODE');
  });

  test('dismiss records reason + flips state', async () => {
    const insight = makeFakeInsight();
    const svc = createInsightsService({
      insightModel: { model: { findById: async () => insight } },
    });
    const r = await svc.dismissInsight({
      insightId: 'i-1',
      reasonCode: 'noise',
      note: 'duplicate of jira',
      actor: { userId: 'u-1' },
    });
    expect(r.ok).toBe(true);
    expect(insight.state).toBe('dismissed');
    expect(insight.feedback.dismissReasons[0]).toMatchObject({
      reasonCode: 'noise',
      note: 'duplicate of jira',
    });
  });

  test('addNote rejects empty + too-long text', async () => {
    const insight = makeFakeInsight();
    const svc = createInsightsService({
      insightModel: { model: { findById: async () => insight } },
    });
    expect((await svc.addNote({ insightId: 'i-1', text: '', actor: { userId: 'u' } })).reason).toBe(
      'NOTE_TEXT_REQUIRED'
    );
    expect(
      (await svc.addNote({ insightId: 'i-1', text: 'x'.repeat(2001), actor: { userId: 'u' } }))
        .reason
    ).toBe('NOTE_TEXT_TOO_LONG');
  });
});

// ─── Base generator helpers ──────────────────────────────────────
describe('generators/base — helpers', () => {
  test('defineGenerator rejects missing fields', () => {
    expect(() => defineGenerator({})).toThrow();
    expect(() => defineGenerator({ id: 'x', kind: 'care-gap' })).toThrow();
    expect(() =>
      defineGenerator({
        id: 'x',
        kind: 'care-gap',
        category: 'clinical',
        scope: 'entity',
        evaluate: 'not-a-function',
      })
    ).toThrow();
  });

  test('defineGenerator accepts a valid spec', () => {
    const spec = defineGenerator({
      id: 'x.v1',
      kind: 'anomaly',
      category: 'operational',
      scope: 'branch',
      evaluate: async () => [],
    });
    expect(spec.id).toBe('x.v1');
  });

  test('digestOf is order-stable across object key orderings', () => {
    const a = digestOf({ x: 1, y: 2 });
    const b = digestOf({ y: 2, x: 1 });
    expect(a).toBe(b);
  });

  test('severityFromScore + confidenceLevelFromScore map correctly', () => {
    expect(severityFromScore(0.9)).toBe('critical');
    expect(severityFromScore(0.7)).toBe('high');
    expect(severityFromScore(0.5)).toBe('medium');
    expect(severityFromScore(0.2)).toBe('low');

    expect(confidenceLevelFromScore(0.9)).toBe('high');
    expect(confidenceLevelFromScore(0.7)).toBe('medium');
    expect(confidenceLevelFromScore(0.3)).toBe('low');
  });

  test('buildPayload fills in source.* + generatedAt', () => {
    const payload = buildPayload(
      { id: 'g.v1', kind: 'care-gap', category: 'clinical', scope: 'entity' },
      {
        rawInput: { k: 'v' },
        titleAr: 'عنوان عربي طويل',
        titleEn: 'English title is long enough',
        summaryAr: 'ملخص باللغة العربية مطلوب',
        summaryEn: 'English summary is mandatory',
        severity: 'medium',
        confidence: { level: 'medium', score: 0.7, factors: ['data is fresh'] },
        reasoning: {
          bulletsAr: ['a', 'b'],
          bulletsEn: ['a', 'b'],
          supportingFacts: [{ labelAr: 'l', labelEn: 'l', value: 1 }],
        },
      }
    );
    expect(payload.source.generatorId).toBe('g.v1');
    expect(payload.source.inputDigest).toMatch(/^[a-f0-9]{40}$/);
    expect(payload.kind).toBe('care-gap');
  });
});

// ─── computeInputDigest in service ───────────────────────────────
describe('insights service — computeInputDigest', () => {
  test('produces the same hash as base.digestOf for same input', () => {
    const input = { x: 1, y: 'foo' };
    expect(computeInputDigest(input)).toBe(digestOf(input));
  });
});

// ─── care-gap generator ──────────────────────────────────────────
describe('care-gap generator — evaluate()', () => {
  function makeBeneficiary(overrides = {}) {
    return {
      _id: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      fileNumber: 'F-001',
      lastAssessmentAt: new Date(),
      tenureDays: 365,
      activeCarePlan: { _id: 'p-1', reviewDate: null },
      activeGoals: [],
      dueVaccinations: [],
      ...overrides,
    };
  }

  test('returns [] for a beneficiary with no gaps', async () => {
    const payloads = await careGapGenerator.evaluate({
      beneficiaries: [makeBeneficiary()],
      now: new Date('2026-05-17T00:00:00Z'),
    });
    expect(payloads).toEqual([]);
  });

  test('detects plan-review-overdue', async () => {
    const now = new Date('2026-05-17T00:00:00Z');
    const payloads = await careGapGenerator.evaluate({
      beneficiaries: [
        makeBeneficiary({
          activeCarePlan: {
            _id: 'p-1',
            reviewDate: new Date('2026-05-01T00:00:00Z'),
            planNumber: 'CP-1',
          },
        }),
      ],
      now,
    });
    expect(payloads).toHaveLength(1);
    expect(payloads[0].kind).toBe('care-gap');
    expect(payloads[0].severity).toBe('low'); // only 1 gap
    expect(payloads[0].reasoning.supportingFacts[0].value).toBe(16); // 16 days overdue
  });

  test('detects multiple gaps and elevates severity', async () => {
    const now = new Date('2026-05-17T00:00:00Z');
    const payloads = await careGapGenerator.evaluate({
      beneficiaries: [
        makeBeneficiary({
          activeCarePlan: { _id: 'p', reviewDate: new Date('2026-05-01T00:00:00Z') },
          activeGoals: [
            { _id: 'g1', status: 'in-progress', lastProgressAt: new Date('2026-03-01') },
            { _id: 'g2', status: 'in-progress', lastProgressAt: null },
          ],
          dueVaccinations: [{ _id: 'v1', dueDate: new Date('2026-04-01'), vaccineName: 'MMR' }],
        }),
      ],
      now,
    });
    expect(payloads).toHaveLength(1);
    // 3 gaps → severity = 'high'
    expect(payloads[0].severity).toBe('high');
    expect(payloads[0].reasoning.supportingFacts).toHaveLength(3);
    expect(payloads[0].suggestedActions).toHaveLength(3);
  });

  test('reduces confidence when assessment data is missing', async () => {
    const now = new Date('2026-05-17T00:00:00Z');
    const payloads = await careGapGenerator.evaluate({
      beneficiaries: [
        makeBeneficiary({
          lastAssessmentAt: null,
          activeCarePlan: { _id: 'p', reviewDate: new Date('2026-05-01') },
        }),
      ],
      now,
    });
    expect(payloads[0].confidence.score).toBeLessThan(0.85);
    expect(payloads[0].confidence.factors.some(f => f.includes('تقييم'))).toBe(true);
  });

  test('payload survives the Insight schema G-validators', async () => {
    const now = new Date('2026-05-17T00:00:00Z');
    const payloads = await careGapGenerator.evaluate({
      beneficiaries: [
        makeBeneficiary({
          activeCarePlan: { _id: 'p', reviewDate: new Date('2026-05-01') },
          activeGoals: [
            { _id: 'g1', status: 'in-progress', lastProgressAt: new Date('2026-03-01') },
          ],
        }),
      ],
      now,
    });
    expect(payloads).toHaveLength(1);
    // Instantiate against the canonical schema — this is the end-to-end
    // check that the generator output is G-compliant.
    const doc = new Insight(payloads[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('a thrown gap-check does not crash the tick', async () => {
    // Inject a bad beneficiary that would trigger an exception in
    // `checkStalledGoals` if it doesn't defensively guard.
    const broken = {
      _id: 'b-broken',
      branchId: null,
      activeCarePlan: { reviewDate: 'not-a-date' },
      activeGoals: 'not-an-array',
    };
    const payloads = await careGapGenerator.evaluate({ beneficiaries: [broken] });
    // Either no payload (gaps fail silently) or one payload with the
    // gaps that did succeed — but NEVER a thrown exception.
    expect(Array.isArray(payloads)).toBe(true);
  });

  test('skips beneficiaries with no _id', async () => {
    const payloads = await careGapGenerator.evaluate({
      beneficiaries: [{ fileNumber: 'orphan' }],
    });
    expect(payloads).toEqual([]);
  });

  test('emits stable inputDigest across ticks with same gap signature', async () => {
    const now = new Date('2026-05-17T00:00:00Z');
    const ben = {
      _id: new mongoose.Types.ObjectId(),
      branchId: null,
      activeCarePlan: { _id: 'p', reviewDate: new Date('2026-05-01') },
    };
    const a = await careGapGenerator.evaluate({ beneficiaries: [ben], now });
    const b = await careGapGenerator.evaluate({ beneficiaries: [ben], now });
    expect(a[0].source.inputDigest).toBe(b[0].source.inputDigest);
  });
});

// ─── _internal gap-check unit tests ──────────────────────────────
describe('care-gap _internal — individual checks', () => {
  const _i = careGapGenerator._internal;
  const now = new Date('2026-05-17T00:00:00Z');

  test('checkCarePlanReviewOverdue returns null when reviewDate is null', () => {
    expect(_i.checkCarePlanReviewOverdue({ activeCarePlan: { reviewDate: null } }, now)).toBe(null);
  });

  test('checkCarePlanReviewOverdue returns gap when reviewDate < now', () => {
    const gap = _i.checkCarePlanReviewOverdue(
      { activeCarePlan: { reviewDate: new Date('2026-05-01') } },
      now
    );
    expect(gap).toBeTruthy();
    expect(gap.value).toBe(16);
  });

  test('checkStalledGoals counts goals with no lastProgressAt as stalled', () => {
    const gap = _i.checkStalledGoals(
      { activeGoals: [{ status: 'in-progress', lastProgressAt: null }] },
      now
    );
    expect(gap).toBeTruthy();
    expect(gap.value).toBe(1);
  });

  test('checkStalledGoals respects custom stalledDays option', () => {
    const ben = {
      activeGoals: [{ status: 'in-progress', lastProgressAt: new Date('2026-05-10') }],
    };
    expect(_i.checkStalledGoals(ben, now, { stalledDays: 30 })).toBe(null);
    expect(_i.checkStalledGoals(ben, now, { stalledDays: 5 })).toBeTruthy();
  });

  test('severityFromGapCount: 5+ → critical, 3-4 → high, 2 → medium, 1 → low', () => {
    const fakeGaps = n => Array(n).fill({});
    expect(_i.severityFromGapCount(fakeGaps(6))).toBe('critical');
    expect(_i.severityFromGapCount(fakeGaps(3))).toBe('high');
    expect(_i.severityFromGapCount(fakeGaps(2))).toBe('medium');
    expect(_i.severityFromGapCount(fakeGaps(1))).toBe('low');
  });
});
