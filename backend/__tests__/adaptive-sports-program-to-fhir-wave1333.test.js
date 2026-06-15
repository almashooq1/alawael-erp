'use strict';
/**
 * W1333 — AdaptiveSportsProgram → FHIR R4 CarePlan mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * AdaptiveSportsProgram onto a base FHIR R4 CarePlan plus a round-trip.
 */

const {
  adaptiveSportsProgramToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toActivityStatus,
  buildCategory,
  buildPeriod,
  buildActivities,
  buildSessionExtension,
  buildAchievementExtension,
  buildExtensions,
  STATUS_MAP,
  ACTIVITY_STATUS,
  ORG_FHIR_BASE,
  ASP_CATEGORY_SYSTEM,
  ASP_CATEGORY_CODE,
  ASP_SPORT_CODESYSTEM,
  ASP_STATUS_EXTENSION_URL,
  ASP_SPORT_EXTENSION_URL,
  ASP_SPORT_CATEGORY_EXTENSION_URL,
  ASP_PHYSICAL_DEMAND_EXTENSION_URL,
  ASP_FREQUENCY_EXTENSION_URL,
  ASP_FAMILY_CONSENT_EXTENSION_URL,
  ASP_MEDICAL_CLEARANCE_EXTENSION_URL,
  ASP_SESSION_EXTENSION_URL,
  ASP_ACHIEVEMENT_EXTENSION_URL,
  ASP_BRANCH_EXTENSION_URL,
  ASP_CARE_PLAN_EXTENSION_URL,
  ASP_DISCONTINUE_EXTENSION_URL,
} = require('../intelligence/fhir/adaptive-sports-program-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  primaryCoachId: '64a555555555555555555555',
  linkedCarePlanVersionId: '64a3333333333333333333cc',
  sport: 'wheelchair_basketball',
  category: 'team',
  physicalDemand: 'high',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-06-30T00:00:00.000Z',
  frequencyPerWeek: 3,
  familyConsent: true,
  medicalClearance: true,
  sessions: [
    {
      date: '2026-01-05T16:00:00.000Z',
      type: 'training',
      durationMinutes: 90,
      independenceLevel: 'minimal_support',
    },
    {
      date: '2026-01-12T16:00:00.000Z',
      type: 'competition',
      durationMinutes: 120,
      independenceLevel: 'independent',
    },
  ],
  achievements: [
    {
      title: 'Regional silver medal',
      earnedAt: '2026-03-01T12:00:00.000Z',
      competitionName: 'Riyadh Para Cup',
      placement: '2nd',
    },
  ],
  status: 'active',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  sport: 'boccia',
  category: 'individual',
  physicalDemand: 'low',
  status: 'draft',
});

const DISCONTINUED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  sport: 'goalball',
  category: 'team',
  physicalDemand: 'moderate',
  status: 'discontinued',
  discontinuationReason: 'Relocation',
});

describe('W1333 adaptiveSportsProgramToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.AdaptiveSportsProgram.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.AdaptiveSportsProgram.safeParse(MINIMAL).success).toBe(true);
  });

  it('DISCONTINUED fixture satisfies the canonical schema', () => {
    expect(canonical.AdaptiveSportsProgram.safeParse(DISCONTINUED).success).toBe(true);
  });
});

describe('W1333 adaptiveSportsProgramToFhir — resource shape', () => {
  it('emits a FHIR R4 CarePlan', () => {
    expect(adaptiveSportsProgramToFhir(FULL).resourceType).toBe('CarePlan');
  });

  it('intent is plan (fixed)', () => {
    expect(adaptiveSportsProgramToFhir(FULL).intent).toBe('plan');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(adaptiveSportsProgramToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(adaptiveSportsProgramToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(adaptiveSportsProgramToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(adaptiveSportsProgramToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('category is the fixed adaptive-sports discriminator', () => {
    expect(adaptiveSportsProgramToFhir(FULL).category).toEqual([
      {
        coding: [{ system: ASP_CATEGORY_SYSTEM, code: ASP_CATEGORY_CODE }],
        text: 'Adaptive Sports Program',
      },
    ]);
  });

  it('author references the primary coach as a Practitioner', () => {
    expect(adaptiveSportsProgramToFhir(FULL).author).toEqual({
      reference: 'Practitioner/64a555555555555555555555',
    });
  });

  it('period spans startDate..endDate', () => {
    expect(adaptiveSportsProgramToFhir(FULL).period).toEqual({
      start: '2026-01-01',
      end: '2026-06-30',
    });
  });

  it('omits period when no dates', () => {
    expect(adaptiveSportsProgramToFhir(MINIMAL).period).toBeUndefined();
  });

  it('activity carries the sport as the activity code', () => {
    const activity = adaptiveSportsProgramToFhir(FULL).activity;
    expect(activity).toHaveLength(1);
    expect(activity[0].detail.code).toEqual({
      coding: [{ system: ASP_SPORT_CODESYSTEM, code: 'wheelchair_basketball' }],
      text: 'Adaptive Sport — wheelchair_basketball',
    });
    expect(activity[0].detail.status).toBe('in-progress');
    expect(activity[0].detail.scheduledString).toBe('3x per week');
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(adaptiveSportsProgramToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    adaptiveSportsProgramToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1333 status mapping', () => {
  it('STATUS_MAP and ACTIVITY_STATUS are frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
    expect(Object.isFrozen(ACTIVITY_STATUS)).toBe(true);
  });

  it('maps the 5 lifecycle states', () => {
    expect(toFhirStatus('draft')).toBe('draft');
    expect(toFhirStatus('active')).toBe('active');
    expect(toFhirStatus('paused')).toBe('on-hold');
    expect(toFhirStatus('completed')).toBe('completed');
    expect(toFhirStatus('discontinued')).toBe('revoked');
  });

  it('absent → unknown; unmapped → unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('unknown');
  });

  it('maps activity status', () => {
    expect(toActivityStatus('draft')).toBe('not-started');
    expect(toActivityStatus('discontinued')).toBe('cancelled');
    expect(toActivityStatus('weird')).toBe('unknown');
  });
});

describe('W1333 extensions', () => {
  it('carries status + sport + category + physical demand', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ASP_STATUS_EXTENSION_URL).valueCode).toBe('active');
    expect(ext.find(e => e.url === ASP_SPORT_EXTENSION_URL).valueCode).toBe(
      'wheelchair_basketball'
    );
    expect(ext.find(e => e.url === ASP_SPORT_CATEGORY_EXTENSION_URL).valueCode).toBe('team');
    expect(ext.find(e => e.url === ASP_PHYSICAL_DEMAND_EXTENSION_URL).valueCode).toBe('high');
  });

  it('carries frequency + consent + clearance flags', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ASP_FREQUENCY_EXTENSION_URL).valueInteger).toBe(3);
    expect(ext.find(e => e.url === ASP_FAMILY_CONSENT_EXTENSION_URL).valueBoolean).toBe(true);
    expect(ext.find(e => e.url === ASP_MEDICAL_CLEARANCE_EXTENSION_URL).valueBoolean).toBe(true);
  });

  it('carries one nested extension per session', () => {
    const ext = buildExtensions(FULL);
    const sessions = ext.filter(e => e.url === ASP_SESSION_EXTENSION_URL);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].extension).toContainEqual({ url: 'type', valueCode: 'training' });
    expect(sessions[0].extension).toContainEqual({ url: 'durationMinutes', valueInteger: 90 });
  });

  it('carries one nested extension per achievement', () => {
    const ext = buildExtensions(FULL);
    const achievements = ext.filter(e => e.url === ASP_ACHIEVEMENT_EXTENSION_URL);
    expect(achievements).toHaveLength(1);
    expect(achievements[0].extension).toContainEqual({
      url: 'title',
      valueString: 'Regional silver medal',
    });
    expect(achievements[0].extension).toContainEqual({ url: 'placement', valueString: '2nd' });
  });

  it('carries branch + linked care-plan references', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === ASP_BRANCH_EXTENSION_URL)).toEqual({
      url: ASP_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
    expect(ext.find(e => e.url === ASP_CARE_PLAN_EXTENSION_URL)).toEqual({
      url: ASP_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64a3333333333333333333cc' },
    });
  });

  it('MINIMAL carries only status/sport/category/physical-demand extensions', () => {
    const resource = adaptiveSportsProgramToFhir(MINIMAL);
    expect(resource.extension.map(e => e.url).sort()).toEqual(
      [
        ASP_STATUS_EXTENSION_URL,
        ASP_SPORT_EXTENSION_URL,
        ASP_SPORT_CATEGORY_EXTENSION_URL,
        ASP_PHYSICAL_DEMAND_EXTENSION_URL,
      ].sort()
    );
  });

  it('DISCONTINUED carries the discontinue-reason extension', () => {
    const ext = adaptiveSportsProgramToFhir(DISCONTINUED).extension;
    expect(ext).toContainEqual({ url: ASP_DISCONTINUE_EXTENSION_URL, valueString: 'Relocation' });
  });
});

describe('W1333 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildCategory returns the fixed discriminator', () => {
    expect(buildCategory()[0].coding[0].code).toBe(ASP_CATEGORY_CODE);
  });

  it('toFhirDate returns YYYY-MM-DD; toFhirDateTime full ISO', () => {
    expect(toFhirDate('2026-01-01T00:00:00.000Z')).toBe('2026-01-01');
    expect(toFhirDateTime('2026-01-05T16:00:00.000Z')).toBe('2026-01-05T16:00:00.000Z');
    expect(toFhirDate(undefined)).toBeUndefined();
    expect(toFhirDate('not-a-date')).toBeUndefined();
  });

  it('buildPeriod returns undefined without dates', () => {
    expect(buildPeriod({})).toBeUndefined();
  });

  it('buildActivities returns undefined without a sport', () => {
    expect(buildActivities({})).toBeUndefined();
  });

  it('buildSessionExtension / buildAchievementExtension return undefined when empty', () => {
    expect(buildSessionExtension({})).toBeUndefined();
    expect(buildAchievementExtension({})).toBeUndefined();
  });

  it('throws when program is missing', () => {
    expect(() => adaptiveSportsProgramToFhir()).toThrow(TypeError);
    expect(() => adaptiveSportsProgramToFhir(null)).toThrow(/program object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => adaptiveSportsProgramToFhir({ sport: 'boccia' })).toThrow(
      /beneficiaryId is required/
    );
  });
});
