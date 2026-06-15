'use strict';
/**
 * BehaviorIncident → FHIR R4 Observation mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): ninth FHIR resource mapper. A
 * logged behavioural incident is the canonical "one observed behavioural event"
 * (intelligence/canonical/schemas/behavior-incident.canonical.js, Behavior
 * Management module). FHIR models an observed event as an Observation — the
 * same resource the Assessment (W1311) and SeizureEvent (W1317) mappers emit.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Observation only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers
 * may post-process `meta.profile`).
 *
 * STANDARDS:
 *   - status is `final` for a logged incident (a behavioural incident is an
 *     observed fact, not a draft); unknown is never produced here.
 *   - subject is the mandatory Patient reference.
 *   - code is a fixed CodeableConcept identifying "behavioural incident" (the
 *     canonical `behavior` free-text is carried as code.text + a component, so
 *     no information is lost while code.coding stays stable for querying).
 *   - effectiveDateTime = occurredAt.
 *   - severity → interpretation (clinical severity is the standard FHIR slot).
 *   - the ABC structure (antecedent / behavior / consequence) is carried as
 *     FHIR `component[]` entries so the structured taxonomy survives.
 *   - intervention, restraint, injury, duration, alert/guardian flags and the
 *     episode link are carried as namespaced extensions (lossless).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const BEHAVIOR_CODE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/observation-type`;
const BEHAVIOR_CODE = 'behavior-incident';
const BEHAVIOR_ABC_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/behavior-abc`;
const BEHAVIOR_SEVERITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-severity`;
const BEHAVIOR_DURATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-duration-minutes`;
const BEHAVIOR_INTERVENTION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-intervention-level`;
const BEHAVIOR_RESTRAINT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-restraint-used`;
const BEHAVIOR_INJURY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-injury-occurred`;
const BEHAVIOR_ALERT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-triggered-alert`;
const BEHAVIOR_GUARDIAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-notified-guardian`;
const BEHAVIOR_EPISODE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-episode`;
const BEHAVIOR_REPORTED_AT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/behavior-reported-at`;

/**
 * Canonical behaviour severity → FHIR interpretation code (observation-interpretation
 * value-set leans clinical L/A/H/HH; we map low→L, medium→A(abnormal),
 * high→H, critical→HH while keeping the human label as text).
 * @type {Record<string,{code:string,display:string}>}
 */
const SEVERITY_INTERPRETATION = Object.freeze({
  low: { code: 'L', display: 'Low' },
  medium: { code: 'A', display: 'Abnormal' },
  high: { code: 'H', display: 'High' },
  critical: { code: 'HH', display: 'Critical high' },
});

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO) so the
 * exact occurrence/report instant is preserved.
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
 * Build the fixed FHIR `code` CodeableConcept. `text` carries the canonical
 * free-text behaviour so a human reading the resource sees what happened while
 * `coding` stays stable for querying.
 * @param {object} b behavior incident
 * @returns {object}
 */
function buildCode(b) {
  return {
    coding: [{ system: BEHAVIOR_CODE_SYSTEM, code: BEHAVIOR_CODE }],
    text: b.behavior,
  };
}

/**
 * Build the severity `interpretation` CodeableConcept[].
 * @param {object} b behavior incident
 * @returns {Array<object>|undefined}
 */
function buildInterpretation(b) {
  const m = SEVERITY_INTERPRETATION[b.severity];
  if (!m) return undefined;
  return [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: m.code,
          display: m.display,
        },
      ],
      text: b.severity,
    },
  ];
}

/**
 * Build the ABC `component[]` (Antecedent / Behavior / Consequence). The
 * structured taxonomy is preserved as discrete components, each carrying its
 * free-text value.
 * @param {object} b behavior incident
 * @returns {Array<object>}
 */
function buildComponents(b) {
  const components = [];
  const add = (code, display, value) => {
    if (!value) return;
    components.push({
      code: { coding: [{ system: BEHAVIOR_ABC_SYSTEM, code, display }] },
      valueString: value,
    });
  };
  add('antecedent', 'Antecedent', b.antecedent);
  add('behavior', 'Behavior', b.behavior);
  add('consequence', 'Consequence', b.consequence);
  return components;
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} b behavior incident
 * @returns {Array<object>}
 */
function buildExtensions(b) {
  const ext = [];
  if (b.severity) {
    ext.push({ url: BEHAVIOR_SEVERITY_EXTENSION_URL, valueCode: b.severity });
  }
  if (typeof b.durationMinutes === 'number') {
    ext.push({
      url: BEHAVIOR_DURATION_EXTENSION_URL,
      valueInteger: b.durationMinutes,
    });
  }
  if (b.interventionLevel) {
    ext.push({
      url: BEHAVIOR_INTERVENTION_EXTENSION_URL,
      valueCode: b.interventionLevel,
    });
  }
  if (typeof b.restraintUsed === 'boolean') {
    ext.push({
      url: BEHAVIOR_RESTRAINT_EXTENSION_URL,
      valueBoolean: b.restraintUsed,
    });
  }
  if (typeof b.injuryOccurred === 'boolean') {
    ext.push({
      url: BEHAVIOR_INJURY_EXTENSION_URL,
      valueBoolean: b.injuryOccurred,
    });
  }
  if (typeof b.triggeredAlert === 'boolean') {
    ext.push({ url: BEHAVIOR_ALERT_EXTENSION_URL, valueBoolean: b.triggeredAlert });
  }
  if (typeof b.notifiedGuardian === 'boolean') {
    ext.push({
      url: BEHAVIOR_GUARDIAN_EXTENSION_URL,
      valueBoolean: b.notifiedGuardian,
    });
  }
  if (b.episodeId) {
    ext.push({
      url: BEHAVIOR_EPISODE_EXTENSION_URL,
      valueReference: { reference: `EpisodeOfCare/${String(b.episodeId)}` },
    });
  }
  const reportedAt = toFhirDateTime(b.reportedAt);
  if (reportedAt) {
    ext.push({ url: BEHAVIOR_REPORTED_AT_EXTENSION_URL, valueDateTime: reportedAt });
  }
  return ext;
}

/**
 * Project a canonical BehaviorIncident onto a base FHIR R4 Observation resource.
 *
 * @param {object} incident canonical BehaviorIncident (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Observation
 * @throws {TypeError} when incident is missing, has no beneficiary link, or has
 *   no behavior description (FHIR Observation needs an observable subject)
 */
function behaviorIncidentToFhir(incident, opts = {}) {
  const { includeId = true } = opts;
  if (!incident || typeof incident !== 'object') {
    throw new TypeError('behaviorIncidentToFhir: incident object is required');
  }
  if (!incident.beneficiaryId) {
    throw new TypeError(
      'behaviorIncidentToFhir: incident.beneficiaryId is required (FHIR subject reference)'
    );
  }
  if (!incident.behavior) {
    throw new TypeError(
      'behaviorIncidentToFhir: incident.behavior is required (FHIR Observation needs the observed behaviour)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Observation',
    status: 'final',
    code: buildCode(incident),
    subject: { reference: `Patient/${String(incident.beneficiaryId)}` },
  };

  if (includeId && incident._id) {
    resource.id = String(incident._id);
  }

  const effective = toFhirDateTime(incident.occurredAt);
  if (effective) resource.effectiveDateTime = effective;

  if (incident.reportedBy) {
    resource.performer = [{ reference: `Practitioner/${String(incident.reportedBy)}` }];
  }

  const interpretation = buildInterpretation(incident);
  if (interpretation) resource.interpretation = interpretation;

  const components = buildComponents(incident);
  if (components.length) resource.component = components;

  const ext = buildExtensions(incident);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  behaviorIncidentToFhir,
  // exported for unit testing
  toFhirDateTime,
  buildCode,
  buildInterpretation,
  buildComponents,
  buildExtensions,
  SEVERITY_INTERPRETATION,
  ORG_FHIR_BASE,
  BEHAVIOR_CODE_SYSTEM,
  BEHAVIOR_CODE,
  BEHAVIOR_ABC_SYSTEM,
  BEHAVIOR_SEVERITY_EXTENSION_URL,
  BEHAVIOR_DURATION_EXTENSION_URL,
  BEHAVIOR_INTERVENTION_EXTENSION_URL,
  BEHAVIOR_RESTRAINT_EXTENSION_URL,
  BEHAVIOR_INJURY_EXTENSION_URL,
  BEHAVIOR_ALERT_EXTENSION_URL,
  BEHAVIOR_GUARDIAN_EXTENSION_URL,
  BEHAVIOR_EPISODE_EXTENSION_URL,
  BEHAVIOR_REPORTED_AT_EXTENSION_URL,
};
