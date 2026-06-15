'use strict';
/**
 * W1320 — SafeguardingConcern → FHIR R4 Flag mapper unit tests.
 *
 * Validates the pure projection in
 * `intelligence/fhir/safeguarding-concern-to-fhir.lib.js` (Item 10,
 * GAPS_ASSESSMENT_2026-06-15). Includes canonical round-trip assertions so the
 * fixtures are guaranteed to be valid canonical SafeguardingConcern records.
 */

const {
  safeguardingConcernToFhir,
  toFhirStatus,
  buildSubject,
  buildCategory,
  buildCode,
  buildPeriod,
  buildInvestigationExtension,
  buildOutcomeExtension,
  buildAuthorityExtension,
  buildExtensions,
  INACTIVE_STATUSES,
  SAFEGUARDING_FLAG_CATEGORY_SYSTEM,
  SAFEGUARDING_FLAG_CATEGORY_CODE,
  SAFEGUARDING_CATEGORY_SYSTEM,
  SAFEGUARDING_STATUS_EXTENSION_URL,
  SAFEGUARDING_SEVERITY_EXTENSION_URL,
  SAFEGUARDING_SUBJECT_KIND_EXTENSION_URL,
  SAFEGUARDING_TRIAGED_AT_EXTENSION_URL,
  SAFEGUARDING_INVESTIGATION_EXTENSION_URL,
  SAFEGUARDING_OUTCOME_EXTENSION_URL,
  SAFEGUARDING_ACTION_PLAN_EXTENSION_URL,
  SAFEGUARDING_AUTHORITY_EXTENSION_URL,
  SAFEGUARDING_SUPERVISOR_NOTIFIED_EXTENSION_URL,
  SAFEGUARDING_CLOSED_BY_EXTENSION_URL,
  SAFEGUARDING_LINKED_INCIDENT_EXTENSION_URL,
  SAFEGUARDING_CONFIDENTIALITY_EXTENSION_URL,
} = require('../intelligence/fhir/safeguarding-concern-to-fhir.lib');

const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  subjectKind: 'beneficiary',
  subjectBeneficiaryId: '64a1111111111111111111aa',
  branchId: '64b2222222222222222222bb',
  reportedBy: '64c3333333333333333333cc',
  reportedAt: '2026-02-01T08:00:00.000Z',
  category: 'physical',
  severity: 'critical',
  description: 'Unexplained bruising consistent with non-accidental injury',
  triagedAt: '2026-02-01T10:00:00.000Z',
  investigatorId: '64d4444444444444444444dd',
  investigationStartedAt: '2026-02-02T09:00:00.000Z',
  outcome: 'substantiated',
  outcomeAt: '2026-02-10T09:00:00.000Z',
  actionPlan: 'Immediate safety plan; family meeting; referral to therapy',
  authorityReported: true,
  authorityName: 'Child Protection Authority',
  authorityReportedAt: '2026-02-01T11:00:00.000Z',
  supervisorNotifiedAt: '2026-02-01T08:30:00.000Z',
  status: 'escalated_to_authority',
  linkedIncidentId: '64e5555555555555555555ee',
  confidentiality: 'restricted',
});

const MINIMAL = Object.freeze({
  subjectKind: 'beneficiary',
  subjectBeneficiaryId: '64a1111111111111111111aa',
  reportedBy: '64c3333333333333333333cc',
  reportedAt: '2026-02-01T08:00:00.000Z',
  category: 'neglect',
  severity: 'low',
  description: 'Concern noted during routine review',
  status: 'reported',
});

const STAFF_SUBJECT = Object.freeze({
  subjectKind: 'staff',
  branchId: '64b2222222222222222222bb',
  reportedBy: '64c3333333333333333333cc',
  reportedAt: '2026-02-01T08:00:00.000Z',
  category: 'other',
  severity: 'medium',
  description: 'Concern about a staff member conduct',
  status: 'triaged',
});

describe('W1320 safeguardingConcernToFhir — canonical validity', () => {
  it('FULL fixture is a valid canonical SafeguardingConcern', () => {
    expect(canonical.SafeguardingConcern.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture is a valid canonical SafeguardingConcern', () => {
    expect(canonical.SafeguardingConcern.safeParse(MINIMAL).success).toBe(true);
  });

  it('STAFF_SUBJECT fixture is a valid canonical SafeguardingConcern', () => {
    expect(canonical.SafeguardingConcern.safeParse(STAFF_SUBJECT).success).toBe(true);
  });
});

describe('W1320 safeguardingConcernToFhir — resource shape', () => {
  it('emits a FHIR R4 Flag', () => {
    expect(safeguardingConcernToFhir(FULL).resourceType).toBe('Flag');
  });

  it('carries the _id as resource id when present', () => {
    expect(safeguardingConcernToFhir(FULL).id).toBe('64f0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(safeguardingConcernToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when the concern has no _id', () => {
    expect(safeguardingConcernToFhir(MINIMAL).id).toBeUndefined();
  });

  it('returns a plain object', () => {
    expect(Object.getPrototypeOf(safeguardingConcernToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(FULL);
    safeguardingConcernToFhir(FULL);
    expect(JSON.stringify(FULL)).toBe(before);
  });
});

describe('W1320 status mapping', () => {
  it('closed/unsubstantiated → inactive', () => {
    expect(toFhirStatus('closed')).toBe('inactive');
    expect(toFhirStatus('unsubstantiated')).toBe('inactive');
  });

  it('every other state → active', () => {
    expect(toFhirStatus('reported')).toBe('active');
    expect(toFhirStatus('triaged')).toBe('active');
    expect(toFhirStatus('investigating')).toBe('active');
    expect(toFhirStatus('substantiated')).toBe('active');
    expect(toFhirStatus('escalated_to_authority')).toBe('active');
    expect(toFhirStatus(undefined)).toBe('active');
  });

  it('INACTIVE_STATUSES is a frozen Set', () => {
    expect(Object.isFrozen(INACTIVE_STATUSES)).toBe(true);
    expect(INACTIVE_STATUSES.has('closed')).toBe(true);
  });

  it('resource.status reflects the concern status', () => {
    expect(safeguardingConcernToFhir(FULL).status).toBe('active');
    expect(safeguardingConcernToFhir({ ...MINIMAL, status: 'closed' }).status).toBe('inactive');
  });
});

describe('W1320 subject resolution', () => {
  it('beneficiary subject → Patient reference', () => {
    expect(buildSubject(FULL)).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('staff subject without person id → Organization reference', () => {
    expect(buildSubject(STAFF_SUBJECT)).toEqual({
      reference: 'Organization/64b2222222222222222222bb',
    });
  });

  it('subject is undefined when nothing resolvable', () => {
    expect(buildSubject({ subjectKind: 'other' })).toBeUndefined();
  });

  it('resource.subject is the Patient for a beneficiary concern', () => {
    expect(safeguardingConcernToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('resource.subject falls back to Organization for a staff concern', () => {
    expect(safeguardingConcernToFhir(STAFF_SUBJECT).subject).toEqual({
      reference: 'Organization/64b2222222222222222222bb',
    });
  });
});

describe('W1320 category / code / period / author', () => {
  it('category marks the flag as safeguarding', () => {
    const cat = buildCategory();
    expect(cat[0].coding[0]).toEqual({
      system: SAFEGUARDING_FLAG_CATEGORY_SYSTEM,
      code: SAFEGUARDING_FLAG_CATEGORY_CODE,
    });
  });

  it('code is the concern category with description as text', () => {
    const code = buildCode(FULL);
    expect(code.coding[0]).toEqual({
      system: SAFEGUARDING_CATEGORY_SYSTEM,
      code: 'physical',
    });
    expect(code.text).toBe('Unexplained bruising consistent with non-accidental injury');
  });

  it('period.start = reportedAt; period.end = closedAt when closed', () => {
    const closed = { ...FULL, status: 'closed', closedAt: '2026-03-01T00:00:00.000Z' };
    const period = buildPeriod(closed);
    expect(period.start).toBe('2026-02-01T08:00:00.000Z');
    expect(period.end).toBe('2026-03-01T00:00:00.000Z');
  });

  it('period has only start when not closed', () => {
    const period = buildPeriod(MINIMAL);
    expect(period.start).toBe('2026-02-01T08:00:00.000Z');
    expect(period.end).toBeUndefined();
  });

  it('author is the reporting Practitioner', () => {
    expect(safeguardingConcernToFhir(FULL).author).toEqual({
      reference: 'Practitioner/64c3333333333333333333cc',
    });
  });
});

describe('W1320 nested extensions', () => {
  it('investigation extension carries investigator + start', () => {
    const ext = buildInvestigationExtension(FULL);
    expect(ext.url).toBe(SAFEGUARDING_INVESTIGATION_EXTENSION_URL);
    expect(ext.extension).toContainEqual({
      url: 'investigator',
      valueReference: { reference: 'Practitioner/64d4444444444444444444dd' },
    });
    expect(ext.extension).toContainEqual({
      url: 'startedAt',
      valueDateTime: '2026-02-02T09:00:00.000Z',
    });
  });

  it('investigation extension undefined when no investigation', () => {
    expect(buildInvestigationExtension(MINIMAL)).toBeUndefined();
  });

  it('outcome extension carries code + instant', () => {
    const ext = buildOutcomeExtension(FULL);
    expect(ext.url).toBe(SAFEGUARDING_OUTCOME_EXTENSION_URL);
    expect(ext.extension).toContainEqual({ url: 'outcome', valueCode: 'substantiated' });
    expect(ext.extension).toContainEqual({
      url: 'outcomeAt',
      valueDateTime: '2026-02-10T09:00:00.000Z',
    });
  });

  it('outcome extension undefined when no outcome', () => {
    expect(buildOutcomeExtension(MINIMAL)).toBeUndefined();
  });

  it('authority extension carries reported + name + instant', () => {
    const ext = buildAuthorityExtension(FULL);
    expect(ext.url).toBe(SAFEGUARDING_AUTHORITY_EXTENSION_URL);
    expect(ext.extension).toContainEqual({ url: 'reported', valueBoolean: true });
    expect(ext.extension).toContainEqual({
      url: 'authorityName',
      valueString: 'Child Protection Authority',
    });
    expect(ext.extension).toContainEqual({
      url: 'reportedAt',
      valueDateTime: '2026-02-01T11:00:00.000Z',
    });
  });

  it('authority extension undefined when no authority data', () => {
    expect(buildAuthorityExtension(MINIMAL)).toBeUndefined();
  });
});

describe('W1320 scalar extensions (lossless carry)', () => {
  it('FULL emits status/severity/subjectKind/triaged/action-plan/supervisor/closed-by/linked/confidentiality', () => {
    const urls = safeguardingConcernToFhir(FULL).extension.map(e => e.url);
    expect(urls).toContain(SAFEGUARDING_STATUS_EXTENSION_URL);
    expect(urls).toContain(SAFEGUARDING_SEVERITY_EXTENSION_URL);
    expect(urls).toContain(SAFEGUARDING_SUBJECT_KIND_EXTENSION_URL);
    expect(urls).toContain(SAFEGUARDING_TRIAGED_AT_EXTENSION_URL);
    expect(urls).toContain(SAFEGUARDING_ACTION_PLAN_EXTENSION_URL);
    expect(urls).toContain(SAFEGUARDING_SUPERVISOR_NOTIFIED_EXTENSION_URL);
    expect(urls).toContain(SAFEGUARDING_LINKED_INCIDENT_EXTENSION_URL);
    expect(urls).toContain(SAFEGUARDING_CONFIDENTIALITY_EXTENSION_URL);
  });

  it('linked incident references an Observation', () => {
    const ext = safeguardingConcernToFhir(FULL).extension.find(
      e => e.url === SAFEGUARDING_LINKED_INCIDENT_EXTENSION_URL
    );
    expect(ext.valueReference).toEqual({
      reference: 'Observation/64e5555555555555555555ee',
    });
  });

  it('closed-by references a Practitioner', () => {
    const closed = { ...MINIMAL, status: 'closed', closedBy: '64c3333333333333333333cc' };
    const ext = safeguardingConcernToFhir(closed).extension.find(
      e => e.url === SAFEGUARDING_CLOSED_BY_EXTENSION_URL
    );
    expect(ext.valueReference).toEqual({
      reference: 'Practitioner/64c3333333333333333333cc',
    });
  });

  it('MINIMAL carries status/severity/subjectKind only', () => {
    const ext = safeguardingConcernToFhir(MINIMAL).extension;
    const urls = ext.map(e => e.url);
    expect(urls).toEqual([
      SAFEGUARDING_STATUS_EXTENSION_URL,
      SAFEGUARDING_SEVERITY_EXTENSION_URL,
      SAFEGUARDING_SUBJECT_KIND_EXTENSION_URL,
    ]);
  });
});

describe('W1320 guards', () => {
  it('throws when concern is missing', () => {
    expect(() => safeguardingConcernToFhir(null)).toThrow(/concern object is required/);
  });

  it('throws when category is missing', () => {
    expect(() =>
      safeguardingConcernToFhir({ subjectBeneficiaryId: '64a1111111111111111111aa' })
    ).toThrow(/category is required/);
  });

  it('throws when no subject is resolvable', () => {
    expect(() => safeguardingConcernToFhir({ category: 'neglect', subjectKind: 'other' })).toThrow(
      /subject reference is required/
    );
  });
});
