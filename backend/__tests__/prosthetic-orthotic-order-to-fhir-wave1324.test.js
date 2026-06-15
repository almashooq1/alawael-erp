'use strict';
/**
 * W1324 — ProstheticOrthoticOrder → FHIR R4 DeviceRequest mapper.
 *
 * Asserts the canonical fabrication-and-fitting order projects onto a valid
 * base DeviceRequest: stage→status value-set, fixed intent=order, deviceCategory
 * as codeCodeableConcept, diagnosis + clinicalGoal as reasonCode, and the full
 * fabrication lifecycle (casting / fitting / delivery / follow-up) carried
 * losslessly as extensions. FULL and MINIMAL canonical fixtures round-trip
 * through the canonical Zod schema.
 */

const { canonical } = require('../intelligence/canonical');
const {
  prostheticOrthoticOrderToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  buildCode,
  buildReason,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  PO_CATEGORY_SYSTEM,
  PO_REASON_SYSTEM,
  PO_STAGE_EXTENSION_URL,
  PO_LATERALITY_EXTENSION_URL,
  PO_CASTING_REQUIRED_EXTENSION_URL,
  PO_CASTING_DATE_EXTENSION_URL,
  PO_MEASUREMENT_DATE_EXTENSION_URL,
  PO_FABRICATION_TYPE_EXTENSION_URL,
  PO_VENDOR_EXTENSION_URL,
  PO_ESTIMATED_COST_EXTENSION_URL,
  PO_FITTING_DATE_EXTENSION_URL,
  PO_FIT_OUTCOME_EXTENSION_URL,
  PO_COMFORT_SCORE_EXTENSION_URL,
  PO_POSTURAL_EXTENSION_URL,
  PO_PRESSURE_MAPPING_EXTENSION_URL,
  PO_DELIVERED_DATE_EXTENSION_URL,
  PO_DELIVERED_DEVICE_EXTENSION_URL,
  PO_FOLLOW_UP_DUE_EXTENSION_URL,
  PO_COMPLETED_DATE_EXTENSION_URL,
  PO_CANCEL_REASON_EXTENSION_URL,
  PO_BRANCH_EXTENSION_URL,
  PO_CARE_PLAN_EXTENSION_URL,
} = require('../intelligence/fhir/prosthetic-orthotic-order-to-fhir.lib');

const FULL = Object.freeze({
  _id: '64f0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64b2222222222222222222bb',
  carePlanVersionId: '64d4444444444444444444dd',
  deviceCategory: 'lower_limb_prosthesis',
  laterality: 'left',
  diagnosis: 'Transtibial amputation',
  clinicalGoal: 'Independent community ambulation',
  prescribedBy: '64c3333333333333333333cc',
  prescribedDate: '2026-02-01T09:00:00.000Z',
  stage: 'fitting',
  measurementDate: '2026-02-05T09:00:00.000Z',
  castingRequired: true,
  castingDate: '2026-02-06T09:00:00.000Z',
  fabricationType: 'in_house',
  vendorName: 'Al-Awael Ortho Lab',
  estimatedCost: 18500.5,
  fittingDate: '2026-03-01T09:00:00.000Z',
  fitOutcome: 'adjustment_needed',
  comfortScore: 7,
  posturalAssessment: 'Mild pelvic obliquity corrected with build-up',
  pressureMappingDone: true,
  deliveredDate: '2026-03-10T09:00:00.000Z',
  deliveredDeviceId: '64e5555555555555555555ee',
  followUpDueDate: '2026-06-10T09:00:00.000Z',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  deviceCategory: 'afo',
  prescribedDate: '2026-02-01T09:00:00.000Z',
  stage: 'prescribed',
});

const CANCELLED = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  deviceCategory: 'spinal_orthosis',
  prescribedDate: '2026-02-01T09:00:00.000Z',
  stage: 'cancelled',
  cancelReason: 'Beneficiary relocated',
});

describe('W1324 ProstheticOrthoticOrder → FHIR DeviceRequest — canonical round-trip', () => {
  it('FULL fixture passes the canonical schema', () => {
    expect(canonical.ProstheticOrthoticOrder.safeParse(FULL).success).toBe(true);
  });
  it('MINIMAL fixture passes the canonical schema', () => {
    expect(canonical.ProstheticOrthoticOrder.safeParse(MINIMAL).success).toBe(true);
  });
  it('CANCELLED fixture passes the canonical schema', () => {
    expect(canonical.ProstheticOrthoticOrder.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1324 resource shape', () => {
  const r = prostheticOrthoticOrderToFhir(FULL);

  it('is a DeviceRequest', () => {
    expect(r.resourceType).toBe('DeviceRequest');
  });
  it('intent is the fixed order', () => {
    expect(r.intent).toBe('order');
  });
  it('carries the _id as id', () => {
    expect(r.id).toBe('64f0000000000000000000ff');
  });
  it('subject references the beneficiary', () => {
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });
  it('requester references the prescriber', () => {
    expect(r.requester).toEqual({ reference: 'Practitioner/64c3333333333333333333cc' });
  });
  it('authoredOn is prescribedDate (full ISO)', () => {
    expect(r.authoredOn).toBe('2026-02-01T09:00:00.000Z');
  });
  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });
  it('does not mutate the input', () => {
    const copy = JSON.parse(JSON.stringify(FULL));
    prostheticOrthoticOrderToFhir(FULL);
    expect(FULL).toEqual(copy);
  });
});

describe('W1324 code', () => {
  const cc = buildCode(FULL);

  it('codeCodeableConcept carries the device category', () => {
    expect(cc.coding[0]).toEqual({
      system: PO_CATEGORY_SYSTEM,
      code: 'lower_limb_prosthesis',
    });
    expect(cc.text).toBe('lower_limb_prosthesis');
  });
});

describe('W1324 reasonCode', () => {
  it('carries diagnosis + clinicalGoal as discrete reasons', () => {
    const reasons = buildReason(FULL);
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toEqual({
      coding: [{ system: PO_REASON_SYSTEM, code: 'diagnosis' }],
      text: 'Transtibial amputation',
    });
    expect(reasons[1].coding[0].code).toBe('clinical-goal');
    expect(reasons[1].text).toBe('Independent community ambulation');
  });
  it('is undefined when neither diagnosis nor goal present', () => {
    expect(buildReason(MINIMAL)).toBeUndefined();
  });
  it('emits only the present reason', () => {
    const reasons = buildReason({ clinicalGoal: 'Pain reduction' });
    expect(reasons).toHaveLength(1);
    expect(reasons[0].coding[0].code).toBe('clinical-goal');
  });
});

describe('W1324 status mapping', () => {
  it('maps the 8-stage fabrication lifecycle onto DeviceRequest status', () => {
    expect(toFhirStatus('prescribed')).toBe('draft');
    expect(toFhirStatus('measured')).toBe('active');
    expect(toFhirStatus('fabrication')).toBe('active');
    expect(toFhirStatus('fitting')).toBe('active');
    expect(toFhirStatus('follow_up')).toBe('active');
    expect(toFhirStatus('delivered')).toBe('completed');
    expect(toFhirStatus('completed')).toBe('completed');
    expect(toFhirStatus('cancelled')).toBe('revoked');
  });
  it('unknown / absent stage collapses to unknown', () => {
    expect(toFhirStatus('archived')).toBe('unknown');
    expect(toFhirStatus(undefined)).toBe('unknown');
  });
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });
});

describe('W1324 extensions', () => {
  const ext = buildExtensions(FULL);
  const one = url => ext.find(e => e.url === url);

  it('carries the raw stage', () => {
    expect(one(PO_STAGE_EXTENSION_URL).valueCode).toBe('fitting');
  });
  it('carries laterality', () => {
    expect(one(PO_LATERALITY_EXTENSION_URL).valueCode).toBe('left');
  });
  it('carries casting required + casting date', () => {
    expect(one(PO_CASTING_REQUIRED_EXTENSION_URL).valueBoolean).toBe(true);
    expect(one(PO_CASTING_DATE_EXTENSION_URL).valueDate).toBe('2026-02-06');
  });
  it('carries measurement date', () => {
    expect(one(PO_MEASUREMENT_DATE_EXTENSION_URL).valueDate).toBe('2026-02-05');
  });
  it('carries fabrication type + vendor + estimated cost', () => {
    expect(one(PO_FABRICATION_TYPE_EXTENSION_URL).valueCode).toBe('in_house');
    expect(one(PO_VENDOR_EXTENSION_URL).valueString).toBe('Al-Awael Ortho Lab');
    expect(one(PO_ESTIMATED_COST_EXTENSION_URL).valueDecimal).toBe(18500.5);
  });
  it('carries fitting date + fit outcome + comfort score', () => {
    expect(one(PO_FITTING_DATE_EXTENSION_URL).valueDate).toBe('2026-03-01');
    expect(one(PO_FIT_OUTCOME_EXTENSION_URL).valueCode).toBe('adjustment_needed');
    expect(one(PO_COMFORT_SCORE_EXTENSION_URL).valueInteger).toBe(7);
  });
  it('carries postural assessment + pressure mapping flag', () => {
    expect(one(PO_POSTURAL_EXTENSION_URL).valueString).toMatch(/pelvic/);
    expect(one(PO_PRESSURE_MAPPING_EXTENSION_URL).valueBoolean).toBe(true);
  });
  it('carries delivery date + delivered device ref + follow-up due', () => {
    expect(one(PO_DELIVERED_DATE_EXTENSION_URL).valueDate).toBe('2026-03-10');
    expect(one(PO_DELIVERED_DEVICE_EXTENSION_URL).valueReference).toEqual({
      reference: 'Device/64e5555555555555555555ee',
    });
    expect(one(PO_FOLLOW_UP_DUE_EXTENSION_URL).valueDate).toBe('2026-06-10');
  });
  it('carries the branch as an Organization reference', () => {
    expect(one(PO_BRANCH_EXTENSION_URL).valueReference).toEqual({
      reference: 'Organization/64b2222222222222222222bb',
    });
  });
  it('carries the linked care plan as a CarePlan reference', () => {
    expect(one(PO_CARE_PLAN_EXTENSION_URL).valueReference).toEqual({
      reference: 'CarePlan/64d4444444444444444444dd',
    });
  });
  it('emits a zero comfort score (typeof number, not truthiness)', () => {
    const z = buildExtensions({ comfortScore: 0 });
    expect(z.find(e => e.url === PO_COMFORT_SCORE_EXTENSION_URL).valueInteger).toBe(0);
  });
});

describe('W1324 minimal resource', () => {
  const r = prostheticOrthoticOrderToFhir(MINIMAL);

  it('emits the mandatory base elements', () => {
    expect(r.resourceType).toBe('DeviceRequest');
    expect(r.status).toBe('draft');
    expect(r.intent).toBe('order');
    expect(r.codeCodeableConcept.coding[0].code).toBe('afo');
    expect(r.subject).toEqual({ reference: 'Patient/64a1111111111111111111aa' });
  });
  it('omits requester / reasonCode', () => {
    expect(r.requester).toBeUndefined();
    expect(r.reasonCode).toBeUndefined();
  });
  it('carries only the stage extension', () => {
    expect(r.extension).toHaveLength(1);
    expect(r.extension[0].url).toBe(PO_STAGE_EXTENSION_URL);
    expect(r.extension[0].valueCode).toBe('prescribed');
  });
});

describe('W1324 cancelled order', () => {
  const r = prostheticOrthoticOrderToFhir(CANCELLED);

  it('maps status to revoked', () => {
    expect(r.status).toBe('revoked');
  });
  it('carries the cancel reason extension', () => {
    expect(r.extension.find(e => e.url === PO_CANCEL_REASON_EXTENSION_URL).valueString).toBe(
      'Beneficiary relocated'
    );
  });
});

describe('W1324 guards', () => {
  it('throws when order is missing', () => {
    expect(() => prostheticOrthoticOrderToFhir(null)).toThrow(TypeError);
  });
  it('throws when beneficiaryId is missing', () => {
    expect(() =>
      prostheticOrthoticOrderToFhir({ deviceCategory: 'afo', stage: 'prescribed' })
    ).toThrow(/beneficiaryId/);
  });
  it('throws when deviceCategory is missing', () => {
    expect(() =>
      prostheticOrthoticOrderToFhir({
        beneficiaryId: '64a1111111111111111111aa',
        stage: 'prescribed',
      })
    ).toThrow(/deviceCategory/);
  });
});

describe('W1324 helpers', () => {
  it('toFhirDate yields YYYY-MM-DD; toFhirDateTime yields full ISO', () => {
    expect(toFhirDate('2026-02-01T09:00:00.000Z')).toBe('2026-02-01');
    expect(toFhirDateTime('2026-02-01T09:00:00.000Z')).toBe('2026-02-01T09:00:00.000Z');
  });
  it('both reject garbage / absent input', () => {
    expect(toFhirDate('nope')).toBeUndefined();
    expect(toFhirDateTime(undefined)).toBeUndefined();
  });
  it('ORG_FHIR_BASE is the org canonical base', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });
});
