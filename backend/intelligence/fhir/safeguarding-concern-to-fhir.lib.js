'use strict';
/**
 * SafeguardingConcern → FHIR R4 Flag mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): eleventh FHIR resource mapper. A
 * safeguarding concern is the canonical "one abuse/neglect concern raised about
 * a person" (intelligence/canonical/schemas/safeguarding-concern.canonical.js,
 * Safeguarding module — CBAHI + Saudi child-protection mandatory). FHIR models
 * "a warning/alert that must be visible when caring for a subject" as a Flag —
 * the correct projection for a safeguarding concern that clinicians must see.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Flag only. Pure function: no DB,
 * no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers may
 * post-process `meta.profile`). NOTE: the concern's confidential narrative is
 * carried verbatim — callers responsible for access control before sharing.
 *
 * STANDARDS:
 *   - status maps the concern lifecycle onto Flag.status (active | inactive |
 *     entered-in-error): closed/unsubstantiated → inactive (the warning no
 *     longer applies), every other state → active. The full 7-state concern
 *     status is preserved losslessly in an extension.
 *   - category = a fixed "safeguarding" CodeableConcept marking the flag class.
 *   - code = the concern category (physical/sexual/…); description is the
 *     human-readable code.text so the alert reads naturally.
 *   - subject (mandatory) = the flagged Patient when a beneficiary, else the
 *     owning Organization (branch) when the subject is staff/other — the
 *     subjectKind is preserved in an extension either way.
 *   - period.start = reportedAt; period.end = closedAt when closed.
 *   - author = the reporting Practitioner.
 *   - severity, outcome, authority reporting, investigation, supervisor
 *     notification, action plan, linked incident and confidentiality are
 *     carried as namespaced extensions (lossless).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const SAFEGUARDING_FLAG_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/flag-category`;
const SAFEGUARDING_FLAG_CATEGORY_CODE = 'safeguarding';
const SAFEGUARDING_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/safeguarding-category`;
const SAFEGUARDING_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-status`;
const SAFEGUARDING_SEVERITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-severity`;
const SAFEGUARDING_SUBJECT_KIND_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-subject-kind`;
const SAFEGUARDING_TRIAGED_AT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-triaged-at`;
const SAFEGUARDING_INVESTIGATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-investigation`;
const SAFEGUARDING_OUTCOME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-outcome`;
const SAFEGUARDING_ACTION_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-action-plan`;
const SAFEGUARDING_AUTHORITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-authority-report`;
const SAFEGUARDING_SUPERVISOR_NOTIFIED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-supervisor-notified-at`;
const SAFEGUARDING_CLOSED_BY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-closed-by`;
const SAFEGUARDING_LINKED_INCIDENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-linked-incident`;
const SAFEGUARDING_CONFIDENTIALITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/safeguarding-confidentiality`;

/**
 * Concern lifecycle states that retire the flag (no longer an active warning).
 * Every other state keeps the flag active.
 * @type {ReadonlySet<string>}
 */
const INACTIVE_STATUSES = Object.freeze(new Set(['closed', 'unsubstantiated']));

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
 * Map the canonical concern status onto the FHIR Flag.status value-set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  return INACTIVE_STATUSES.has(status) ? 'inactive' : 'active';
}

/**
 * Resolve the mandatory Flag.subject reference. A beneficiary subject → Patient;
 * a staff/other subject without a person id → the owning Organization (branch).
 * @param {object} c safeguarding concern
 * @returns {object|undefined} a FHIR Reference, or undefined when unresolvable
 */
function buildSubject(c) {
  if (c.subjectBeneficiaryId) {
    return { reference: `Patient/${String(c.subjectBeneficiaryId)}` };
  }
  if (c.branchId) {
    return { reference: `Organization/${String(c.branchId)}` };
  }
  return undefined;
}

/**
 * Build the fixed Flag.category[] marking this as a safeguarding flag.
 * @returns {Array<object>}
 */
function buildCategory() {
  return [
    {
      coding: [
        {
          system: SAFEGUARDING_FLAG_CATEGORY_SYSTEM,
          code: SAFEGUARDING_FLAG_CATEGORY_CODE,
        },
      ],
    },
  ];
}

/**
 * Build the Flag.code CodeableConcept from the concern category; the human
 * description is carried as code.text so the alert reads naturally.
 * @param {object} c safeguarding concern
 * @returns {object}
 */
function buildCode(c) {
  return {
    coding: [{ system: SAFEGUARDING_CATEGORY_SYSTEM, code: c.category }],
    text: c.description,
  };
}

/**
 * Build the Flag.period (start = reportedAt; end = closedAt when closed).
 * @param {object} c safeguarding concern
 * @returns {object|undefined}
 */
function buildPeriod(c) {
  const start = toFhirDateTime(c.reportedAt);
  const end = toFhirDateTime(c.closedAt);
  if (!start && !end) return undefined;
  const period = {};
  if (start) period.start = start;
  if (end) period.end = end;
  return period;
}

/**
 * Build a nested extension describing the investigation (investigator +
 * start instant) when present.
 * @param {object} c safeguarding concern
 * @returns {object|undefined}
 */
function buildInvestigationExtension(c) {
  const parts = [];
  if (c.investigatorId) {
    parts.push({
      url: 'investigator',
      valueReference: { reference: `Practitioner/${String(c.investigatorId)}` },
    });
  }
  const startedAt = toFhirDateTime(c.investigationStartedAt);
  if (startedAt) parts.push({ url: 'startedAt', valueDateTime: startedAt });
  if (!parts.length) return undefined;
  return { url: SAFEGUARDING_INVESTIGATION_EXTENSION_URL, extension: parts };
}

/**
 * Build a nested extension describing the outcome (code + instant) when present.
 * @param {object} c safeguarding concern
 * @returns {object|undefined}
 */
function buildOutcomeExtension(c) {
  if (!c.outcome) return undefined;
  const parts = [{ url: 'outcome', valueCode: c.outcome }];
  const at = toFhirDateTime(c.outcomeAt);
  if (at) parts.push({ url: 'outcomeAt', valueDateTime: at });
  return { url: SAFEGUARDING_OUTCOME_EXTENSION_URL, extension: parts };
}

/**
 * Build a nested extension describing the mandatory-authority report when the
 * concern was escalated to a child-protection authority.
 * @param {object} c safeguarding concern
 * @returns {object|undefined}
 */
function buildAuthorityExtension(c) {
  const parts = [];
  if (typeof c.authorityReported === 'boolean') {
    parts.push({ url: 'reported', valueBoolean: c.authorityReported });
  }
  if (c.authorityName) parts.push({ url: 'authorityName', valueString: c.authorityName });
  const at = toFhirDateTime(c.authorityReportedAt);
  if (at) parts.push({ url: 'reportedAt', valueDateTime: at });
  if (!parts.length) return undefined;
  return { url: SAFEGUARDING_AUTHORITY_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} c safeguarding concern
 * @returns {Array<object>}
 */
function buildExtensions(c) {
  const ext = [];
  if (c.status) {
    ext.push({ url: SAFEGUARDING_STATUS_EXTENSION_URL, valueCode: c.status });
  }
  if (c.severity) {
    ext.push({ url: SAFEGUARDING_SEVERITY_EXTENSION_URL, valueCode: c.severity });
  }
  if (c.subjectKind) {
    ext.push({ url: SAFEGUARDING_SUBJECT_KIND_EXTENSION_URL, valueCode: c.subjectKind });
  }
  const triagedAt = toFhirDateTime(c.triagedAt);
  if (triagedAt) {
    ext.push({ url: SAFEGUARDING_TRIAGED_AT_EXTENSION_URL, valueDateTime: triagedAt });
  }
  const investigation = buildInvestigationExtension(c);
  if (investigation) ext.push(investigation);
  const outcome = buildOutcomeExtension(c);
  if (outcome) ext.push(outcome);
  if (c.actionPlan) {
    ext.push({ url: SAFEGUARDING_ACTION_PLAN_EXTENSION_URL, valueString: c.actionPlan });
  }
  const authority = buildAuthorityExtension(c);
  if (authority) ext.push(authority);
  const supervisorNotifiedAt = toFhirDateTime(c.supervisorNotifiedAt);
  if (supervisorNotifiedAt) {
    ext.push({
      url: SAFEGUARDING_SUPERVISOR_NOTIFIED_EXTENSION_URL,
      valueDateTime: supervisorNotifiedAt,
    });
  }
  if (c.closedBy) {
    ext.push({
      url: SAFEGUARDING_CLOSED_BY_EXTENSION_URL,
      valueReference: { reference: `Practitioner/${String(c.closedBy)}` },
    });
  }
  if (c.linkedIncidentId) {
    ext.push({
      url: SAFEGUARDING_LINKED_INCIDENT_EXTENSION_URL,
      valueReference: { reference: `Observation/${String(c.linkedIncidentId)}` },
    });
  }
  if (c.confidentiality) {
    ext.push({
      url: SAFEGUARDING_CONFIDENTIALITY_EXTENSION_URL,
      valueCode: c.confidentiality,
    });
  }
  return ext;
}

/**
 * Project a canonical SafeguardingConcern onto a base FHIR R4 Flag resource.
 *
 * @param {object} concern canonical SafeguardingConcern (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Flag
 * @throws {TypeError} when concern is missing, has no category (FHIR Flag needs
 *   a code), or has no resolvable subject (FHIR Flag.subject is mandatory)
 */
function safeguardingConcernToFhir(concern, opts = {}) {
  const { includeId = true } = opts;
  if (!concern || typeof concern !== 'object') {
    throw new TypeError('safeguardingConcernToFhir: concern object is required');
  }
  if (!concern.category) {
    throw new TypeError('safeguardingConcernToFhir: concern.category is required (FHIR Flag code)');
  }
  const subject = buildSubject(concern);
  if (!subject) {
    throw new TypeError(
      'safeguardingConcernToFhir: a subject reference is required (subjectBeneficiaryId or branchId)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Flag',
    status: toFhirStatus(concern.status),
    category: buildCategory(),
    code: buildCode(concern),
    subject,
  };

  if (includeId && concern._id) {
    resource.id = String(concern._id);
  }

  const period = buildPeriod(concern);
  if (period) resource.period = period;

  if (concern.reportedBy) {
    resource.author = { reference: `Practitioner/${String(concern.reportedBy)}` };
  }

  const ext = buildExtensions(concern);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  safeguardingConcernToFhir,
  // exported for unit testing
  toFhirDateTime,
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
  ORG_FHIR_BASE,
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
};
