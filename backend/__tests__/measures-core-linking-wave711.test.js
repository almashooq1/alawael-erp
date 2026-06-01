'use strict';

/**
 * measures-core-linking-wave711.test.js — W711
 *
 * Coverage for the measures→core connective tissue:
 *   • episode-series-reader  — raw administration rows → enriched measures[]
 *                              → detectDeterioration (PURE adapter).
 *   • plan-recommendation    — deterioration signal → EXPLAINABLE plan-of-care
 *                              PROPOSALS (requiresApproval, never auto-applied).
 *   • measure-scored-event   — canonical `measure.scored` envelope builder
 *                              (informational binding, publishing DEFERRED).
 *
 * All three modules are PURE — no DB / bus / clock mutation, no DB mocking.
 */

const reader = require('../measures/intelligence/episode-series-reader');
const {
  buildPlanRecommendations,
  ACTIONABLE,
} = require('../measures/intelligence/plan-recommendation');
const {
  buildMeasureScoredEvent,
  EVENT_TYPE,
  DOMAIN,
} = require('../measures/intelligence/measure-scored-event');
const { SEVERITY } = require('../measures/intelligence/deterioration');

/** A worsening NRS pain series (lower_better) — 3 points so regression fires. */
const NRS_DECLINING = [
  { measureCode: 'NRS', derivedValue: 1, administeredAt: '2026-01-01' },
  { measureCode: 'NRS', derivedValue: 5, administeredAt: '2026-02-01' },
  { measureCode: 'NRS', derivedValue: 9, administeredAt: '2026-03-01' },
];

/** An improving KATZ ADL series (higher_better). */
const KATZ_IMPROVING = [
  { measureCode: 'KATZ', value: 2, date: '2026-01-05' },
  { measureCode: 'KATZ', value: 4, date: '2026-02-05' },
  { measureCode: 'KATZ', value: 6, date: '2026-03-05' },
];

describe('episode-series-reader — buildMeasuresFromAdministrations', () => {
  test('groups rows by measureCode and orders chronologically', () => {
    const shuffled = [NRS_DECLINING[2], NRS_DECLINING[0], NRS_DECLINING[1]];
    const measures = reader.buildMeasuresFromAdministrations(shuffled);
    expect(measures).toHaveLength(1);
    const nrs = measures[0];
    expect(nrs.measureCode).toBe('NRS');
    expect(nrs.administrations.map(a => a.value)).toEqual([1, 5, 9]);
  });

  test('enriches direction / cutoff / latestBandSeverity from the scoring registry', () => {
    const [nrs] = reader.buildMeasuresFromAdministrations(NRS_DECLINING);
    expect(nrs.direction).toBe('lower_better');
    expect(nrs.cutoff).toBe(4);
    // latest value 9 → NRS interpret severe_pain → 'critical'
    expect(nrs.latestBandSeverity).toBe('critical');
  });

  test('tolerates mixed field names (derivedValue/value, administeredAt/date)', () => {
    const mixed = [
      { code: 'KATZ', score: 3, scoredAt: '2026-01-01' },
      { measure_code: 'KATZ', derived_value: 5, recordedAt: '2026-02-01' },
    ];
    const [k] = reader.buildMeasuresFromAdministrations(mixed);
    expect(k.measureCode).toBe('KATZ');
    expect(k.administrations.map(a => a.value)).toEqual([3, 5]);
  });

  test('skips malformed rows without throwing', () => {
    const dirty = [
      null,
      { measureCode: 'NRS' }, // no value/date
      { measureCode: 'NRS', derivedValue: 'x', administeredAt: '2026-01-01' }, // NaN
      { measureCode: 'NRS', derivedValue: 4, administeredAt: '2026-01-01' }, // valid
    ];
    const measures = reader.buildMeasuresFromAdministrations(dirty);
    expect(measures).toHaveLength(1);
    expect(measures[0].administrations).toHaveLength(1);
  });

  test('unknown measure code falls back to neutral direction, no band', () => {
    const [m] = reader.buildMeasuresFromAdministrations([
      { measureCode: 'NOPE', value: 5, date: '2026-01-01' },
    ]);
    expect(m.direction).toBe('neutral');
    expect(m.latestBandSeverity).toBeNull();
  });
});

describe('episode-series-reader — analyzeEpisode', () => {
  test('flags critical deterioration on a worsening series and keeps episode identity', () => {
    const res = reader.analyzeEpisode({
      episodeId: 'EP1',
      beneficiaryId: 'B1',
      administrations: [...NRS_DECLINING, ...KATZ_IMPROVING],
    });
    expect(res.episodeId).toBe('EP1');
    expect(res.beneficiaryId).toBe('B1');
    expect(res.summary.status).toBe(SEVERITY.CRITICAL);
    const nrs = res.signals.find(s => s.measureCode === 'NRS');
    expect(nrs.severity).toBe(SEVERITY.CRITICAL);
    expect(nrs.declining).toBe(true);
    const katz = res.signals.find(s => s.measureCode === 'KATZ');
    expect(katz.declining).toBe(false);
  });

  test('empty episode → insufficient, no crash', () => {
    const res = reader.analyzeEpisode({ administrations: [] });
    expect(res.summary.status).toBe(SEVERITY.INSUFFICIENT);
    expect(res.signals).toHaveLength(0);
    expect(res.episodeId).toBeNull();
  });
});

describe('plan-recommendation — buildPlanRecommendations', () => {
  const deterioration = reader.analyzeEpisode({
    episodeId: 'EP1',
    beneficiaryId: 'B1',
    administrations: [...NRS_DECLINING, ...KATZ_IMPROVING],
  });

  test('only actionable severities yield proposals (improving KATZ excluded)', () => {
    const recs = buildPlanRecommendations(deterioration);
    expect(recs).toHaveLength(1);
    expect(recs[0].measureCode).toBe('NRS');
    expect(ACTIONABLE.has(recs[0].severity)).toBe(true);
  });

  test('every proposal is governance-gated: proposed + requiresApproval + not auto-applied', () => {
    const recs = buildPlanRecommendations(deterioration);
    for (const r of recs) {
      expect(r.status).toBe('proposed');
      expect(r.requiresApproval).toBe(true);
      expect(r.autoApplied).toBe(false);
      expect(Array.isArray(r.approverRoles)).toBe(true);
      expect(r.approverRoles.length).toBeGreaterThan(0);
    }
  });

  test('proposal is fully explainable — carries the evidence it rests on', () => {
    const [r] = buildPlanRecommendations(deterioration);
    expect(r.evidence).toBeTruthy();
    expect(r.evidence.classification).toBe('regression');
    expect(Array.isArray(r.evidence.reasons)).toBe(true);
    expect(r.evidence.latestValue).toBe(9);
    expect(r.evidence.previousValue).toBe(5);
    expect(typeof r.rationale_ar).toBe('string');
    expect(r.rationale_en).toMatch(/Plan-of-care review proposed for NRS/);
    expect(Array.isArray(r.suggestedActions)).toBe(true);
    expect(r.suggestedActions.length).toBeGreaterThan(0);
  });

  test('critical severity → urgent urgency + 24h SLA', () => {
    const [r] = buildPlanRecommendations(deterioration);
    expect(r.severity).toBe(SEVERITY.CRITICAL);
    expect(r.urgency).toBe('urgent');
    expect(r.slaHours).toBe(24);
  });

  test('proposals sorted worst-first by priority', () => {
    const recs = buildPlanRecommendations(deterioration);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].priority).toBeGreaterThanOrEqual(recs[i].priority);
    }
  });

  test('context override wins over result-embedded identity', () => {
    const recs = buildPlanRecommendations(deterioration, {
      episodeId: 'OVERRIDE',
      beneficiaryId: 'B9',
    });
    expect(recs[0].episodeId).toBe('OVERRIDE');
    expect(recs[0].beneficiaryId).toBe('B9');
  });

  test('empty / stable input → no proposals', () => {
    expect(buildPlanRecommendations({ signals: [] })).toEqual([]);
    expect(buildPlanRecommendations({})).toEqual([]);
  });
});

describe('measure-scored-event — buildMeasureScoredEvent', () => {
  test('builds the canonical envelope with informational binding', () => {
    const ev = buildMeasureScoredEvent({
      measureCode: 'NRS',
      beneficiaryId: 'B1',
      episodeId: 'EP1',
      administrationId: 'A1',
      derivedValue: 9,
      interpretation: {
        band: 'severe_pain',
        severity: 'critical',
        label_ar: 'ألم شديد',
        label_en: 'Severe pain',
      },
      scoredAt: '2026-03-01T00:00:00Z',
      scoredBy: 'U1',
    });
    expect(ev.eventType).toBe(EVENT_TYPE);
    expect(ev.domain).toBe(DOMAIN);
    expect(ev.version).toBe(1);
    expect(ev.binding).toBe('informational');
    expect(ev.occurredAt).toBe('2026-03-01T00:00:00.000Z');
    expect(ev.data.measureCode).toBe('NRS');
    expect(ev.data.derivedValue).toBe(9);
    expect(ev.data.severity).toBe('critical');
    expect(ev.data.label_en).toBe('Severe pain');
    expect(ev.data.scoredBy).toBe('U1');
  });

  test('interpretation is optional → null band/severity, still valid', () => {
    const ev = buildMeasureScoredEvent({
      measureCode: 'KATZ',
      beneficiaryId: 'B1',
      derivedValue: 6,
    });
    expect(ev.data.band).toBeNull();
    expect(ev.data.severity).toBeNull();
    expect(ev.data.episodeId).toBeNull();
    expect(ev.data.administrationId).toBeNull();
  });

  test('rejects missing measureCode / beneficiaryId / non-numeric value', () => {
    expect(() => buildMeasureScoredEvent({ beneficiaryId: 'B1', derivedValue: 1 })).toThrow(
      /measureCode/
    );
    expect(() => buildMeasureScoredEvent({ measureCode: 'NRS', derivedValue: 1 })).toThrow(
      /beneficiaryId/
    );
    expect(() =>
      buildMeasureScoredEvent({ measureCode: 'NRS', beneficiaryId: 'B1', derivedValue: 'x' })
    ).toThrow(/derivedValue/);
  });
});
