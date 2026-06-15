'use strict';
/**
 * FHIR R4 resource mappers — unified entry point.
 *
 * Pure, additive projections from the platform's canonical data model onto
 * base FHIR R4 resources (no DB, no I/O, no NPHIES profile binding forced).
 * Foundation for FHIR-conformance testing (Item 10, GAPS_ASSESSMENT_2026-06-15).
 *
 *   Beneficiary    → Patient        (W1309)
 *   EpisodeOfCare  → EpisodeOfCare  (W1310)
 *   Assessment     → Observation    (W1311)
 *   Session        → Encounter      (W1312)
 *   PlanOfCare     → CarePlan       (W1313)
 *   Measure        → Questionnaire  (W1314)
 *   RiskProfile    → RiskAssessment (W1315)
 *   SeizureEvent   → Observation    (W1317)
 *   BehaviorIncident → Observation  (W1318)
 *   AssistiveDevice  → Device       (W1319)
 *   SafeguardingConcern → Flag      (W1320)
 *
 * Usage:
 *   const fhir = require('./intelligence/fhir');
 *   const patient = fhir.beneficiaryToFhirPatient(beneficiary);
 *   const encounter = fhir.sessionToFhirEncounter(session);
 */

const { beneficiaryToFhirPatient } = require('./beneficiary-to-fhir.lib');
const { episodeOfCareToFhir } = require('./episode-of-care-to-fhir.lib');
const { assessmentToFhirObservation } = require('./assessment-to-fhir.lib');
const { sessionToFhirEncounter } = require('./session-to-fhir.lib');
const { planOfCareToFhir } = require('./plan-of-care-to-fhir.lib');
const { measureToFhirQuestionnaire } = require('./measure-to-fhir.lib');
const { riskProfileToFhir } = require('./risk-profile-to-fhir.lib');
const { seizureEventToFhir } = require('./seizure-event-to-fhir.lib');
const { behaviorIncidentToFhir } = require('./behavior-incident-to-fhir.lib');
const { assistiveDeviceToFhir } = require('./assistive-device-to-fhir.lib');
const { safeguardingConcernToFhir } = require('./safeguarding-concern-to-fhir.lib');

/**
 * Map a canonical entity to its FHIR resource by canonical entity name.
 * @type {Record<string, Function>}
 */
const MAPPERS = Object.freeze({
  Beneficiary: beneficiaryToFhirPatient,
  EpisodeOfCare: episodeOfCareToFhir,
  Assessment: assessmentToFhirObservation,
  Session: sessionToFhirEncounter,
  PlanOfCare: planOfCareToFhir,
  Measure: measureToFhirQuestionnaire,
  RiskProfile: riskProfileToFhir,
  SeizureEvent: seizureEventToFhir,
  BehaviorIncident: behaviorIncidentToFhir,
  AssistiveDevice: assistiveDeviceToFhir,
  SafeguardingConcern: safeguardingConcernToFhir,
});

/**
 * Declared FHIR R4 resourceType each canonical mapper produces. Kept beside
 * MAPPERS (same keys) as an explicit, testable contract: the W1316 drift guard
 * asserts every mapper actually emits the resourceType named here, so a future
 * mapper edit that silently changes its output type fails CI.
 * @type {Record<string, string>}
 */
const RESOURCE_TYPES = Object.freeze({
  Beneficiary: 'Patient',
  EpisodeOfCare: 'EpisodeOfCare',
  Assessment: 'Observation',
  Session: 'Encounter',
  PlanOfCare: 'CarePlan',
  Measure: 'Questionnaire',
  RiskProfile: 'RiskAssessment',
  SeizureEvent: 'Observation',
  BehaviorIncident: 'Observation',
  AssistiveDevice: 'Device',
  SafeguardingConcern: 'Flag',
});

module.exports = {
  beneficiaryToFhirPatient,
  episodeOfCareToFhir,
  assessmentToFhirObservation,
  sessionToFhirEncounter,
  planOfCareToFhir,
  measureToFhirQuestionnaire,
  riskProfileToFhir,
  seizureEventToFhir,
  behaviorIncidentToFhir,
  assistiveDeviceToFhir,
  safeguardingConcernToFhir,
  MAPPERS,
  RESOURCE_TYPES,
};
