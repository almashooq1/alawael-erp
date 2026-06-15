'use strict';
/**
 * W1331 — CreativeArtsTherapySession → FHIR R4 Encounter mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * CreativeArtsTherapySession onto a base FHIR R4 Encounter plus a round-trip.
 */

const {
  creativeArtsTherapySessionToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  CATS_MODALITY_SYSTEM,
  CATS_DURATION_EXTENSION_URL,
  CATS_FORMAT_EXTENSION_URL,
  CATS_GROUP_SIZE_EXTENSION_URL,
  CATS_MATERIAL_EXTENSION_URL,
  CATS_INTERVENTION_EXTENSION_URL,
  CATS_GOAL_EXTENSION_URL,
  CATS_ENGAGEMENT_EXTENSION_URL,
  CATS_MOOD_BEFORE_EXTENSION_URL,
  CATS_MOOD_AFTER_EXTENSION_URL,
  CATS_ARTIFACT_TYPE_EXTENSION_URL,
  CATS_ARTIFACT_REF_EXTENSION_URL,
  CATS_CARE_PLAN_EXTENSION_URL,
  CATS_CANCEL_REASON_EXTENSION_URL,
} = require('../intelligence/fhir/creative-arts-therapy-session-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  carePlanVersionId: '64a3333333333333333333cc',
  therapistId: '64a555555555555555555555',
  modality: 'art',
  sessionDate: '2026-03-10T09:00:00.000Z',
  durationMinutes: 60,
  format: 'group',
  groupSize: 4,
  materialsUsed: ['clay', 'watercolor'],
  interventions: ['free drawing', 'guided imagery'],
  goalsAddressed: ['emotional expression'],
  engagementLevel: 'high',
  moodBefore: 'anxious',
  moodAfter: 'content',
  artifactType: 'image',
  artifactRef: 'artifacts/abc.png',
  status: 'completed',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  modality: 'music',
  sessionDate: '2026-02-01T09:00:00.000Z',
  status: 'scheduled',
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  modality: 'drama',
  sessionDate: '2026-02-15T09:00:00.000Z',
  status: 'cancelled',
  cancelReason: 'Therapist unavailable',
});

describe('W1331 creativeArtsTherapySessionToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.CreativeArtsTherapySession.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.CreativeArtsTherapySession.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.CreativeArtsTherapySession.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1331 creativeArtsTherapySessionToFhir — resource shape', () => {
  it('emits a FHIR R4 Encounter', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).resourceType).toBe('Encounter');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(creativeArtsTherapySessionToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(creativeArtsTherapySessionToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('class is ambulatory (HL7 v3-ActCode AMB)', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).class).toEqual({
      system: ACT_ENCOUNTER_CLASS_SYSTEM,
      code: 'AMB',
      display: 'ambulatory',
    });
  });

  it('type carries the modality', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).type).toEqual([
      {
        coding: [{ system: CATS_MODALITY_SYSTEM, code: 'art' }],
        text: 'Creative Arts Therapy — art',
      },
    ]);
  });

  it('therapist is the participant', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).participant).toEqual([
      { individual: { reference: 'Practitioner/64a555555555555555555555' } },
    ]);
  });

  it('period derives end from sessionDate + durationMinutes', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).period).toEqual({
      start: '2026-03-10T09:00:00.000Z',
      end: '2026-03-10T10:00:00.000Z',
    });
  });

  it('period has start only when no duration', () => {
    expect(creativeArtsTherapySessionToFhir(MINIMAL).period).toEqual({
      start: '2026-02-01T09:00:00.000Z',
    });
  });

  it('serviceProvider references the branch Organization', () => {
    expect(creativeArtsTherapySessionToFhir(FULL).serviceProvider).toEqual({
      reference: 'Organization/64a2222222222222222222bb',
    });
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(creativeArtsTherapySessionToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    creativeArtsTherapySessionToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1331 status mapping', () => {
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

describe('W1331 extensions', () => {
  it('carries duration + format + group size', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === CATS_DURATION_EXTENSION_URL)).toEqual({
      url: CATS_DURATION_EXTENSION_URL,
      valueInteger: 60,
    });
    expect(ext.find(e => e.url === CATS_FORMAT_EXTENSION_URL).valueCode).toBe('group');
    expect(ext.find(e => e.url === CATS_GROUP_SIZE_EXTENSION_URL).valueInteger).toBe(4);
  });

  it('carries one extension per material / intervention / goal', () => {
    const ext = buildExtensions(FULL);
    expect(ext.filter(e => e.url === CATS_MATERIAL_EXTENSION_URL)).toHaveLength(2);
    expect(ext.filter(e => e.url === CATS_INTERVENTION_EXTENSION_URL)).toHaveLength(2);
    expect(ext.filter(e => e.url === CATS_GOAL_EXTENSION_URL)).toHaveLength(1);
  });

  it('carries engagement + mood before/after', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === CATS_ENGAGEMENT_EXTENSION_URL).valueCode).toBe('high');
    expect(ext.find(e => e.url === CATS_MOOD_BEFORE_EXTENSION_URL).valueCode).toBe('anxious');
    expect(ext.find(e => e.url === CATS_MOOD_AFTER_EXTENSION_URL).valueCode).toBe('content');
  });

  it('carries artifact type + ref + care-plan ref', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === CATS_ARTIFACT_TYPE_EXTENSION_URL).valueCode).toBe('image');
    expect(ext.find(e => e.url === CATS_ARTIFACT_REF_EXTENSION_URL).valueString).toBe(
      'artifacts/abc.png'
    );
    expect(ext.find(e => e.url === CATS_CARE_PLAN_EXTENSION_URL)).toEqual({
      url: CATS_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64a3333333333333333333cc' },
    });
  });

  it('MINIMAL produces no extensions', () => {
    expect(creativeArtsTherapySessionToFhir(MINIMAL).extension).toBeUndefined();
  });

  it('CANCELLED carries the cancel-reason extension', () => {
    const resource = creativeArtsTherapySessionToFhir(CANCELLED);
    expect(resource.extension).toEqual([
      { url: CATS_CANCEL_REASON_EXTENSION_URL, valueString: 'Therapist unavailable' },
    ]);
  });
});

describe('W1331 helpers + guards', () => {
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
    expect(() => creativeArtsTherapySessionToFhir()).toThrow(TypeError);
    expect(() => creativeArtsTherapySessionToFhir(null)).toThrow(/session object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => creativeArtsTherapySessionToFhir({ modality: 'music' })).toThrow(
      /beneficiaryId is required/
    );
  });
});
