'use strict';
/**
 * W1335 — CaregiverSupportProgram → FHIR R4 CarePlan mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * CaregiverSupportProgram onto a base FHIR R4 CarePlan plus a round-trip.
 */

const {
  caregiverSupportProgramToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toActivityStatus,
  buildCategory,
  buildPeriod,
  buildActivities,
  buildSessionExtension,
  buildOutcomeExtension,
  buildExtensions,
  STATUS_MAP,
  ACTIVITY_STATUS,
  ORG_FHIR_BASE,
  CSP_CATEGORY_SYSTEM,
  CSP_CATEGORY_CODE,
  CSP_MODULE_CODESYSTEM,
  CSP_STATUS_EXTENSION_URL,
  CSP_PROGRAM_TYPE_EXTENSION_URL,
  CSP_CAREGIVER_GUARDIAN_EXTENSION_URL,
  CSP_CAREGIVER_NAME_EXTENSION_URL,
  CSP_CAREGIVER_RELATIONSHIP_EXTENSION_URL,
  CSP_CAREGIVER_PHONE_EXTENSION_URL,
  CSP_TARGET_COMPLETION_EXTENSION_URL,
  CSP_PAUSED_AT_EXTENSION_URL,
  CSP_DISCONTINUED_AT_EXTENSION_URL,
  CSP_DISCONTINUE_REASON_EXTENSION_URL,
  CSP_COUNSELOR_NAME_EXTENSION_URL,
  CSP_TOTAL_MODULES_EXTENSION_URL,
  CSP_TOTAL_TARGET_HOURS_EXTENSION_URL,
  CSP_SIBLING_AGE_RANGE_EXTENSION_URL,
  CSP_GROUP_NAME_EXTENSION_URL,
  CSP_GROUP_FREQUENCY_EXTENSION_URL,
  CSP_SESSION_EXTENSION_URL,
  CSP_OUTCOME_EXTENSION_URL,
  CSP_BRANCH_EXTENSION_URL,
} = require('../intelligence/fhir/caregiver-support-program-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  programType: 'caregiver_training',
  status: 'in_progress',
  caregiverGuardianId: '64a3333333333333333333cc',
  caregiverName: 'Umm Khalid',
  caregiverRelationship: 'mother',
  caregiverPhone: '+966500000000',
  enrolledAt: '2026-01-10T00:00:00.000Z',
  targetCompletionDate: '2026-06-10T00:00:00.000Z',
  assignedCounselorId: '64a4444444444444444444dd',
  assignedCounselorName: 'Counselor Sara',
  totalModules: 6,
  totalTargetHours: 24,
  modulesProgress: [
    {
      moduleNumber: 1,
      title: 'Understanding behavior',
      targetHours: 4,
      hoursCompleted: 4,
      completedAt: '2026-02-01T00:00:00.000Z',
    },
    {
      moduleNumber: 2,
      title: 'Positive reinforcement',
      targetHours: 4,
      hoursCompleted: 2,
    },
  ],
  sessions: [
    {
      sessionDate: '2026-01-20T10:00:00.000Z',
      durationMinutes: 90,
      format: 'individual',
      topic: 'Intro session',
      facilitatorId: '64a5555555555555555555ee',
      attendanceStatus: 'attended',
      progressNotes: 'Engaged well',
    },
  ],
  outcomes: {
    preProgramBurdenScore: 52,
    postProgramBurdenScore: 38,
    satisfactionScore: 9,
    selfReportedImpact: 'Less overwhelmed',
  },
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  programType: 'parent_support_group',
  status: 'enrolled',
});

const DISCONTINUED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  programType: 'caregiver_counseling',
  status: 'discontinued',
  discontinuedAt: '2026-03-01T00:00:00.000Z',
  discontinuationReason: 'Family relocated',
});

describe('W1335 caregiverSupportProgramToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.CaregiverSupportProgram.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.CaregiverSupportProgram.safeParse(MINIMAL).success).toBe(true);
  });

  it('DISCONTINUED fixture satisfies the canonical schema', () => {
    expect(canonical.CaregiverSupportProgram.safeParse(DISCONTINUED).success).toBe(true);
  });
});

describe('W1335 caregiverSupportProgramToFhir — resource shape', () => {
  it('emits a FHIR R4 CarePlan', () => {
    expect(caregiverSupportProgramToFhir(FULL).resourceType).toBe('CarePlan');
  });

  it('intent is plan (fixed)', () => {
    expect(caregiverSupportProgramToFhir(FULL).intent).toBe('plan');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(caregiverSupportProgramToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(caregiverSupportProgramToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(caregiverSupportProgramToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(caregiverSupportProgramToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('category is the fixed caregiver-support discriminator', () => {
    expect(caregiverSupportProgramToFhir(FULL).category).toEqual([
      {
        coding: [{ system: CSP_CATEGORY_SYSTEM, code: CSP_CATEGORY_CODE }],
        text: 'Caregiver Support Program',
      },
    ]);
  });

  it('author references the assigned counselor as a Practitioner', () => {
    expect(caregiverSupportProgramToFhir(FULL).author).toEqual({
      reference: 'Practitioner/64a4444444444444444444dd',
    });
  });

  it('period spans enrolledAt..targetCompletionDate', () => {
    expect(caregiverSupportProgramToFhir(FULL).period).toEqual({
      start: '2026-01-10',
      end: '2026-06-10',
    });
  });

  it('activity carries one entry per module with code + status + nested progress', () => {
    const activity = caregiverSupportProgramToFhir(FULL).activity;
    expect(activity).toHaveLength(2);
    expect(activity[0].detail.code).toEqual({
      coding: [{ system: CSP_MODULE_CODESYSTEM, code: '1' }],
      text: 'Understanding behavior',
    });
    expect(activity[0].detail.status).toBe('completed');
    expect(activity[0].detail.scheduledString).toBe('4h target');
    expect(activity[0].detail.extension[0].extension).toContainEqual({
      url: 'completedAt',
      valueDateTime: '2026-02-01T00:00:00.000Z',
    });
    // module 2 has no completedAt -> falls back to program lifecycle (in_progress)
    expect(activity[1].detail.status).toBe('in-progress');
  });

  it('omits activity when no modules', () => {
    expect(caregiverSupportProgramToFhir(MINIMAL).activity).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(caregiverSupportProgramToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    caregiverSupportProgramToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1335 status mapping', () => {
  it('STATUS_MAP and ACTIVITY_STATUS are frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
    expect(Object.isFrozen(ACTIVITY_STATUS)).toBe(true);
  });

  it('maps the 5 lifecycle states', () => {
    expect(toFhirStatus('enrolled')).toBe('active');
    expect(toFhirStatus('in_progress')).toBe('active');
    expect(toFhirStatus('paused')).toBe('on-hold');
    expect(toFhirStatus('completed')).toBe('completed');
    expect(toFhirStatus('discontinued')).toBe('revoked');
  });

  it('absent → unknown; unmapped → unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('unknown');
  });

  it('maps activity status', () => {
    expect(toActivityStatus('enrolled')).toBe('scheduled');
    expect(toActivityStatus('completed')).toBe('completed');
    expect(toActivityStatus('discontinued')).toBe('cancelled');
    expect(toActivityStatus('weird')).toBe('unknown');
  });
});

describe('W1335 extensions', () => {
  it('carries status + program type', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === CSP_STATUS_EXTENSION_URL).valueCode).toBe('in_progress');
    expect(ext.find(e => e.url === CSP_PROGRAM_TYPE_EXTENSION_URL).valueCode).toBe(
      'caregiver_training'
    );
  });

  it('carries caregiver details', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === CSP_CAREGIVER_GUARDIAN_EXTENSION_URL)).toEqual({
      url: CSP_CAREGIVER_GUARDIAN_EXTENSION_URL,
      valueReference: { reference: 'RelatedPerson/64a3333333333333333333cc' },
    });
    expect(ext.find(e => e.url === CSP_CAREGIVER_NAME_EXTENSION_URL).valueString).toBe(
      'Umm Khalid'
    );
    expect(ext.find(e => e.url === CSP_CAREGIVER_RELATIONSHIP_EXTENSION_URL).valueString).toBe(
      'mother'
    );
    expect(ext.find(e => e.url === CSP_CAREGIVER_PHONE_EXTENSION_URL).valueString).toBe(
      '+966500000000'
    );
  });

  it('carries target completion + counselor name + totals', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === CSP_TARGET_COMPLETION_EXTENSION_URL).valueDate).toBe(
      '2026-06-10'
    );
    expect(ext.find(e => e.url === CSP_COUNSELOR_NAME_EXTENSION_URL).valueString).toBe(
      'Counselor Sara'
    );
    expect(ext.find(e => e.url === CSP_TOTAL_MODULES_EXTENSION_URL).valueInteger).toBe(6);
    expect(ext.find(e => e.url === CSP_TOTAL_TARGET_HOURS_EXTENSION_URL).valueDecimal).toBe(24);
  });

  it('carries one nested session extension', () => {
    const ext = buildExtensions(FULL);
    const sessions = ext.filter(e => e.url === CSP_SESSION_EXTENSION_URL);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].extension).toContainEqual({ url: 'format', valueCode: 'individual' });
    expect(sessions[0].extension).toContainEqual({
      url: 'attendanceStatus',
      valueCode: 'attended',
    });
    expect(sessions[0].extension).toContainEqual({
      url: 'facilitator',
      valueReference: { reference: 'Practitioner/64a5555555555555555555ee' },
    });
  });

  it('carries the nested outcome extension', () => {
    const ext = buildExtensions(FULL);
    const outcome = ext.find(e => e.url === CSP_OUTCOME_EXTENSION_URL);
    expect(outcome.extension).toContainEqual({ url: 'preProgramBurdenScore', valueDecimal: 52 });
    expect(outcome.extension).toContainEqual({ url: 'postProgramBurdenScore', valueDecimal: 38 });
    expect(outcome.extension).toContainEqual({ url: 'satisfactionScore', valueDecimal: 9 });
  });

  it('carries branch as Organization reference', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === CSP_BRANCH_EXTENSION_URL)).toEqual({
      url: CSP_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
  });

  it('carries discontinue fields on the DISCONTINUED fixture', () => {
    const ext = buildExtensions(DISCONTINUED);
    expect(ext.find(e => e.url === CSP_DISCONTINUED_AT_EXTENSION_URL).valueDateTime).toBe(
      '2026-03-01T00:00:00.000Z'
    );
    expect(ext.find(e => e.url === CSP_DISCONTINUE_REASON_EXTENSION_URL).valueString).toBe(
      'Family relocated'
    );
  });

  it('MINIMAL carries only status + program-type extensions', () => {
    const resource = caregiverSupportProgramToFhir(MINIMAL);
    expect(resource.extension.map(e => e.url).sort()).toEqual(
      [CSP_STATUS_EXTENSION_URL, CSP_PROGRAM_TYPE_EXTENSION_URL].sort()
    );
  });
});

describe('W1335 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildCategory returns the fixed discriminator', () => {
    expect(buildCategory()[0].coding[0].code).toBe(CSP_CATEGORY_CODE);
  });

  it('toFhirDate returns YYYY-MM-DD; toFhirDateTime full ISO', () => {
    expect(toFhirDate('2026-01-10T00:00:00.000Z')).toBe('2026-01-10');
    expect(toFhirDateTime('2026-01-20T10:00:00.000Z')).toBe('2026-01-20T10:00:00.000Z');
    expect(toFhirDate(undefined)).toBeUndefined();
    expect(toFhirDate('not-a-date')).toBeUndefined();
  });

  it('buildPeriod returns undefined without dates', () => {
    expect(buildPeriod({})).toBeUndefined();
  });

  it('buildActivities returns undefined without modules', () => {
    expect(buildActivities({})).toBeUndefined();
  });

  it('buildSessionExtension/buildOutcomeExtension return undefined when empty', () => {
    expect(buildSessionExtension({})).toBeUndefined();
    expect(buildOutcomeExtension({})).toBeUndefined();
  });

  it('throws when program is missing', () => {
    expect(() => caregiverSupportProgramToFhir()).toThrow(TypeError);
    expect(() => caregiverSupportProgramToFhir(null)).toThrow(/program object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => caregiverSupportProgramToFhir({ programType: 'caregiver_training' })).toThrow(
      /beneficiaryId is required/
    );
  });
});
