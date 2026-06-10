'use strict';

/**
 * CaregiverSupportProgram — Wave 384.
 *
 * "برنامج دعم مقدمي الرعاية" — graduates the in-memory scaffold at
 * `rehabilitation-services/advanced-family-support-service.js` (Maps for
 * counselings + caregiverTrainings + supportGroups) into a production-grade
 * Mongoose model with persistence + invariants + canonical refs.
 *
 * Distinct from sibling modules in this domain:
 *   • CaregiverBurdenAssessment (clinical-assessment/) — the Zarit-22 score
 *     itself, ASSESSMENT artifact. This module is the PROGRAM that the
 *     assessment may trigger or that closes the loop on a high score.
 *   • RespiteBooking (W363) — the time-limited respite event itself.
 *     CaregiverSupportProgram covers ONGOING enrollment in counseling /
 *     training / support-group, NOT one-off respite hours.
 *   • Guardian (existing) — the walī's static identity record. This module
 *     links to a caregiver via free-text fields because caregivers are not
 *     always Guardians (siblings, aunts/uncles, paid caregivers).
 *
 * Five program types covering the major caregiver-support modalities:
 *   • caregiver_counseling      — individual or family counseling sessions
 *   • caregiver_training        — structured ~5-module / ~20h training
 *   • parent_support_group      — peer support among parents
 *   • sibling_support_group     — peer support among siblings (requires age band)
 *   • caregiver_peer_support    — caregiver-to-caregiver group
 *
 * Six-state lifecycle:
 *   enrolled → in_progress → (completed | paused | discontinued)
 *   paused ↔ in_progress
 *   completed / discontinued are terminal.
 *
 * Wave-18 invariants:
 *   • programType ∈ PROGRAM_TYPES
 *   • caregiver identity required (either caregiverGuardianId OR
 *     caregiverName + relationship)
 *   • status='completed' requires completedAt
 *   • status='discontinued' requires discontinuationReason
 *   • status='paused' requires pausedAt
 *   • programType='sibling_support_group' requires siblingAgeRange.min/max
 *   • programType='caregiver_training' requires totalModules ≥ 1
 *   • sessions[] entries require sessionDate + format
 *   • outcomes.preProgramBurdenScore + postProgramBurdenScore in [0, 88]
 *     (Zarit-22 valid range)
 *   • outcomes.satisfactionScore in [1, 10] when present
 */

const mongoose = require('mongoose');

const PROGRAM_TYPES = [
  'caregiver_counseling',
  'caregiver_training',
  'parent_support_group',
  'sibling_support_group',
  'caregiver_peer_support',
];

const STATUSES = ['enrolled', 'in_progress', 'paused', 'completed', 'discontinued'];

const SESSION_FORMATS = ['individual', 'family', 'group', 'phone', 'video'];

const ATTENDANCE_STATUSES = ['attended', 'absent', 'cancelled', 'late', 'partial'];

const SessionSchema = new mongoose.Schema(
  {
    sessionDate: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60, min: 5, max: 480 },
    format: { type: String, enum: SESSION_FORMATS, required: true },
    topic: { type: String, default: '', maxlength: 300 },
    facilitatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    facilitatorName: { type: String, default: '', maxlength: 100 },
    attendanceStatus: { type: String, enum: ATTENDANCE_STATUSES, default: 'attended' },
    attendees: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, default: '', maxlength: 100 },
            relationship: { type: String, default: '', maxlength: 50 },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },
    progressNotes: { type: String, default: '', maxlength: 2000 },
    nextSessionDate: { type: Date, default: null },
  },
  { _id: true }
);

const ModuleProgressSchema = new mongoose.Schema(
  {
    moduleNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, maxlength: 200 },
    targetHours: { type: Number, default: 4, min: 0 },
    hoursCompleted: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const HistorySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, default: '' },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: { type: String, default: '', maxlength: 100 },
    reason: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

const CaregiverSupportProgramSchema = new mongoose.Schema(
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

    programType: { type: String, enum: PROGRAM_TYPES, required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'enrolled', index: true },

    // ── Caregiver identity ────────────────────────────────────────
    caregiverGuardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      default: null,
    },
    caregiverName: { type: String, default: '', maxlength: 100 },
    caregiverRelationship: { type: String, default: '', maxlength: 50 },
    caregiverPhone: { type: String, default: '', maxlength: 30 },

    // ── Schedule ───────────────────────────────────────────────────
    enrolledAt: { type: Date, default: Date.now },
    targetCompletionDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    discontinuedAt: { type: Date, default: null },
    discontinuationReason: { type: String, default: '', maxlength: 500 },

    // ── Program ownership / coordination ──────────────────────────
    assignedCounselorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedCounselorName: { type: String, default: '', maxlength: 100 },

    // ── Type-specific config ──────────────────────────────────────
    // For caregiver_training:
    totalModules: { type: Number, default: 0, min: 0, max: 50 },
    totalTargetHours: { type: Number, default: 0, min: 0, max: 500 },
    modulesProgress: { type: [ModuleProgressSchema], default: () => [] },

    // For sibling_support_group:
    siblingAgeRange: {
      min: { type: Number, default: null, min: 0, max: 30 },
      max: { type: Number, default: null, min: 0, max: 30 },
    },

    // For *_support_group:
    groupName: { type: String, default: '', maxlength: 100 },
    groupFrequency: { type: String, default: '', maxlength: 50 },

    // ── Session log ───────────────────────────────────────────────
    sessions: { type: [SessionSchema], default: () => [] },

    // ── Outcomes ──────────────────────────────────────────────────
    outcomes: {
      preProgramBurdenScore: { type: Number, default: null, min: 0, max: 88 },
      postProgramBurdenScore: { type: Number, default: null, min: 0, max: 88 },
      satisfactionScore: { type: Number, default: null, min: 1, max: 10 },
      selfReportedImpact: { type: String, default: '', maxlength: 1500 },
    },

    history: { type: [HistorySchema], default: () => [] },
    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'caregiver_support_programs' }
);

CaregiverSupportProgramSchema.index({ beneficiaryId: 1, programType: 1, status: 1 });
CaregiverSupportProgramSchema.index({ branchId: 1, status: 1 });
CaregiverSupportProgramSchema.index({ assignedCounselorId: 1, status: 1 });
CaregiverSupportProgramSchema.index({ targetCompletionDate: 1, status: 1 });

CaregiverSupportProgramSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

CaregiverSupportProgramSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!PROGRAM_TYPES.includes(this.programType)) {
    this.invalidate('programType', `must be one of ${PROGRAM_TYPES.join(',')}`);
    ok = false;
  }

  // Caregiver identity required: either guardian ref OR (name + relationship)
  const hasGuardian = !!this.caregiverGuardianId;
  const hasNameRelation =
    String(this.caregiverName || '').trim() && String(this.caregiverRelationship || '').trim();
  if (!hasGuardian && !hasNameRelation) {
    this.invalidate(
      'caregiverName',
      'caregiverGuardianId OR (caregiverName + caregiverRelationship) required'
    );
    ok = false;
  }

  // Lifecycle terminal/transitional fields
  if (this.status === 'completed' && !this.completedAt) {
    this.invalidate('completedAt', 'completedAt required when status=completed');
    ok = false;
  }
  if (this.status === 'discontinued') {
    if (!this.discontinuedAt) {
      this.invalidate('discontinuedAt', 'discontinuedAt required when status=discontinued');
      ok = false;
    }
    if (!String(this.discontinuationReason || '').trim()) {
      this.invalidate(
        'discontinuationReason',
        'discontinuationReason required when status=discontinued'
      );
      ok = false;
    }
  }
  if (this.status === 'paused' && !this.pausedAt) {
    this.invalidate('pausedAt', 'pausedAt required when status=paused');
    ok = false;
  }

  // Program-type specific config
  if (this.programType === 'sibling_support_group') {
    const min = this.siblingAgeRange && this.siblingAgeRange.min;
    const max = this.siblingAgeRange && this.siblingAgeRange.max;
    if (min == null || max == null) {
      this.invalidate(
        'siblingAgeRange',
        'siblingAgeRange.min and .max required for sibling_support_group'
      );
      ok = false;
    } else if (Number(min) > Number(max)) {
      this.invalidate('siblingAgeRange', 'siblingAgeRange.min must be ≤ .max');
      ok = false;
    }
  }
  if (this.programType === 'caregiver_training') {
    if (!this.totalModules || this.totalModules < 1) {
      this.invalidate('totalModules', 'totalModules ≥ 1 required for caregiver_training');
      ok = false;
    }
  }

  // Sessions: each requires sessionDate + format
  if (Array.isArray(this.sessions)) {
    for (let i = 0; i < this.sessions.length; i++) {
      const s = this.sessions[i];
      if (!s.sessionDate) {
        this.invalidate(`sessions.${i}.sessionDate`, 'sessions[].sessionDate required');
        ok = false;
      }
      if (!SESSION_FORMATS.includes(s.format)) {
        this.invalidate(`sessions.${i}.format`, `sessions[].format ∈ ${SESSION_FORMATS.join(',')}`);
        ok = false;
      }
    }
  }

  // Module progress hoursCompleted ≤ targetHours
  if (Array.isArray(this.modulesProgress)) {
    for (let i = 0; i < this.modulesProgress.length; i++) {
      const m = this.modulesProgress[i];
      if (Number(m.hoursCompleted) > Number(m.targetHours)) {
        this.invalidate(
          `modulesProgress.${i}.hoursCompleted`,
          'hoursCompleted must be ≤ targetHours'
        );
        ok = false;
      }
    }
  }

  return ok;
});

CaregiverSupportProgramSchema.virtual('sessionsCount').get(function () {
  return Array.isArray(this.sessions) ? this.sessions.length : 0;
});

CaregiverSupportProgramSchema.virtual('sessionsAttendedCount').get(function () {
  return Array.isArray(this.sessions)
    ? this.sessions.filter(s => s.attendanceStatus === 'attended').length
    : 0;
});

CaregiverSupportProgramSchema.virtual('modulesCompletedCount').get(function () {
  return Array.isArray(this.modulesProgress)
    ? this.modulesProgress.filter(m => m.completedAt).length
    : 0;
});

CaregiverSupportProgramSchema.virtual('hoursCompletedTotal').get(function () {
  if (!Array.isArray(this.modulesProgress)) return 0;
  return this.modulesProgress.reduce((acc, m) => acc + (Number(m.hoursCompleted) || 0), 0);
});

CaregiverSupportProgramSchema.virtual('modulesProgressPct').get(function () {
  if (!this.totalModules) return 0;
  const completed = Array.isArray(this.modulesProgress)
    ? this.modulesProgress.filter(m => m.completedAt).length
    : 0;
  return Math.round((completed / this.totalModules) * 100);
});

CaregiverSupportProgramSchema.virtual('burdenScoreDelta').get(function () {
  if (
    !this.outcomes ||
    this.outcomes.preProgramBurdenScore == null ||
    this.outcomes.postProgramBurdenScore == null
  ) {
    return null;
  }
  return this.outcomes.postProgramBurdenScore - this.outcomes.preProgramBurdenScore;
});

CaregiverSupportProgramSchema.virtual('isOverdue').get(function () {
  return !!(
    (this.status === 'enrolled' || this.status === 'in_progress') &&
    this.targetCompletionDate &&
    new Date(this.targetCompletionDate) < new Date()
  );
});

CaregiverSupportProgramSchema.set('toJSON', { virtuals: true });
CaregiverSupportProgramSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1120 — caregiver-support program island → CareTimeline) ──
CaregiverSupportProgramSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
CaregiverSupportProgramSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'completed' || this.$__prevStatus === 'completed') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    Promise.resolve(
      integrationBus.publish('caregiver-support', 'program.completed', {
        caregiverSupportProgramId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        programType: doc.programType,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.CaregiverSupportProgram ||
  mongoose.model('CaregiverSupportProgram', CaregiverSupportProgramSchema);

module.exports.PROGRAM_TYPES = PROGRAM_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.SESSION_FORMATS = SESSION_FORMATS;
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
