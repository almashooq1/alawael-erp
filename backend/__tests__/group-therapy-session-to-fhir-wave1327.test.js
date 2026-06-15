'use strict';
/**
 * W1327 — GroupTherapySession → FHIR R4 Encounter mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * GroupTherapySession onto a base FHIR R4 Encounter plus a canonical
 * round-trip on every fixture.
 */

const {
  groupTherapySessionToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildParticipants,
  buildParticipantExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  GTS_TYPE_SYSTEM,
  GTS_PARTICIPANT_EXTENSION_URL,
  GTS_TOPIC_EXTENSION_URL,
  GTS_TOPIC_AR_EXTENSION_URL,
} = require('../intelligence/fhir/group-therapy-session-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  groupId: '64a4444444444444444444bb',
  therapistId: '64a555555555555555555555',
  coTherapistId: '64a666666666666666666666',
  status: 'completed',
  scheduledStart: '2026-03-10T09:00:00.000Z',
  scheduledEnd: '2026-03-10T10:00:00.000Z',
  actualStart: '2026-03-10T09:05:00.000Z',
  actualEnd: '2026-03-10T10:02:00.000Z',
  participants: [
    {
      beneficiaryId: '64a1111111111111111111aa',
      episodeId: '64a7777777777777777777aa',
      attendance: 'present',
    },
    { beneficiaryId: '64a1111111111111111111bb', attendance: 'late' },
  ],
  topic: 'Social skills',
  topic_ar: 'المهارات الاجتماعية',
});

const MINIMAL = Object.freeze({
  groupId: '64a4444444444444444444bb',
  therapistId: '64a555555555555555555555',
  status: 'scheduled',
  scheduledStart: '2026-02-01T09:00:00.000Z',
  participants: [{ beneficiaryId: '64a1111111111111111111aa' }],
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  groupId: '64a4444444444444444444bb',
  therapistId: '64a555555555555555555555',
  status: 'no_show',
  scheduledStart: '2026-02-15T09:00:00.000Z',
  participants: [{ beneficiaryId: '64a1111111111111111111aa', attendance: 'absent' }],
});

describe('W1327 groupTherapySessionToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.GroupTherapySession.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.GroupTherapySession.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.GroupTherapySession.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1327 groupTherapySessionToFhir — resource shape', () => {
  it('emits a FHIR R4 Encounter', () => {
    expect(groupTherapySessionToFhir(FULL).resourceType).toBe('Encounter');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(groupTherapySessionToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(groupTherapySessionToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(groupTherapySessionToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the Group (not a single Patient)', () => {
    expect(groupTherapySessionToFhir(FULL).subject).toEqual({
      reference: 'Group/64a4444444444444444444bb',
    });
  });

  it('class is ambulatory (HL7 v3-ActCode AMB)', () => {
    expect(groupTherapySessionToFhir(FULL).class).toEqual({
      system: ACT_ENCOUNTER_CLASS_SYSTEM,
      code: 'AMB',
      display: 'ambulatory',
    });
  });

  it('type carries the fixed group-therapy concept', () => {
    expect(groupTherapySessionToFhir(FULL).type).toEqual([
      {
        coding: [{ system: GTS_TYPE_SYSTEM, code: 'group-therapy' }],
        text: 'Group Therapy Session',
      },
    ]);
  });

  it('period prefers actual times over scheduled', () => {
    expect(groupTherapySessionToFhir(FULL).period).toEqual({
      start: '2026-03-10T09:05:00.000Z',
      end: '2026-03-10T10:02:00.000Z',
    });
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(groupTherapySessionToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    groupTherapySessionToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1327 participant[]', () => {
  it('includes therapist and co-therapist as Practitioner', () => {
    expect(groupTherapySessionToFhir(FULL).participant).toEqual([
      { individual: { reference: 'Practitioner/64a555555555555555555555' } },
      { individual: { reference: 'Practitioner/64a666666666666666666666' } },
    ]);
  });

  it('MINIMAL has only the therapist', () => {
    expect(buildParticipants(MINIMAL)).toEqual([
      { individual: { reference: 'Practitioner/64a555555555555555555555' } },
    ]);
  });

  it('returns undefined when no practitioners', () => {
    expect(buildParticipants({ participants: [] })).toBeUndefined();
  });
});

describe('W1327 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('scheduled → planned', () => {
    expect(toFhirStatus('scheduled')).toBe('planned');
  });

  it('in_progress → in-progress', () => {
    expect(toFhirStatus('in_progress')).toBe('in-progress');
  });

  it('completed → finished', () => {
    expect(toFhirStatus('completed')).toBe('finished');
  });

  it('no_show / cancelled / rescheduled → cancelled', () => {
    expect(toFhirStatus('no_show')).toBe('cancelled');
    expect(toFhirStatus('cancelled')).toBe('cancelled');
    expect(toFhirStatus('rescheduled')).toBe('cancelled');
  });

  it('absent status → unknown; unmapped → entered-in-error', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('entered-in-error');
  });
});

describe('W1327 participant extensions', () => {
  it('emits one participant extension per beneficiary', () => {
    const ext = buildExtensions(FULL);
    const parts = ext.filter(e => e.url === GTS_PARTICIPANT_EXTENSION_URL);
    expect(parts).toHaveLength(2);
  });

  it('participant extension carries beneficiary ref + episode + attendance', () => {
    const nested = buildParticipantExtension({
      beneficiaryId: '64a1111111111111111111aa',
      episodeId: '64a7777777777777777777aa',
      attendance: 'present',
    });
    expect(nested.url).toBe(GTS_PARTICIPANT_EXTENSION_URL);
    expect(nested.extension).toEqual([
      { url: 'beneficiary', valueReference: { reference: 'Patient/64a1111111111111111111aa' } },
      { url: 'episode', valueReference: { reference: 'EpisodeOfCare/64a7777777777777777777aa' } },
      { url: 'attendance', valueCode: 'present' },
    ]);
  });

  it('participant extension with only beneficiary carries just that sub-ext', () => {
    const nested = buildParticipantExtension({ beneficiaryId: '64a1111111111111111111aa' });
    expect(nested.extension).toEqual([
      { url: 'beneficiary', valueReference: { reference: 'Patient/64a1111111111111111111aa' } },
    ]);
  });

  it('carries bilingual topic', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === GTS_TOPIC_EXTENSION_URL)).toEqual({
      url: GTS_TOPIC_EXTENSION_URL,
      valueString: 'Social skills',
    });
    expect(ext.find(e => e.url === GTS_TOPIC_AR_EXTENSION_URL)).toEqual({
      url: GTS_TOPIC_AR_EXTENSION_URL,
      valueString: 'المهارات الاجتماعية',
    });
  });

  it('MINIMAL carries only the one participant extension', () => {
    const r = groupTherapySessionToFhir(MINIMAL);
    expect(r.extension).toHaveLength(1);
    expect(r.extension[0].url).toBe(GTS_PARTICIPANT_EXTENSION_URL);
  });
});

describe('W1327 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildType returns the fixed group concept', () => {
    expect(buildType()[0].coding[0].code).toBe('group-therapy');
  });

  it('toFhirDateTime returns full ISO; undefined for invalid', () => {
    expect(toFhirDateTime('2026-03-10T09:00:00.000Z')).toBe('2026-03-10T09:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('buildPeriod returns undefined when no times', () => {
    expect(buildPeriod({})).toBeUndefined();
  });

  it('throws when session is missing', () => {
    expect(() => groupTherapySessionToFhir()).toThrow(TypeError);
    expect(() => groupTherapySessionToFhir(null)).toThrow(/session object is required/);
  });

  it('throws when groupId is missing', () => {
    expect(() => groupTherapySessionToFhir({ participants: [{ beneficiaryId: 'x' }] })).toThrow(
      /groupId is required/
    );
  });

  it('throws when participants is empty or missing', () => {
    expect(() => groupTherapySessionToFhir({ groupId: 'g' })).toThrow(
      /participants must be non-empty/
    );
    expect(() => groupTherapySessionToFhir({ groupId: 'g', participants: [] })).toThrow(
      /participants must be non-empty/
    );
  });
});
