'use strict';
/**
 * W1342 — SeatAllocation → FHIR R4 Appointment mapper.
 *
 * Projects a canonical SeatAllocation (a standing seat/place allocation of a
 * day-rehabilitation center to a beneficiary, recurring on given days/period)
 * onto a base FHIR R4 Appointment. The beneficiary and the branch are
 * `participant` actors (Patient + Location); the allocation window maps to
 * start/end; the recurring days-of-week + period + seat label + hold/release
 * lifecycle are carried as namespaced extensions. The original allocation
 * status is always preserved in an extension while `status` is projected onto
 * the Appointment value-set. A FIXED serviceType discriminator marks this as a
 * day-rehab seat allocation.
 *
 * PURE: no DB, no IO, no mongoose. Deterministic. Never mutates input.
 * Additive + non-breaking: standalone module.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

const SEAT_SERVICE_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/seat-allocation-service-type`;
const SEAT_SERVICE_TYPE_CODE = 'day-rehab-seat';

const SD = `${ORG_FHIR_BASE}/StructureDefinition`;
const SEAT_STATUS_EXTENSION_URL = `${SD}/seat-allocation-status`;
const SEAT_LABEL_EXTENSION_URL = `${SD}/seat-allocation-label`;
const SEAT_SECTION_EXTENSION_URL = `${SD}/seat-allocation-section`;
const SEAT_DAYS_OF_WEEK_EXTENSION_URL = `${SD}/seat-allocation-days-of-week`;
const SEAT_PERIOD_EXTENSION_URL = `${SD}/seat-allocation-period`;
const SEAT_HOLD_REASON_EXTENSION_URL = `${SD}/seat-allocation-hold-reason`;
const SEAT_RELEASED_AT_EXTENSION_URL = `${SD}/seat-allocation-released-at`;
const SEAT_RELEASE_REASON_EXTENSION_URL = `${SD}/seat-allocation-release-reason`;
const SEAT_WAITLIST_EXTENSION_URL = `${SD}/seat-allocation-waitlist`;
const SEAT_BRANCH_EXTENSION_URL = `${SD}/seat-allocation-branch`;

// SeatAllocation.status → FHIR Appointment.status
const STATUS_MAP = Object.freeze({
  active: 'booked',
  on_hold: 'pending',
  released: 'cancelled',
});

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

/** Map an ISO-ish input to a full FHIR dateTime; undefined for bad/absent input. */
function toFhirDateTime(value) {
  if (!isPresent(value)) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Project allocation status onto Appointment.status (default proposed). */
function toFhirStatus(status) {
  if (!isPresent(status)) return 'proposed';
  return STATUS_MAP[status] || 'proposed';
}

/** Fixed day-rehab seat-allocation serviceType discriminator. */
function buildServiceType() {
  return [
    {
      coding: [{ system: SEAT_SERVICE_TYPE_SYSTEM, code: SEAT_SERVICE_TYPE_CODE }],
      text: 'Day-Rehabilitation Seat Allocation',
    },
  ];
}

/** Appointment.participant: the beneficiary (Patient) + the branch (Location). */
function buildParticipants(record) {
  const participants = [
    {
      actor: { reference: `Patient/${record.beneficiaryId}` },
      status: 'accepted',
    },
    {
      actor: { reference: `Location/${record.branchId}` },
      status: 'accepted',
    },
  ];
  if (isPresent(record.sectionId)) {
    participants.push({
      actor: { reference: `Location/${record.sectionId}` },
      status: 'accepted',
    });
  }
  return participants;
}

function buildExtensions(record) {
  const ext = [];

  // Always carry the original allocation status.
  ext.push({ url: SEAT_STATUS_EXTENSION_URL, valueCode: record.status });

  if (isPresent(record.seatLabel)) {
    ext.push({ url: SEAT_LABEL_EXTENSION_URL, valueString: record.seatLabel });
  }
  if (isPresent(record.sectionId)) {
    ext.push({
      url: SEAT_SECTION_EXTENSION_URL,
      valueReference: { reference: `Location/${record.sectionId}` },
    });
  }
  if (Array.isArray(record.daysOfWeek) && record.daysOfWeek.length > 0) {
    ext.push({
      url: SEAT_DAYS_OF_WEEK_EXTENSION_URL,
      extension: record.daysOfWeek.map(d => ({ url: 'day', valueInteger: d })),
    });
  }
  if (isPresent(record.period)) {
    ext.push({ url: SEAT_PERIOD_EXTENSION_URL, valueCode: record.period });
  }
  if (isPresent(record.holdReason)) {
    ext.push({ url: SEAT_HOLD_REASON_EXTENSION_URL, valueString: record.holdReason });
  }
  const releasedAt = toFhirDateTime(record.releasedAt);
  if (releasedAt) {
    ext.push({ url: SEAT_RELEASED_AT_EXTENSION_URL, valueDateTime: releasedAt });
  }
  if (isPresent(record.releaseReason)) {
    ext.push({ url: SEAT_RELEASE_REASON_EXTENSION_URL, valueString: record.releaseReason });
  }
  if (isPresent(record.waitlistEntryId)) {
    ext.push({
      url: SEAT_WAITLIST_EXTENSION_URL,
      valueString: String(record.waitlistEntryId),
    });
  }

  // branchId is required → always present.
  ext.push({
    url: SEAT_BRANCH_EXTENSION_URL,
    valueReference: { reference: `Organization/${record.branchId}` },
  });

  return ext;
}

/**
 * Map a canonical SeatAllocation to a base FHIR R4 Appointment.
 * @param {object} record canonical SeatAllocation
 * @param {object} [opts]
 * @param {boolean} [opts.includeId=true] set `id` from `_id`
 * @returns {object} plain FHIR Appointment resource
 */
function seatAllocationToFhir(record, opts = {}) {
  if (!record || typeof record !== 'object') {
    throw new TypeError('seatAllocationToFhir: record object is required');
  }
  if (!isPresent(record.beneficiaryId)) {
    throw new TypeError('seatAllocationToFhir: record.beneficiaryId is required');
  }
  if (!isPresent(record.branchId)) {
    throw new TypeError('seatAllocationToFhir: record.branchId is required');
  }

  const { includeId = true } = opts;

  const resource = {
    resourceType: 'Appointment',
    status: toFhirStatus(record.status),
    serviceType: buildServiceType(),
    participant: buildParticipants(record),
  };

  if (includeId && isPresent(record._id)) {
    resource.id = String(record._id);
  }

  const start = toFhirDateTime(record.effectiveFrom);
  if (start) resource.start = start;

  const end = toFhirDateTime(record.effectiveTo);
  if (end) resource.end = end;

  resource.extension = buildExtensions(record);

  return resource;
}

module.exports = {
  seatAllocationToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildServiceType,
  buildParticipants,
  buildExtensions,
  isPresent,
  STATUS_MAP,
  ORG_FHIR_BASE,
  SEAT_SERVICE_TYPE_SYSTEM,
  SEAT_SERVICE_TYPE_CODE,
  SEAT_STATUS_EXTENSION_URL,
  SEAT_LABEL_EXTENSION_URL,
  SEAT_SECTION_EXTENSION_URL,
  SEAT_DAYS_OF_WEEK_EXTENSION_URL,
  SEAT_PERIOD_EXTENSION_URL,
  SEAT_HOLD_REASON_EXTENSION_URL,
  SEAT_RELEASED_AT_EXTENSION_URL,
  SEAT_RELEASE_REASON_EXTENSION_URL,
  SEAT_WAITLIST_EXTENSION_URL,
  SEAT_BRANCH_EXTENSION_URL,
};
