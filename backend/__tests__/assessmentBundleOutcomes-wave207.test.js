'use strict';

/**
 * Wave 207 — bundle outcomes tests.
 *
 * Pure unit tests against the factory. Bundle model mocked.
 */

const createOutcomes = require('../services/assessmentBundleOutcomes.service');

function makeBundleMock(docs = []) {
  return {
    find: jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(docs),
    })),
  };
}

const T0 = new Date('2026-01-01T10:00:00Z');
const T1 = new Date('2026-02-01T10:00:00Z');
const T2 = new Date('2026-04-01T10:00:00Z');

describe('Wave 207 — assessmentBundleOutcomes', () => {
  test('factory rejects missing model', () => {
    expect(() => createOutcomes({})).toThrow(/bundle/i);
  });

  describe('extractScore', () => {
    test('returns level when present', () => {
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock() });
      expect(svc.extractScore({ level: 3 })).toBe(3);
    });
    test('returns totalScore when present', () => {
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock() });
      expect(svc.extractScore({ totalScore: 45 })).toBe(45);
    });
    test('returns standardScore when present', () => {
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock() });
      expect(svc.extractScore({ standardScore: 70 })).toBe(70);
    });
    test('returns null for empty / malformed entries', () => {
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock() });
      expect(svc.extractScore(null)).toBeNull();
      expect(svc.extractScore({})).toBeNull();
      expect(svc.extractScore({ level: 'high' })).toBeNull();
    });
  });

  describe('getMeasureTimelines', () => {
    test('groups scores per measureKey ordered chronologically', async () => {
      const docs = [
        {
          _id: 'b1',
          createdAt: T0,
          scoresInput: [{ measureKey: 'GMFCS', level: 4 }],
        },
        {
          _id: 'b2',
          createdAt: T1,
          scoresInput: [{ measureKey: 'GMFCS', level: 3 }],
        },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      expect(m.get('GMFCS')).toHaveLength(2);
      expect(m.get('GMFCS')[0].score).toBe(4);
      expect(m.get('GMFCS')[1].score).toBe(3);
    });

    test('skips entries with no extractable score', async () => {
      const docs = [
        {
          _id: 'b1',
          createdAt: T0,
          scoresInput: [{ measureKey: 'CARS2' /* no totalScore */ }],
        },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      expect(m.size).toBe(0);
    });
  });

  describe('computeDeltas', () => {
    test('GMFCS level 4 → 3 → improving (lower-better)', async () => {
      const docs = [
        { _id: 'b1', createdAt: T0, scoresInput: [{ measureKey: 'GMFCS', level: 4 }] },
        { _id: 'b2', createdAt: T1, scoresInput: [{ measureKey: 'GMFCS', level: 3 }] },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      const deltas = svc.computeDeltas(m);
      const gmfcs = deltas.find(d => d.measureKey === 'GMFCS');
      expect(gmfcs.delta).toBe(-1);
      expect(gmfcs.direction).toBe('improving');
      expect(gmfcs.higherBetter).toBe(false);
    });

    test('FIM 60 → 90 → improving (higher-better)', async () => {
      const docs = [
        { _id: 'b1', createdAt: T0, scoresInput: [{ measureKey: 'FIM', totalScore: 60 }] },
        { _id: 'b2', createdAt: T1, scoresInput: [{ measureKey: 'FIM', totalScore: 90 }] },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      const deltas = svc.computeDeltas(m);
      expect(deltas[0].direction).toBe('improving');
      expect(deltas[0].delta).toBe(30);
    });

    test('CARS2 35 → 45 → declining (higher = more severe)', async () => {
      const docs = [
        { _id: 'b1', createdAt: T0, scoresInput: [{ measureKey: 'CARS2', totalScore: 35 }] },
        { _id: 'b2', createdAt: T1, scoresInput: [{ measureKey: 'CARS2', totalScore: 45 }] },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      const deltas = svc.computeDeltas(m);
      expect(deltas[0].direction).toBe('declining');
    });

    test('Vineland3 60 → 62 (within steady band 5) → steady', async () => {
      const docs = [
        { _id: 'b1', createdAt: T0, scoresInput: [{ measureKey: 'Vineland3', standardScore: 60 }] },
        { _id: 'b2', createdAt: T1, scoresInput: [{ measureKey: 'Vineland3', standardScore: 62 }] },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      const deltas = svc.computeDeltas(m);
      expect(deltas[0].direction).toBe('steady');
    });

    test('single point → insufficient', async () => {
      const docs = [{ _id: 'b1', createdAt: T0, scoresInput: [{ measureKey: 'GMFCS', level: 3 }] }];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      const deltas = svc.computeDeltas(m);
      expect(deltas[0].direction).toBe('insufficient');
    });

    test('deltas sorted so declining surfaces first', async () => {
      const docs = [
        {
          _id: 'b1',
          createdAt: T0,
          scoresInput: [
            { measureKey: 'GMFCS', level: 3 },
            { measureKey: 'CARS2', totalScore: 30 },
          ],
        },
        {
          _id: 'b2',
          createdAt: T1,
          scoresInput: [
            { measureKey: 'GMFCS', level: 3 }, // steady
            { measureKey: 'CARS2', totalScore: 45 }, // declining
          ],
        },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const m = await svc.getMeasureTimelines('bene1');
      const deltas = svc.computeDeltas(m);
      expect(deltas[0].direction).toBe('declining');
      expect(deltas[0].measureKey).toBe('CARS2');
    });
  });

  describe('getOutcomeReport', () => {
    test('returns full report with summary', async () => {
      const docs = [
        {
          _id: 'b1',
          createdAt: T0,
          scoresInput: [
            { measureKey: 'GMFCS', level: 4 },
            { measureKey: 'CARS2', totalScore: 40 },
          ],
        },
        {
          _id: 'b2',
          createdAt: T1,
          scoresInput: [
            { measureKey: 'GMFCS', level: 3 }, // improving
            { measureKey: 'CARS2', totalScore: 35 }, // improving (lower = better)
          ],
        },
        {
          _id: 'b3',
          createdAt: T2,
          scoresInput: [
            { measureKey: 'GMFCS', level: 3 }, // steady from b2 (latest pair was -1)
          ],
        },
      ];
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock(docs) });
      const report = await svc.getOutcomeReport('bene1');
      expect(report.summary.measuresTracked).toBe(2);
      expect(report.summary.improving).toBeGreaterThanOrEqual(1);
      // GMFCS timeline contains all 3 points
      const gmfcsTimeline = report.timelines.find(t => t.measureKey === 'GMFCS');
      expect(gmfcsTimeline.points).toHaveLength(3);
    });

    test('no bundles → empty summary, no errors', async () => {
      const svc = createOutcomes({ AssessmentRecommendationBundle: makeBundleMock([]) });
      const report = await svc.getOutcomeReport('bene1');
      expect(report.summary.measuresTracked).toBe(0);
      expect(report.deltas).toEqual([]);
      expect(report.timelines).toEqual([]);
    });
  });
});
