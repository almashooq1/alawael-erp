'use strict';
/**
 * RespiteBooking → FHIR R4 Appointment mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 27th FHIR resource mapper. A
 * respite booking is a temporary-care reservation so the family/primary
 * caregiver gets a break — a Saudi Disability Authority subsidy-eligible
 * service category (intelligence/canonical/schemas/respite-booking.canonical.js,
 * W363). Its 8-state lifecycle (requested → approved/rejected → confirmed →
 * checked_in → completed / cancelled / no_show) is a *scheduling* workflow, so
 * the natural FHIR fit is an Appointment (NOT a CarePlan — a booking is a single
 * scheduled service instance, not a longitudinal plan).
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Appointment only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps the 8-state lifecycle onto the FHIR Appointment.status
 *     value-set: requested → pending, approved → booked, rejected → cancelled,
 *     confirmed → booked, checked_in → checked-in, completed → fulfilled,
 *     cancelled → cancelled, no_show → noshow. The original status is also
 *     preserved losslessly in an extension.
 *   - serviceType[] = a FIXED discriminator CodeableConcept (`respite-care`).
 *   - appointmentType = the booking type (day | overnight | extended).
 *   - start/end from startAt/endAt.
 *   - participant[] = the beneficiary as a Patient actor (mandatory; 1..*).
 *   - the approval/rejection trail, emergency contact (mandatory at intake),
 *     check-in/out, costs, funding source + subsidy ref, cancellation trail,
 *     linked care-plan + branch are carried as namespaced extensions so nothing
 *     in the canonical record is lost.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const RB_SERVICE_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/appointment-service-type`;
const RB_SERVICE_TYPE_CODE = 'respite-care';
const RB_BOOKING_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/respite-booking-type`;
const RB_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-status`;
const RB_BOOKING_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-type`;
const RB_NIGHT_COUNT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-night-count`;
const RB_REQUESTED_BY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-requested-by`;
const RB_APPROVAL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-approval`;
const RB_REJECTION_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-rejection-reason`;
const RB_EMERGENCY_CONTACT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-emergency-contact`;
const RB_CHECKED_IN_AT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-checked-in-at`;
const RB_CHECKED_OUT_AT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-checked-out-at`;
const RB_ESTIMATED_COST_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-estimated-cost`;
const RB_ACTUAL_COST_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-actual-cost`;
const RB_FUNDING_SOURCE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-funding-source`;
const RB_SUBSIDY_REF_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-subsidy-ref`;
const RB_CANCELLATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-cancellation`;
const RB_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-linked-care-plan`;
const RB_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/respite-booking-branch`;

/**
 * Canonical 8-state lifecycle → FHIR Appointment.status value-set. The original
 * status is preserved losslessly in an extension.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  requested: 'pending',
  approved: 'booked',
  rejected: 'cancelled',
  confirmed: 'booked',
  checked_in: 'checked-in',
  completed: 'fulfilled',
  cancelled: 'cancelled',
  no_show: 'noshow',
});

/**
 * Coerce a Date or loose date string into a FHIR `dateTime`/`instant` (full ISO).
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
 * Map the canonical booking status onto the FHIR Appointment.status value-set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'proposed';
  return STATUS_MAP[status] || 'proposed';
}

/**
 * Build the FIXED Appointment.serviceType[] discriminator (`respite-care`).
 * @returns {Array<object>}
 */
function buildServiceType() {
  return [
    {
      coding: [{ system: RB_SERVICE_TYPE_SYSTEM, code: RB_SERVICE_TYPE_CODE }],
      text: 'Respite Care',
    },
  ];
}

/**
 * Build Appointment.appointmentType from the booking type.
 * @param {object} b booking
 * @returns {object|undefined}
 */
function buildAppointmentType(b) {
  if (!b.bookingType) return undefined;
  return {
    coding: [{ system: RB_BOOKING_TYPE_SYSTEM, code: String(b.bookingType) }],
    text: `Respite — ${String(b.bookingType)}`,
  };
}

/**
 * Build the mandatory Appointment.participant[] (the beneficiary as Patient).
 * @param {object} b booking
 * @returns {Array<object>}
 */
function buildParticipant(b) {
  return [
    {
      actor: { reference: `Patient/${String(b.beneficiaryId)}` },
      required: 'required',
      status: 'accepted',
    },
  ];
}

/**
 * Build the mandatory emergency-contact extension.
 * @param {object} b booking
 * @returns {object|undefined}
 */
function buildEmergencyContactExtension(b) {
  const parts = [];
  if (b.emergencyContactName)
    parts.push({ url: 'name', valueString: String(b.emergencyContactName) });
  if (b.emergencyContactPhone)
    parts.push({ url: 'phone', valueString: String(b.emergencyContactPhone) });
  if (!parts.length) return undefined;
  return { url: RB_EMERGENCY_CONTACT_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} b booking
 * @returns {Array<object>}
 */
function buildExtensions(b) {
  const ext = [];

  if (b.status) ext.push({ url: RB_STATUS_EXTENSION_URL, valueCode: b.status });
  if (b.bookingType) ext.push({ url: RB_BOOKING_TYPE_EXTENSION_URL, valueCode: b.bookingType });
  if (typeof b.nightCount === 'number') {
    ext.push({ url: RB_NIGHT_COUNT_EXTENSION_URL, valueInteger: b.nightCount });
  }
  if (b.requestedBy || b.requestedByRelationship) {
    const parts = [];
    if (b.requestedBy) {
      parts.push({
        url: 'requestedBy',
        valueReference: { reference: `RelatedPerson/${String(b.requestedBy)}` },
      });
    }
    if (b.requestedByRelationship) {
      parts.push({ url: 'relationship', valueString: String(b.requestedByRelationship) });
    }
    if (parts.length) ext.push({ url: RB_REQUESTED_BY_EXTENSION_URL, extension: parts });
  }
  if (b.approvedBy || b.approvedAt) {
    const parts = [];
    if (b.approvedBy) {
      parts.push({
        url: 'approvedBy',
        valueReference: { reference: `Practitioner/${String(b.approvedBy)}` },
      });
    }
    const approvedAt = toFhirDateTime(b.approvedAt);
    if (approvedAt) parts.push({ url: 'approvedAt', valueDateTime: approvedAt });
    if (parts.length) ext.push({ url: RB_APPROVAL_EXTENSION_URL, extension: parts });
  }
  if (b.rejectionReason) {
    ext.push({ url: RB_REJECTION_REASON_EXTENSION_URL, valueString: String(b.rejectionReason) });
  }
  const emergency = buildEmergencyContactExtension(b);
  if (emergency) ext.push(emergency);
  const checkedInAt = toFhirDateTime(b.checkedInAt);
  if (checkedInAt) ext.push({ url: RB_CHECKED_IN_AT_EXTENSION_URL, valueDateTime: checkedInAt });
  const checkedOutAt = toFhirDateTime(b.checkedOutAt);
  if (checkedOutAt) ext.push({ url: RB_CHECKED_OUT_AT_EXTENSION_URL, valueDateTime: checkedOutAt });
  if (typeof b.estimatedCost === 'number') {
    ext.push({ url: RB_ESTIMATED_COST_EXTENSION_URL, valueDecimal: b.estimatedCost });
  }
  if (typeof b.actualCost === 'number') {
    ext.push({ url: RB_ACTUAL_COST_EXTENSION_URL, valueDecimal: b.actualCost });
  }
  if (b.fundingSource)
    ext.push({ url: RB_FUNDING_SOURCE_EXTENSION_URL, valueCode: b.fundingSource });
  if (b.subsidyApprovalRef) {
    ext.push({ url: RB_SUBSIDY_REF_EXTENSION_URL, valueString: String(b.subsidyApprovalRef) });
  }
  if (b.cancellationReason || b.cancelledAt || b.cancelledBy) {
    const parts = [];
    if (b.cancellationReason)
      parts.push({ url: 'reason', valueString: String(b.cancellationReason) });
    const cancelledAt = toFhirDateTime(b.cancelledAt);
    if (cancelledAt) parts.push({ url: 'cancelledAt', valueDateTime: cancelledAt });
    if (b.cancelledBy) {
      parts.push({
        url: 'cancelledBy',
        valueReference: { reference: `Practitioner/${String(b.cancelledBy)}` },
      });
    }
    if (parts.length) ext.push({ url: RB_CANCELLATION_EXTENSION_URL, extension: parts });
  }
  if (b.linkedCarePlanVersionId) {
    ext.push({
      url: RB_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(b.linkedCarePlanVersionId)}` },
    });
  }
  if (b.branchId) {
    ext.push({
      url: RB_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(b.branchId)}` },
    });
  }
  return ext;
}

/**
 * Project a canonical RespiteBooking onto a base FHIR R4 Appointment resource.
 *
 * @param {object} booking canonical RespiteBooking
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Appointment
 * @throws {TypeError} when booking is missing or has no beneficiaryId
 */
function respiteBookingToFhir(booking, opts = {}) {
  const { includeId = true } = opts;
  if (!booking || typeof booking !== 'object') {
    throw new TypeError('respiteBookingToFhir: booking object is required');
  }
  if (!booking.beneficiaryId) {
    throw new TypeError(
      'respiteBookingToFhir: booking.beneficiaryId is required (Appointment.participant.actor)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Appointment',
    status: toFhirStatus(booking.status),
    serviceType: buildServiceType(),
    participant: buildParticipant(booking),
  };

  if (includeId && booking._id) {
    resource.id = String(booking._id);
  }

  const appointmentType = buildAppointmentType(booking);
  if (appointmentType) resource.appointmentType = appointmentType;

  const start = toFhirDateTime(booking.startAt);
  if (start) resource.start = start;
  const end = toFhirDateTime(booking.endAt);
  if (end) resource.end = end;

  const created = toFhirDateTime(booking.requestedAt);
  if (created) resource.created = created;

  const ext = buildExtensions(booking);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  respiteBookingToFhir,
  // exported for unit testing
  toFhirDateTime,
  toFhirStatus,
  buildServiceType,
  buildAppointmentType,
  buildParticipant,
  buildEmergencyContactExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  RB_SERVICE_TYPE_SYSTEM,
  RB_SERVICE_TYPE_CODE,
  RB_BOOKING_TYPE_SYSTEM,
  RB_STATUS_EXTENSION_URL,
  RB_BOOKING_TYPE_EXTENSION_URL,
  RB_NIGHT_COUNT_EXTENSION_URL,
  RB_REQUESTED_BY_EXTENSION_URL,
  RB_APPROVAL_EXTENSION_URL,
  RB_REJECTION_REASON_EXTENSION_URL,
  RB_EMERGENCY_CONTACT_EXTENSION_URL,
  RB_CHECKED_IN_AT_EXTENSION_URL,
  RB_CHECKED_OUT_AT_EXTENSION_URL,
  RB_ESTIMATED_COST_EXTENSION_URL,
  RB_ACTUAL_COST_EXTENSION_URL,
  RB_FUNDING_SOURCE_EXTENSION_URL,
  RB_SUBSIDY_REF_EXTENSION_URL,
  RB_CANCELLATION_EXTENSION_URL,
  RB_CARE_PLAN_EXTENSION_URL,
  RB_BRANCH_EXTENSION_URL,
};
