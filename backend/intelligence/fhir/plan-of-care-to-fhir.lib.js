'use strict';
/**
 * PlanOfCare → FHIR R4 CarePlan mapper (foundation).
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): fifth FHIR resource mapper after
 * Patient (W1309), EpisodeOfCare (W1310), Observation (W1311) and Encounter
 * (W1312). The structured therapeutic plan for one episode is the canonical
 * PlanOfCare (intelligence/canonical/schemas/plan-of-care.canonical.js); FHIR
 * models a therapeutic plan as a CarePlan.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 CarePlan only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps to the FHIR CarePlan status value-set:
 *       draft→draft, pending_review/pending_approval→draft, active→active,
 *       on_hold→on-hold, completed→completed, cancelled→revoked,
 *       superseded→revoked, unknown→unknown.
 *     (pending_review/pending_approval/superseded nuance is preserved in a
 *      namespaced status-detail extension so the projection is lossless.)
 *   - intent is fixed to `plan` (CarePlan.intent is mandatory in FHIR).
 *   - subject is the mandatory Patient reference.
 *   - encounter/episode link surfaces natively via `addresses`/extension.
 *   - version + sessionsPerWeek + approval carried as namespaced extensions.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const EPISODE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/careplan-episode`;
const VERSION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/careplan-version`;
const SESSIONS_PER_WEEK_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/careplan-sessions-per-week`;
const APPROVAL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/careplan-approval`;
const STATUS_DETAIL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/careplan-status-detail`;

/**
 * Canonical plan status → FHIR CarePlan status value-set.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  draft: 'draft',
  pending_review: 'draft',
  pending_approval: 'draft',
  active: 'active',
  on_hold: 'on-hold',
  completed: 'completed',
  cancelled: 'revoked',
  superseded: 'revoked',
});

/**
 * Statuses whose nuance is lost in the FHIR mapping and must be preserved in a
 * status-detail extension.
 * @type {ReadonlyArray<string>}
 */
const NUANCED_STATUSES = Object.freeze(['pending_review', 'pending_approval', 'superseded']);

/**
 * Map a canonical plan status to a FHIR CarePlan status, defaulting an
 * unrecognised value to `unknown` rather than guessing.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'unknown';
  return STATUS_MAP[status] || 'unknown';
}

/**
 * Coerce a Date or loose date string into a FHIR `date` (YYYY-MM-DD).
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDate(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/**
 * Build the FHIR `period` from the plan timeline.
 * @param {object} p plan
 * @returns {object|undefined}
 */
function buildPeriod(p) {
  const start = toFhirDate(p.startDate);
  const end = toFhirDate(p.expectedEndDate);
  if (!start && !end) return undefined;
  /** @type {{start?:string,end?:string}} */
  const period = {};
  if (start) period.start = start;
  if (end) period.end = end;
  return period;
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} p plan
 * @returns {Array<object>}
 */
function buildExtensions(p) {
  const ext = [];
  if (p.episodeId) {
    ext.push({
      url: EPISODE_EXTENSION_URL,
      valueReference: { reference: `EpisodeOfCare/${String(p.episodeId)}` },
    });
  }
  if (typeof p.version === 'number') {
    ext.push({ url: VERSION_EXTENSION_URL, valueInteger: p.version });
  }
  if (typeof p.sessionsPerWeek === 'number') {
    ext.push({
      url: SESSIONS_PER_WEEK_EXTENSION_URL,
      valueInteger: p.sessionsPerWeek,
    });
  }
  if (p.approvedBy || p.approvedAt) {
    /** @type {Array<object>} */
    const sub = [];
    if (p.approvedBy) {
      sub.push({
        url: 'approvedBy',
        valueReference: { reference: `Practitioner/${String(p.approvedBy)}` },
      });
    }
    const approvedAt = toFhirDate(p.approvedAt);
    if (approvedAt) sub.push({ url: 'approvedAt', valueDate: approvedAt });
    ext.push({ url: APPROVAL_EXTENSION_URL, extension: sub });
  }
  if (NUANCED_STATUSES.includes(p.status)) {
    ext.push({ url: STATUS_DETAIL_EXTENSION_URL, valueCode: p.status });
  }
  return ext;
}

/**
 * Project a canonical PlanOfCare onto a base FHIR R4 CarePlan resource.
 *
 * @param {object} plan canonical PlanOfCare (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 CarePlan
 * @throws {TypeError} when plan is missing or has no beneficiary link
 */
function planOfCareToFhir(plan, opts = {}) {
  const { includeId = true } = opts;
  if (!plan || typeof plan !== 'object') {
    throw new TypeError('planOfCareToFhir: plan object is required');
  }
  if (!plan.beneficiaryId) {
    throw new TypeError(
      'planOfCareToFhir: plan.beneficiaryId is required (FHIR subject reference)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'CarePlan',
    status: toFhirStatus(plan.status),
    intent: 'plan',
    subject: { reference: `Patient/${String(plan.beneficiaryId)}` },
  };

  if (includeId && plan._id) {
    resource.id = String(plan._id);
  }

  const period = buildPeriod(plan);
  if (period) resource.period = period;

  if (plan.changeReason) {
    resource.note = [{ text: plan.changeReason }];
  }

  const ext = buildExtensions(plan);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  planOfCareToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDate,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  NUANCED_STATUSES,
  ORG_FHIR_BASE,
  EPISODE_EXTENSION_URL,
  VERSION_EXTENSION_URL,
  SESSIONS_PER_WEEK_EXTENSION_URL,
  APPROVAL_EXTENSION_URL,
  STATUS_DETAIL_EXTENSION_URL,
};
