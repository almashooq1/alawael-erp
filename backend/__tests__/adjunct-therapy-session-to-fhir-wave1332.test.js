'use strict';
/**
 * W1332 — AdjunctTherapySession → FHIR R4 Encounter mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * AdjunctTherapySession onto a base FHIR R4 Encounter plus a round-trip.
 */

const {
  adjunctTherapySessionToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  ADJ_MODALITY_SYSTEM,
  ADJ_DURATION_EXTENSION_URL,
  ADJ_MEDICAL_CLEARED_EXTENSION_URL,
  ADJ_CLEARED_DATE_EXTENSION_URL,
  ADJ_CONTRAINDICATIONS_EXTENSION_URL,
  ADJ_READINESS_EXTENSION_URL,
  ADJ_ACTIVITY_EXTENSION_URL,
  ADJ_SKILL_EXTENSION_URL,
  ADJ_RESPONSE_EXTENSION_URL,
  ADJ_ANIMAL_TYPE_EXTENSION_URL,
  ADJ_WATER_TEMP_EXTENSION_URL,
  ADJ_INCIDENT_EXTENSION_URL,
  ADJ_CARE_PLAN_EXTENSION_URL,
  ADJ_CANCEL_REASON_EXTENSION_URL,
} = require('../intelligence/fhir/adjunct-therapy-session-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  carePlanVersionId: '64a3333333333333333333cc',
  therapistId: '64a555555555555555555555',
  modality: 'hydrotherapy',
  sessionDate: '2026-03-10T09:00:00.000Z',
  durationMinutes: 45,
  medicalCleared: true,
  clearedDate: '2026-03-01T08:00:00.000Z',
  contraindications: 'none',
  readinessLevel: 'ready',
  activities: ['floating', 'kicking drills'],
  skillsTargeted: ['balance', 'breath control'],
  beneficiaryResponse: 'positive',
  animalType: 'none',
  waterTemperatureC: 33.5,
  incidentDuringSession: false,
  status: 'completed',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  modality: 'hippotherapy',
  sessionDate: '2026-02-01T09:00:00.000Z',
  status: 'scheduled',
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  modality: 'animal_assisted',
  sessionDate: '2026-02-15T09:00:00.000Z',
  status: 'cancelled',
  cancelReason: 'Animal unavailable',
});

describe('W1332 adjunctTherapySessionToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.AdjunctTherapySession.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.AdjunctTherapySession.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.AdjunctTherapySession.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1332 adjunctTherapySessionToFhir — resource shape', () => {
  it('emits a FHIR R4 Encounter', () => {
    expect(adjunctTherapySessionToFhir(FULL).resourceType).toBe('Encounter');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(adjunctTherapySessionToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(adjunctTherapySessionToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(adjunctTherapySessionToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(adjunctTherapySessionToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('class is ambulatory (HL7 v3-ActCode AMB)', () => {
    expect(adjunctTherapySessionToFhir(FULL).class).toEqual({
      system: ACT_ENCOUNTER_CLASS_SYSTEM,
      code: 'AMB',
      display: 'ambulatory',
    });
  });

  it('type carries the modality', () => {
    expect(adjunctTherapySessionToFhir(FULL).type).toEqual([
      {
        coding: [{ system: ADJ_MODALITY_SYSTEM, code: 'hydrotherapy' }],
        text: 'Adjunct Therapy — hydrotherapy',
      },
    ]);
  });

  it('therapist is the participant', () => {
    expect(adjunctTherapySessionToFhir(FULL).participant).toEqual([
      { individual: { reference: 'Practitioner/64a555555555555555555555' } },
    ]);
  });

  it('period derives end from sessionDate + durationMinutes', () => {
    expect(adjunctTherapySessionToFhir(FULL).period).toEqual({
      start: '2026-03-10T09:00:00.000Z',
      end: '2026-03-10T09:45:00.000Z',
    });
  });

  it('period has start only when no duration', () => {
    expect(adjunctTherapySessionToFhir(MINIMAL).period).toEqual({
      start: '2026-02-01T09:00:00.000Z',
    });
  });

  it('serviceProvider references the branch Organization', () => {
    expect(adjunctTherapySessionToFhir(FULL).serviceProvider).toEqual({
      reference: 'Organization/64a2222222222222222222bb',
    });
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(adjunctTherapySessionToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    adjunctTherapySessionToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1332 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('scheduled → planned, completed → finished', () => {
    expect(toFhirStatus('scheduled')).toBe('planned');
    expect(toFhirStatus('completed')).toBe('finished');
  });

  it('cancelled / no_show → cancelled', () => {
    expect(toFhirStatus('cancelled')).toBe('cancelled');
    expect(toFhirStatus('no_show')).toBe('cancelled');
  });

  it('absent → unknown; unmapped → entered-in-error', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('entered-in-error');
  });
});

describe('W1332 extensions', () => {
  it('carries duration + medical-clearance + cleared-date + contraindications', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ADJ_DURATION_EXTENSION_URL).valueInteger).toBe(45);
    expect(ext.find(e => e.url === ADJ_MEDICAL_CLEARED_EXTENSION_URL).valueBoolean).toBe(true);
    expect(ext.find(e => e.url === ADJ_CLEARED_DATE_EXTENSION_URL).valueDateTime).toBe(
      '2026-03-01T08:00:00.000Z'
    );
    expect(ext.find(e => e.url === ADJ_CONTRAINDICATIONS_EXTENSION_URL).valueString).toBe('none');
  });

  it('carries readiness + one extension per activity / skill', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ADJ_READINESS_EXTENSION_URL).valueCode).toBe('ready');
    expect(ext.filter(e => e.url === ADJ_ACTIVITY_EXTENSION_URL)).toHaveLength(2);
    expect(ext.filter(e => e.url === ADJ_SKILL_EXTENSION_URL)).toHaveLength(2);
  });

  it('carries response + animal type + water temp + incident + care-plan ref', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ADJ_RESPONSE_EXTENSION_URL).valueCode).toBe('positive');
    expect(ext.find(e => e.url === ADJ_ANIMAL_TYPE_EXTENSION_URL).valueCode).toBe('none');
    expect(ext.find(e => e.url === ADJ_WATER_TEMP_EXTENSION_URL).valueDecimal).toBe(33.5);
    expect(ext.find(e => e.url === ADJ_INCIDENT_EXTENSION_URL).valueBoolean).toBe(false);
    expect(ext.find(e => e.url === ADJ_CARE_PLAN_EXTENSION_URL)).toEqual({
      url: ADJ_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64a3333333333333333333cc' },
    });
  });

  it('MINIMAL produces no extensions', () => {
    expect(adjunctTherapySessionToFhir(MINIMAL).extension).toBeUndefined();
  });

  it('CANCELLED carries the cancel-reason extension', () => {
    const resource = adjunctTherapySessionToFhir(CANCELLED);
    expect(resource.extension).toEqual([
      { url: ADJ_CANCEL_REASON_EXTENSION_URL, valueString: 'Animal unavailable' },
    ]);
  });
});

describe('W1332 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildType returns undefined without a modality', () => {
    expect(buildType({})).toBeUndefined();
  });

  it('toFhirDateTime returns full ISO; undefined for invalid', () => {
    expect(toFhirDateTime('2026-03-10T09:00:00.000Z')).toBe('2026-03-10T09:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('buildPeriod returns undefined without a sessionDate', () => {
    expect(buildPeriod({})).toBeUndefined();
  });

  it('throws when session is missing', () => {
    expect(() => adjunctTherapySessionToFhir()).toThrow(TypeError);
    expect(() => adjunctTherapySessionToFhir(null)).toThrow(/session object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => adjunctTherapySessionToFhir({ modality: 'hydrotherapy' })).toThrow(
      /beneficiaryId is required/
    );
  });
});
