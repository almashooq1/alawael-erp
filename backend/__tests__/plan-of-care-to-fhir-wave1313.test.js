'use strict';
/**
 * W1313 — PlanOfCare → FHIR R4 CarePlan mapper self-test. Pure unit, no DB.
 */

const {
  planOfCareToFhir,
  toFhirStatus,
  toFhirDate,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  NUANCED_STATUSES,
  EPISODE_EXTENSION_URL,
  VERSION_EXTENSION_URL,
  SESSIONS_PER_WEEK_EXTENSION_URL,
  APPROVAL_EXTENSION_URL,
  STATUS_DETAIL_EXTENSION_URL,
} = require('../intelligence/fhir/plan-of-care-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

/** A fully-populated canonical PlanOfCare fixture. */
const FULL_PLAN = {
  _id: '6500000000000000000000aa',
  beneficiaryId: '64a1111111111111111111aa',
  episodeId: '64b2222222222222222222bb',
  version: 3,
  status: 'active',
  startDate: '2026-02-01',
  expectedEndDate: '2026-08-01',
  sessionsPerWeek: 2,
  approvedBy: '64e4444444444444444444dd',
  approvedAt: '2026-02-03',
  changeReason: 'goal progression',
  createdAt: '2026-02-01T08:00:00.000Z',
  updatedAt: '2026-02-03T08:00:00.000Z',
};

describe('W1313 PlanOfCare → FHIR CarePlan — core projection', () => {
  const r = planOfCareToFhir(FULL_PLAN);

  it('sets resourceType CarePlan', () => {
    expect(r.resourceType).toBe('CarePlan');
  });

  it('fixes intent to plan (mandatory)', () => {
    expect(r.intent).toBe('plan');
  });

  it('carries the canonical _id as FHIR id', () => {
    expect(r.id).toBe('6500000000000000000000aa');
  });

  it('omits id when includeId=false', () => {
    expect(planOfCareToFhir(FULL_PLAN, { includeId: false }).id).toBeUndefined();
  });

  it('references the beneficiary as the Patient subject', () => {
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });

  it('builds period from the plan timeline', () => {
    expect(r.period).toEqual({ start: '2026-02-01', end: '2026-08-01' });
  });

  it('maps changeReason to note text', () => {
    expect(r.note).toEqual([{ text: 'goal progression' }]);
  });
});

describe('W1313 PlanOfCare → FHIR CarePlan — status value-set', () => {
  it.each([
    ['draft', 'draft'],
    ['pending_review', 'draft'],
    ['pending_approval', 'draft'],
    ['active', 'active'],
    ['on_hold', 'on-hold'],
    ['completed', 'completed'],
    ['cancelled', 'revoked'],
    ['superseded', 'revoked'],
  ])('maps canonical %s → FHIR %s', (canonicalStatus, fhirStatus) => {
    expect(toFhirStatus(canonicalStatus)).toBe(fhirStatus);
  });

  it('defaults absent status to unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
  });

  it('maps an unrecognised status to unknown', () => {
    expect(toFhirStatus('xyz')).toBe('unknown');
  });

  it('STATUS_MAP covers every canonical PlanStatus value', () => {
    [
      'draft',
      'pending_review',
      'pending_approval',
      'active',
      'on_hold',
      'completed',
      'cancelled',
      'superseded',
    ].forEach(s => expect(STATUS_MAP[s]).toBeDefined());
  });
});

describe('W1313 PlanOfCare → FHIR CarePlan — period', () => {
  it('returns undefined when no dates present', () => {
    expect(buildPeriod({ beneficiaryId: 'x' })).toBeUndefined();
  });

  it('coerces a Date instance to YYYY-MM-DD', () => {
    expect(toFhirDate(new Date('2026-02-01T22:00:00.000Z'))).toBe('2026-02-01');
  });

  it('returns undefined for an invalid date', () => {
    expect(toFhirDate('nope')).toBeUndefined();
  });
});

describe('W1313 PlanOfCare → FHIR CarePlan — extensions', () => {
  const ext = buildExtensions(FULL_PLAN);

  it('carries the episode as an EpisodeOfCare reference extension', () => {
    expect(ext).toContainEqual({
      url: EPISODE_EXTENSION_URL,
      valueReference: { reference: 'EpisodeOfCare/64b2222222222222222222bb' },
    });
  });

  it('carries version as an integer extension', () => {
    expect(ext).toContainEqual({ url: VERSION_EXTENSION_URL, valueInteger: 3 });
  });

  it('carries sessionsPerWeek as an integer extension', () => {
    expect(ext).toContainEqual({
      url: SESSIONS_PER_WEEK_EXTENSION_URL,
      valueInteger: 2,
    });
  });

  it('carries approval as a nested extension', () => {
    expect(ext).toContainEqual({
      url: APPROVAL_EXTENSION_URL,
      extension: [
        {
          url: 'approvedBy',
          valueReference: { reference: 'Practitioner/64e4444444444444444444dd' },
        },
        { url: 'approvedAt', valueDate: '2026-02-03' },
      ],
    });
  });

  it('preserves nuanced statuses in a status-detail extension', () => {
    const r = planOfCareToFhir({ ...FULL_PLAN, status: 'superseded' });
    expect(r.status).toBe('revoked');
    expect(r.extension).toContainEqual({
      url: STATUS_DETAIL_EXTENSION_URL,
      valueCode: 'superseded',
    });
  });

  it('NUANCED_STATUSES lists the three lossy statuses', () => {
    expect(NUANCED_STATUSES).toEqual(['pending_review', 'pending_approval', 'superseded']);
  });

  it('omits extension array entirely on a minimal plan', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      episodeId: '64b2222222222222222222bb',
      status: 'active',
      startDate: '2026-02-01',
    };
    const r = planOfCareToFhir(minimal);
    // episodeId still produces one extension; assert it is ONLY that
    expect(r.extension).toEqual([
      {
        url: EPISODE_EXTENSION_URL,
        valueReference: { reference: 'EpisodeOfCare/64b2222222222222222222bb' },
      },
    ]);
  });
});

describe('W1313 PlanOfCare → FHIR CarePlan — guards', () => {
  it('throws when plan is missing', () => {
    expect(() => planOfCareToFhir(undefined)).toThrow(TypeError);
  });

  it('throws when beneficiaryId is absent', () => {
    expect(() =>
      planOfCareToFhir({
        episodeId: '64b2222222222222222222bb',
        status: 'active',
        startDate: '2026-02-01',
      })
    ).toThrow(/beneficiaryId/);
  });
});

describe('W1313 PlanOfCare → FHIR CarePlan — canonical conformance', () => {
  it('the fixture validates against the canonical PlanOfCare schema', () => {
    expect(canonical.PlanOfCare.safeParse(FULL_PLAN).success).toBe(true);
  });

  it('a minimal valid plan maps to a conformant CarePlan', () => {
    const minimal = {
      beneficiaryId: '64a1111111111111111111aa',
      episodeId: '64b2222222222222222222bb',
      status: 'draft',
      startDate: '2026-02-01',
    };
    expect(canonical.PlanOfCare.safeParse(minimal).success).toBe(true);
    const r = planOfCareToFhir(minimal);
    expect(r.resourceType).toBe('CarePlan');
    expect(r.status).toBe('draft');
    expect(r.intent).toBe('plan');
    expect(r.subject.reference).toBe('Patient/64a1111111111111111111aa');
  });
});
