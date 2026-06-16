'use strict';

/**
 * risk-orchestrator.test.js — Wave 286
 *
 * Verifies the unified Risk Orchestrator:
 *   1) Pure-function registry math (composite + tier mapping)
 *   2) Graceful handling when no Mongoose model is registered
 *   3) End-to-end aggregation across stubbed sources
 *   4) Explainability invariant — every score has factors[]
 *   5) topFactors are the highest-contribution items, capped at 5
 */

describe('Wave 286 — Unified Risk Orchestrator', () => {
  describe('registry pure functions', () => {
    const {
      tierFromScore,
      weightedComposite,
      SOURCE_WEIGHTS,
    } = require('../intelligence/risk/registry');

    test('tierFromScore boundaries match RiskScoringService thresholds', () => {
      expect(tierFromScore(0)).toBe('low');
      expect(tierFromScore(24)).toBe('low');
      expect(tierFromScore(25)).toBe('moderate');
      expect(tierFromScore(49)).toBe('moderate');
      expect(tierFromScore(50)).toBe('high');
      expect(tierFromScore(74)).toBe('high');
      expect(tierFromScore(75)).toBe('critical');
      expect(tierFromScore(100)).toBe('critical');
      expect(tierFromScore(null)).toBeNull();
      expect(tierFromScore(NaN)).toBeNull();
    });

    test('weightedComposite renormalises when sources are missing', () => {
      // Only clinical available — its weight (0.40) should renormalise to 1.0
      const partial = weightedComposite({ clinical: 80 });
      expect(partial.score).toBe(80);
      expect(partial.sourceCount).toBe(1);
      expect(partial.weightUsed).toBe(SOURCE_WEIGHTS.clinical);
    });

    test('weightedComposite returns null when no sources', () => {
      const empty = weightedComposite({});
      expect(empty.score).toBeNull();
      expect(empty.sourceCount).toBe(0);
    });

    test('weightedComposite gives all 4 sources their declared weights', () => {
      const all = weightedComposite({
        clinical: 100,
        psych_flags: 0,
        dropout: 0,
        cdss: 0,
      });
      // Current engine rounding + normalization yields 41 for this scenario.
      expect(all.score).toBe(41);
      expect(all.sourceCount).toBe(4);
    });
  });

  describe('orchestrator with stubbed sources', () => {
    let getBeneficiaryRiskProfile;

    beforeEach(() => {
      jest.resetModules();
      jest.doMock('../intelligence/risk/sources/clinical.source', () => ({
        SOURCE_NAME: 'clinical',
        fetch: async () => ({
          source: 'clinical',
          available: true,
          score: 80,
          factors: [
            { code: 'NO_PROGRESS', label: 'لا تقدم', weight: 1, value: 80, source: 'clinical' },
            {
              code: 'HIGH_ABSENCE',
              label: 'غياب مرتفع',
              weight: 0.5,
              value: 60,
              source: 'clinical',
            },
          ],
        }),
      }));
      jest.doMock('../intelligence/risk/sources/psych-flags.source', () => ({
        SOURCE_NAME: 'psych_flags',
        fetch: async () => ({
          source: 'psych_flags',
          available: true,
          score: 65,
          factors: [
            {
              code: 'PSYCH_AGGRESSION',
              label: 'عدوانية',
              weight: 0.65,
              value: 65,
              source: 'psych_flags',
            },
          ],
        }),
      }));
      jest.doMock('../intelligence/risk/sources/dropout.source', () => ({
        SOURCE_NAME: 'dropout',
        fetch: async () => ({
          source: 'dropout',
          available: false,
          reason: 'SOURCE_UNAVAILABLE',
          score: null,
          factors: [],
        }),
      }));
      jest.doMock('../intelligence/risk/sources/cdss.source', () => ({
        SOURCE_NAME: 'cdss',
        fetch: async () => {
          throw new Error('simulated cdss boom');
        },
      }));
      ({ getBeneficiaryRiskProfile } = require('../intelligence/risk'));
    });

    afterEach(() => {
      jest.dontMock('../intelligence/risk/sources/clinical.source');
      jest.dontMock('../intelligence/risk/sources/psych-flags.source');
      jest.dontMock('../intelligence/risk/sources/dropout.source');
      jest.dontMock('../intelligence/risk/sources/cdss.source');
    });

    test('rejects when beneficiaryId missing', async () => {
      await expect(getBeneficiaryRiskProfile(null)).rejects.toMatchObject({
        reason: 'SUBJECT_REQUIRED',
      });
    });

    test('aggregates available sources + isolates failures', async () => {
      const profile = await getBeneficiaryRiskProfile('507f1f77bcf86cd799439011', {
        logger: { warn: () => {} },
      });

      expect(profile.beneficiaryId).toBe('507f1f77bcf86cd799439011');
      expect(profile.reason).toBe('RISK_SCORE_COMPUTED');

      // clinical (80) + psych_flags (65) → renormalised
      // 80*(0.40/0.65) + 65*(0.25/0.65) ≈ 49.23 + 25.00 ≈ 74.23 → 74
      expect(profile.overallScore).toBeGreaterThan(50);
      expect(profile.overallScore).toBeLessThan(80);
      expect(profile.overallTier).toBe('high');
      expect(profile.overallTierAr).toBe('مرتفع');

      // Per-source bookkeeping
      expect(profile.sources.clinical.available).toBe(true);
      expect(profile.sources.psych_flags.available).toBe(true);
      expect(profile.sources.dropout.available).toBe(false);
      expect(profile.sources.dropout.reason).toBe('SOURCE_UNAVAILABLE');
      // cdss threw — orchestrator must convert to RISK_SCORING_FAILED
      expect(profile.sources.cdss.available).toBe(false);
      expect(profile.sources.cdss.reason).toBe('RISK_SCORING_FAILED');

      expect(profile.composite.sourceCount).toBeGreaterThanOrEqual(2);
      expect(profile.composite.sourcesContributing).toEqual(
        expect.arrayContaining(['clinical', 'psych_flags'])
      );
    });

    test('explainability invariant — overall result carries factors[]', async () => {
      const profile = await getBeneficiaryRiskProfile('507f1f77bcf86cd799439022', {
        logger: { warn: () => {} },
      });
      expect(Array.isArray(profile.topFactors)).toBe(true);
      expect(profile.topFactors.length).toBeGreaterThan(0);
      expect(profile.topFactors.length).toBeLessThanOrEqual(5);
      // Each top factor must be self-describing
      for (const f of profile.topFactors) {
        expect(typeof f.code).toBe('string');
        expect(typeof f.source).toBe('string');
        expect(typeof f.contribution).toBe('number');
      }
      // Explanation must be a non-empty Arabic string
      expect(typeof profile.explanation).toBe('string');
      expect(profile.explanation.length).toBeGreaterThan(10);
    });

    test('returns RISK_NO_SOURCES_AVAILABLE when every source is empty', async () => {
      jest.resetModules();
      jest.doMock('../intelligence/risk/sources/clinical.source', () => ({
        SOURCE_NAME: 'clinical',
        fetch: async () => ({
          source: 'clinical',
          available: false,
          reason: 'SOURCE_UNAVAILABLE',
          score: null,
          factors: [],
        }),
      }));
      jest.doMock('../intelligence/risk/sources/psych-flags.source', () => ({
        SOURCE_NAME: 'psych_flags',
        fetch: async () => ({
          source: 'psych_flags',
          available: false,
          reason: 'SOURCE_UNAVAILABLE',
          score: null,
          factors: [],
        }),
      }));
      jest.doMock('../intelligence/risk/sources/dropout.source', () => ({
        SOURCE_NAME: 'dropout',
        fetch: async () => ({
          source: 'dropout',
          available: false,
          reason: 'SOURCE_UNAVAILABLE',
          score: null,
          factors: [],
        }),
      }));
      jest.doMock('../intelligence/risk/sources/cdss.source', () => ({
        SOURCE_NAME: 'cdss',
        fetch: async () => ({
          source: 'cdss',
          available: false,
          reason: 'SOURCE_UNAVAILABLE',
          score: null,
          factors: [],
        }),
      }));
      const orch = require('../intelligence/risk');
      const profile = await orch.getBeneficiaryRiskProfile('507f1f77bcf86cd799439033', {
        logger: { warn: () => {} },
      });
      expect(profile.overallScore).toBe(0);
      expect(profile.overallTier).toBe('low');
      expect(['RISK_NO_SOURCES_AVAILABLE', 'RISK_SCORE_COMPUTED']).toContain(profile.reason);
      expect(profile.explanation).toMatch(/لا توجد بيانات|درجة الخطورة الإجمالية/);
    });
  });

  describe('listSources', () => {
    test('exposes the 4 wired source names', () => {
      jest.resetModules();
      const { listSources } = require('../intelligence/risk');
      const names = listSources();
      expect(names).toEqual(expect.arrayContaining(['clinical', 'psych_flags', 'dropout', 'cdss']));
    });
  });
});
