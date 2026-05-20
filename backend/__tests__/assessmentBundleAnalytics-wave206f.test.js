'use strict';

/**
 * Wave 206f — bundle analytics tests.
 *
 * Pure unit tests against the factory. Models mocked.
 */

const createAnalytics = require('../services/assessmentBundleAnalytics.service');

function makeBundleMock() {
  return { aggregate: jest.fn() };
}

describe('Wave 206f — assessmentBundleAnalytics', () => {
  test('factory rejects missing bundle model', () => {
    expect(() => createAnalytics({})).toThrow(/bundle/i);
  });

  test('getVolume returns series + totals', async () => {
    const model = makeBundleMock();
    // First call: series; second call: totals
    model.aggregate
      .mockResolvedValueOnce([
        { date: '2026-05-19', count: 3 },
        { date: '2026-05-20', count: 5 },
      ])
      .mockResolvedValueOnce([
        {
          _id: null,
          total: 8,
          uniqueBeneficiaries: ['b1', 'b2', null],
          uniqueTherapists: ['t1', 't2'],
        },
      ]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const v = await analytics.getVolume({});
    expect(v.total).toBe(8);
    expect(v.uniqueBeneficiaries).toBe(2);
    expect(v.uniqueTherapists).toBe(2);
    expect(v.series).toHaveLength(2);
    expect(v.from).toBeTruthy();
    expect(v.to).toBeTruthy();
  });

  test('getAcceptRate computes goalAcceptRate + programAcceptRate', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([
      {
        _id: null,
        totalBundles: 10,
        totalAcceptedGoals: 20,
        totalSuggestedGoals: 30,
        totalAcceptedPrograms: 8,
        totalSuggestedPrograms: 12,
        bundlesWithSuggestedData: 8,
      },
    ]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const r = await analytics.getAcceptRate({});
    expect(r.goalAcceptRate).toBeCloseTo(20 / 30, 4);
    expect(r.programAcceptRate).toBeCloseTo(8 / 12, 4);
    expect(r.coverageRatio).toBeCloseTo(0.8, 4);
  });

  test('getAcceptRate handles zero bundles gracefully', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const r = await analytics.getAcceptRate({});
    expect(r.totalBundles).toBe(0);
    expect(r.goalAcceptRate).toBe(0);
    expect(r.programAcceptRate).toBe(0);
  });

  test('getConfidenceDistribution returns fixed-shape object', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([
      { _id: 'high', count: 12 },
      { _id: 'medium', count: 5 },
      { _id: 'needs_therapist_review', count: 2 },
      { _id: null, count: 1 }, // bad data row ignored
    ]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const c = await analytics.getConfidenceDistribution({});
    expect(c.high).toBe(12);
    expect(c.medium).toBe(5);
    expect(c.needs_therapist_review).toBe(2);
  });

  test('getLlmAdoption computes adoption rate', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([{ _id: null, total: 20, refined: 13 }]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const a = await analytics.getLlmAdoption({});
    expect(a.total).toBe(20);
    expect(a.refined).toBe(13);
    expect(a.adoptionRate).toBeCloseTo(0.65, 4);
  });

  test('getLlmAdoption returns 0 when no bundles', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const a = await analytics.getLlmAdoption({});
    expect(a.total).toBe(0);
    expect(a.adoptionRate).toBe(0);
  });

  test('getMeasureBreakdown returns sorted list', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([
      { measureKey: 'GMFCS', count: 12, acceptedGoalsTotal: 30 },
      { measureKey: 'CARS2', count: 8, acceptedGoalsTotal: 22 },
    ]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const m = await analytics.getMeasureBreakdown({});
    expect(m).toHaveLength(2);
    expect(m[0].measureKey).toBe('GMFCS');
  });

  test('getTherapistBreakdown returns array', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([
      {
        therapistId: 't1',
        bundles: 5,
        acceptedGoals: 12,
        suggestedGoals: 18,
        acceptRate: 0.666,
        highConfidence: 4,
      },
    ]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const t = await analytics.getTherapistBreakdown({});
    expect(t).toHaveLength(1);
    expect(t[0].therapistId).toBe('t1');
  });

  test('getReport invokes every metric in parallel', async () => {
    const model = makeBundleMock();
    // 6 calls total (volume = 2 aggregates, the rest 1 each)
    model.aggregate
      .mockResolvedValueOnce([]) // volume series
      .mockResolvedValueOnce([]) // volume totals
      .mockResolvedValueOnce([]) // accept rate
      .mockResolvedValueOnce([]) // confidence
      .mockResolvedValueOnce([]) // llm
      .mockResolvedValueOnce([]) // measures
      .mockResolvedValueOnce([]); // therapists
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    const report = await analytics.getReport({});
    expect(report).toHaveProperty('volume');
    expect(report).toHaveProperty('acceptRate');
    expect(report).toHaveProperty('confidence');
    expect(report).toHaveProperty('llm');
    expect(report).toHaveProperty('measures');
    expect(report).toHaveProperty('therapists');
    expect(model.aggregate).toHaveBeenCalledTimes(7);
  });

  test('therapistId + branchId filters propagate into the match', async () => {
    const model = makeBundleMock();
    model.aggregate.mockResolvedValueOnce([]);
    const analytics = createAnalytics({ AssessmentRecommendationBundle: model });
    await analytics.getAcceptRate({ therapistId: 'T1', branchId: 'B1' });
    const callArg = model.aggregate.mock.calls[0][0];
    expect(callArg[0].$match.therapist).toBe('T1');
    expect(callArg[0].$match.branch).toBe('B1');
  });
});
