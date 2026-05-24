'use strict';

/**
 * AdaptiveSportsProgram — Wave 362.
 *
 * "الرياضة التكيّفية" — graduates `rehabilitation-services/
 * adaptive-sports-service.js` scaffold (pre-W362 used `new Map()` only)
 * to a Mongoose-backed model.
 *
 * Each program = (beneficiary, sport, period) participation record with
 * embedded sessions[] log. Distinct from TherapySession — adaptive sports
 * are RECREATIONAL / FITNESS / SOCIAL outlets rather than therapeutic
 * sessions, though many serve a therapeutic purpose (Hippotherapy via
 * equine, hydrotherapy via swimming).
 *
 * Wave-18 invariants:
 *   • sport ∈ SPORTS catalog
 *   • physicalDemand ∈ {low, moderate, high}
 *   • status='completed' requires endDate
 *   • status='active' requires startDate
 *   • Each session: date + durationMinutes ≥ 0 required
 *   • achievements[] entries: title + earnedAt required
 */

const mongoose = require('mongoose');

// Sports catalog — covers wheelchair sports + adapted versions of common
// sports + therapy-adjacent activities (equine, swimming, sensory)
const SPORTS = [
  'wheelchair_basketball',
  'wheelchair_tennis',
  'wheelchair_rugby',
  'wheelchair_racing',
  'boccia',
  'goalball',
  'sitting_volleyball',
  'adapted_swimming',
  'hippotherapy',
  'adapted_cycling',
  'adapted_skiing',
  'adapted_archery',
  'adapted_judo',
  'powerlifting',
  'sled_hockey',
  'unified_football',
  'sensory_movement',
  'water_polo_adapted',
  'other',
];

const CATEGORIES = ['team', 'individual', 'therapy_adjacent'];
const PHYSICAL_DEMAND = ['low', 'moderate', 'high'];
const STATUSES = ['draft', 'active', 'paused', 'completed', 'discontinued'];
const SESSION_TYPES = ['training', 'competition', 'demo', 'social', 'assessment'];
const INDEPENDENCE_LEVELS = ['full_support', 'moderate_support', 'minimal_support', 'independent'];

const SessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: SESSION_TYPES, default: 'training' },
    durationMinutes: { type: Number, required: true, min: 0, max: 480 },
    location: { type: String, default: '', maxlength: 150 },
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    coachName: { type: String, default: '', maxlength: 100 },
    participationNotes: { type: String, default: '', maxlength: 500 },
    skillsObserved: { type: [String], default: () => [] },
    independenceLevel: { type: String, enum: INDEPENDENCE_LEVELS, default: 'moderate_support' },
    incidentNotes: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const AchievementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    titleAr: { type: String, default: '', maxlength: 200 },
    earnedAt: { type: Date, required: true },
    description: { type: String, default: '', maxlength: 500 },
    competitionName: { type: String, default: '', maxlength: 200 },
    placement: { type: String, default: '', maxlength: 50 }, // "1st", "Gold", etc.
  },
  { _id: true }
);

const AdaptiveSportsProgramSchema = new mongoose.Schema(
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

    sport: { type: String, enum: SPORTS, required: true, index: true },
    sportLabelAr: { type: String, default: '', maxlength: 100 },
    category: { type: String, enum: CATEGORIES, required: true, default: 'individual' },
    physicalDemand: { type: String, enum: PHYSICAL_DEMAND, default: 'moderate' },

    // Disability categories the program is designed for
    targetedDisabilityTypes: { type: [String], default: () => [] },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    frequencyPerWeek: { type: Number, default: null, min: 0, max: 14 },
    durationMinutesPerSession: { type: Number, default: null, min: 0, max: 480 },

    primaryCoachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    primaryCoachName: { type: String, default: '', maxlength: 100 },

    goals: { type: [String], default: () => [] },
    contraindications: { type: [String], default: () => [] },
    equipmentNeeded: { type: [String], default: () => [] },
    accommodationsNeeded: { type: [String], default: () => [] },

    sessions: { type: [SessionSchema], default: () => [] },
    achievements: { type: [AchievementSchema], default: () => [] },

    // Family + community signoff
    familyConsent: { type: Boolean, default: false },
    medicalClearance: { type: Boolean, default: false },
    medicalClearanceBy: { type: String, default: '', maxlength: 100 },
    medicalClearanceAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    discontinuationReason: { type: String, default: '', maxlength: 500 },

    linkedCarePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'adaptive_sports_programs' }
);

AdaptiveSportsProgramSchema.index({ beneficiaryId: 1, sport: 1, startDate: -1 });
AdaptiveSportsProgramSchema.index({ branchId: 1, status: 1 });
AdaptiveSportsProgramSchema.index({ sport: 1, status: 1 });

AdaptiveSportsProgramSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AdaptiveSportsProgramSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!SPORTS.includes(this.sport)) {
    this.invalidate('sport', `must be one of ${SPORTS.join(',')}`);
    ok = false;
  }
  if (!PHYSICAL_DEMAND.includes(this.physicalDemand)) {
    this.invalidate('physicalDemand', `must be one of ${PHYSICAL_DEMAND.join(',')}`);
    ok = false;
  }

  if (this.status === 'active' && !this.startDate) {
    this.invalidate('startDate', 'startDate required when status=active');
    ok = false;
  }
  if (this.status === 'completed' && !this.endDate) {
    this.invalidate('endDate', 'endDate required when status=completed');
    ok = false;
  }
  if (this.status === 'discontinued' && !String(this.discontinuationReason || '').trim()) {
    this.invalidate('discontinuationReason', 'discontinuationReason required');
    ok = false;
  }

  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'endDate must be >= startDate');
    ok = false;
  }

  // High-demand sports require medical clearance
  if (this.physicalDemand === 'high' && this.status !== 'draft' && !this.medicalClearance) {
    this.invalidate(
      'medicalClearance',
      'medical clearance required for high-physical-demand sports'
    );
    ok = false;
  }

  // Session integrity
  if (Array.isArray(this.sessions)) {
    for (let i = 0; i < this.sessions.length; i++) {
      const s = this.sessions[i];
      if (!s.date) {
        this.invalidate(`sessions.${i}.date`, 'session date required');
        ok = false;
      }
      if (typeof s.durationMinutes !== 'number' || s.durationMinutes < 0) {
        this.invalidate(`sessions.${i}.durationMinutes`, 'session duration required');
        ok = false;
      }
    }
  }

  // Achievement integrity
  if (Array.isArray(this.achievements)) {
    for (let i = 0; i < this.achievements.length; i++) {
      const a = this.achievements[i];
      if (!String(a.title || '').trim()) {
        this.invalidate(`achievements.${i}.title`, 'achievement title required');
        ok = false;
      }
      if (!a.earnedAt) {
        this.invalidate(`achievements.${i}.earnedAt`, 'achievement earnedAt required');
        ok = false;
      }
    }
  }

  return ok;
});

AdaptiveSportsProgramSchema.virtual('sessionCount').get(function () {
  return Array.isArray(this.sessions) ? this.sessions.length : 0;
});

AdaptiveSportsProgramSchema.virtual('achievementCount').get(function () {
  return Array.isArray(this.achievements) ? this.achievements.length : 0;
});

AdaptiveSportsProgramSchema.virtual('totalMinutesLogged').get(function () {
  if (!Array.isArray(this.sessions)) return 0;
  return this.sessions.reduce(
    (acc, s) => acc + (typeof s.durationMinutes === 'number' ? s.durationMinutes : 0),
    0
  );
});

AdaptiveSportsProgramSchema.set('toJSON', { virtuals: true });
AdaptiveSportsProgramSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.AdaptiveSportsProgram ||
  mongoose.model('AdaptiveSportsProgram', AdaptiveSportsProgramSchema);

module.exports.SPORTS = SPORTS;
module.exports.CATEGORIES = CATEGORIES;
module.exports.PHYSICAL_DEMAND = PHYSICAL_DEMAND;
module.exports.STATUSES = STATUSES;
module.exports.SESSION_TYPES = SESSION_TYPES;
module.exports.INDEPENDENCE_LEVELS = INDEPENDENCE_LEVELS;
