'use strict';

/**
 * therapySessionProjection.js — W1240
 *
 * ROOT FIX for the ClinicalSession ↔ TherapySession write/read split documented in
 * docs/DDD_VS_LEGACY_MODEL_SPLIT_2026-06-12.md. The web-admin UI writes sessions to
 * `ClinicalSession` (domains/sessions); the entire analytics layer — Session-Center
 * KPIs, episodes, goal-progress, NPHIES claims, ICF, pain (the 56 TherapySession
 * consumers) — reads `TherapySession`. There was NO sync between them, so a session
 * logged through the UI showed on the Beneficiary-360 but was INVISIBLE to all of
 * those surfaces.
 *
 * This module projects each ClinicalSession write into a faithful TherapySession
 * read-model record (CQRS read-model projection), keyed by `sourceClinicalSessionId`
 * for idempotency (one TherapySession per source ClinicalSession; re-projecting an
 * updated session updates the same record).
 *
 * Two invariants make this safe to run on the live (currently empty) session spine:
 *   1. FAIL-SAFE — every error is swallowed and returned as `{ ok:false }`, never
 *      thrown. A projection failure must NEVER break the UI session-create flow.
 *      Incomplete analytics is acceptable; a broken session write is not.
 *   2. FAITHFUL-OR-NULL — `ClinicalSession.therapistId` refs `User`, but
 *      `TherapySession.therapist` refs `Employee`. We resolve via `Employee.user_id`;
 *      when no Employee is linked we leave `therapist` null. The projection is never
 *      WRONG (no fabricated therapist attribution feeding claims/KPIs) — only
 *      incomplete, which a later backfill can fill.
 */

const mongoose = require('mongoose');

// ClinicalSession.specialty (English) → TherapySession.sessionType (Arabic discipline enum)
const SPECIALTY_TO_DISCIPLINE = Object.freeze({
  physical_therapy: 'علاج طبيعي',
  occupational_therapy: 'علاج وظيفي',
  speech_therapy: 'نطق وتخاطب',
  behavioral_therapy: 'علاج سلوكي',
  psychological: 'علاج نفسي',
  // educational | social_work | nursing | vocational | recreational |
  // multidisciplinary | other | (unset) → 'أخرى'
});

// ClinicalSession.status (lowercase) → TherapySession.status (UPPERCASE enum)
const STATUS_MAP = Object.freeze({
  scheduled: 'SCHEDULED',
  confirmed: 'CONFIRMED',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED_BY_CENTER',
  late_cancel: 'CANCELLED_BY_PATIENT',
  no_show: 'NO_SHOW',
  rescheduled: 'RESCHEDULED',
});

function mapSessionType(specialty) {
  return SPECIALTY_TO_DISCIPLINE[specialty] || 'أخرى';
}

function mapStatus(status) {
  return STATUS_MAP[status] || 'SCHEDULED';
}

/**
 * Resolve a ClinicalSession.therapistId (ref User) to an Employee._id
 * (TherapySession.therapist ref Employee). Faithful-or-null: returns null when no
 * Employee is linked or on any error. Never throws.
 * @param {mongoose.Types.ObjectId|string|null} userId
 * @returns {Promise<mongoose.Types.ObjectId|null>}
 */
async function resolveTherapistEmployeeId(userId) {
  if (!userId) return null;
  try {
    const Employee = mongoose.model('Employee');
    const emp = await Employee.findOne({ user_id: userId }).select('_id').lean();
    return emp ? emp._id : null;
  } catch {
    return null;
  }
}

/**
 * Build the TherapySession projection fields from a ClinicalSession document.
 * One async lookup (therapist resolution); never throws.
 * @param {Object} clinical - a ClinicalSession doc or lean object
 * @returns {Promise<Object>} fields for a TherapySession upsert
 */
async function mapClinicalToTherapy(clinical) {
  const therapist = await resolveTherapistEmployeeId(clinical.therapistId);
  // `date` is the only required TherapySession field — always provide a valid Date.
  const date =
    clinical.scheduledDate || clinical.actualStartTime || clinical.createdAt || new Date(0);
  const duration =
    clinical.actualDurationMinutes != null
      ? clinical.actualDurationMinutes
      : clinical.scheduledDurationMinutes;

  return {
    sourceClinicalSessionId: clinical._id,
    beneficiary: clinical.beneficiaryId || undefined,
    episodeOfCare: clinical.episodeId || undefined,
    carePlan: clinical.carePlanId || undefined,
    therapist: therapist || undefined,
    branchId: clinical.branchId || undefined,
    sessionType: mapSessionType(clinical.specialty),
    status: mapStatus(clinical.status),
    date,
    ...(duration != null ? { duration } : {}),
    createdBy: clinical.therapistId || undefined,
  };
}

/**
 * Idempotently project a ClinicalSession into its TherapySession read-model record
 * (upsert keyed by `sourceClinicalSessionId`). FAIL-SAFE — returns a result object,
 * never throws.
 * @param {Object} clinical - the ClinicalSession doc just written
 * @param {{logger?: {warn?: Function}}} [opts]
 * @returns {Promise<{ok: boolean, id?: any, error?: string}>}
 */
async function projectClinicalSession(clinical, { logger } = {}) {
  try {
    if (!clinical || !clinical._id) return { ok: false, error: 'no source doc' };
    const TherapySession = mongoose.model('TherapySession');
    const fields = await mapClinicalToTherapy(clinical);
    const doc = await TherapySession.findOneAndUpdate(
      { sourceClinicalSessionId: clinical._id },
      { $set: fields },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    return { ok: true, id: doc ? doc._id : undefined };
  } catch (err) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`[therapySessionProjection] projection failed (non-fatal): ${err.message}`);
    }
    return { ok: false, error: err.message };
  }
}

module.exports = {
  SPECIALTY_TO_DISCIPLINE,
  STATUS_MAP,
  mapSessionType,
  mapStatus,
  resolveTherapistEmployeeId,
  mapClinicalToTherapy,
  projectClinicalSession,
};
