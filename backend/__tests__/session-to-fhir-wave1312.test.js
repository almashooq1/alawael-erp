'use strict';
/**
 * W1312 — Session → FHIR R4 Encounter mapper self-test. Pure unit, no DB.
 */

const {
  sessionToFhirEncounter,
  toFhirStatus,
  toFhirDateTime,
  buildClass,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  CLASS_MAP,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  DISCIPLINE_SYSTEM,
  STATUS_DETAIL_EXTENSION_URL,
  PLAN_EXTENSION_URL,
} = require('../intelligence/fhir/session-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

/** A fully-populated canonical Session fixture. */
const FULL_SESSION = {
  _id: '64f0000000000000000000aa',
  beneficiaryId: '64a1111111111111111111aa',
  episodeId: '64b2222222222222222222bb',
  planId: '64c3333333333333333333cc',
  therapistId: '64e4444444444444444444dd',
  modality: 'tele',
  status: 'completed',
  scheduledStart: '2026-04-01T09:00:00.000Z',
  scheduledEnd: '2026-04-01T09:45:00.000Z',
  actualStart: '2026-04-01T09:05:00.000Z',
  actualEnd: '2026-04-01T09:50:00.000Z',
  discipline: 'speech',
  createdAt: '2026-04-01T08:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

describe('W1312 Session → FHIR Encounter — core projection', () => {
  const r = sessionToFhirEncounter(FULL_SESSION);

  it('sets resourceType Encounter', () => {
    expect(r.resourceType).toBe('Encounter');
  });

  it('carries the canonical _id as FHIR id', () => {
    expect(r.id).toBe('64f0000000000000000000aa');
  });

  it('omits id when includeId=false', () => {
    expect(sessionToFhirEncounter(FULL_SESSION, { includeId: false }).id).toBeUndefined();
  });

  it('references the beneficiary as the Patient subject', () => {
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });

  it('references the therapist as a participant Practitioner', () => {
    expect(r.participant).toEqual([
      { individual: { reference: 'Practitioner/64e4444444444444444444dd' } },
    ]);
  });

  it('links the episode natively via episodeOfCare', () => {
    expect(r.episodeOfCare).toEqual([{ reference: 'EpisodeOfCare/64b2222222222222222222bb' }]);
  });

  it('maps discipline to serviceType', () => {
    expect(r.serviceType).toEqual({
      coding: [{ system: DISCIPLINE_SYSTEM, code: 'speech' }],
      text: 'speech',
    });
  });
});

describe('W1312 Session → FHIR Encounter — status value-set', () => {
  it.each([
    ['scheduled', 'planned'],
    ['in_progress', 'in-progress'],
    ['completed', 'finished'],
    ['cancelled', 'cancelled'],
    ['no_show', 'cancelled'],
    ['rescheduled', 'cancelled'],
  ])('maps canonical %s → FHIR %s', (canonicalStatus, fhirStatus) => {
    expect(toFhirStatus(canonicalStatus)).toBe(fhirStatus);
  });

  it('defaults absent status to unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
  });

  it('maps an unrecognised status to entered-in-error', () => {
    expect(toFhirStatus('xyz')).toBe('entered-in-error');
  });

  it('STATUS_MAP covers every canonical SessionStatus value', () => {
    ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'].forEach(s =>
      expect(STATUS_MAP[s]).toBeDefined()
    );
  });
});

describe('W1312 Session → FHIR Encounter — class mapping', () => {
  it.each([
    ['individual', 'AMB'],
    ['group', 'AMB'],
    ['tele', 'VR'],
    ['home', 'HH'],
    ['community', 'FLD'],
    ['arvr', 'VR'],
  ])('maps modality %s → class %s', (modality, code) => {
    expect(buildClass(modality).code).toBe(code);
  });

  it('defaults absent modality to ambulatory', () => {
    expect(buildClass(undefined)).toEqual({
      system: ACT_ENCOUNTER_CLASS_SYSTEM,
      ...CLASS_MAP.individual,
    });
  });
});

describe('W1312 Session → FHIR Encounter — period', () => {
  it('prefers actual times over scheduled', () => {
    expect(buildPeriod(FULL_SESSION)).toEqual({
      start: '2026-04-01T09:05:00.000Z',
      end: '2026-04-01T09:50:00.000Z',
    });
  });

  it('falls back to scheduled times when no actuals', () => {
    const s = {
      ...FULL_SESSION,
      actualStart: undefined,
      actualEnd: undefined,
    };
    expect(buildPeriod(s)).toEqual({
      start: '2026-04-01T09:00:00.000Z',
      end: '2026-04-01T09:45:00.000Z',
    });
  });

  it('returns undefined when no times are present', () => {
    expect(buildPeriod({ beneficiaryId: 'x' })).toBeUndefined();
  });

  it('coerces a Date instance to full ISO', () => {
    expect(toFhirDateTime(new Date('2026-04-01T09:00:00.000Z'))).toBe('2026-04-01T09:00:00.000Z');
  });

  it('returns undefined for an invalid date', () => {
    expect(toFhirDateTime('nope')).toBeUndefined();
  });
});

describe('W1312 Session → FHIR Encounter — extensions', () => {
  it('preserves the no_show nuance lost when mapped → cancelled', () => {
    const r = sessionToFhirEncounter({ ...FULL_SESSION, status: 'no_show' });
    expect(r.status).toBe('cancelled');
    expect(r.extension).toContainEqual({
      url: STATUS_DETAIL_EXTENSION_URL,
      valueCode: 'no_show',
    });
  });

  it('preserves the rescheduled nuance', () => {
    const ext = buildExtensions({ status: 'rescheduled' });
    expect(ext).toContainEqual({
      url: STATUS_DETAIL_EXTENSION_URL,
      valueCode: 'rescheduled',
    });
  });

  it('carries the care plan as a CarePlan reference extension', () => {
    expect(buildExtensions(FULL_SESSION)).toContainEqual({
      url: PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64c3333333333333333333cc' },
    });
  });

  it('maps cancellationReason to reasonCode text', () => {
    const r = sessionToFhirEncounter({
      ...FULL_SESSION,
      status: 'cancelled',
      cancellationReason: 'family request',
    });
    expect(r.reasonCode).toEqual([{ text: 'family request' }]);
  });

  it('omits extension array entirely on a minimal completed session', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      therapistId: '64e4444444444444444444dd',
      status: 'completed',
      scheduledStart: '2026-04-01T09:00:00.000Z',
    };
    expect(sessionToFhirEncounter(minimal).extension).toBeUndefined();
  });
});

describe('W1312 Session → FHIR Encounter — guards', () => {
  it('throws when session is missing', () => {
    expect(() => sessionToFhirEncounter(undefined)).toThrow(TypeError);
  });

  it('throws when beneficiaryId is absent', () => {
    expect(() =>
      sessionToFhirEncounter({
        therapistId: '64e4444444444444444444dd',
        status: 'completed',
        scheduledStart: '2026-04-01T09:00:00.000Z',
      })
    ).toThrow(/beneficiaryId/);
  });
});

describe('W1312 Session → FHIR Encounter — canonical conformance', () => {
  it('the fixture validates against the canonical Session schema', () => {
    expect(canonical.Session.safeParse(FULL_SESSION).success).toBe(true);
  });

  it('a minimal valid session maps to a conformant Encounter', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      therapistId: '64e4444444444444444444dd',
      status: 'scheduled',
      scheduledStart: '2026-04-01T09:00:00.000Z',
    };
    expect(canonical.Session.safeParse(minimal).success).toBe(true);
    const r = sessionToFhirEncounter(minimal);
    expect(r.resourceType).toBe('Encounter');
    expect(r.status).toBe('planned');
    expect(r.subject.reference).toBe('Patient/64a1111111111111111111aa');
  });
});
