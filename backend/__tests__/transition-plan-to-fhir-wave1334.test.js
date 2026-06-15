'use strict';
/**
 * W1334 — TransitionPlan → FHIR R4 CarePlan mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * TransitionPlan onto a base FHIR R4 CarePlan plus a round-trip.
 */

const {
  transitionPlanToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toMilestoneStatus,
  buildCategory,
  buildActivities,
  buildDomainScoreExtension,
  buildExtensions,
  STATUS_MAP,
  MILESTONE_STATUS,
  ORG_FHIR_BASE,
  TP_CATEGORY_SYSTEM,
  TP_CATEGORY_CODE,
  TP_DOMAIN_CODESYSTEM,
  TP_STATUS_EXTENSION_URL,
  TP_TYPE_EXTENSION_URL,
  TP_CURRENT_AGE_EXTENSION_URL,
  TP_CURRENT_PLACEMENT_EXTENSION_URL,
  TP_TARGET_PLACEMENT_EXTENSION_URL,
  TP_PLANNED_DATE_EXTENSION_URL,
  TP_ACTUAL_DATE_EXTENSION_URL,
  TP_DOMAIN_SCORE_EXTENSION_URL,
  TP_COMPOSITE_READINESS_EXTENSION_URL,
  TP_READINESS_ASSESSED_EXTENSION_URL,
  TP_MILESTONE_DETAIL_EXTENSION_URL,
  TP_BRANCH_EXTENSION_URL,
  TP_CARE_PLAN_EXTENSION_URL,
  TP_IEP_EXTENSION_URL,
} = require('../intelligence/fhir/transition-plan-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  transitionLeadId: '64a555555555555555555555',
  linkedCarePlanVersionId: '64a3333333333333333333cc',
  linkedIepId: '64a4444444444444444444dd',
  transitionType: 'school_to_work',
  status: 'in_progress',
  currentAgeMonths: 216,
  currentPlacement: 'Special school grade 12',
  targetPlacement: 'Sheltered vocational workshop',
  plannedTransitionDate: '2026-09-01T00:00:00.000Z',
  actualTransitionDate: '2026-09-15T00:00:00.000Z',
  domainScores: [
    { domain: 'vocational', score: 3 },
    { domain: 'life_skills', score: 4 },
  ],
  compositeReadinessScore: 3.5,
  readinessAssessedAt: '2026-05-01T10:00:00.000Z',
  milestones: [
    {
      title: 'Complete job-readiness assessment',
      domain: 'vocational',
      dueDate: '2026-06-01T00:00:00.000Z',
      achievedAt: '2026-05-28T00:00:00.000Z',
      status: 'achieved',
    },
    {
      title: 'Independent commute training',
      domain: 'life_skills',
      dueDate: '2026-07-01T00:00:00.000Z',
      status: 'in_progress',
    },
  ],
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  transitionType: 'early_to_school',
  status: 'draft',
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  transitionType: 'rehab_to_community',
  status: 'cancelled',
});

describe('W1334 transitionPlanToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.TransitionPlan.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.TransitionPlan.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.TransitionPlan.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1334 transitionPlanToFhir — resource shape', () => {
  it('emits a FHIR R4 CarePlan', () => {
    expect(transitionPlanToFhir(FULL).resourceType).toBe('CarePlan');
  });

  it('intent is plan (fixed)', () => {
    expect(transitionPlanToFhir(FULL).intent).toBe('plan');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(transitionPlanToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(transitionPlanToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(transitionPlanToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(transitionPlanToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('category is the fixed life-stage-transition discriminator', () => {
    expect(transitionPlanToFhir(FULL).category).toEqual([
      {
        coding: [{ system: TP_CATEGORY_SYSTEM, code: TP_CATEGORY_CODE }],
        text: 'Life-Stage Transition Plan',
      },
    ]);
  });

  it('author references the transition lead as a Practitioner', () => {
    expect(transitionPlanToFhir(FULL).author).toEqual({
      reference: 'Practitioner/64a555555555555555555555',
    });
  });

  it('activity carries one entry per milestone with domain code + due period', () => {
    const activity = transitionPlanToFhir(FULL).activity;
    expect(activity).toHaveLength(2);
    expect(activity[0].detail.code).toEqual({
      coding: [{ system: TP_DOMAIN_CODESYSTEM, code: 'vocational' }],
      text: 'Complete job-readiness assessment',
    });
    expect(activity[0].detail.status).toBe('completed');
    expect(activity[0].detail.scheduledPeriod).toEqual({ end: '2026-06-01' });
    expect(activity[0].detail.extension[0].extension).toContainEqual({
      url: 'achievedAt',
      valueDateTime: '2026-05-28T00:00:00.000Z',
    });
  });

  it('omits activity when no milestones', () => {
    expect(transitionPlanToFhir(MINIMAL).activity).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(transitionPlanToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    transitionPlanToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1334 status mapping', () => {
  it('STATUS_MAP and MILESTONE_STATUS are frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
    expect(Object.isFrozen(MILESTONE_STATUS)).toBe(true);
  });

  it('maps the 6 lifecycle states', () => {
    expect(toFhirStatus('draft')).toBe('draft');
    expect(toFhirStatus('readiness_assessed')).toBe('active');
    expect(toFhirStatus('in_progress')).toBe('active');
    expect(toFhirStatus('completed')).toBe('completed');
    expect(toFhirStatus('paused')).toBe('on-hold');
    expect(toFhirStatus('cancelled')).toBe('revoked');
  });

  it('absent → unknown; unmapped → unknown', () => {
    expect(toFhirStatus(undefined)).toBe('unknown');
    expect(toFhirStatus('weird')).toBe('unknown');
  });

  it('maps milestone status', () => {
    expect(toMilestoneStatus('pending')).toBe('not-started');
    expect(toMilestoneStatus('achieved')).toBe('completed');
    expect(toMilestoneStatus('missed')).toBe('stopped');
    expect(toMilestoneStatus('weird')).toBe('unknown');
  });
});

describe('W1334 extensions', () => {
  it('carries status + type + current age', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TP_STATUS_EXTENSION_URL).valueCode).toBe('in_progress');
    expect(ext.find(e => e.url === TP_TYPE_EXTENSION_URL).valueCode).toBe('school_to_work');
    expect(ext.find(e => e.url === TP_CURRENT_AGE_EXTENSION_URL).valueInteger).toBe(216);
  });

  it('carries current + target placement', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TP_CURRENT_PLACEMENT_EXTENSION_URL).valueString).toBe(
      'Special school grade 12'
    );
    expect(ext.find(e => e.url === TP_TARGET_PLACEMENT_EXTENSION_URL).valueString).toBe(
      'Sheltered vocational workshop'
    );
  });

  it('carries planned + actual transition dates', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TP_PLANNED_DATE_EXTENSION_URL).valueDate).toBe('2026-09-01');
    expect(ext.find(e => e.url === TP_ACTUAL_DATE_EXTENSION_URL).valueDate).toBe('2026-09-15');
  });

  it('carries one nested extension per domain score', () => {
    const ext = buildExtensions(FULL);
    const scores = ext.filter(e => e.url === TP_DOMAIN_SCORE_EXTENSION_URL);
    expect(scores).toHaveLength(2);
    expect(scores[0].extension).toEqual([
      { url: 'domain', valueCode: 'vocational' },
      { url: 'score', valueInteger: 3 },
    ]);
  });

  it('carries composite readiness + assessed-at', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TP_COMPOSITE_READINESS_EXTENSION_URL).valueDecimal).toBe(3.5);
    expect(ext.find(e => e.url === TP_READINESS_ASSESSED_EXTENSION_URL).valueDateTime).toBe(
      '2026-05-01T10:00:00.000Z'
    );
  });

  it('carries branch + linked care-plan references + IEP id', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === TP_BRANCH_EXTENSION_URL)).toEqual({
      url: TP_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
    expect(ext.find(e => e.url === TP_CARE_PLAN_EXTENSION_URL)).toEqual({
      url: TP_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64a3333333333333333333cc' },
    });
    expect(ext.find(e => e.url === TP_IEP_EXTENSION_URL)).toEqual({
      url: TP_IEP_EXTENSION_URL,
      valueString: '64a4444444444444444444dd',
    });
  });

  it('MINIMAL carries only status + type extensions', () => {
    const resource = transitionPlanToFhir(MINIMAL);
    expect(resource.extension.map(e => e.url).sort()).toEqual(
      [TP_STATUS_EXTENSION_URL, TP_TYPE_EXTENSION_URL].sort()
    );
  });
});

describe('W1334 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildCategory returns the fixed discriminator', () => {
    expect(buildCategory()[0].coding[0].code).toBe(TP_CATEGORY_CODE);
  });

  it('toFhirDate returns YYYY-MM-DD; toFhirDateTime full ISO', () => {
    expect(toFhirDate('2026-09-01T00:00:00.000Z')).toBe('2026-09-01');
    expect(toFhirDateTime('2026-05-01T10:00:00.000Z')).toBe('2026-05-01T10:00:00.000Z');
    expect(toFhirDate(undefined)).toBeUndefined();
    expect(toFhirDate('not-a-date')).toBeUndefined();
  });

  it('buildActivities returns undefined without milestones', () => {
    expect(buildActivities({})).toBeUndefined();
  });

  it('buildDomainScoreExtension returns undefined without a domain', () => {
    expect(buildDomainScoreExtension({})).toBeUndefined();
    expect(buildDomainScoreExtension({ domain: 'social', score: 2 }).extension).toEqual([
      { url: 'domain', valueCode: 'social' },
      { url: 'score', valueInteger: 2 },
    ]);
  });

  it('throws when plan is missing', () => {
    expect(() => transitionPlanToFhir()).toThrow(TypeError);
    expect(() => transitionPlanToFhir(null)).toThrow(/plan object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => transitionPlanToFhir({ transitionType: 'school_to_work' })).toThrow(
      /beneficiaryId is required/
    );
  });
});
