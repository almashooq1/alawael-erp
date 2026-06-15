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
 *   BeneficiaryDietPrescription → NutritionOrder (W1321)
 *   SensoryDietProgram → CarePlan  (W1322)
 *   CommunicationAidProfile → Observation (W1323)
 *   ProstheticOrthoticOrder → DeviceRequest (W1324)
 *   InstrumentalSwallowStudy → DiagnosticReport (W1325)
 *   SpasticityInjection → Procedure (W1326)
 *   GroupTherapySession → Encounter (W1327)
 *   TeleRehabSession → Encounter (W1328)
 *   ARVRSession → Encounter (W1329)
 *   DttSession → Encounter (W1330)
 *   CreativeArtsTherapySession → Encounter (W1331)
 *   AdjunctTherapySession → Encounter (W1332)
 *   AdaptiveSportsProgram → CarePlan (W1333)
 *   TransitionPlan → CarePlan (W1334)
 *   CaregiverSupportProgram → CarePlan (W1335)
 *   RespiteBooking → Appointment (W1336)
 *   FacilityAsset → Device (W1337)
 *   StaffHealthRecord → Observation (W1338)
 *   BiomedicalWasteRecord → SupplyDelivery (W1339)
 *   Sponsorship → Coverage (W1340)
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
const {
  beneficiaryDietPrescriptionToFhir,
} = require('./beneficiary-diet-prescription-to-fhir.lib');
const { sensoryDietProgramToFhir } = require('./sensory-diet-program-to-fhir.lib');
const { communicationAidProfileToFhir } = require('./communication-aid-profile-to-fhir.lib');
const { prostheticOrthoticOrderToFhir } = require('./prosthetic-orthotic-order-to-fhir.lib');
const { instrumentalSwallowStudyToFhir } = require('./instrumental-swallow-study-to-fhir.lib');
const { spasticityInjectionToFhir } = require('./spasticity-injection-to-fhir.lib');
const { groupTherapySessionToFhir } = require('./group-therapy-session-to-fhir.lib');
const { teleRehabSessionToFhir } = require('./tele-rehab-session-to-fhir.lib');
const { arvrSessionToFhir } = require('./arvr-session-to-fhir.lib');
const { dttSessionToFhir } = require('./dtt-session-to-fhir.lib');
const { creativeArtsTherapySessionToFhir } = require('./creative-arts-therapy-session-to-fhir.lib');
const { adjunctTherapySessionToFhir } = require('./adjunct-therapy-session-to-fhir.lib');
const { adaptiveSportsProgramToFhir } = require('./adaptive-sports-program-to-fhir.lib');
const { transitionPlanToFhir } = require('./transition-plan-to-fhir.lib');
const { caregiverSupportProgramToFhir } = require('./caregiver-support-program-to-fhir.lib');
const { respiteBookingToFhir } = require('./respite-booking-to-fhir.lib');
const { facilityAssetToFhir } = require('./facility-asset-to-fhir.lib');
const { staffHealthRecordToFhir } = require('./staff-health-record-to-fhir.lib');
const { biomedicalWasteRecordToFhir } = require('./biomedical-waste-record-to-fhir.lib');
const { sponsorshipToFhir } = require('./sponsorship-to-fhir.lib');

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
  BeneficiaryDietPrescription: beneficiaryDietPrescriptionToFhir,
  SensoryDietProgram: sensoryDietProgramToFhir,
  CommunicationAidProfile: communicationAidProfileToFhir,
  ProstheticOrthoticOrder: prostheticOrthoticOrderToFhir,
  InstrumentalSwallowStudy: instrumentalSwallowStudyToFhir,
  SpasticityInjection: spasticityInjectionToFhir,
  GroupTherapySession: groupTherapySessionToFhir,
  TeleRehabSession: teleRehabSessionToFhir,
  ARVRSession: arvrSessionToFhir,
  DttSession: dttSessionToFhir,
  CreativeArtsTherapySession: creativeArtsTherapySessionToFhir,
  AdjunctTherapySession: adjunctTherapySessionToFhir,
  AdaptiveSportsProgram: adaptiveSportsProgramToFhir,
  TransitionPlan: transitionPlanToFhir,
  CaregiverSupportProgram: caregiverSupportProgramToFhir,
  RespiteBooking: respiteBookingToFhir,
  FacilityAsset: facilityAssetToFhir,
  StaffHealthRecord: staffHealthRecordToFhir,
  BiomedicalWasteRecord: biomedicalWasteRecordToFhir,
  Sponsorship: sponsorshipToFhir,
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
  BeneficiaryDietPrescription: 'NutritionOrder',
  SensoryDietProgram: 'CarePlan',
  CommunicationAidProfile: 'Observation',
  ProstheticOrthoticOrder: 'DeviceRequest',
  InstrumentalSwallowStudy: 'DiagnosticReport',
  SpasticityInjection: 'Procedure',
  GroupTherapySession: 'Encounter',
  TeleRehabSession: 'Encounter',
  ARVRSession: 'Encounter',
  DttSession: 'Encounter',
  CreativeArtsTherapySession: 'Encounter',
  AdjunctTherapySession: 'Encounter',
  AdaptiveSportsProgram: 'CarePlan',
  TransitionPlan: 'CarePlan',
  CaregiverSupportProgram: 'CarePlan',
  RespiteBooking: 'Appointment',
  FacilityAsset: 'Device',
  StaffHealthRecord: 'Observation',
  BiomedicalWasteRecord: 'SupplyDelivery',
  Sponsorship: 'Coverage',
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
  beneficiaryDietPrescriptionToFhir,
  sensoryDietProgramToFhir,
  communicationAidProfileToFhir,
  prostheticOrthoticOrderToFhir,
  instrumentalSwallowStudyToFhir,
  spasticityInjectionToFhir,
  groupTherapySessionToFhir,
  teleRehabSessionToFhir,
  arvrSessionToFhir,
  dttSessionToFhir,
  creativeArtsTherapySessionToFhir,
  adjunctTherapySessionToFhir,
  adaptiveSportsProgramToFhir,
  transitionPlanToFhir,
  caregiverSupportProgramToFhir,
  respiteBookingToFhir,
  facilityAssetToFhir,
  staffHealthRecordToFhir,
  biomedicalWasteRecordToFhir,
  sponsorshipToFhir,
  MAPPERS,
  RESOURCE_TYPES,
};
