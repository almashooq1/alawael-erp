'use strict';
/**
 * W1315 — RiskProfile → FHIR R4 RiskAssessment mapper self-test. Pure, no DB.
 */

const {
  riskProfileToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildPrediction,
  buildFactorExtensions,
  buildExtensions,
  STATUS_MAP,
  RISK_TIER_SYSTEM,
  RISK_EPISODE_EXTENSION_URL,
  RISK_COMPOSITE_EXTENSION_URL,
  RISK_FACTOR_EXTENSION_URL,
  RISK_SCORE_EXTENSION_URL,
} = require('../intelligence/fhir/risk-profile-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

/** A fully-populated, canonical-valid RiskProfile fixture. */
const FULL_PROFILE = {
  beneficiaryId: '64a1111111111111111111aa',
  episodeId: '64b2222222222222222222bb',
  overallScore: 72,
  overallTier: 'high',
  overallTierAr: 'مرتفع',
  sources: {
    clinical: {
      source: 'clinical',
      available: true,
      score: 70,
      factors: [],
    },
    dropout: {
      source: 'dropout',
      available: true,
      score: 80,
      factors: [],
    },
  },
  topFactors: [
    {
      code: 'MISSED_SESSIONS',
      label: 'Missed sessions in last 30d',
      source: 'dropout',
      weight: 0.4,
      contribution: 18.2,
    },
    {
      code: 'PLATEAU',
      label: 'Goal plateau',
      source: 'clinical',
      weight: 0.3,
      contribution: 12.1,
    },
  ],
  composite: {
    weightUsed: 0.6,
    sourceCount: 2,
    sourcesContributing: ['clinical', 'dropout'],
  },
  computedAt: '2026-06-15T09:30:00.000Z',
  reason: 'RISK_SCORE_COMPUTED',
  explanation: 'High risk driven by missed sessions and a goal plateau.',
};

/** A canonical-valid no-sources profile. */
const EMPTY_PROFILE = {
  beneficiaryId: '64a1111111111111111111aa',
  overallScore: null,
  overallTier: null,
  overallTierAr: null,
  sources: {},
  topFactors: [],
  composite: { weightUsed: 0, sourceCount: 0, sourcesContributing: [] },
  computedAt: '2026-06-15T09:30:00.000Z',
  reason: 'RISK_NO_SOURCES_AVAILABLE',
  explanation: 'No risk sources were available for this beneficiary.',
};

describe('W1315 RiskProfile → FHIR RiskAssessment — core projection', () => {
  const r = riskProfileToFhir(FULL_PROFILE);

  it('sets resourceType RiskAssessment', () => {
    expect(r.resourceType).toBe('RiskAssessment');
  });

  it('references the beneficiary as the Patient subject', () => {
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });

  it('carries computedAt as occurrenceDateTime', () => {
    expect(r.occurrenceDateTime).toBe('2026-06-15T09:30:00.000Z');
  });

  it('carries the explanation as a note', () => {
    expect(r.note).toEqual([{ text: 'High risk driven by missed sessions and a goal plateau.' }]);
  });

  it('omits id when includeId=false', () => {
    expect(
      riskProfileToFhir({ ...FULL_PROFILE, _id: 'x' }, { includeId: false }).id
    ).toBeUndefined();
  });

  it('emits id when a profile _id is supplied', () => {
    expect(riskProfileToFhir({ ...FULL_PROFILE, _id: 'rp1' }).id).toBe('rp1');
  });
});

describe('W1315 RiskProfile → FHIR RiskAssessment — status value-set', () => {
  it.each([
    ['RISK_SCORE_COMPUTED', 'final'],
    ['RISK_NO_SOURCES_AVAILABLE', 'registered'],
  ])('maps reason %s → status %s', (reason, expected) => {
    expect(toFhirStatus(reason)).toBe(expected);
  });

  it('defaults an absent reason to registered', () => {
    expect(toFhirStatus(undefined)).toBe('registered');
  });

  it('maps an unrecognised reason to entered-in-error', () => {
    expect(toFhirStatus('WAT')).toBe('entered-in-error');
  });

  it('STATUS_MAP covers both canonical reasons', () => {
    expect(Object.keys(STATUS_MAP).sort()).toEqual([
      'RISK_NO_SOURCES_AVAILABLE',
      'RISK_SCORE_COMPUTED',
    ]);
  });
});

describe('W1315 RiskProfile → FHIR RiskAssessment — prediction', () => {
  it('builds a single prediction from the overall score + tier', () => {
    expect(buildPrediction(FULL_PROFILE)).toEqual([
      {
        outcome: { text: 'Overall rehabilitation risk' },
        qualitativeRisk: {
          coding: [{ system: RISK_TIER_SYSTEM, code: 'high' }],
          text: 'مرتفع',
        },
        probabilityDecimal: 0.72,
      },
    ]);
  });

  it('omits the prediction entirely when no score (no-sources case)', () => {
    expect(buildPrediction(EMPTY_PROFILE)).toBeUndefined();
    expect(riskProfileToFhir(EMPTY_PROFILE).prediction).toBeUndefined();
  });

  it('omits qualitativeRisk text when no Arabic tier', () => {
    const p = buildPrediction({ overallScore: 50, overallTier: 'moderate' });
    expect(p[0].qualitativeRisk.text).toBeUndefined();
    expect(p[0].probabilityDecimal).toBe(0.5);
  });
});

describe('W1315 RiskProfile → FHIR RiskAssessment — datetime helper', () => {
  it('coerces a Date instance to a full ISO instant', () => {
    expect(toFhirDateTime(new Date('2026-06-15T09:30:00.000Z'))).toBe('2026-06-15T09:30:00.000Z');
  });

  it('returns undefined for an invalid date', () => {
    expect(toFhirDateTime('nope')).toBeUndefined();
  });
});

describe('W1315 RiskProfile → FHIR RiskAssessment — extensions', () => {
  const ext = buildExtensions(FULL_PROFILE);

  it('carries the episode as an EpisodeOfCare reference extension', () => {
    expect(ext).toContainEqual({
      url: RISK_EPISODE_EXTENSION_URL,
      valueReference: { reference: 'EpisodeOfCare/64b2222222222222222222bb' },
    });
  });

  it('carries the raw 0-100 score as a decimal extension', () => {
    expect(ext).toContainEqual({
      url: RISK_SCORE_EXTENSION_URL,
      valueDecimal: 72,
    });
  });

  it('carries composite weighting as a nested extension', () => {
    expect(ext).toContainEqual({
      url: RISK_COMPOSITE_EXTENSION_URL,
      extension: [
        { url: 'weightUsed', valueDecimal: 0.6 },
        { url: 'sourceCount', valueInteger: 2 },
        { url: 'sourceContributing', valueCode: 'clinical' },
        { url: 'sourceContributing', valueCode: 'dropout' },
      ],
    });
  });

  it('emits one factor extension per explainable top factor', () => {
    const factorExts = ext.filter(e => e.url === RISK_FACTOR_EXTENSION_URL);
    expect(factorExts).toHaveLength(2);
    expect(factorExts[0].extension).toEqual([
      { url: 'code', valueString: 'MISSED_SESSIONS' },
      { url: 'label', valueString: 'Missed sessions in last 30d' },
      { url: 'source', valueCode: 'dropout' },
      { url: 'weight', valueDecimal: 0.4 },
      { url: 'contribution', valueDecimal: 18.2 },
    ]);
  });

  it('skips factors without a code', () => {
    const exts = buildFactorExtensions([null, {}, { code: 'OK', source: 'cdss' }]);
    expect(exts).toHaveLength(1);
    expect(exts[0].extension).toEqual([
      { url: 'code', valueString: 'OK' },
      { url: 'source', valueCode: 'cdss' },
    ]);
  });

  it('emits no episode/score extensions for the empty profile', () => {
    const ext2 = buildExtensions(EMPTY_PROFILE);
    expect(ext2.find(e => e.url === RISK_EPISODE_EXTENSION_URL)).toBeUndefined();
    expect(ext2.find(e => e.url === RISK_SCORE_EXTENSION_URL)).toBeUndefined();
  });
});

describe('W1315 RiskProfile → FHIR RiskAssessment — guards', () => {
  it('throws when profile is missing', () => {
    expect(() => riskProfileToFhir(undefined)).toThrow(TypeError);
  });

  it('throws when beneficiaryId is absent', () => {
    expect(() => riskProfileToFhir({ reason: 'RISK_SCORE_COMPUTED', overallScore: 1 })).toThrow(
      /beneficiaryId/
    );
  });
});

describe('W1315 RiskProfile → FHIR RiskAssessment — canonical conformance', () => {
  it('the full fixture validates against the canonical RiskProfile schema', () => {
    expect(canonical.RiskProfile.safeParse(FULL_PROFILE).success).toBe(true);
  });

  it('the empty fixture validates against the canonical RiskProfile schema', () => {
    expect(canonical.RiskProfile.safeParse(EMPTY_PROFILE).success).toBe(true);
  });

  it('a computed profile maps to a final RiskAssessment with a prediction', () => {
    const r = riskProfileToFhir(FULL_PROFILE);
    expect(r.status).toBe('final');
    expect(r.prediction).toHaveLength(1);
    expect(r.prediction[0].probabilityDecimal).toBe(0.72);
  });

  it('a no-sources profile maps to a registered RiskAssessment, no prediction', () => {
    const r = riskProfileToFhir(EMPTY_PROFILE);
    expect(r.status).toBe('registered');
    expect(r.prediction).toBeUndefined();
  });
});
