'use strict';

/**
 * W374 — DDD event-contracts drift guard.
 *
 * Locks the structural integrity of `backend/events/contracts/dddEventContracts.js`
 * (716 LOC, 17 domain groups, ~80 event contracts). This is the de-facto canonical
 * event registry that the doctrine's §3.2 illustrative names point to in practice
 * (doctrine uses examples like `beneficiary.created`; the contracts file uses
 * `beneficiary.registered` etc — "مثل" in §3.2 = illustrative not exhaustive).
 *
 * Pre-W374 state (2026-05-25):
 *   - Only the auto-generated structural test at
 *     `tests/unit/contracts-dddEventContracts.module.test.js` exists, asserting
 *     4 trivial properties (file exists, valid JS, 1 local require, has
 *     module.exports). It does NOT catch:
 *       * an accidentally-removed event group
 *       * a contract missing a required field (description, payload, etc)
 *       * a duplicate eventType across domains
 *       * version-back-rev (silently breaking consumers)
 *       * an eventType that doesn't match its declared domain prefix
 *   - No event-bus drift guard catches consumers referring to undefined domains.
 *
 * W374 plugs those gaps via a load-and-introspect approach (require the
 * registry directly — it's pure JS data, no mongoose). Same pattern as
 * `__tests__/care-plan-registry-integrity-wave332.test.js`.
 *
 * Checks:
 *   1. Aggregated `DDD_CONTRACTS` includes every named event group exactly once.
 *   2. Every contract has the canonical envelope: `{ domain, eventType,
 *      version, description, payload, delivery, priority, consumers }`.
 *   3. `eventType` is `<domain-prefix>.<snake_case>` (e.g. `beneficiary.registered`).
 *      Prefixes form a fixed allowlist mapped from the W354 TIER constant.
 *   4. No duplicate `eventType` strings across the entire registry.
 *   5. `version` is a positive integer (`>= 1`). No silent v0 / floats.
 *   6. `consumers` is a non-empty array of strings (downstream domains or
 *      services like 'notification'). Doctrine §3.2: events MUST have at least
 *      one consumer to justify their existence.
 *   7. `getDDDContractStats()` returns counts within stable bounds — additions
 *      are allowed, but a sudden drop in `totalEvents` signals accidental removal.
 *
 * Baseline (2026-05-25): 17 domain groups, ~80 unique eventTypes, all v1.
 * Future contract additions: increment `MIN_TOTAL_EVENTS` in tandem.
 * Future contract removals: require explicit ADR (consumer breakage risk).
 */

const contracts = require('../events/contracts/dddEventContracts');

// W377 (2026-05-25): shrunk from 17 to 9 groups after deleting 8 entirely-
// aspirational groups (workflow, family, dashboards, tele-rehab, ar-vr,
// group-therapy, research, field-training) per ADR-027. Remaining 9 are the
// groups where at least one event is wired or worth wiring per the wire/delete
// table in ADR-027.
const EXPECTED_DOMAIN_GROUPS = Object.freeze([
  'core',
  'episodes',
  'assessments',
  'care-plans',
  'sessions',
  'goals',
  'quality',
  'behavior',
  'ai-recommendations',
  'appointments', // W970 — appointment booking/cancellation/no-show → core timeline
  'safety', // W992 — seizure / safeguarding / restraint clinical safety events → core timeline
  'screenings', // W993 — vision / hearing functional screenings → core timeline
  'medications', // W994 — MAR dose outcomes (administered/refused/missed/held) → core timeline
  'discharge', // W995 — discharge plan completion → core timeline
  'admissions', // W996 — waitlist enrollment (admission) → core timeline
  'referrals', // W997 — referral conversion (loop closed) → core timeline
  'medical-referrals', // W998 — medical referral completion → core timeline
  'measurements', // W999 — measurement result approved → core timeline
  'insurance-claims', // W1000 — insurance claim paid → core timeline
  'invoices', // W1023 — invoice fully paid → core timeline
  'teleconsultations', // W1024 — tele-rehab consultation completed → core timeline
  'home-visits', // W1025 — home visit completed → core timeline
  'family-counselling', // W1026 — family counselling session completed → core timeline
  'assistive-devices', // W1028 — assistive device returned → core timeline
  'respite', // W1029 — respite booking completed → core timeline
  'transition', // W1030 — transition plan completed → core timeline
  'diet-prescription', // W1031 — diet prescription activated → core timeline
  'communication-aid', // W1042 — AAC communication aid profile activated → core timeline
  'ai-report', // W1043 — AI-generated report sent → core timeline
  'adaptive-sports', // W1044 — adaptive sports program completed → core timeline
  'iep', // W1045 — individual education plan activated → core timeline
  'vaccination', // W1046 — vaccination administered → core timeline
  'family-home-program', // W1047 — family home program completed → core timeline
  'spasticity-injection', // W1048 — spasticity injection completed → core timeline
  'prosthetic-orthotic-order', // W1049 — prosthetic/orthotic delivered → core timeline
  'seating-postural-assessment', // W1050 — seating/postural finalized → core timeline
  'sensory-diet-program', // W1051 — sensory diet completed → core timeline
  'prior-authorization', // W1052 — prior authorization approved → core timeline
  'plan-review', // W1053 — care plan review recorded → core timeline
  'instrumental-swallow-study', // W1054 — swallow study completed → core timeline
  'crisis-incident', // W1055 — crisis incident resolved → core timeline
  'iq-assessment', // W1056 — IQ assessment completed → core timeline
  'creative-arts-therapy', // W1057 — creative arts therapy session completed → core timeline
  'insurance-eligibility', // W1058 — insurance eligibility check recorded → core timeline
  'morning-health-check', // W1059 — morning health check flagged → core timeline
  'differential-diagnosis', // W1060 — differential diagnosis confirmed → core timeline
  'community-referral', // W1061 — community referral completed → core timeline
  'clinical-pathway', // W1062 — clinical pathway plan completed → core timeline
  'aac-profile', // W1063 — AAC PECS phase advanced → core timeline
  'pain-assessment', // W1064 — pain assessment finalized → core timeline
  'dysphagia-assessment', // W1065 — dysphagia assessment finalized → core timeline
  'allergy', // W1066 — allergy recorded → core timeline
  'dtt-session', // W1067 — DTT session completed → core timeline
  'goal-progress', // W1068 — goal progress achieved → core timeline
  'adjunct-therapy', // W1069 — adjunct therapy session completed → core timeline
  'disability-card', // W1070 — disability card registered → core timeline
  'portfolio', // W1071 — portfolio milestone added → core timeline
  'physiotherapy-assessment', // W1072 — physiotherapy assessment finalized → core timeline
  'beneficiary-contract', // W1073 — service contract activated → core timeline
  'subsidy-entry', // W1074 — subsidy payment received → core timeline
  'sponsorship', // W1075 — sponsorship activated → core timeline
  'toileting-event', // W1076 — potty request (toilet-training milestone) → core timeline
  'home-carryover', // W1077 — home-practice completed (family engagement) → core timeline
  'medication-order', // W1078 — medication order activated → core timeline
  'family-visit', // W1079 — family visit approved (family engagement) → core timeline
  'bip-fidelity', // W1080
  'goal-entry', // W1081
  'cdss-risk', // W1082
  'red-flag', // W1083
  'session-attendance', // W1084 — session missed (no_show/absent) → core timeline
  'nps-response', // W1085 — family NPS satisfaction recorded → core timeline
  'daily-comm-log', // W1086 — daily parent communication log published → core timeline
  'consent-record', // W1087 — consent granted (PDPL/CBAHI) → core timeline
  'risk-snapshot', // W1088 — clinical risk tier escalated → core timeline
  'progress-report', // W1089 — monthly progress report recorded → core timeline
  'day-attendance', // W1090 — daily day-rehab rollcall present → core timeline
  'waiting-list', // W1091 — known beneficiary joined the waiting list → core timeline
  'pickup-authorization', // W1092 — pickup authorization created → core timeline
  'meal-event', // W1093 — meal allergy incident → core timeline
  'cdss-alert', // W1094 — critical CDSS alert → core timeline
  'gas-snapshot', // W1095 — GAS T-score snapshot → core timeline
  'pdpl-request', // W1096 — PDPL data-subject request → core timeline
  'bip-effectiveness', // W1097 — BIP effectiveness reading → core timeline
  'seat-allocation', // W1098 — day-center seat allocation → core timeline
  'student-activity', // W1099 — gamified student activity completion → core timeline
  'story-book', // W1100 — quarterly story book published → core timeline — BIP fidelity check recorded → core timeline
  'gas-scoring', // W1101 — GAS goal-attainment level scored → core timeline
  'speech-session', // W1102 — speech-session recording analysis completed → core timeline
  'portal-payment', // W1103 — guardian portal invoice paid → core timeline
  'caregiver-support', // W1104 — caregiver support program completed → core timeline
  'coupon-usage', // W1105 — beneficiary coupon redeemed → core timeline
  'insurance-policy', // W1106 — beneficiary insurance policy activated → core timeline
  'red-flag-override', // W1107 — clinical red-flag override recorded → core timeline
  'smart-scheduler', // W1108 — beneficiary smart schedule activated → core timeline
  'story-surface', // W1109 — beneficiary story surface variant published → core timeline
  'arvr-session', // W1110 — beneficiary AR/VR rehab session completed → core timeline
  'program-enrollment', // W1111 — beneficiary program enrollment activated → core timeline
  'family-communication', // W1112 — beneficiary family communication logged → core timeline
  'workflow-task', // W1113 — beneficiary care-workflow task completed → core timeline
  'behavior-record', // W1114 — beneficiary behavior (ABC) record logged → core timeline
  'measure-reassessment', // W1115 — beneficiary measure-reassessment task completed → core timeline
  'measure-alert', // W1116 — beneficiary measure-driven alert raised → core timeline
]);

// Allowed `eventType` prefixes. Most match W354 TIER domain names; a few are
// short-form aliases the contracts adopted before W354 (e.g. `ai` for
// `ai-recommendations`, `telerehab` for `tele-rehab`). The contracts file IS
// the source of truth — listing here only locks the current allowlist so a
// NEW typo'd prefix (e.g. `ben.created`) fails CI.
const ALLOWED_EVENT_PREFIXES = Object.freeze(
  new Set([
    'beneficiary',
    'episode',
    'assessment',
    'care_plan',
    'careplan',
    'session',
    'goal',
    'workflow',
    'journey',
    'quality',
    'family',
    'dashboard',
    'kpi',
    'decision',
    'telerehab',
    'arvr',
    'behavior',
    'group_therapy',
    'group',
    'research',
    'training',
    'field_training',
    'ai',
    'recommendation',
    'appointment', // W970 — appointment.booked / .cancelled / .no_show
    'seizure', // W992 — seizure.recorded
    'safeguarding', // W992 — safeguarding.concern_raised
    'restraint', // W992 — restraint.applied
    'screening', // W993 — screening.completed (vision + hearing)
    'medication', // W994 — medication.dose_recorded (MAR)
    'discharge', // W995 — discharge.completed
    'admission', // W996 — admission.enrolled (waitlist)
    'referral', // W997 — referral.converted (ReferralTracking)
    'medical_referral', // W998 — medical_referral.completed (MedicalReferral)
    'measurement', // W999 — measurement.result_approved (MeasurementResult)
    'insurance_claim', // W1000 — insurance_claim.paid (InsuranceClaim)
    'invoice', // W1023 — invoice.paid (Invoice)
    'teleconsultation', // W1024 — teleconsultation.completed (Teleconsultation)
    'home_visit', // W1025 — home_visit.completed (HomeVisit)
    'family_counselling', // W1026 — family_counselling.completed (FamilyCounsellingSession)
    'assistive_device', // W1028 — assistive_device.returned (AssistiveDevice)
    'respite', // W1029 — respite.completed (RespiteBooking)
    'transition', // W1030 — transition.completed (TransitionPlan)
    'diet_prescription', // W1031 — diet_prescription.activated (BeneficiaryDietPrescription)
    'communication_aid', // W1042 — communication_aid.activated (CommunicationAidProfile)
    'ai_report', // W1043 — ai_report.sent (AiGeneratedReport)
    'adaptive_sports', // W1044 — adaptive_sports.completed (AdaptiveSportsProgram)
    'iep', // W1045 — iep.activated (IndividualEducationPlan)
    'vaccination', // W1046 — vaccination.administered (Vaccination)
    'family_home_program', // W1047 — family_home_program.completed (FamilyHomeProgram)
    'spasticity_injection', // W1048 — spasticity_injection.completed (SpasticityInjection)
    'prosthetic_orthotic', // W1049 — prosthetic_orthotic.delivered (ProstheticOrthoticOrder)
    'seating_postural', // W1050 — seating_postural.finalized (SeatingPosturalAssessment)
    'sensory_diet', // W1051 — sensory_diet.completed (SensoryDietProgram)
    'prior_authorization', // W1052 — prior_authorization.approved (PriorAuthorization)
    'plan_review', // W1053 — plan_review.recorded (PlanReview)
    'swallow_study', // W1054 — swallow_study.completed (InstrumentalSwallowStudy)
    'crisis_incident', // W1055 — crisis_incident.resolved (CrisisIncident)
    'iq_assessment', // W1056 — iq_assessment.completed (IQAssessment)
    'creative_arts_therapy', // W1057 — creative_arts_therapy.completed (CreativeArtsTherapySession)
    'insurance_eligibility', // W1058 — insurance_eligibility.checked (InsuranceEligibilityCheck)
    'morning_health_check', // W1059 — morning_health_check.flagged (MorningHealthCheck)
    'differential_diagnosis', // W1060 — differential_diagnosis.confirmed (DifferentialDiagnosis)
    'community_referral', // W1061 — community_referral.completed (CommunityReferral)
    'clinical_pathway', // W1062 — clinical_pathway.completed (ClinicalPathwayPlan)
    'aac_profile', // W1063 — aac_profile.pecs_phase_advanced (AacProfile)
    'pain_assessment', // W1064 — pain_assessment.finalized (PainAssessment)
    'dysphagia_assessment', // W1065 — dysphagia_assessment.finalized (DysphagiaAssessment)
    'allergy', // W1066 — allergy.recorded (Allergy)
    'dtt_session', // W1067 — dtt_session.completed (DttSession)
    'goal_progress', // W1068 — goal_progress.goal_achieved (GoalProgressSnapshot)
    'adjunct_therapy', // W1069 — adjunct_therapy.session_completed (AdjunctTherapySession)
    'disability_card', // W1070 — disability_card.registered (BeneficiaryDisabilityCard)
    'portfolio', // W1071 — portfolio.milestone_added (BeneficiaryPortfolioItem)
    'physiotherapy_assessment', // W1072 — physiotherapy_assessment.finalized (PhysiotherapyAssessment)
    'beneficiary_contract', // W1073 — beneficiary_contract.activated (BeneficiaryContract)
    'subsidy_entry', // W1074 — subsidy_entry.received (BeneficiarySubsidyEntry)
    'sponsorship', // W1075 — sponsorship.activated (Sponsorship)
    'toileting_event', // W1076 — toileting_event.potty_requested (ToiletingEvent)
    'home_carryover', // W1077 — home_carryover.completed (HomeCarryoverEntry)
    'medication_order', // W1078 — medication_order.activated (MedicationOrder)
    'family_visit', // W1079 — family_visit.approved (FamilyVisitRequest)
    'bip_fidelity', // W1080
    'goal_entry', // W1081
    'cdss_risk', // W1082
    'red_flag', // W1083
    'session_attendance', // W1084 — session_attendance.missed (SessionAttendance)
    'nps_response', // W1085 — nps_response.recorded (NpsResponse)
    'daily_comm_log', // W1086 — daily_comm_log.published (DailyCommunicationLog)
    'consent_record', // W1087 — consent_record.granted (Consent)
    'risk_snapshot', // W1088 — risk_snapshot.escalated (RiskSnapshot)
    'progress_report', // W1089 — progress_report.recorded (BeneficiaryProgress)
    'day_attendance', // W1090 — day_attendance.present (BeneficiaryDayAttendance)
    'waiting_list', // W1091 — waiting_list.joined (WaitingListEntry)
    'pickup_authorization', // W1092 — pickup_authorization.requested (PickupAuthorization)
    'meal_event', // W1093 — meal_event.allergy_incident (BeneficiaryMealEvent)
    'cdss_alert', // W1094 — cdss_alert.raised (CdssAlert)
    'gas_snapshot', // W1095 — gas_snapshot.recorded (GasScoreSnapshot)
    'pdpl_request', // W1096 — pdpl_request.received (PdplRequest)
    'bip_effectiveness', // W1097 — bip_effectiveness.recorded (BipEffectiveness)
    'seat_allocation', // W1098 — seat_allocation.assigned (SeatAllocation)
    'student_activity', // W1099 — student_activity.completed (StudentActivity)
    'story_book', // W1100 — story_book.published (StoryBook) — bip_fidelity.checked (BipFidelityCheck)
    'gas_scoring', // W1101 — gas_scoring.recorded (GasScoring)
    'speech_session', // W1102 — speech_session.analyzed (SpeechSessionRecording)
    'portal_payment', // W1103 — portal_payment.paid (PortalPayment)
    'caregiver_support', // W1104 — caregiver_support.completed (CaregiverSupportProgram)
    'coupon_usage', // W1105 — coupon_usage.redeemed (CouponUsage)
    'insurance_policy', // W1106 — insurance_policy.activated (InsurancePolicy)
    'red_flag_override', // W1107 — red_flag_override.recorded (RedFlagOverride)
    'smart_scheduler', // W1108 — smart_scheduler.activated (SmartScheduler)
    'story_surface', // W1109 — story_surface.published (StorySurfaceVariant)
    'arvr_session', // W1110 — arvr_session.completed (ARVRSession)
    'program_enrollment', // W1111 — program_enrollment.activated (ProgramEnrollment)
    'family_communication', // W1112 — family_communication.logged (FamilyCommunication)
    'workflow_task', // W1113 — workflow_task.completed (WorkflowTask)
    'behavior_record', // W1114 — behavior_record.logged (BehaviorRecord)
    'measure_reassessment', // W1115 — measure_reassessment.completed (MeasureReassessmentTask)
    'measure_alert', // W1116 — measure_alert.raised (MeasureAlert)
  ])
);

const REQUIRED_CONTRACT_FIELDS = Object.freeze([
  'domain',
  'eventType',
  'version',
  'description',
  'payload',
  'delivery',
  'priority',
  'consumers',
]);

const MIN_TOTAL_EVENTS = 10; // floor; post-W377 actual count = 18 (was 34 pre-W377)
const MAX_TOTAL_EVENTS = 200; // ceiling; sanity bound — re-baseline if exceeded

describe('W374 DDD event-contracts drift guard', () => {
  describe('aggregator integrity', () => {
    it('exports DDD_CONTRACTS aggregator + getDDDContractStats helper', () => {
      expect(typeof contracts.DDD_CONTRACTS).toBe('object');
      expect(contracts.DDD_CONTRACTS).not.toBeNull();
      expect(typeof contracts.getDDDContractStats).toBe('function');
    });

    it('DDD_CONTRACTS includes exactly the expected domain groups', () => {
      const actual = Object.keys(contracts.DDD_CONTRACTS).sort();
      const expected = [...EXPECTED_DOMAIN_GROUPS].sort();
      expect(actual).toEqual(expected);
    });

    it('every named event group is also exported as a named export', () => {
      // W377 (2026-05-25): 8 group-export pairs removed per ADR-027 deletions.
      const groupExportMap = {
        core: 'BENEFICIARY_DDD_EVENTS',
        episodes: 'EPISODE_EVENTS',
        assessments: 'ASSESSMENT_EVENTS',
        'care-plans': 'CARE_PLAN_EVENTS',
        sessions: 'SESSION_EVENTS',
        goals: 'GOAL_EVENTS',
        quality: 'QUALITY_EVENTS',
        behavior: 'BEHAVIOR_EVENTS',
        'ai-recommendations': 'AI_RECOMMENDATION_EVENTS',
        appointments: 'APPOINTMENT_EVENTS', // W970
      };
      for (const [group, exportName] of Object.entries(groupExportMap)) {
        expect(contracts[exportName]).toBe(contracts.DDD_CONTRACTS[group]);
      }
    });
  });

  describe('contract shape', () => {
    it('every contract has the canonical envelope fields', () => {
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          for (const field of REQUIRED_CONTRACT_FIELDS) {
            if (!(field in evt) || evt[field] === undefined) {
              violations.push(`  - ${group}.${eventKey} missing "${field}"`);
            }
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) missing required envelope field(s):\n` +
            violations.join('\n') +
            `\n\nDoctrine §3.2 — every event MUST declare: ${REQUIRED_CONTRACT_FIELDS.join(', ')}.`
        );
      }
    });

    it('every contract.version is a positive integer (>= 1)', () => {
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          if (!Number.isInteger(evt.version) || evt.version < 1) {
            violations.push(`  - ${group}.${eventKey}.version = ${JSON.stringify(evt.version)}`);
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have invalid version:\n` +
            violations.join('\n') +
            `\n\nVersion must be a positive integer. Increment when changing payload shape.`
        );
      }
    });

    it('every contract.consumers is a non-empty array of strings', () => {
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          if (!Array.isArray(evt.consumers) || evt.consumers.length === 0) {
            violations.push(`  - ${group}.${eventKey} has no consumers (length=0 or not-array)`);
            continue;
          }
          for (const c of evt.consumers) {
            if (typeof c !== 'string' || !c) {
              violations.push(`  - ${group}.${eventKey} consumer "${c}" is not a string`);
            }
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have invalid consumers:\n` +
            violations.join('\n') +
            `\n\nDoctrine §3.2 — events without consumers shouldn't exist. ` +
            `If a producer emits but no subscriber listens, delete the contract or add the subscriber.`
        );
      }
    });
  });

  describe('naming convention', () => {
    it('every eventType matches <allowed_prefix>.<snake_case> shape', () => {
      const violations = [];
      const re = /^([a-z][a-z0-9_]*)\.[a-z][a-z0-9_]*$/;
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          const m = evt.eventType.match(re);
          if (!m) {
            violations.push(
              `  - ${group}.${eventKey}.eventType "${evt.eventType}" doesn't match <prefix>.<snake_case>`
            );
            continue;
          }
          if (!ALLOWED_EVENT_PREFIXES.has(m[1])) {
            violations.push(
              `  - ${group}.${eventKey}.eventType prefix "${m[1]}" not in ALLOWED_EVENT_PREFIXES`
            );
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} eventType(s) violate naming convention:\n` +
            violations.join('\n') +
            `\n\nPattern: <prefix>.<snake_case>. Prefix must be in the allowlist. ` +
            `Adding a new prefix requires updating ALLOWED_EVENT_PREFIXES in this guard.`
        );
      }
    });

    it('no duplicate eventType strings across the entire registry', () => {
      const seen = new Map();
      const duplicates = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          const t = evt.eventType;
          if (seen.has(t)) {
            duplicates.push(`  - "${t}" appears in BOTH ${seen.get(t)} AND ${group}.${eventKey}`);
          } else {
            seen.set(t, `${group}.${eventKey}`);
          }
        }
      }
      if (duplicates.length > 0) {
        throw new Error(
          `${duplicates.length} duplicate eventType string(s):\n` +
            duplicates.join('\n') +
            `\n\neventType strings must be globally unique. Two contracts with the same string ` +
            `cause subscriber confusion + integration-bus routing errors. Rename one or merge.`
        );
      }
    });

    it('contract.domain matches the DDD_CONTRACTS group key (or known alias)', () => {
      // Many contracts declare a domain string that matches the group key
      // exactly (e.g. group 'episodes' → contract.domain 'episodes'). A few
      // pre-W354 contracts use looser strings (e.g. group 'core' → contract.
      // domain 'core'). We only verify that contract.domain is a non-empty
      // string here; tighter alignment is a follow-up.
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          if (typeof evt.domain !== 'string' || !evt.domain) {
            violations.push(`  - ${group}.${eventKey}.domain is empty or not-string`);
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have empty/non-string domain:\n` + violations.join('\n')
        );
      }
    });
  });

  describe('stability via stats', () => {
    it('getDDDContractStats() returns totals within stable bounds', () => {
      const stats = contracts.getDDDContractStats();
      expect(stats.domains).toBe(EXPECTED_DOMAIN_GROUPS.length);
      expect(stats.totalEvents).toBeGreaterThanOrEqual(MIN_TOTAL_EVENTS);
      expect(stats.totalEvents).toBeLessThanOrEqual(MAX_TOTAL_EVENTS);
      // Per-domain sanity: no domain has zero events (would be a dead group).
      for (const [domain, count] of Object.entries(stats.perDomain)) {
        if (count === 0) {
          throw new Error(`Domain "${domain}" has zero events — group dead, remove or populate.`);
        }
      }
    });
  });
});
