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

/**
 * Map a canonical entity to its FHIR resource by canonical entity name.
 * @type {Record<string, Function>}
 */
const MAPPERS = Object.freeze({
  Beneficiary: beneficiaryToFhirPatient,
  EpisodeOfCare: episodeOfCareToFhir,
  Assessment: assessmentToFhirObservation,
  Session: sessionToFhirEncounter,
});

module.exports = {
  beneficiaryToFhirPatient,
  episodeOfCareToFhir,
  assessmentToFhirObservation,
  sessionToFhirEncounter,
  MAPPERS,
};
