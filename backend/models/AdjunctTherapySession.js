'use strict';

/**
 * AdjunctTherapySession — Wave 693.
 *
 * "جلسة العلاج المساند (المائي / بالخيل / بمساعدة الحيوان)" — a persistent
 * record of an adjunct/recreational therapy session that requires a medical
 * clearance gate before it may run.
 *
 * Why a dedicated PERSISTENT model (the 2026-05-31 audit gap):
 *   • `rehabilitation-services/hydrotherapy-service.js` (454 LOC) and
 *     `animal-assisted-therapy-service.js` (412 LOC) hold rich clinical
 *     logic but store everything in IN-MEMORY Maps — assessments, plans,
 *     and sessions are LOST on restart and have no admin UI. They are
 *     proof-of-concept, not a production module.
 *   • This model persists the production path: the medical-clearance gate
 *     (the safety contract those services encode), the session log, and the
 *     outcome — WITHOUT touching the fragile in-memory services (they are
 *     unconsumed by web-admin). One unified model with a `modality` enum
 *     (hydrotherapy / hippotherapy / animal_assisted) avoids fragmentation.
 *
 * Wave-18 invariants:
 *   • modality ∈ MODALITIES; status ∈ STATUSES
 *   • status=completed ⇒ medicalCleared=true (the safety gate — a session
 *     cannot be completed without medical clearance)
 *   • status=completed ⇒ activities OR outcomeNotes recorded
 *   • status=cancelled ⇒ cancelReason required
 *   • incidentDuringSession=true ⇒ incidentNotes required
 *   • modality ∈ {hippotherapy, animal_assisted} AND status=completed ⇒
 *     animalType recorded (which animal was used)
 */

const mongoose = require('mongoose');

const MODALITIES = ['hydrotherapy', 'hippotherapy', 'animal_assisted'];
const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];
const READINESS_LEVELS = ['not_assessed', 'emerging', 'ready'];
const RESPONSES = ['positive', 'neutral', 'distressed', 'refused'];
const ANIMAL_TYPES = ['horse', 'dog', 'other', 'none'];

const AdjunctTherapySessionSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    carePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    therapistName: { type: String, default: '', maxlength: 100 },

    modality: { type: String, enum: MODALITIES, required: true, index: true },
    sessionDate: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: null, min: 0, max: 240 },

    // ── Medical clearance (the safety gate) ─────────────────────────────
    medicalCleared: { type: Boolean, default: false },
    clearedByName: { type: String, default: '', maxlength: 100 },
    clearedDate: { type: Date, default: null },
    contraindications: { type: String, default: '', maxlength: 500 },

    readinessLevel: { type: String, enum: READINESS_LEVELS, default: 'not_assessed' },

    // ── Session content ─────────────────────────────────────────────────
    activities: { type: [String], default: () => [] },
    skillsTargeted: { type: [String], default: () => [] },
    beneficiaryResponse: { type: String, enum: RESPONSES.concat([null]), default: null },
    outcomeNotes: { type: String, default: '', maxlength: 1000 },

    // ── Modality-specific (optional) ────────────────────────────────────
    // Hydrotherapy: pool conditions + vitals.
    waterTemperatureC: { type: Number, default: null, min: 20, max: 42 },
    poolDepthM: { type: Number, default: null, min: 0, max: 5 },
    flotationUsed: { type: Boolean, default: false },
    heartRateBefore: { type: Number, default: null, min: 0, max: 250 },
    heartRateAfter: { type: Number, default: null, min: 0, max: 250 },
    // Equine / animal-assisted: which animal.
    animalType: { type: String, enum: ANIMAL_TYPES, default: 'none' },
    animalName: { type: String, default: '', maxlength: 80 },

    // ── Safety ──────────────────────────────────────────────────────────
    incidentDuringSession: { type: Boolean, default: false },
    incidentNotes: { type: String, default: '', maxlength: 500 },

    status: { type: String, enum: STATUSES, default: 'scheduled', index: true },
    cancelReason: { type: String, default: '', maxlength: 300 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'adjunct_therapy_sessions' }
);

AdjunctTherapySessionSchema.index({ beneficiaryId: 1, sessionDate: -1 });
AdjunctTherapySessionSchema.index({ branchId: 1, status: 1 });
AdjunctTherapySessionSchema.index({ modality: 1, sessionDate: -1 });

AdjunctTherapySessionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

const ANIMAL_MODALITIES = ['hippotherapy', 'animal_assisted'];

AdjunctTherapySessionSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!MODALITIES.includes(this.modality)) {
    this.invalidate('modality', `must be one of ${MODALITIES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'completed') {
    if (!this.medicalCleared) {
      this.invalidate('medicalCleared', 'medical clearance required before completing a session');
      ok = false;
    }
    const hasContent =
      (Array.isArray(this.activities) && this.activities.length > 0) ||
      String(this.outcomeNotes || '').trim();
    if (!hasContent) {
      this.invalidate('outcomeNotes', 'completed session needs activities or outcomeNotes');
      ok = false;
    }
    if (
      ANIMAL_MODALITIES.includes(this.modality) &&
      (!this.animalType || this.animalType === 'none')
    ) {
      this.invalidate('animalType', 'animalType required for completed equine/animal sessions');
      ok = false;
    }
  }
  if (this.status === 'cancelled' && !String(this.cancelReason || '').trim()) {
    this.invalidate('cancelReason', 'cancelReason required when status=cancelled');
    ok = false;
  }
  if (this.incidentDuringSession && !String(this.incidentNotes || '').trim()) {
    this.invalidate('incidentNotes', 'incidentNotes required when incidentDuringSession=true');
    ok = false;
  }
  return ok;
});

AdjunctTherapySessionSchema.virtual('isCleared').get(function () {
  return !!this.medicalCleared;
});

AdjunctTherapySessionSchema.virtual('hadIncident').get(function () {
  return !!this.incidentDuringSession;
});

AdjunctTherapySessionSchema.set('toJSON', { virtuals: true });
AdjunctTherapySessionSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.AdjunctTherapySession ||
  mongoose.model('AdjunctTherapySession', AdjunctTherapySessionSchema);

module.exports.MODALITIES = MODALITIES;
module.exports.STATUSES = STATUSES;
module.exports.READINESS_LEVELS = READINESS_LEVELS;
module.exports.RESPONSES = RESPONSES;
module.exports.ANIMAL_TYPES = ANIMAL_TYPES;
