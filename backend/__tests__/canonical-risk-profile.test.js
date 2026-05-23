'use strict';
/**
 * canonical-risk-profile.test.js — Wave 287
 *
 * Asserts the canonical RiskProfile contract:
 *   1) Registered in the canonical registry under name 'RiskProfile'.
 *   2) Accepts the live orchestrator output verbatim (no drift).
 *   3) Enforces both refine() invariants:
 *      - overallScore/overallTier nullability must match
 *      - reason ↔ sourceCount/score must agree
 */

const path = require('path');

jest.unmock('mongoose');

describe('Canonical RiskProfile (W287)', () => {
  const { canonical, registry } = require('../intelligence/canonical');

  test('registered under name "RiskProfile"', () => {
    expect(registry.names()).toContain('RiskProfile');
    expect(canonical.RiskProfile).toBeDefined();
    expect(typeof canonical.RiskProfile.safeParse).toBe('function');
  });

  test('accepts a well-formed score-computed profile', () => {
    const profile = {
      beneficiaryId: '507f1f77bcf86cd799439011',
      episodeId: null,
      overallScore: 62,
      overallTier: 'high',
      overallTierAr: 'مرتفع',
      sources: {
        clinical: {
          source: 'clinical',
          available: true,
          score: 62,
          factors: [{ code: 'WEEKLY_INCIDENTS', source: 'clinical', contribution: 0.4 }],
        },
      },
      topFactors: [{ code: 'WEEKLY_INCIDENTS', source: 'clinical', contribution: 0.4 }],
      composite: {
        weightUsed: 0.4,
        sourceCount: 1,
        sourcesContributing: ['clinical'],
      },
      computedAt: new Date().toISOString(),
      reason: 'RISK_SCORE_COMPUTED',
      explanation: 'درجة الخطورة الإجمالية 62/100 (مرتفع).',
    };
    const r = canonical.RiskProfile.safeParse(profile);
    if (!r.success) throw new Error(JSON.stringify(r.error.errors, null, 2));
    expect(r.success).toBe(true);
  });

  test('accepts a no-sources-available profile', () => {
    const profile = {
      beneficiaryId: '507f1f77bcf86cd799439011',
      episodeId: null,
      overallScore: null,
      overallTier: null,
      overallTierAr: null,
      sources: {},
      topFactors: [],
      composite: { weightUsed: 0, sourceCount: 0, sourcesContributing: [] },
      computedAt: new Date().toISOString(),
      reason: 'RISK_NO_SOURCES_AVAILABLE',
      explanation: 'لا توجد بيانات كافية.',
    };
    const r = canonical.RiskProfile.safeParse(profile);
    expect(r.success).toBe(true);
  });

  test('rejects when overallScore is set but tier is null', () => {
    const r = canonical.RiskProfile.safeParse({
      beneficiaryId: '507f1f77bcf86cd799439011',
      overallScore: 50,
      overallTier: null,
      overallTierAr: null,
      sources: {
        clinical: { source: 'clinical', available: true, score: 50, factors: [] },
      },
      topFactors: [],
      composite: { weightUsed: 0.4, sourceCount: 1, sourcesContributing: ['clinical'] },
      computedAt: new Date().toISOString(),
      reason: 'RISK_SCORE_COMPUTED',
      explanation: 'x',
    });
    expect(r.success).toBe(false);
  });

  test('rejects when reason=NO_SOURCES but a source contributed', () => {
    const r = canonical.RiskProfile.safeParse({
      beneficiaryId: '507f1f77bcf86cd799439011',
      overallScore: null,
      overallTier: null,
      overallTierAr: null,
      sources: {},
      topFactors: [],
      composite: { weightUsed: 0.4, sourceCount: 2, sourcesContributing: ['clinical', 'cdss'] },
      computedAt: new Date().toISOString(),
      reason: 'RISK_NO_SOURCES_AVAILABLE',
      explanation: 'x',
    });
    expect(r.success).toBe(false);
  });

  test('end-to-end: live orchestrator output parses cleanly', async () => {
    // Sources return null (no models registered) → orchestrator should
    // ship a fully canonical RIS_NO_SOURCES_AVAILABLE profile.
    jest.resetModules();
    for (const s of ['clinical', 'psych-flags', 'dropout', 'cdss']) {
      jest.doMock(path.join('..', 'intelligence', 'risk', 'sources', `${s}.source.js`), () => ({
        SOURCE_NAME: s.replace('-', '_'),
        async load() {
          return { available: false, reason: 'SOURCE_UNAVAILABLE' };
        },
      }));
    }
    const { getBeneficiaryRiskProfile } = require('../intelligence/risk');
    const profile = await getBeneficiaryRiskProfile('507f1f77bcf86cd799439011', {
      logger: { warn: () => {} },
    });

    const { canonical: canon } = require('../intelligence/canonical');
    const r = canon.RiskProfile.safeParse(profile);
    if (!r.success) throw new Error(JSON.stringify(r.error.errors, null, 2));
    expect(r.success).toBe(true);
  });
});
