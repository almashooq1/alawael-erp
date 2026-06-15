'use strict';
/**
 * W1330 — DttSession → FHIR R4 Encounter mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical DttSession
 * onto a base FHIR R4 Encounter plus a canonical round-trip.
 */

const {
  dttSessionToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildTargetExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  DTT_PROGRAM_AREA_SYSTEM,
  DTT_DURATION_EXTENSION_URL,
  DTT_CARE_PLAN_EXTENSION_URL,
  DTT_TARGET_EXTENSION_URL,
  DTT_CANCEL_REASON_EXTENSION_URL,
} = require('../intelligence/fhir/dtt-session-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  carePlanVersionId: '64a3333333333333333333cc',
  therapistId: '64a555555555555555555555',
  sessionDate: '2026-03-10T09:00:00.000Z',
  durationMinutes: 45,
  programArea: 'communication',
  status: 'completed',
  targets: [
    {
      targetName: 'Mand for preferred item',
      curriculumRef: 'VB-MAPP M-5',
      masteryCriterionPct: 80,
      masteryAchieved: true,
      trials: [
        { promptLevel: 'independent', response: 'correct' },
        { promptLevel: 'gestural', response: 'incorrect' },
        { promptLevel: 'independent', response: 'correct' },
      ],
    },
    { targetName: 'Tact common objects' },
  ],
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  sessionDate: '2026-02-01T09:00:00.000Z',
  programArea: 'social',
  status: 'scheduled',
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  sessionDate: '2026-02-15T09:00:00.000Z',
  programArea: 'motor',
  status: 'cancelled',
  cancelReason: 'Beneficiary ill',
});

describe('W1330 dttSessionToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.DttSession.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.DttSession.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.DttSession.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1330 dttSessionToFhir — resource shape', () => {
  it('emits a FHIR R4 Encounter', () => {
    expect(dttSessionToFhir(FULL).resourceType).toBe('Encounter');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(dttSessionToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(dttSessionToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(dttSessionToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(dttSessionToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('class is ambulatory (HL7 v3-ActCode AMB)', () => {
    expect(dttSessionToFhir(FULL).class).toEqual({
      system: ACT_ENCOUNTER_CLASS_SYSTEM,
      code: 'AMB',
      display: 'ambulatory',
    });
  });

  it('type carries the program area', () => {
    expect(dttSessionToFhir(FULL).type).toEqual([
      {
        coding: [{ system: DTT_PROGRAM_AREA_SYSTEM, code: 'communication' }],
        text: 'DTT — communication',
      },
    ]);
  });

  it('therapist is the participant', () => {
    expect(dttSessionToFhir(FULL).participant).toEqual([
      { individual: { reference: 'Practitioner/64a555555555555555555555' } },
    ]);
  });

  it('omits participant when no therapist', () => {
    expect(dttSessionToFhir(MINIMAL).participant).toBeUndefined();
  });

  it('period derives end from sessionDate + durationMinutes', () => {
    expect(dttSessionToFhir(FULL).period).toEqual({
      start: '2026-03-10T09:00:00.000Z',
      end: '2026-03-10T09:45:00.000Z',
    });
  });

  it('period has start only when no duration', () => {
    expect(dttSessionToFhir(MINIMAL).period).toEqual({ start: '2026-02-01T09:00:00.000Z' });
  });

  it('serviceProvider references the branch Organization', () => {
    expect(dttSessionToFhir(FULL).serviceProvider).toEqual({
      reference: 'Organization/64a2222222222222222222bb',
    });
  });

  it('omits serviceProvider when no branch', () => {
    expect(dttSessionToFhir(MINIMAL).serviceProvider).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(dttSessionToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    dttSessionToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1330 status mapping', () => {
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

describe('W1330 target + extensions', () => {
  it('buildTargetExtension summarises trials (count + correct)', () => {
    const ext = buildTargetExtension(FULL.targets[0]);
    expect(ext.url).toBe(DTT_TARGET_EXTENSION_URL);
    expect(ext.extension).toContainEqual({
      url: 'target-name',
      valueString: 'Mand for preferred item',
    });
    expect(ext.extension).toContainEqual({ url: 'trial-count', valueInteger: 3 });
    expect(ext.extension).toContainEqual({ url: 'correct-count', valueInteger: 2 });
    expect(ext.extension).toContainEqual({ url: 'mastery-achieved', valueBoolean: true });
  });

  it('target without trials omits the count sub-extensions', () => {
    const ext = buildTargetExtension(FULL.targets[1]);
    expect(ext.extension).toEqual([{ url: 'target-name', valueString: 'Tact common objects' }]);
  });

  it('carries duration + care-plan + one ext per target', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === DTT_DURATION_EXTENSION_URL)).toEqual({
      url: DTT_DURATION_EXTENSION_URL,
      valueInteger: 45,
    });
    expect(ext.find(e => e.url === DTT_CARE_PLAN_EXTENSION_URL)).toEqual({
      url: DTT_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64a3333333333333333333cc' },
    });
    expect(ext.filter(e => e.url === DTT_TARGET_EXTENSION_URL)).toHaveLength(2);
  });

  it('MINIMAL produces no extensions', () => {
    expect(dttSessionToFhir(MINIMAL).extension).toBeUndefined();
  });

  it('CANCELLED carries the cancel-reason extension', () => {
    const resource = dttSessionToFhir(CANCELLED);
    expect(resource.extension).toContainEqual({
      url: DTT_CANCEL_REASON_EXTENSION_URL,
      valueString: 'Beneficiary ill',
    });
  });
});

describe('W1330 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildType returns undefined without a program area', () => {
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
    expect(() => dttSessionToFhir()).toThrow(TypeError);
    expect(() => dttSessionToFhir(null)).toThrow(/session object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => dttSessionToFhir({ programArea: 'social' })).toThrow(/beneficiaryId is required/);
  });
});
