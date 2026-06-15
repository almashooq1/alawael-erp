'use strict';
/**
 * SeizureEvent → FHIR R4 Observation mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): eighth FHIR resource mapper. A
 * logged seizure episode is the canonical "one observed clinical safety event"
 * (intelligence/canonical/schemas/seizure-event.canonical.js, model W356).
 * FHIR models an observed clinical event as an Observation — the same resource
 * the Assessment mapper (W1311) emits — so a single FHIR-conformance test can
 * assert both share the Observation shape.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Observation only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers
 * may post-process `meta.profile`).
 *
 * STANDARDS:
 *   - status maps to the FHIR Observation status value-set:
 *       recorded→preliminary, reviewed→final, unknown→entered-in-error.
 *     (a freshly logged event is `preliminary`; clinician review promotes it to
 *      `final`.)
 *   - subject is the mandatory Patient reference.
 *   - code is REQUIRED in FHIR; built from the canonical seizure `type` under a
 *     namespaced CodeSystem (no SNOMED/ICD binding forced here).
 *   - effective is a Period (start→end) when the episode end is known, else a
 *     single dateTime at onset.
 *   - All clinical detail (severity, consciousness, duration, injury, ambulance,
 *     rescue medication, parent-notification, episode/care-plan link, branch,
 *     review) is carried as namespaced extensions so the projection is lossless.
 *   - status-epilepticus (durationSeconds ≥ 300, the W356 model invariant) is
 *     surfaced as a derived boolean extension.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const SEIZURE_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/seizure-type`;
const SEIZURE_SEVERITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-severity`;
const SEIZURE_CONSCIOUSNESS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-consciousness`;
const SEIZURE_DURATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-duration-seconds`;
const SEIZURE_STATUS_EPILEPTICUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-status-epilepticus`;
const SEIZURE_INJURY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-injury`;
const SEIZURE_AMBULANCE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-ambulance-called`;
const SEIZURE_RESCUE_MED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-rescue-medication`;
const SEIZURE_PARENT_NOTIFIED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-parent-notified-at`;
const SEIZURE_CAREPLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-care-plan`;
const SEIZURE_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-branch`;
const SEIZURE_REVIEW_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/seizure-review`;

/** Duration (seconds) at/above which a seizure is status epilepticus (W356). */
const STATUS_EPILEPTICUS_THRESHOLD_SECONDS = 300;

/**
 * Canonical seizure status → FHIR Observation status value-set.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  recorded: 'preliminary',
  reviewed: 'final',
});

/**
 * Map a canonical seizure status to a FHIR Observation status, defaulting an
 * unrecognised value to `entered-in-error` rather than guessing.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'preliminary'; // absence → a freshly logged event
  return STATUS_MAP[status] || 'entered-in-error';
}

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO) so the
 * exact onset/notification instant is preserved.
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
 * Build the mandatory FHIR `code` CodeableConcept from the seizure type.
 * @param {object} s seizure event
 * @returns {object}
 */
function buildCode(s) {
  return {
    coding: [{ system: SEIZURE_TYPE_SYSTEM, code: s.type }],
    text: s.type,
  };
}

/**
 * Build FHIR `effective[x]`: a Period when an end time exists, otherwise a
 * single dateTime at onset (falling back to the event date when no startTime).
 * @param {object} s seizure event
 * @returns {{key:'effectivePeriod'|'effectiveDateTime', value:any}|undefined}
 */
function buildEffective(s) {
  const start = toFhirDateTime(s.startTime) || toFhirDateTime(s.date);
  const end = toFhirDateTime(s.endTime);
  if (start && end) {
    return { key: 'effectivePeriod', value: { start, end } };
  }
  if (start) {
    return { key: 'effectiveDateTime', value: start };
  }
  return undefined;
}

/**
 * Determine whether this episode qualifies as status epilepticus from the
 * recorded duration (the W356 model invariant: ≥ 300 seconds).
 * @param {object} s seizure event
 * @returns {boolean|undefined} undefined when no duration was recorded
 */
function isStatusEpilepticus(s) {
  if (typeof s.durationSeconds !== 'number') return undefined;
  return s.durationSeconds >= STATUS_EPILEPTICUS_THRESHOLD_SECONDS;
}

/**
 * Build the namespaced extension[] (lossless carry of non-base clinical detail).
 * @param {object} s seizure event
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (s.severity) {
    ext.push({ url: SEIZURE_SEVERITY_EXTENSION_URL, valueCode: s.severity });
  }
  if (s.consciousness) {
    ext.push({
      url: SEIZURE_CONSCIOUSNESS_EXTENSION_URL,
      valueCode: s.consciousness,
    });
  }
  if (typeof s.durationSeconds === 'number') {
    ext.push({
      url: SEIZURE_DURATION_EXTENSION_URL,
      valueInteger: s.durationSeconds,
    });
    ext.push({
      url: SEIZURE_STATUS_EPILEPTICUS_EXTENSION_URL,
      valueBoolean: isStatusEpilepticus(s),
    });
  }
  if (typeof s.injury === 'boolean') {
    ext.push({ url: SEIZURE_INJURY_EXTENSION_URL, valueBoolean: s.injury });
  }
  if (typeof s.ambulanceCalled === 'boolean') {
    ext.push({
      url: SEIZURE_AMBULANCE_EXTENSION_URL,
      valueBoolean: s.ambulanceCalled,
    });
  }
  // Rescue medication: nested extension (name + MAR cross-link) so the two
  // related fields stay grouped.
  if (s.rescueMedicationGivenName || s.rescueMedicationMarId) {
    const sub = [];
    if (s.rescueMedicationGivenName) {
      sub.push({ url: 'name', valueString: s.rescueMedicationGivenName });
    }
    if (s.rescueMedicationMarId) {
      sub.push({
        url: 'mar',
        valueReference: {
          reference: `MedicationAdministration/${String(s.rescueMedicationMarId)}`,
        },
      });
    }
    ext.push({ url: SEIZURE_RESCUE_MED_EXTENSION_URL, extension: sub });
  }
  const parentNotified = toFhirDateTime(s.parentNotifiedAt);
  if (parentNotified) {
    ext.push({
      url: SEIZURE_PARENT_NOTIFIED_EXTENSION_URL,
      valueDateTime: parentNotified,
    });
  }
  if (s.carePlanVersionId) {
    ext.push({
      url: SEIZURE_CAREPLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(s.carePlanVersionId)}` },
    });
  }
  if (s.branchId) {
    ext.push({
      url: SEIZURE_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(s.branchId)}` },
    });
  }
  // Review nuance: who reviewed and when (only meaningful once reviewed).
  if (s.reviewedBy || s.reviewedAt) {
    const sub = [];
    if (s.reviewedBy) {
      sub.push({
        url: 'reviewedBy',
        valueReference: { reference: `Practitioner/${String(s.reviewedBy)}` },
      });
    }
    const reviewedAt = toFhirDateTime(s.reviewedAt);
    if (reviewedAt) {
      sub.push({ url: 'reviewedAt', valueDateTime: reviewedAt });
    }
    if (sub.length) {
      ext.push({ url: SEIZURE_REVIEW_EXTENSION_URL, extension: sub });
    }
  }
  return ext;
}

/**
 * Project a canonical SeizureEvent onto a base FHIR R4 Observation resource.
 *
 * @param {object} seizure canonical SeizureEvent (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Observation
 * @throws {TypeError} when seizure is missing, has no beneficiary link, or has
 *   no type (FHIR Observation.code is mandatory)
 */
function seizureEventToFhir(seizure, opts = {}) {
  const { includeId = true } = opts;
  if (!seizure || typeof seizure !== 'object') {
    throw new TypeError('seizureEventToFhir: seizure object is required');
  }
  if (!seizure.beneficiaryId) {
    throw new TypeError(
      'seizureEventToFhir: seizure.beneficiaryId is required (FHIR subject reference)'
    );
  }
  if (!seizure.type) {
    throw new TypeError(
      'seizureEventToFhir: seizure.type is required (FHIR Observation.code is mandatory)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Observation',
    status: toFhirStatus(seizure.status),
    code: buildCode(seizure),
    subject: { reference: `Patient/${String(seizure.beneficiaryId)}` },
  };

  if (includeId && seizure._id) {
    resource.id = String(seizure._id);
  }

  const effective = buildEffective(seizure);
  if (effective) resource[effective.key] = effective.value;

  if (seizure.witnessedBy) {
    resource.performer = [{ reference: `Practitioner/${String(seizure.witnessedBy)}` }];
  }

  const ext = buildExtensions(seizure);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  seizureEventToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildCode,
  buildEffective,
  isStatusEpilepticus,
  buildExtensions,
  STATUS_MAP,
  STATUS_EPILEPTICUS_THRESHOLD_SECONDS,
  ORG_FHIR_BASE,
  SEIZURE_TYPE_SYSTEM,
  SEIZURE_SEVERITY_EXTENSION_URL,
  SEIZURE_CONSCIOUSNESS_EXTENSION_URL,
  SEIZURE_DURATION_EXTENSION_URL,
  SEIZURE_STATUS_EPILEPTICUS_EXTENSION_URL,
  SEIZURE_INJURY_EXTENSION_URL,
  SEIZURE_AMBULANCE_EXTENSION_URL,
  SEIZURE_RESCUE_MED_EXTENSION_URL,
  SEIZURE_PARENT_NOTIFIED_EXTENSION_URL,
  SEIZURE_CAREPLAN_EXTENSION_URL,
  SEIZURE_BRANCH_EXTENSION_URL,
  SEIZURE_REVIEW_EXTENSION_URL,
};
