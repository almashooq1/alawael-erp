'use strict';
/**
 * DttSession → FHIR R4 Encounter mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 21st FHIR resource mapper. An ABA
 * discrete-trial-training (DTT) session is a single clinical contact carrying
 * trial-by-trial data (intelligence/canonical/schemas/dtt-session.canonical.js).
 * FHIR models a contact as an Encounter; the program area is carried as
 * Encounter.type and the per-target / per-trial data is carried losslessly as
 * namespaced extensions.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Encounter only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps to the FHIR Encounter status value-set:
 *       scheduled→planned, completed→finished, cancelled/no_show→cancelled,
 *       unknown→entered-in-error.
 *   - class uses HL7 v3-ActCode AMB (ambulatory).
 *   - subject is the mandatory Patient reference.
 *   - serviceProvider references the delivering branch Organization (native).
 *   - period is derived from sessionDate + durationMinutes.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ACT_ENCOUNTER_CLASS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const DTT_PROGRAM_AREA_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/dtt-program-area`;
const DTT_DURATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/dtt-duration-minutes`;
const DTT_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/dtt-care-plan-version`;
const DTT_TARGET_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/dtt-target`;
const DTT_CANCEL_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/dtt-cancel-reason`;

/**
 * Canonical DTT session status → FHIR Encounter status value-set.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  scheduled: 'planned',
  completed: 'finished',
  cancelled: 'cancelled',
  no_show: 'cancelled',
});

/**
 * Map a canonical DTT session status to a FHIR Encounter status.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'unknown';
  return STATUS_MAP[status] || 'entered-in-error';
}

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
 * Build the program-area Encounter type CodeableConcept.
 * @param {object} s session
 * @returns {Array<object>|undefined}
 */
function buildType(s) {
  if (!s.programArea) return undefined;
  return [
    {
      coding: [{ system: DTT_PROGRAM_AREA_SYSTEM, code: s.programArea }],
      text: `DTT — ${String(s.programArea)}`,
    },
  ];
}

/**
 * Build the FHIR `period` from sessionDate + optional durationMinutes.
 * @param {object} s session
 * @returns {object|undefined}
 */
function buildPeriod(s) {
  const start = toFhirDateTime(s.sessionDate);
  if (!start) return undefined;
  /** @type {{start:string,end?:string}} */
  const period = { start };
  if (typeof s.durationMinutes === 'number' && s.durationMinutes > 0) {
    const end = new Date(new Date(start).getTime() + s.durationMinutes * 60000);
    period.end = end.toISOString();
  }
  return period;
}

/**
 * Build one nested target extension (target name + curriculum + mastery +
 * trial summary counts).
 * @param {object} t target
 * @returns {object}
 */
function buildTargetExtension(t) {
  const sub = [{ url: 'target-name', valueString: String(t.targetName) }];
  if (t.curriculumRef) sub.push({ url: 'curriculum-ref', valueString: String(t.curriculumRef) });
  if (typeof t.masteryCriterionPct === 'number') {
    sub.push({ url: 'mastery-criterion-pct', valueDecimal: t.masteryCriterionPct });
  }
  if (typeof t.masteryAchieved === 'boolean') {
    sub.push({ url: 'mastery-achieved', valueBoolean: t.masteryAchieved });
  }
  if (Array.isArray(t.trials)) {
    sub.push({ url: 'trial-count', valueInteger: t.trials.length });
    const correct = t.trials.filter(tr => tr && tr.response === 'correct').length;
    sub.push({ url: 'correct-count', valueInteger: correct });
  }
  return { url: DTT_TARGET_EXTENSION_URL, extension: sub };
}

/**
 * Build the namespaced extension[] (duration, care-plan, per-target, cancel).
 * @param {object} s session
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (typeof s.durationMinutes === 'number') {
    ext.push({ url: DTT_DURATION_EXTENSION_URL, valueInteger: s.durationMinutes });
  }
  if (s.carePlanVersionId) {
    ext.push({
      url: DTT_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(s.carePlanVersionId)}` },
    });
  }
  if (Array.isArray(s.targets)) {
    for (const t of s.targets) {
      if (t && t.targetName) ext.push(buildTargetExtension(t));
    }
  }
  if (s.cancelReason)
    ext.push({ url: DTT_CANCEL_REASON_EXTENSION_URL, valueString: s.cancelReason });
  return ext;
}

/**
 * Project a canonical DttSession onto a base FHIR R4 Encounter resource.
 *
 * @param {object} session canonical DttSession
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Encounter
 * @throws {TypeError} when session is missing or has no beneficiary link
 */
function dttSessionToFhir(session, opts = {}) {
  const { includeId = true } = opts;
  if (!session || typeof session !== 'object') {
    throw new TypeError('dttSessionToFhir: session object is required');
  }
  if (!session.beneficiaryId) {
    throw new TypeError(
      'dttSessionToFhir: session.beneficiaryId is required (FHIR subject reference)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Encounter',
    status: toFhirStatus(session.status),
    class: { system: ACT_ENCOUNTER_CLASS_SYSTEM, code: 'AMB', display: 'ambulatory' },
    subject: { reference: `Patient/${String(session.beneficiaryId)}` },
  };

  if (includeId && session._id) {
    resource.id = String(session._id);
  }

  const type = buildType(session);
  if (type) resource.type = type;

  if (session.therapistId) {
    resource.participant = [
      { individual: { reference: `Practitioner/${String(session.therapistId)}` } },
    ];
  }

  const period = buildPeriod(session);
  if (period) resource.period = period;

  if (session.branchId) {
    resource.serviceProvider = { reference: `Organization/${String(session.branchId)}` };
  }

  const ext = buildExtensions(session);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  dttSessionToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildTargetExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  DTT_PROGRAM_AREA_SYSTEM,
  DTT_DURATION_EXTENSION_URL,
  DTT_CARE_PLAN_EXTENSION_URL,
  DTT_TARGET_EXTENSION_URL,
  DTT_CANCEL_REASON_EXTENSION_URL,
};
