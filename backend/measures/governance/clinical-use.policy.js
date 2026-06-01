'use strict';

/**
 * clinical-use.policy.js — W693 screening-vs-diagnostic use enforcement.
 *
 * WHY this exists (the clinical-safety gap):
 *   A screening instrument (M-CHAT-R/F, SCQ, SDQ) answers "should this child
 *   be referred for a full evaluation?" — it does NOT establish a diagnosis.
 *   Treating a positive screen as a diagnosis is a well-documented clinical
 *   error that leads to false labelling and inappropriate care plans.
 *
 *   This pure policy layer reads the `purpose` / `category` already present on
 *   every Measure catalog entry and exposes guard helpers that the
 *   interpretation + care-plan layers call so that:
 *     • a screening result NEVER drives a diagnostic conclusion;
 *     • a positive screen ALWAYS surfaces a "needs confirmatory assessment"
 *       recommendation instead of a diagnostic label.
 *
 * No DB, no I/O. Decisions are deterministic given the Measure document.
 */

// Canonical use intents a caller may request a measure to support.
const USE_INTENTS = Object.freeze({
  SCREENING: 'screening', // identify who needs further evaluation
  DIAGNOSTIC: 'diagnostic', // establish/confirm a clinical diagnosis
  SEVERITY: 'severity', // grade severity of a known condition
  MONITORING: 'monitoring', // track change over time
  OUTCOME: 'outcome', // measure treatment outcome / QoL
  ELIGIBILITY: 'eligibility', // functional classification for services
});

// What each instrument purpose is CLINICALLY VALID to support.
// (purpose comes from the Measure catalog entry, e.g. 'screening',
//  'diagnostic', 'severity', 'classification', 'quality_of_life', 'function')
const PURPOSE_VALID_INTENTS = Object.freeze({
  screening: [USE_INTENTS.SCREENING, USE_INTENTS.MONITORING],
  diagnostic: [USE_INTENTS.DIAGNOSTIC, USE_INTENTS.SEVERITY, USE_INTENTS.MONITORING],
  severity: [USE_INTENTS.SEVERITY, USE_INTENTS.MONITORING, USE_INTENTS.OUTCOME],
  classification: [USE_INTENTS.ELIGIBILITY, USE_INTENTS.MONITORING],
  quality_of_life: [USE_INTENTS.OUTCOME, USE_INTENTS.MONITORING],
  function: [USE_INTENTS.MONITORING, USE_INTENTS.OUTCOME, USE_INTENTS.ELIGIBILITY],
});

/** Read the governance-relevant purpose from a Measure document. */
function purposeOf(measure) {
  if (!measure || typeof measure !== 'object') return null;
  // `purpose` is the precise field; `category` is the coarse fallback.
  return measure.purpose || measure.category || null;
}

/** True when the instrument is a screening-only tool. */
function isScreeningOnly(measure) {
  return purposeOf(measure) === 'screening';
}

/** True when the instrument is built to support a diagnostic conclusion. */
function isDiagnostic(measure) {
  return purposeOf(measure) === 'diagnostic';
}

/**
 * Decide whether a measure may be used for a requested intent.
 *
 * @param {Object} measure  Measure catalog document
 * @param {string} intent   one of USE_INTENTS
 * @returns {{ allowed: boolean, reason: string, purpose: string|null,
 *            requiresConfirmatory: boolean }}
 */
function evaluateUse(measure, intent) {
  const purpose = purposeOf(measure);
  if (!purpose) {
    return {
      allowed: false,
      reason: 'UNKNOWN_PURPOSE',
      purpose: null,
      requiresConfirmatory: false,
    };
  }
  const valid = PURPOSE_VALID_INTENTS[purpose];
  if (!valid) {
    // Unmapped purpose — fail safe: only allow monitoring.
    const allowed = intent === USE_INTENTS.MONITORING;
    return {
      allowed,
      reason: allowed ? 'MONITORING_ALWAYS_ALLOWED' : 'PURPOSE_NOT_MAPPED',
      purpose,
      requiresConfirmatory: false,
    };
  }
  const allowed = valid.includes(intent);
  // A screening tool asked to support a diagnostic intent is the headline
  // unsafe case — block it and signal that a confirmatory assessment is needed.
  const screeningToDiagnostic = purpose === 'screening' && intent === USE_INTENTS.DIAGNOSTIC;
  return {
    allowed,
    reason: allowed
      ? 'PURPOSE_SUPPORTS_INTENT'
      : screeningToDiagnostic
        ? 'SCREENING_CANNOT_DIAGNOSE'
        : 'PURPOSE_DOES_NOT_SUPPORT_INTENT',
    purpose,
    requiresConfirmatory: screeningToDiagnostic,
  };
}

/**
 * Throw when a measure is used for a clinically-invalid intent.
 * @param {Object} measure
 * @param {string} intent
 */
function assertUse(measure, intent) {
  const result = evaluateUse(measure, intent);
  if (!result.allowed) {
    const err = new Error(
      `Measure '${measure?.code || '?'}' (purpose=${result.purpose}) cannot be used ` +
        `for intent '${intent}': ${result.reason}`
    );
    err.code = 'MEASURE_USE_NOT_PERMITTED';
    err.reason = result.reason;
    err.requiresConfirmatory = result.requiresConfirmatory;
    throw err;
  }
  return result;
}

/**
 * For a POSITIVE/at-risk screening result, produce the bilingual
 * "this is a screen, not a diagnosis" advisory that MUST accompany any
 * surfaced screening flag. Returns null when the measure isn't screening-only.
 *
 * @param {Object} measure
 * @returns {{ ar: string, en: string, action: string }|null}
 */
function confirmatoryAdvisory(measure) {
  if (!isScreeningOnly(measure)) return null;
  const label = measure.name_ar || measure.name || measure.code || 'هذا المقياس';
  return {
    action: 'REFER_FOR_DIAGNOSTIC_ASSESSMENT',
    ar:
      `${label} أداة فرز وليست أداة تشخيص. النتيجة الإيجابية تعني الحاجة إلى ` +
      `تقييم تشخيصي شامل من فريق مختص، ولا تُعدّ تشخيصًا بحدّ ذاتها.`,
    en:
      `${measure.name || measure.code} is a screening tool, not a diagnostic test. ` +
      `A positive result indicates the need for a comprehensive diagnostic ` +
      `evaluation by a qualified team — it is not a diagnosis in itself.`,
  };
}

module.exports = {
  USE_INTENTS,
  PURPOSE_VALID_INTENTS,
  purposeOf,
  isScreeningOnly,
  isDiagnostic,
  evaluateUse,
  assertUse,
  confirmatoryAdvisory,
};
