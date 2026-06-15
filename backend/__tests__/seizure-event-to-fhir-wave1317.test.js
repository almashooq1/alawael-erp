'use strict';
/**
 * W1317 — SeizureEvent → FHIR R4 Observation mapper tests.
 *
 * Verifies the eighth FHIR resource projection (Item 10). Pure-function unit
 * tests + a canonical round-trip so a future canonical-schema change that
 * breaks the projection fails CI.
 */

const {
  seizureEventToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildCode,
  buildEffective,
  isStatusEpilepticus,
  buildExtensions,
  STATUS_MAP,
  STATUS_EPILEPTICUS_THRESHOLD_SECONDS,
  SEIZURE_TYPE_SYSTEM,
  SEIZURE_DURATION_EXTENSION_URL,
  SEIZURE_STATUS_EPILEPTICUS_EXTENSION_URL,
  SEIZURE_RESCUE_MED_EXTENSION_URL,
  SEIZURE_CAREPLAN_EXTENSION_URL,
  SEIZURE_REVIEW_EXTENSION_URL,
} = require('../intelligence/fhir/seizure-event-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64b2222222222222222222bb',
  carePlanVersionId: '64c3333333333333333333cc',
  date: '2026-02-01',
  startTime: '2026-02-01T08:00:00.000Z',
  endTime: '2026-02-01T08:06:30.000Z',
  durationSeconds: 390,
  type: 'tonic_clonic',
  severity: 'severe',
  consciousness: 'lost',
  injury: true,
  ambulanceCalled: true,
  rescueMedicationGivenName: 'Midazolam',
  rescueMedicationMarId: '64d4444444444444444444dd',
  witnessedBy: '64e5555555555555555555ee',
  parentNotifiedAt: '2026-02-01T08:20:00.000Z',
  status: 'reviewed',
  reviewedBy: '64f6666666666666666666ff',
  reviewedAt: '2026-02-02T09:00:00.000Z',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  date: '2026-02-01',
  startTime: '2026-02-01T08:00:00.000Z',
  type: 'absence',
  status: 'recorded',
});

describe('W1317 seizureEventToFhir — helpers', () => {
  it('STATUS_MAP is frozen and covers both canonical statuses', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
    expect(STATUS_MAP.recorded).toBe('preliminary');
    expect(STATUS_MAP.reviewed).toBe('final');
  });

  it('toFhirStatus maps known + unknown + absent', () => {
    expect(toFhirStatus('recorded')).toBe('preliminary');
    expect(toFhirStatus('reviewed')).toBe('final');
    expect(toFhirStatus(undefined)).toBe('preliminary');
    expect(toFhirStatus('bogus')).toBe('entered-in-error');
  });

  it('toFhirDateTime returns full ISO and undefined for bad input', () => {
    expect(toFhirDateTime('2026-02-01T08:00:00.000Z')).toBe('2026-02-01T08:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('buildCode builds a CodeableConcept from type', () => {
    const code = buildCode(FULL);
    expect(code.coding[0].system).toBe(SEIZURE_TYPE_SYSTEM);
    expect(code.coding[0].code).toBe('tonic_clonic');
    expect(code.text).toBe('tonic_clonic');
  });

  it('buildEffective returns a Period when end is present', () => {
    const eff = buildEffective(FULL);
    expect(eff.key).toBe('effectivePeriod');
    expect(eff.value).toEqual({
      start: '2026-02-01T08:00:00.000Z',
      end: '2026-02-01T08:06:30.000Z',
    });
  });

  it('buildEffective returns a dateTime when no end time', () => {
    const eff = buildEffective(MINIMAL);
    expect(eff.key).toBe('effectiveDateTime');
    expect(eff.value).toBe('2026-02-01T08:00:00.000Z');
  });

  it('buildEffective falls back to date when no startTime', () => {
    const eff = buildEffective({ date: '2026-02-01' });
    expect(eff.key).toBe('effectiveDateTime');
    expect(typeof eff.value).toBe('string');
  });

  it('STATUS_EPILEPTICUS_THRESHOLD_SECONDS is 300', () => {
    expect(STATUS_EPILEPTICUS_THRESHOLD_SECONDS).toBe(300);
  });

  it('isStatusEpilepticus reflects the 300s threshold', () => {
    expect(isStatusEpilepticus({ durationSeconds: 390 })).toBe(true);
    expect(isStatusEpilepticus({ durationSeconds: 300 })).toBe(true);
    expect(isStatusEpilepticus({ durationSeconds: 120 })).toBe(false);
    expect(isStatusEpilepticus({})).toBeUndefined();
  });
});

describe('W1317 seizureEventToFhir — resource shape', () => {
  it('emits a base Observation with mandatory fields', () => {
    const obs = seizureEventToFhir(FULL);
    expect(obs.resourceType).toBe('Observation');
    expect(obs.status).toBe('final'); // reviewed
    expect(obs.code.coding[0].code).toBe('tonic_clonic');
    expect(obs.subject.reference).toBe('Patient/64a1111111111111111111aa');
    expect(obs.id).toBe('64f0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    const obs = seizureEventToFhir(FULL, { includeId: false });
    expect(obs.id).toBeUndefined();
  });

  it('uses effectivePeriod when end time exists', () => {
    const obs = seizureEventToFhir(FULL);
    expect(obs.effectivePeriod.start).toBe('2026-02-01T08:00:00.000Z');
    expect(obs.effectivePeriod.end).toBe('2026-02-01T08:06:30.000Z');
    expect(obs.effectiveDateTime).toBeUndefined();
  });

  it('uses effectiveDateTime for an ongoing/unended event', () => {
    const obs = seizureEventToFhir(MINIMAL);
    expect(obs.effectiveDateTime).toBe('2026-02-01T08:00:00.000Z');
    expect(obs.effectivePeriod).toBeUndefined();
  });

  it('maps witnessedBy to performer Practitioner', () => {
    const obs = seizureEventToFhir(FULL);
    expect(obs.performer[0].reference).toBe('Practitioner/64e5555555555555555555ee');
  });

  it('minimal event has no extension array', () => {
    const obs = seizureEventToFhir(MINIMAL);
    expect(obs.extension).toBeUndefined();
  });
});

describe('W1317 seizureEventToFhir — extensions (lossless)', () => {
  const ext = buildExtensions(FULL);
  const byUrl = url => ext.find(e => e.url.endsWith(url));

  it('carries severity and consciousness as valueCode', () => {
    expect(byUrl('seizure-severity').valueCode).toBe('severe');
    expect(byUrl('seizure-consciousness').valueCode).toBe('lost');
  });

  it('carries duration as integer seconds', () => {
    const d = ext.find(e => e.url === SEIZURE_DURATION_EXTENSION_URL);
    expect(d.valueInteger).toBe(390);
  });

  it('derives status-epilepticus boolean from duration', () => {
    const se = ext.find(e => e.url === SEIZURE_STATUS_EPILEPTICUS_EXTENSION_URL);
    expect(se.valueBoolean).toBe(true);
  });

  it('carries injury and ambulance flags', () => {
    expect(byUrl('seizure-injury').valueBoolean).toBe(true);
    expect(byUrl('seizure-ambulance-called').valueBoolean).toBe(true);
  });

  it('groups rescue medication name + MAR ref in a nested extension', () => {
    const rm = ext.find(e => e.url === SEIZURE_RESCUE_MED_EXTENSION_URL);
    const name = rm.extension.find(x => x.url === 'name');
    const mar = rm.extension.find(x => x.url === 'mar');
    expect(name.valueString).toBe('Midazolam');
    expect(mar.valueReference.reference).toBe('MedicationAdministration/64d4444444444444444444dd');
  });

  it('carries parent-notified-at as dateTime', () => {
    expect(byUrl('seizure-parent-notified-at').valueDateTime).toBe('2026-02-01T08:20:00.000Z');
  });

  it('links care plan and branch as references', () => {
    const cp = ext.find(e => e.url === SEIZURE_CAREPLAN_EXTENSION_URL);
    expect(cp.valueReference.reference).toBe('CarePlan/64c3333333333333333333cc');
    expect(byUrl('seizure-branch').valueReference.reference).toBe(
      'Organization/64b2222222222222222222bb'
    );
  });

  it('groups review nuance (reviewedBy + reviewedAt) in a nested extension', () => {
    const rv = ext.find(e => e.url === SEIZURE_REVIEW_EXTENSION_URL);
    const by = rv.extension.find(x => x.url === 'reviewedBy');
    const at = rv.extension.find(x => x.url === 'reviewedAt');
    expect(by.valueReference.reference).toBe('Practitioner/64f6666666666666666666ff');
    expect(at.valueDateTime).toBe('2026-02-02T09:00:00.000Z');
  });

  it('a sub-threshold duration derives status-epilepticus false', () => {
    const short = buildExtensions({ ...FULL, durationSeconds: 120 });
    const se = short.find(e => e.url === SEIZURE_STATUS_EPILEPTICUS_EXTENSION_URL);
    expect(se.valueBoolean).toBe(false);
  });
});

describe('W1317 seizureEventToFhir — guards + canonical round-trip', () => {
  it('throws without a seizure object', () => {
    expect(() => seizureEventToFhir(null)).toThrow(/seizure object is required/);
  });

  it('throws without beneficiaryId', () => {
    expect(() => seizureEventToFhir({ type: 'absence', status: 'recorded' })).toThrow(
      /beneficiaryId is required/
    );
  });

  it('throws without type (Observation.code is mandatory)', () => {
    expect(() =>
      seizureEventToFhir({ beneficiaryId: '64a1111111111111111111aa', status: 'recorded' })
    ).toThrow(/type is required/);
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(FULL);
    seizureEventToFhir(FULL);
    expect(JSON.stringify(FULL)).toBe(before);
  });

  it('both fixtures validate against the canonical SeizureEvent schema', () => {
    expect(canonical.SeizureEvent.safeParse(FULL).success).toBe(true);
    expect(canonical.SeizureEvent.safeParse(MINIMAL).success).toBe(true);
  });
});
