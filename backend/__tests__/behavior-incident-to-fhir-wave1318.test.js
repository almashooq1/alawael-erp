'use strict';
/**
 * W1318 — BehaviorIncident → FHIR R4 Observation mapper tests.
 *
 * Verifies the ninth FHIR resource projection (Item 10). Pure-function unit
 * tests + a canonical round-trip.
 */

const {
  behaviorIncidentToFhir,
  toFhirDateTime,
  buildCode,
  buildInterpretation,
  buildComponents,
  buildExtensions,
  SEVERITY_INTERPRETATION,
  BEHAVIOR_CODE_SYSTEM,
  BEHAVIOR_CODE,
  BEHAVIOR_ABC_SYSTEM,
  BEHAVIOR_DURATION_EXTENSION_URL,
  BEHAVIOR_INTERVENTION_EXTENSION_URL,
  BEHAVIOR_EPISODE_EXTENSION_URL,
} = require('../intelligence/fhir/behavior-incident-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  episodeId: '64b2222222222222222222bb',
  reportedBy: '64c3333333333333333333cc',
  occurredAt: '2026-02-01T08:00:00.000Z',
  reportedAt: '2026-02-01T08:30:00.000Z',
  antecedent: 'Transition to a new activity',
  behavior: 'Self-injurious head banging',
  consequence: 'Sensory break in quiet room',
  severity: 'critical',
  durationMinutes: 12,
  interventionLevel: 'sensory_break',
  restraintUsed: false,
  injuryOccurred: true,
  triggeredAlert: true,
  notifiedGuardian: true,
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  reportedBy: '64c3333333333333333333cc',
  occurredAt: '2026-02-01T08:00:00.000Z',
  antecedent: 'Loud noise',
  behavior: 'Elopement attempt',
  severity: 'low',
});

describe('W1318 behaviorIncidentToFhir — helpers', () => {
  it('SEVERITY_INTERPRETATION is frozen and covers all 4 severities', () => {
    expect(Object.isFrozen(SEVERITY_INTERPRETATION)).toBe(true);
    expect(SEVERITY_INTERPRETATION.low.code).toBe('L');
    expect(SEVERITY_INTERPRETATION.medium.code).toBe('A');
    expect(SEVERITY_INTERPRETATION.high.code).toBe('H');
    expect(SEVERITY_INTERPRETATION.critical.code).toBe('HH');
  });

  it('toFhirDateTime returns full ISO and undefined for bad input', () => {
    expect(toFhirDateTime('2026-02-01T08:00:00.000Z')).toBe('2026-02-01T08:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('buildCode is fixed coding + free-text behaviour', () => {
    const code = buildCode(FULL);
    expect(code.coding[0].system).toBe(BEHAVIOR_CODE_SYSTEM);
    expect(code.coding[0].code).toBe(BEHAVIOR_CODE);
    expect(code.text).toBe('Self-injurious head banging');
  });

  it('buildInterpretation maps severity to v3 interpretation', () => {
    const interp = buildInterpretation(FULL);
    expect(interp[0].coding[0].code).toBe('HH');
    expect(interp[0].text).toBe('critical');
  });

  it('buildInterpretation returns undefined for unknown severity', () => {
    expect(buildInterpretation({ severity: 'bogus' })).toBeUndefined();
  });

  it('buildComponents emits ABC components present', () => {
    const comps = buildComponents(FULL);
    const codes = comps.map(c => c.code.coding[0].code);
    expect(codes).toEqual(['antecedent', 'behavior', 'consequence']);
    expect(comps[0].valueString).toBe('Transition to a new activity');
    expect(comps[0].code.coding[0].system).toBe(BEHAVIOR_ABC_SYSTEM);
  });

  it('buildComponents skips an absent consequence', () => {
    const comps = buildComponents(MINIMAL);
    const codes = comps.map(c => c.code.coding[0].code);
    expect(codes).toEqual(['antecedent', 'behavior']);
  });
});

describe('W1318 behaviorIncidentToFhir — resource shape', () => {
  it('emits a base Observation with mandatory fields', () => {
    const obs = behaviorIncidentToFhir(FULL);
    expect(obs.resourceType).toBe('Observation');
    expect(obs.status).toBe('final');
    expect(obs.code.coding[0].code).toBe(BEHAVIOR_CODE);
    expect(obs.subject.reference).toBe('Patient/64a1111111111111111111aa');
    expect(obs.id).toBe('64f0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    const obs = behaviorIncidentToFhir(FULL, { includeId: false });
    expect(obs.id).toBeUndefined();
  });

  it('sets effectiveDateTime from occurredAt', () => {
    const obs = behaviorIncidentToFhir(FULL);
    expect(obs.effectiveDateTime).toBe('2026-02-01T08:00:00.000Z');
  });

  it('maps reportedBy to performer Practitioner', () => {
    const obs = behaviorIncidentToFhir(FULL);
    expect(obs.performer[0].reference).toBe('Practitioner/64c3333333333333333333cc');
  });

  it('attaches severity interpretation and ABC components', () => {
    const obs = behaviorIncidentToFhir(FULL);
    expect(obs.interpretation[0].coding[0].code).toBe('HH');
    expect(obs.component).toHaveLength(3);
  });

  it('minimal incident carries only the severity extension', () => {
    const obs = behaviorIncidentToFhir(MINIMAL);
    expect(obs.extension).toHaveLength(1);
    expect(obs.extension[0].url.endsWith('behavior-severity')).toBe(true);
    expect(obs.extension[0].valueCode).toBe('low');
  });
});

describe('W1318 behaviorIncidentToFhir — extensions (lossless)', () => {
  const ext = buildExtensions(FULL);
  const byUrl = url => ext.find(e => e.url.endsWith(url));

  it('carries severity as valueCode', () => {
    expect(byUrl('behavior-severity').valueCode).toBe('critical');
  });

  it('carries duration as integer minutes', () => {
    const d = ext.find(e => e.url === BEHAVIOR_DURATION_EXTENSION_URL);
    expect(d.valueInteger).toBe(12);
  });

  it('carries intervention level as valueCode', () => {
    const i = ext.find(e => e.url === BEHAVIOR_INTERVENTION_EXTENSION_URL);
    expect(i.valueCode).toBe('sensory_break');
  });

  it('carries restraint/injury/alert/guardian booleans', () => {
    expect(byUrl('behavior-restraint-used').valueBoolean).toBe(false);
    expect(byUrl('behavior-injury-occurred').valueBoolean).toBe(true);
    expect(byUrl('behavior-triggered-alert').valueBoolean).toBe(true);
    expect(byUrl('behavior-notified-guardian').valueBoolean).toBe(true);
  });

  it('links the episode of care', () => {
    const ep = ext.find(e => e.url === BEHAVIOR_EPISODE_EXTENSION_URL);
    expect(ep.valueReference.reference).toBe('EpisodeOfCare/64b2222222222222222222bb');
  });

  it('carries reported-at as dateTime', () => {
    expect(byUrl('behavior-reported-at').valueDateTime).toBe('2026-02-01T08:30:00.000Z');
  });
});

describe('W1318 behaviorIncidentToFhir — guards + canonical round-trip', () => {
  it('throws without an incident object', () => {
    expect(() => behaviorIncidentToFhir(null)).toThrow(/incident object is required/);
  });

  it('throws without beneficiaryId', () => {
    expect(() => behaviorIncidentToFhir({ behavior: 'x', severity: 'low' })).toThrow(
      /beneficiaryId is required/
    );
  });

  it('throws without behavior', () => {
    expect(() =>
      behaviorIncidentToFhir({ beneficiaryId: '64a1111111111111111111aa', severity: 'low' })
    ).toThrow(/behavior is required/);
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(FULL);
    behaviorIncidentToFhir(FULL);
    expect(JSON.stringify(FULL)).toBe(before);
  });

  it('both fixtures validate against the canonical BehaviorIncident schema', () => {
    expect(canonical.BehaviorIncident.safeParse(FULL).success).toBe(true);
    expect(canonical.BehaviorIncident.safeParse(MINIMAL).success).toBe(true);
  });
});
