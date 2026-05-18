'use strict';

/**
 * no-show-prediction.registry.js — Wave 115 / P3.4.
 *
 * Constants for the No-Show Prediction service.
 *
 * Closes P3.4 from blueprint/09-roadmap.md §5: "No-Show Prediction —
 * model + proactive interventions (extra reminders to likely no-shows).
 * Exit: No-show rate reduced ≥ 20%."
 *
 * Pattern mirrors Wave 113 (anomaly detector): registry holds enums +
 * thresholds + intervention catalogue; service consumes them. Tunable
 * without touching service code.
 */

const RISK_BAND = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});
const RISK_BANDS = Object.freeze(Object.values(RISK_BAND));

// Score thresholds — score ∈ [0,1]. Each band starts at threshold.
// Anything below MEDIUM threshold is LOW.
const BAND_THRESHOLDS = Object.freeze({
  [RISK_BAND.MEDIUM]: 0.3,
  [RISK_BAND.HIGH]: 0.55,
  [RISK_BAND.CRITICAL]: 0.75,
});

// Feature weights — additive contribution to a raw score that is then
// clamped to [0,1]. Sum upper bound ~1.10 (the soft-overshoot lets
// extreme cases reach CRITICAL even when one or two signals are zero).
// Exposed here so tuning is data-driven rather than guessing in code.
const FEATURE_WEIGHTS = Object.freeze({
  NO_SHOW_RATE_90D: 0.45, // strongest signal — past behavior
  CANCELLATION_RATE_90D: 0.15, // soft cancel still indicates commitment issue
  RECENT_STREAK: 0.1, // last-5 no-show count / 5
  DAYS_SINCE_LAST_ATTENDED: 0.1, // capped at 1 (≥30 days)
  RESCHEDULE_COUNT: 0.05, // capped at 1 (≥3 reschedules)
  FIRST_APPOINTMENT: 0.05, // first booking — no history to anchor on
  EARLY_OR_LATE_HOUR: 0.03, // before 9am or 16:00+ — common no-show windows
  NO_INSURANCE_APPROVAL: 0.02, // less financial commitment
  BRANCH_BASELINE: 0.05, // branch-level no-show rate (operational floor)
});

const INTERVENTION = Object.freeze({
  STANDARD_REMINDER: 'standard_reminder',
  SMS_24H_BEFORE: 'sms_24h_before',
  SMS_2H_BEFORE: 'sms_2h_before',
  PHONE_CALL_TASK: 'phone_call_task',
  PHONE_CALL_REQUIRED: 'phone_call_required',
  THERAPIST_ALERT: 'therapist_alert',
});
const INTERVENTIONS = Object.freeze(Object.values(INTERVENTION));

const INTERVENTIONS_BY_BAND = Object.freeze({
  [RISK_BAND.LOW]: Object.freeze([INTERVENTION.STANDARD_REMINDER]),
  [RISK_BAND.MEDIUM]: Object.freeze([INTERVENTION.STANDARD_REMINDER, INTERVENTION.SMS_24H_BEFORE]),
  [RISK_BAND.HIGH]: Object.freeze([
    INTERVENTION.STANDARD_REMINDER,
    INTERVENTION.SMS_24H_BEFORE,
    INTERVENTION.SMS_2H_BEFORE,
    INTERVENTION.PHONE_CALL_TASK,
  ]),
  [RISK_BAND.CRITICAL]: Object.freeze([
    INTERVENTION.STANDARD_REMINDER,
    INTERVENTION.SMS_24H_BEFORE,
    INTERVENTION.SMS_2H_BEFORE,
    INTERVENTION.PHONE_CALL_REQUIRED,
    INTERVENTION.THERAPIST_ALERT,
  ]),
});

// Appointment statuses for which prediction makes sense.
//   PENDING / CONFIRMED              → upcoming, predict
//   CHECKED_IN / IN_PROGRESS / COMPLETED → outcome known, no prediction
//   CANCELLED / NO_SHOW              → outcome known
//   RESCHEDULED                      → outcome moved; prediction applies
//                                       to the new appointment row
const PREDICTABLE_STATUSES = Object.freeze(['PENDING', 'CONFIRMED']);

// Default look-ahead horizon for batch scans.
const DEFAULT_BATCH_HORIZON_HOURS = 48;

// Confidence baseline for the rule-based fallback. The validation
// pipeline (Wave 116+) will refine this from observed actual outcomes.
const BASELINE_CONFIDENCE = 0.6;

// Tolerance for accuracy checks (|actual - predicted| ≤ TOLERANCE).
// Matches progressPrediction.service.js convention.
const ACCURACY_TOLERANCE = 0.15;

const REASON = Object.freeze({
  NO_SHOW_PREDICTION_UNAVAILABLE: 'NO_SHOW_PREDICTION_UNAVAILABLE',
  NO_SHOW_APPOINTMENT_NOT_FOUND: 'NO_SHOW_APPOINTMENT_NOT_FOUND',
  NO_SHOW_APPOINTMENT_INVALID_STATUS: 'NO_SHOW_APPOINTMENT_INVALID_STATUS',
  NO_SHOW_BENEFICIARY_REQUIRED: 'NO_SHOW_BENEFICIARY_REQUIRED',
  NO_SHOW_PERSIST_FAILED: 'NO_SHOW_PERSIST_FAILED',
  NO_SHOW_VALIDATION_FAILED: 'NO_SHOW_VALIDATION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
});

const MODEL_VERSION = 'no-show-rule-based-v1';

// ─── Pure helpers ────────────────────────────────────────────────

function bandForScore(score) {
  if (!Number.isFinite(score)) return RISK_BAND.LOW;
  if (score >= BAND_THRESHOLDS[RISK_BAND.CRITICAL]) return RISK_BAND.CRITICAL;
  if (score >= BAND_THRESHOLDS[RISK_BAND.HIGH]) return RISK_BAND.HIGH;
  if (score >= BAND_THRESHOLDS[RISK_BAND.MEDIUM]) return RISK_BAND.MEDIUM;
  return RISK_BAND.LOW;
}

function interventionsForBand(band) {
  return INTERVENTIONS_BY_BAND[band] || INTERVENTIONS_BY_BAND[RISK_BAND.LOW];
}

module.exports = {
  RISK_BAND,
  RISK_BANDS,
  BAND_THRESHOLDS,
  FEATURE_WEIGHTS,
  INTERVENTION,
  INTERVENTIONS,
  INTERVENTIONS_BY_BAND,
  PREDICTABLE_STATUSES,
  DEFAULT_BATCH_HORIZON_HOURS,
  BASELINE_CONFIDENCE,
  ACCURACY_TOLERANCE,
  REASON,
  MODEL_VERSION,
  bandForScore,
  interventionsForBand,
};
