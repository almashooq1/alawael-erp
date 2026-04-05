/**
 * RehabSession.js — نماذج الجلسات التأهيلية
 * Rehabilitation Sessions + Goal Progress + Group Sessions + Program Referrals
 */

'use strict';

const mongoose = require('mongoose');

// ══════════════════════════════════════════════════════════════
// 1. تقدم الأهداف في الجلسة (session_goal_progress)
// ══════════════════════════════════════════════════════════════
const sessionGoalProgressSchema = new mongoose.Schema(
  {
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabSession',
      required: true,
      index: true,
    },
    goal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabPlanGoal',
      required: true,
    },

    /**
     * بيانات المحاولات:
     * {
     *   total_trials: 10,
     *   correct: 7,
     *   incorrect: 2,
     *   prompted: 1,
     *   prompt_levels: { independent:7, verbal:1, gestural:0, model:1, physical:1 }
     * }
     */
    trial_data: {
      total_trials: { type: Number, default: 0, min: 0 },
      correct: { type: Number, default: 0, min: 0 },
      incorrect: { type: Number, default: 0, min: 0 },
      prompted: { type: Number, default: 0, min: 0 },
      prompt_levels: {
        independent: { type: Number, default: 0 },
        verbal: { type: Number, default: 0 },
        gestural: { type: Number, default: 0 },
        model: { type: Number, default: 0 },
        physical: { type: Number, default: 0 },
        full_physical: { type: Number, default: 0 },
      },
    },

    progress_rating: { type: Number, min: 1, max: 5 }, // 1-5
    prompting_level: {
      type: String,
      enum: ['independent', 'verbal', 'gestural', 'model', 'physical', 'full_physical'],
    },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'session_goal_progress',
  }
);

sessionGoalProgressSchema.index({ session_id: 1, goal_id: 1 }, { unique: true });

sessionGoalProgressSchema.virtual('accuracy_percentage').get(function () {
  const t = this.trial_data;
  if (!t || !t.total_trials || t.total_trials === 0) return 0;
  return Math.round((t.correct / t.total_trials) * 100 * 10) / 10;
});

sessionGoalProgressSchema.virtual('trials_summary').get(function () {
  const t = this.trial_data;
  if (!t) return '-';
  return `${t.correct}/${t.total_trials} صحيح | ${t.incorrect} خطأ | ${t.prompted} بمساعدة`;
});

const SessionGoalProgress =
  mongoose.models.SessionGoalProgress ||
  mongoose.models.SessionGoalProgress ||
  mongoose.models.SessionGoalProgress ||
  mongoose.model('SessionGoalProgress', sessionGoalProgressSchema);

// ══════════════════════════════════════════════════════════════
// 2. الجلسة التأهيلية (rehab_sessions)
// ══════════════════════════════════════════════════════════════
const rehabSessionSchema = new mongoose.Schema(
  {
    // ── الروابط الأساسية ─────────────────────────────────────
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    beneficiary_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    specialist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الأخصائي مطلوب'],
      index: true,
    },
    program_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabProgram',
      required: [true, 'البرنامج مطلوب'],
      index: true,
    },
    enrollment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgramEnrollment' },
    plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabPlan' },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    // ── معلومات الجلسة ───────────────────────────────────────
    session_type: {
      type: String,
      enum: ['individual', 'group'],
      default: 'individual',
    },
    session_number: { type: Number, comment: 'رقم الجلسة التسلسلي للمستفيد في البرنامج' },
    date: { type: Date, required: [true, 'تاريخ الجلسة مطلوب'], index: true },
    start_time: { type: String }, // HH:MM
    end_time: { type: String }, // HH:MM
    actual_duration_minutes: { type: Number, min: 0 },

    // ── الحضور ───────────────────────────────────────────────
    attendance_status: {
      type: String,
      enum: ['present', 'absent', 'excused', 'late', 'cancelled'],
      default: 'present',
      index: true,
    },
    absence_reason: { type: String, trim: true },

    // ── محتوى الجلسة ─────────────────────────────────────────
    objectives_worked_on: [{ type: String }],
    activities_performed: { type: String, trim: true },
    materials_used: [{ type: String }],
    beneficiary_response: { type: String, trim: true },
    progress_notes: { type: String, trim: true },
    next_session_plan: { type: String, trim: true },
    parent_feedback_notes: { type: String, trim: true },
    behavioral_observations: { type: String, trim: true },

    // ── مؤشرات الجلسة ───────────────────────────────────────
    mood: {
      type: String,
      enum: ['happy', 'calm', 'neutral', 'anxious', 'agitated', 'sad', 'hyperactive', 'tired'],
    },
    energy_level: {
      type: String,
      enum: ['high', 'moderate', 'medium', 'low', 'very_low'],
    },
    cooperation_level: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'refused'],
    },

    // ── المرفقات ─────────────────────────────────────────────
    attachments: [
      {
        path: String,
        name: String,
        size: Number,
        mime_type: String,
        uploaded_at: { type: Date, default: Date.now },
      },
    ],

    // ── التوقيع والحالة ──────────────────────────────────────
    signed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signed_at: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'completed', 'approved'],
      default: 'draft',
      index: true,
    },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'rehab_sessions',
  }
);

rehabSessionSchema.index({ beneficiary_id: 1, date: -1 });
rehabSessionSchema.index({ specialist_id: 1, date: -1 });
rehabSessionSchema.index({ program_id: 1, date: -1 });
rehabSessionSchema.index({ date: 1, status: 1 });

rehabSessionSchema.virtual('duration_display').get(function () {
  if (!this.actual_duration_minutes) return '-';
  const h = Math.floor(this.actual_duration_minutes / 60);
  const m = this.actual_duration_minutes % 60;
  return h > 0 ? `${h} ساعة و ${m} دقيقة` : `${m} دقيقة`;
});

// ── Pre-save: حساب رقم الجلسة تلقائياً ──────────────────────
rehabSessionSchema.pre('save', async function (next) {
  if (!this.session_number && this.beneficiary_id && this.program_id) {
    const count = await this.constructor.countDocuments({
      beneficiary_id: this.beneficiary_id,
      program_id: this.program_id,
    });
    this.session_number = count + 1;
  }
  // حساب مدة الجلسة الفعلية إذا توفر وقت البداية والنهاية
  if (this.start_time && this.end_time && !this.actual_duration_minutes) {
    const [sh, sm] = this.start_time.split(':').map(Number);
    const [eh, em] = this.end_time.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (mins > 0) this.actual_duration_minutes = mins;
  }
  next();
});

const RehabSession =
  mongoose.models.RehabSession || mongoose.model('RehabSession', rehabSessionSchema);

// ══════════════════════════════════════════════════════════════
// 3. الجلسات الجماعية (group_sessions)
// ══════════════════════════════════════════════════════════════
const groupSessionSchema = new mongoose.Schema(
  {
    program_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabProgram',
      required: true,
      index: true,
    },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    specialist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    session_date: { type: Date, required: true, index: true },
    start_time: { type: String },
    end_time: { type: String },

    topic_ar: { type: String, trim: true },
    topic_en: { type: String, trim: true },
    description: { type: String, trim: true },
    objectives: { type: String, trim: true },

    // المشاركون: [beneficiary_id, ...]
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' }],
    max_participants: { type: Number, default: 8 },
    actual_participants_count: { type: Number, default: 0 },

    // الحضور: { beneficiary_id: 'present'|'absent' }
    attendance: { type: Map, of: String },

    activities_performed: { type: String, trim: true },
    materials_used: [{ type: String }],
    observations: { type: String, trim: true },
    outcomes: { type: String, trim: true },

    attachments: [
      {
        path: String,
        name: String,
        size: Number,
        mime_type: String,
      },
    ],

    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'rehab_group_sessions',
  }
);

groupSessionSchema.index({ program_id: 1, session_date: -1 });

const GroupSession =
  mongoose.models.RehabGroupSession || mongoose.model('RehabGroupSession', groupSessionSchema);

// ══════════════════════════════════════════════════════════════
// 4. الإحالات بين البرامج (program_referrals)
// ══════════════════════════════════════════════════════════════
const referralSchema = new mongoose.Schema(
  {
    beneficiary_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    from_program_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabProgram' },
    to_program_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabProgram',
      required: true,
    },
    referred_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    reason: { type: String, required: [true, 'سبب الإحالة مطلوب'], trim: true },
    clinical_justification: { type: String, trim: true },

    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },

    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewed_at: { type: Date },
    review_notes: { type: String, trim: true },
    rejection_reason: { type: String, trim: true },

    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'rehab_program_referrals',
  }
);

referralSchema.index({ beneficiary_id: 1, status: 1 });

const ProgramReferral =
  mongoose.models.ProgramReferral || mongoose.model('ProgramReferral', referralSchema);

module.exports = {
  RehabSession,
  SessionGoalProgress,
  GroupSession,
  ProgramReferral,
};
