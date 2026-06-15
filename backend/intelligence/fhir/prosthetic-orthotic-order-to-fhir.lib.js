'use strict';
/**
 * ProstheticOrthoticOrder → FHIR R4 DeviceRequest mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 15th FHIR resource mapper. A
 * prosthetics/orthotics/seating fabrication-and-fitting order
 * (intelligence/canonical/schemas/prosthetic-orthotic-order.canonical.js,
 * Clinical Devices module) is a clinical REQUEST for a device to be made and
 * fitted — distinct from the AssistiveDevice loan/maintenance asset record
 * (W1319 → Device). FHIR models "a request for a patient to use / be supplied
 * a device" as a DeviceRequest. The fabrication lifecycle (prescribe → measure
 * → fabricate → fit → deliver → follow-up) projects onto DeviceRequest.status.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 DeviceRequest only. Pure
 * function: no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced
 * (callers may post-process `meta.profile`).
 *
 * STANDARDS:
 *   - intent is the FIXED `order` (a clinical prescription).
 *   - status maps the fabrication stage onto the DeviceRequest status value-set
 *     (prescribed→draft, measured/fabrication/fitting/follow_up→active,
 *     delivered/completed→completed, cancelled→revoked; else unknown).
 *   - subject is the mandatory Patient reference.
 *   - codeCodeableConcept = the canonical deviceCategory (what is requested).
 *   - authoredOn = prescribedDate; requester = prescribedBy.
 *   - reasonCode carries diagnosis + clinicalGoal (CodeableConcept text).
 *   - laterality, casting, fabrication, fitting, comfort, postural, delivery,
 *     follow-up, completion, cancel reason, branch and care-plan link are
 *     carried as namespaced extensions (lossless).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const PO_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/prosthetic-orthotic-category`;
const PO_REASON_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/prosthetic-orthotic-reason`;

const PO_STAGE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-stage`;
const PO_LATERALITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-laterality`;
const PO_CASTING_REQUIRED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-casting-required`;
const PO_CASTING_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-casting-date`;
const PO_MEASUREMENT_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-measurement-date`;
const PO_FABRICATION_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-fabrication-type`;
const PO_VENDOR_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-vendor`;
const PO_ESTIMATED_COST_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-estimated-cost`;
const PO_FITTING_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-fitting-date`;
const PO_FIT_OUTCOME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-fit-outcome`;
const PO_COMFORT_SCORE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-comfort-score`;
const PO_POSTURAL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-postural-assessment`;
const PO_PRESSURE_MAPPING_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-pressure-mapping-done`;
const PO_DELIVERED_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-delivered-date`;
const PO_DELIVERED_DEVICE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-delivered-device`;
const PO_FOLLOW_UP_DUE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-follow-up-due`;
const PO_COMPLETED_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-completed-date`;
const PO_CANCEL_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-cancel-reason`;
const PO_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-branch`;
const PO_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/prosthetic-orthotic-linked-care-plan`;

/**
 * Canonical fabrication stage → FHIR DeviceRequest status. The raw stage is
 * also kept losslessly in an extension.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  prescribed: 'draft',
  measured: 'active',
  fabrication: 'active',
  fitting: 'active',
  follow_up: 'active',
  delivered: 'completed',
  completed: 'completed',
  cancelled: 'revoked',
});

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO).
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDateTime(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Coerce a Date or loose date string into a FHIR `date` (YYYY-MM-DD).
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDate(value) {
  const iso = toFhirDateTime(value);
  return iso ? iso.slice(0, 10) : undefined;
}

/**
 * Map the canonical fabrication stage onto the FHIR DeviceRequest status set.
 * @param {string|undefined} stage
 * @returns {string}
 */
function toFhirStatus(stage) {
  return STATUS_MAP[stage] || 'unknown';
}

/**
 * Build the FHIR `codeCodeableConcept` from the canonical deviceCategory (what
 * is requested). `text` carries the raw category for human readability.
 * @param {object} o order
 * @returns {object}
 */
function buildCode(o) {
  return {
    coding: [{ system: PO_CATEGORY_SYSTEM, code: o.deviceCategory }],
    text: o.deviceCategory,
  };
}

/**
 * Build the `reasonCode[]` from diagnosis + clinicalGoal (each a discrete
 * CodeableConcept carrying its free text). Undefined when neither is present.
 * @param {object} o order
 * @returns {Array<object>|undefined}
 */
function buildReason(o) {
  const reasons = [];
  if (o.diagnosis) {
    reasons.push({
      coding: [{ system: PO_REASON_SYSTEM, code: 'diagnosis' }],
      text: o.diagnosis,
    });
  }
  if (o.clinicalGoal) {
    reasons.push({
      coding: [{ system: PO_REASON_SYSTEM, code: 'clinical-goal' }],
      text: o.clinicalGoal,
    });
  }
  return reasons.length ? reasons : undefined;
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} o order
 * @returns {Array<object>}
 */
function buildExtensions(o) {
  const ext = [];
  if (o.stage) ext.push({ url: PO_STAGE_EXTENSION_URL, valueCode: o.stage });
  if (o.laterality) {
    ext.push({ url: PO_LATERALITY_EXTENSION_URL, valueCode: o.laterality });
  }
  if (typeof o.castingRequired === 'boolean') {
    ext.push({ url: PO_CASTING_REQUIRED_EXTENSION_URL, valueBoolean: o.castingRequired });
  }
  const castingDate = toFhirDate(o.castingDate);
  if (castingDate) ext.push({ url: PO_CASTING_DATE_EXTENSION_URL, valueDate: castingDate });
  const measurementDate = toFhirDate(o.measurementDate);
  if (measurementDate) {
    ext.push({ url: PO_MEASUREMENT_DATE_EXTENSION_URL, valueDate: measurementDate });
  }
  if (o.fabricationType) {
    ext.push({ url: PO_FABRICATION_TYPE_EXTENSION_URL, valueCode: o.fabricationType });
  }
  if (o.vendorName) ext.push({ url: PO_VENDOR_EXTENSION_URL, valueString: o.vendorName });
  if (typeof o.estimatedCost === 'number') {
    ext.push({ url: PO_ESTIMATED_COST_EXTENSION_URL, valueDecimal: o.estimatedCost });
  }
  const fittingDate = toFhirDate(o.fittingDate);
  if (fittingDate) ext.push({ url: PO_FITTING_DATE_EXTENSION_URL, valueDate: fittingDate });
  if (o.fitOutcome) ext.push({ url: PO_FIT_OUTCOME_EXTENSION_URL, valueCode: o.fitOutcome });
  if (typeof o.comfortScore === 'number') {
    ext.push({ url: PO_COMFORT_SCORE_EXTENSION_URL, valueInteger: o.comfortScore });
  }
  if (o.posturalAssessment) {
    ext.push({ url: PO_POSTURAL_EXTENSION_URL, valueString: o.posturalAssessment });
  }
  if (typeof o.pressureMappingDone === 'boolean') {
    ext.push({ url: PO_PRESSURE_MAPPING_EXTENSION_URL, valueBoolean: o.pressureMappingDone });
  }
  const deliveredDate = toFhirDate(o.deliveredDate);
  if (deliveredDate) ext.push({ url: PO_DELIVERED_DATE_EXTENSION_URL, valueDate: deliveredDate });
  if (o.deliveredDeviceId) {
    ext.push({
      url: PO_DELIVERED_DEVICE_EXTENSION_URL,
      valueReference: { reference: `Device/${String(o.deliveredDeviceId)}` },
    });
  }
  const followUpDue = toFhirDate(o.followUpDueDate);
  if (followUpDue) ext.push({ url: PO_FOLLOW_UP_DUE_EXTENSION_URL, valueDate: followUpDue });
  const completedDate = toFhirDate(o.completedDate);
  if (completedDate) ext.push({ url: PO_COMPLETED_DATE_EXTENSION_URL, valueDate: completedDate });
  if (o.cancelReason) {
    ext.push({ url: PO_CANCEL_REASON_EXTENSION_URL, valueString: o.cancelReason });
  }
  if (o.branchId) {
    ext.push({
      url: PO_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(o.branchId)}` },
    });
  }
  if (o.carePlanVersionId) {
    ext.push({
      url: PO_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(o.carePlanVersionId)}` },
    });
  }
  return ext;
}

/**
 * Project a canonical ProstheticOrthoticOrder onto a base FHIR R4 DeviceRequest.
 *
 * @param {object} order canonical ProstheticOrthoticOrder (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 DeviceRequest
 * @throws {TypeError} when order is missing, has no beneficiary link, or has no
 *   deviceCategory (DeviceRequest needs the requested device)
 */
function prostheticOrthoticOrderToFhir(order, opts = {}) {
  const { includeId = true } = opts;
  if (!order || typeof order !== 'object') {
    throw new TypeError('prostheticOrthoticOrderToFhir: order object is required');
  }
  if (!order.beneficiaryId) {
    throw new TypeError(
      'prostheticOrthoticOrderToFhir: order.beneficiaryId is required (FHIR subject reference)'
    );
  }
  if (!order.deviceCategory) {
    throw new TypeError(
      'prostheticOrthoticOrderToFhir: order.deviceCategory is required (the requested device)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'DeviceRequest',
    status: toFhirStatus(order.stage),
    intent: 'order',
    codeCodeableConcept: buildCode(order),
    subject: { reference: `Patient/${String(order.beneficiaryId)}` },
  };

  if (includeId && order._id) {
    resource.id = String(order._id);
  }

  const authoredOn = toFhirDateTime(order.prescribedDate);
  if (authoredOn) resource.authoredOn = authoredOn;

  if (order.prescribedBy) {
    resource.requester = { reference: `Practitioner/${String(order.prescribedBy)}` };
  }

  const reason = buildReason(order);
  if (reason) resource.reasonCode = reason;

  const ext = buildExtensions(order);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
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
};
