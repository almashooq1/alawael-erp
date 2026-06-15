'use strict';
/**
 * W1326 — SpasticityInjection → FHIR R4 Procedure mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * SpasticityInjection onto a base FHIR R4 Procedure, plus a canonical
 * round-trip (every fixture must satisfy its own canonical schema so the mapper
 * is never tested against shapes the platform cannot produce).
 */

const {
  spasticityInjectionToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  buildCode,
  buildReason,
  buildBodySite,
  buildMuscleDetailExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  SI_AGENT_SYSTEM,
  SI_REASON_SYSTEM,
  SI_MUSCLE_SYSTEM,
  SI_SIDE_SYSTEM,
  SI_BRAND_EXTENSION_URL,
  SI_TOTAL_DOSE_EXTENSION_URL,
  SI_MUSCLE_DETAIL_EXTENSION_URL,
  SI_CONSENT_EXTENSION_URL,
  SI_FOLLOW_UP_DUE_EXTENSION_URL,
  SI_BRANCH_EXTENSION_URL,
  SI_CARE_PLAN_EXTENSION_URL,
  SI_CANCEL_REASON_EXTENSION_URL,
} = require('../intelligence/fhir/spasticity-injection-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a222222222222222222222',
  carePlanVersionId: '64a333333333333333333333',
  physicianId: '64a555555555555555555555',
  agent: 'botulinum_toxin_a',
  brandName: 'Botox',
  procedureDate: '2026-03-10T08:30:00.000Z',
  totalDoseUnits: 200,
  targetedMuscles: [
    { muscle: 'gastrocnemius', side: 'left', doseUnits: 50, ashworthBefore: '3' },
    { muscle: 'soleus', side: 'right', doseUnits: 40, ashworthBefore: '2' },
  ],
  goals: ['Reduce equinus gait', 'Improve standing tolerance'],
  consentObtained: true,
  followUpDueDate: '2026-06-10T00:00:00.000Z',
  status: 'completed',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  agent: 'phenol',
  procedureDate: '2026-02-01T09:00:00.000Z',
  status: 'planned',
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  agent: 'baclofen_itb',
  procedureDate: '2026-02-15T09:00:00.000Z',
  status: 'cancelled',
  cancelReason: 'Active infection at injection site',
});

describe('W1326 spasticityInjectionToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical SpasticityInjection schema', () => {
    expect(canonical.SpasticityInjection.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.SpasticityInjection.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.SpasticityInjection.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1326 spasticityInjectionToFhir — resource shape', () => {
  it('emits a FHIR R4 Procedure', () => {
    expect(spasticityInjectionToFhir(FULL).resourceType).toBe('Procedure');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(spasticityInjectionToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(spasticityInjectionToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(spasticityInjectionToFhir(MINIMAL).id).toBeUndefined();
  });

  it('subject references the beneficiary as a Patient', () => {
    expect(spasticityInjectionToFhir(FULL).subject).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('code carries the agent coding + text', () => {
    expect(spasticityInjectionToFhir(FULL).code).toEqual({
      coding: [{ system: SI_AGENT_SYSTEM, code: 'botulinum_toxin_a' }],
      text: 'botulinum_toxin_a',
    });
  });

  it('performedDateTime = procedureDate (full ISO)', () => {
    expect(spasticityInjectionToFhir(FULL).performedDateTime).toBe('2026-03-10T08:30:00.000Z');
  });

  it('performer wraps physicianId in an actor reference', () => {
    expect(spasticityInjectionToFhir(FULL).performer).toEqual([
      { actor: { reference: 'Practitioner/64a555555555555555555555' } },
    ]);
  });

  it('omits performer when physicianId is absent', () => {
    expect(spasticityInjectionToFhir(MINIMAL).performer).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(spasticityInjectionToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    spasticityInjectionToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1326 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('planned → preparation', () => {
    expect(toFhirStatus('planned')).toBe('preparation');
  });

  it('completed → completed', () => {
    expect(toFhirStatus('completed')).toBe('completed');
  });

  it('cancelled → not-done', () => {
    expect(toFhirStatus('cancelled')).toBe('not-done');
  });

  it('unknown / absent status → unknown', () => {
    expect(toFhirStatus('weird')).toBe('unknown');
    expect(toFhirStatus(undefined)).toBe('unknown');
  });
});

describe('W1326 reasonCode + bodySite', () => {
  it('reasonCode carries one CodeableConcept per goal', () => {
    const reason = buildReason(FULL);
    expect(reason).toHaveLength(2);
    expect(reason[0]).toEqual({
      coding: [{ system: SI_REASON_SYSTEM, code: 'goal' }],
      text: 'Reduce equinus gait',
    });
  });

  it('reasonCode undefined when no goals', () => {
    expect(buildReason(MINIMAL)).toBeUndefined();
  });

  it('bodySite carries one CodeableConcept per muscle with side', () => {
    const sites = buildBodySite(FULL);
    expect(sites).toHaveLength(2);
    expect(sites[0]).toEqual({
      coding: [
        { system: SI_MUSCLE_SYSTEM, code: 'gastrocnemius' },
        { system: SI_SIDE_SYSTEM, code: 'left' },
      ],
      text: 'gastrocnemius (left)',
    });
  });

  it('bodySite undefined when no targeted muscles', () => {
    expect(buildBodySite(MINIMAL)).toBeUndefined();
  });

  it('FULL resource carries reasonCode + bodySite', () => {
    const r = spasticityInjectionToFhir(FULL);
    expect(r.reasonCode).toHaveLength(2);
    expect(r.bodySite).toHaveLength(2);
  });

  it('MINIMAL resource omits reasonCode + bodySite', () => {
    const r = spasticityInjectionToFhir(MINIMAL);
    expect(r.reasonCode).toBeUndefined();
    expect(r.bodySite).toBeUndefined();
  });
});

describe('W1326 extensions', () => {
  it('carries brand name as valueString', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === SI_BRAND_EXTENSION_URL)).toEqual({
      url: SI_BRAND_EXTENSION_URL,
      valueString: 'Botox',
    });
  });

  it('carries total dose as valueDecimal', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === SI_TOTAL_DOSE_EXTENSION_URL)).toEqual({
      url: SI_TOTAL_DOSE_EXTENSION_URL,
      valueDecimal: 200,
    });
  });

  it('emits one nested muscle-detail extension per muscle', () => {
    const ext = buildExtensions(FULL);
    const details = ext.filter(e => e.url === SI_MUSCLE_DETAIL_EXTENSION_URL);
    expect(details).toHaveLength(2);
  });

  it('nested muscle-detail carries muscle/side/dose/ashworth', () => {
    const nested = buildMuscleDetailExtension({
      muscle: 'gastrocnemius',
      side: 'left',
      doseUnits: 50,
      ashworthBefore: '3',
    });
    expect(nested.url).toBe(SI_MUSCLE_DETAIL_EXTENSION_URL);
    expect(nested.extension).toEqual([
      { url: 'muscle', valueString: 'gastrocnemius' },
      { url: 'side', valueCode: 'left' },
      { url: 'dose-units', valueDecimal: 50 },
      { url: 'ashworth-before', valueString: '3' },
    ]);
  });

  it('nested muscle-detail with only muscle carries just that sub-ext', () => {
    const nested = buildMuscleDetailExtension({ muscle: 'biceps' });
    expect(nested.extension).toEqual([{ url: 'muscle', valueString: 'biceps' }]);
  });

  it('carries consent obtained as a boolean', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === SI_CONSENT_EXTENSION_URL)).toEqual({
      url: SI_CONSENT_EXTENSION_URL,
      valueBoolean: true,
    });
  });

  it('carries follow-up due as valueDate', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === SI_FOLLOW_UP_DUE_EXTENSION_URL)).toEqual({
      url: SI_FOLLOW_UP_DUE_EXTENSION_URL,
      valueDate: '2026-06-10',
    });
  });

  it('references the branch + care plan', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === SI_BRANCH_EXTENSION_URL)).toEqual({
      url: SI_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a222222222222222222222' },
    });
    expect(ext.find(e => e.url === SI_CARE_PLAN_EXTENSION_URL)).toEqual({
      url: SI_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64a333333333333333333333' },
    });
  });

  it('MINIMAL fixture produces no extensions', () => {
    expect(spasticityInjectionToFhir(MINIMAL).extension).toBeUndefined();
  });

  it('CANCELLED fixture carries only the cancel reason extension', () => {
    const ext = buildExtensions(CANCELLED);
    expect(ext).toEqual([
      { url: SI_CANCEL_REASON_EXTENSION_URL, valueString: 'Active infection at injection site' },
    ]);
  });
});

describe('W1326 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('toFhirDateTime returns full ISO; toFhirDate returns YYYY-MM-DD', () => {
    expect(toFhirDateTime('2026-03-10T08:30:00.000Z')).toBe('2026-03-10T08:30:00.000Z');
    expect(toFhirDate('2026-03-10T08:30:00.000Z')).toBe('2026-03-10');
  });

  it('toFhirDateTime returns undefined for falsy / invalid input', () => {
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('buildCode shapes the agent concept', () => {
    expect(buildCode({ agent: 'phenol' }).coding[0].code).toBe('phenol');
  });

  it('throws when injection is missing', () => {
    expect(() => spasticityInjectionToFhir()).toThrow(TypeError);
    expect(() => spasticityInjectionToFhir(null)).toThrow(/injection object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => spasticityInjectionToFhir({ agent: 'phenol' })).toThrow(
      /beneficiaryId is required/
    );
  });

  it('throws when agent is missing', () => {
    expect(() => spasticityInjectionToFhir({ beneficiaryId: '64a1111111111111111111aa' })).toThrow(
      /agent is required/
    );
  });
});
