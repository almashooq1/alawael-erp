'use strict';
/**
 * W1322 — SensoryDietProgram → FHIR R4 CarePlan mapper.
 *
 * Asserts the canonical projection is a valid base CarePlan, carries the FIXED
 * `sensory-diet` category discriminator (so it is distinguishable from the
 * W1313 plan-of-care CarePlan), losslessly carries goals / activities /
 * Snoezelen sessions, and that FULL and MINIMAL canonical fixtures round-trip
 * through the canonical Zod schema.
 */

const { canonical } = require('../intelligence/canonical');
const {
  sensoryDietProgramToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toActivityStatus,
  buildCategory,
  buildPeriod,
  buildActivities,
  buildSnoezelenExtension,
  buildExtensions,
  STATUS_MAP,
  ACTIVITY_STATUS,
  ORG_FHIR_BASE,
  SENSORY_CATEGORY_SYSTEM,
  SENSORY_CATEGORY_CODE,
  SENSORY_SYSTEM_CODESYSTEM,
  SENSORY_STATUS_EXTENSION_URL,
  SENSORY_REVIEW_DATE_EXTENSION_URL,
  SENSORY_GOAL_EXTENSION_URL,
  SENSORY_SNOEZELEN_EXTENSION_URL,
  SENSORY_BRANCH_EXTENSION_URL,
  SENSORY_CARE_PLAN_EXTENSION_URL,
  SENSORY_DISCONTINUE_EXTENSION_URL,
} = require('../intelligence/fhir/sensory-diet-program-to-fhir.lib');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64b2222222222222222222bb',
  carePlanVersionId: '64d4444444444444444444dd',
  therapistId: '64c3333333333333333333cc',
  status: 'active',
  startDate: '2026-02-01T08:00:00.000Z',
  reviewDate: '2026-05-01T08:00:00.000Z',
  goals: ['Improve self-regulation', 'Reduce sensory-seeking behaviour'],
  activities: [
    {
      name: 'Wall push-ups',
      sensorySystem: 'proprioceptive',
      purpose: 'calming',
      frequency: 'twice daily',
      durationMinutes: 10,
    },
    {
      name: 'Swing time',
      sensorySystem: 'vestibular',
      purpose: 'organizing',
      frequency: 'before lessons',
    },
  ],
  snoezelenSessions: [
    {
      date: '2026-02-10T10:00:00.000Z',
      regulationOutcome: 'regulated',
      stimuliUsed: ['bubble tube', 'fibre optics'],
    },
  ],
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  status: 'active',
});

const DISCONTINUED = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  status: 'discontinued',
  discontinueReason: 'Beneficiary transitioned to school OT services',
});

describe('W1322 SensoryDietProgram → FHIR CarePlan — canonical round-trip', () => {
  it('FULL fixture passes the canonical schema', () => {
    expect(canonical.SensoryDietProgram.safeParse(FULL).success).toBe(true);
  });
  it('MINIMAL fixture passes the canonical schema', () => {
    expect(canonical.SensoryDietProgram.safeParse(MINIMAL).success).toBe(true);
  });
  it('DISCONTINUED fixture passes the canonical schema', () => {
    expect(canonical.SensoryDietProgram.safeParse(DISCONTINUED).success).toBe(true);
  });
});

describe('W1322 resource shape', () => {
  const r = sensoryDietProgramToFhir(FULL);

  it('is a CarePlan', () => {
    expect(r.resourceType).toBe('CarePlan');
  });
  it('carries the _id as id', () => {
    expect(r.id).toBe('64f0000000000000000000ff');
  });
  it('intent is the fixed plan', () => {
    expect(r.intent).toBe('plan');
  });
  it('subject references the beneficiary', () => {
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });
  it('author references the therapist', () => {
    expect(r.author).toEqual({ reference: 'Practitioner/64c3333333333333333333cc' });
  });
  it('period.start is the startDate (no end — review is a checkpoint)', () => {
    expect(r.period).toEqual({ start: '2026-02-01' });
  });
  it('description joins the goals', () => {
    expect(r.description).toBe('Improve self-regulation; Reduce sensory-seeking behaviour');
  });
  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });
  it('does not mutate the input', () => {
    const copy = JSON.parse(JSON.stringify(FULL));
    sensoryDietProgramToFhir(FULL);
    expect(FULL).toEqual(copy);
  });
});

describe('W1322 category discriminator', () => {
  const cat = buildCategory();

  it('is the FIXED sensory-diet coding', () => {
    expect(cat[0].coding[0]).toEqual({
      system: SENSORY_CATEGORY_SYSTEM,
      code: SENSORY_CATEGORY_CODE,
    });
  });
  it('SENSORY_CATEGORY_CODE is sensory-diet', () => {
    expect(SENSORY_CATEGORY_CODE).toBe('sensory-diet');
  });
  it('is present on the produced resource (distinguishes from plan-of-care)', () => {
    const r = sensoryDietProgramToFhir(MINIMAL);
    expect(r.category[0].coding[0].code).toBe('sensory-diet');
  });
});

describe('W1322 status mapping', () => {
  it('maps the 4-state program lifecycle', () => {
    expect(toFhirStatus('active')).toBe('active');
    expect(toFhirStatus('on_hold')).toBe('on-hold');
    expect(toFhirStatus('completed')).toBe('completed');
    expect(toFhirStatus('discontinued')).toBe('revoked');
  });
  it('unknown / absent status collapses to unknown', () => {
    expect(toFhirStatus('paused')).toBe('unknown');
    expect(toFhirStatus(undefined)).toBe('unknown');
  });
  it('STATUS_MAP + ACTIVITY_STATUS are frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
    expect(Object.isFrozen(ACTIVITY_STATUS)).toBe(true);
  });
});

describe('W1322 activities', () => {
  const acts = buildActivities(FULL);

  it('emits one CarePlan.activity per program activity', () => {
    expect(acts).toHaveLength(2);
  });
  it('uses the sensory system as the activity code', () => {
    expect(acts[0].detail.code.coding[0]).toEqual({
      system: SENSORY_SYSTEM_CODESYSTEM,
      code: 'proprioceptive',
    });
    expect(acts[0].detail.code.text).toBe('Wall push-ups');
  });
  it('inherits the program lifecycle as the activity status', () => {
    expect(acts[0].detail.status).toBe('in-progress');
  });
  it('carries the frequency as scheduledString', () => {
    expect(acts[0].detail.scheduledString).toBe('twice daily');
  });
  it('carries purpose + duration in a nested extension', () => {
    const parts = acts[0].detail.extension[0].extension;
    const byUrl = Object.fromEntries(parts.map(e => [e.url, e]));
    expect(byUrl.purpose.valueCode).toBe('calming');
    expect(byUrl.durationMinutes.valueInteger).toBe(10);
  });
  it('omits durationMinutes from the nested extension when absent', () => {
    const parts = acts[1].detail.extension[0].extension;
    const byUrl = Object.fromEntries(parts.map(e => [e.url, e]));
    expect(byUrl.purpose.valueCode).toBe('organizing');
    expect(byUrl.durationMinutes).toBeUndefined();
  });
  it('maps activity status for a discontinued program', () => {
    expect(toActivityStatus('discontinued')).toBe('cancelled');
  });
  it('is undefined when there are no activities', () => {
    expect(buildActivities(MINIMAL)).toBeUndefined();
  });
});

describe('W1322 snoezelen sessions', () => {
  const sExt = buildSnoezelenExtension(FULL.snoezelenSessions[0]);

  it('is a nested extension on the namespaced URL', () => {
    expect(sExt.url).toBe(SENSORY_SNOEZELEN_EXTENSION_URL);
    expect(Array.isArray(sExt.extension)).toBe(true);
  });
  it('carries date + regulationOutcome + one part per stimulus', () => {
    const byUrl = sExt.extension.reduce((m, e) => {
      (m[e.url] = m[e.url] || []).push(e);
      return m;
    }, {});
    expect(byUrl.date[0].valueDateTime).toBe('2026-02-10T10:00:00.000Z');
    expect(byUrl.regulationOutcome[0].valueCode).toBe('regulated');
    expect(byUrl.stimulus).toHaveLength(2);
    expect(byUrl.stimulus.map(e => e.valueString)).toEqual(['bubble tube', 'fibre optics']);
  });
  it('is undefined for a malformed session', () => {
    expect(buildSnoezelenExtension(null)).toBeUndefined();
    expect(buildSnoezelenExtension({})).toBeUndefined();
  });
});

describe('W1322 extensions', () => {
  const ext = buildExtensions(FULL);
  const byUrl = url => ext.find(e => e.url === url);

  it('carries the lossless original status', () => {
    expect(byUrl(SENSORY_STATUS_EXTENSION_URL).valueCode).toBe('active');
  });
  it('carries the review date', () => {
    expect(byUrl(SENSORY_REVIEW_DATE_EXTENSION_URL).valueDate).toBe('2026-05-01');
  });
  it('carries one extension per goal', () => {
    const goalExts = ext.filter(e => e.url === SENSORY_GOAL_EXTENSION_URL);
    expect(goalExts).toHaveLength(2);
    expect(goalExts[0].valueString).toBe('Improve self-regulation');
  });
  it('carries the branch as an Organization reference', () => {
    expect(byUrl(SENSORY_BRANCH_EXTENSION_URL).valueReference).toEqual({
      reference: 'Organization/64b2222222222222222222bb',
    });
  });
  it('carries the linked care plan as a CarePlan reference', () => {
    expect(byUrl(SENSORY_CARE_PLAN_EXTENSION_URL).valueReference).toEqual({
      reference: 'CarePlan/64d4444444444444444444dd',
    });
  });
  it('carries the snoezelen session extension', () => {
    expect(byUrl(SENSORY_SNOEZELEN_EXTENSION_URL)).toBeDefined();
  });
});

describe('W1322 discontinued program', () => {
  const r = sensoryDietProgramToFhir(DISCONTINUED);

  it('maps status to revoked', () => {
    expect(r.status).toBe('revoked');
  });
  it('carries the discontinue reason extension', () => {
    const d = r.extension.find(e => e.url === SENSORY_DISCONTINUE_EXTENSION_URL);
    expect(d.valueString).toBe('Beneficiary transitioned to school OT services');
  });
});

describe('W1322 minimal resource', () => {
  const r = sensoryDietProgramToFhir(MINIMAL);

  it('emits the mandatory base elements + category', () => {
    expect(r.resourceType).toBe('CarePlan');
    expect(r.status).toBe('active');
    expect(r.intent).toBe('plan');
    expect(r.category[0].coding[0].code).toBe('sensory-diet');
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });
  it('omits period / author / description / activity', () => {
    expect(r.period).toBeUndefined();
    expect(r.author).toBeUndefined();
    expect(r.description).toBeUndefined();
    expect(r.activity).toBeUndefined();
  });
  it('carries only the status extension', () => {
    expect(r.extension).toHaveLength(1);
    expect(r.extension[0].url).toBe(SENSORY_STATUS_EXTENSION_URL);
    expect(r.extension[0].valueCode).toBe('active');
  });
});

describe('W1322 guards', () => {
  it('throws when program is missing', () => {
    expect(() => sensoryDietProgramToFhir(null)).toThrow(TypeError);
  });
  it('throws when beneficiaryId is missing', () => {
    expect(() => sensoryDietProgramToFhir({ status: 'active' })).toThrow(/beneficiaryId/);
  });
});

describe('W1322 helpers', () => {
  it('toFhirDate yields YYYY-MM-DD; toFhirDateTime yields full ISO', () => {
    expect(toFhirDate('2026-02-01T08:00:00.000Z')).toBe('2026-02-01');
    expect(toFhirDateTime('2026-02-01T08:00:00.000Z')).toBe('2026-02-01T08:00:00.000Z');
  });
  it('both reject garbage / absent input', () => {
    expect(toFhirDate('nope')).toBeUndefined();
    expect(toFhirDateTime(undefined)).toBeUndefined();
  });
  it('buildPeriod is undefined without a start date', () => {
    expect(buildPeriod(MINIMAL)).toBeUndefined();
  });
  it('ORG_FHIR_BASE is the org canonical base', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });
});
