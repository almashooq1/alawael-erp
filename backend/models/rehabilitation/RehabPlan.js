/**
 * RehabPlan.js — الخطة التأهيلية الفردية (IRP) وأهدافها
 * Individual Rehabilitation Plan + Goals
 */

'use strict';

const mongoose = require('mongoose');

// ══════════════════════════════════════════════════════════════
// 1. نموذج أهداف الخطة (rehab_plan_goals)
// ══════════════════════════════════════════════════════════════
const goalSchema = new mongoose.Schema(
  {
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabPlan',
      required: true,
      index: true,
    },
    parent_goal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabPlanGoal' },

    // ── نوع الهدف ────────────────────────────────────────────
    goal_type: {
      type: String,
      enum: ['short_term', 'long_term'],
      required: [true, 'نوع الهدف مطلوب'],
    },

    // ── المجال ───────────────────────────────────────────────
    domain: {
      type: String,
      required: [true, 'مجال الهدف مطلوب'],
      // communication, motor, cognitive, social, self_care, behavioral, academic, vocational, sensory, play
    },

    // ── الوصف ────────────────────────────────────────────────
    description_ar: { type: String, required: [true, 'وصف الهدف بالعربية مطلوب'], trim: true },
    description_en: { type: String, trim: true },

    // ── معايير القياس ────────────────────────────────────────
    measurement_criteria: { type: String, required: [true, 'معايير القياس مطلوبة'], trim: true },
    measurement_method: { type: String, trim: true },

    // ── المستويات ────────────────────────────────────────────
    baseline_level: { type: String, required: [true, 'المستوى الأساسي مطلوب'], trim: true },
    baseline_date: { type: Date, default: Date.now },
    baseline_notes: { type: String, trim: true },
    target_level: { type: String, required: [true, 'المستوى المستهدف مطلوب'], trim: true },
    current_level: { type: String, trim: true },
    target_date: { type: Date },

    // ── الإتقان ───────────────────────────────────────────────
    mastery_criteria: { type: String, trim: true },
    mastery_percentage: { type: Number, default: 0, min: 0, max: 100 },

    // ── الحالة ───────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'not_started',
        'in_progress',
        'mastered',
        'maintained',
        'modified',
        'discontinued',
        'on_hold',
      ],
      default: 'not_started',
      index: true,
    },
    status_changed_at: { type: Date },
    status_changed_reason: { type: String, trim: true },

    // ── الأولوية والترتيب ────────────────────────────────────
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    sort_order: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'rehab_plan_goals',
  }
);

goalSchema.index({ plan_id: 1, status: 1 });
goalSchema.index({ domain: 1 });

goalSchema.virtual('is_behind_schedule').get(function () {
  if (!this.target_date || this.status === 'mastered') return false;
  if (!this.baseline_date) return false;
  const totalDays =
    (new Date(this.target_date) - new Date(this.baseline_date)) / (1000 * 60 * 60 * 24);
  const elapsedDays = (Date.now() - new Date(this.baseline_date)) / (1000 * 60 * 60 * 24);
  const expectedProgress = Math.min(100, (elapsedDays / Math.max(totalDays, 1)) * 100);
  return this.mastery_percentage < expectedProgress * 0.7;
});

const RehabPlanGoal = mongoose.models.RehabPlanGoal || mongoose.model('RehabPlanGoal', goalSchema);

// ══════════════════════════════════════════════════════════════
// 2. نموذج الخطة التأهيلية الفردية (rehab_plans)
// ══════════════════════════════════════════════════════════════
const planSchema = new mongoose.Schema(
  {
    // ── الروابط الأساسية ─────────────────────────────────────
    beneficiary_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    program_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabProgram',
      required: [true, 'البرنامج مطلوب'],
    },
    enrollment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProgramEnrollment',
    },
    specialist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الأخصائي مطلوب'],
    },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    // ── رقم الخطة ────────────────────────────────────────────
    plan_number: { type: String, unique: true, sparse: true },

    // ── نوع الخطة ────────────────────────────────────────────
    plan_type: {
      type: String,
      enum: [
        'initial',
        'updated',
        'quarterly_review',
        'annual_review',
        'discharge',
        'review',
        'transition',
      ],
      required: [true, 'نوع الخطة مطلوب'],
    },

    // ── التواريخ ─────────────────────────────────────────────
    start_date: { type: Date, required: [true, 'تاريخ البداية مطلوب'] },
    end_date: { type: Date },
    review_date: { type: Date },
    next_review_date: { type: Date },

    // ── محتوى الخطة ─────────────────────────────────────────
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    current_level_summary: { type: String, trim: true },
    baseline_summary: { type: String, trim: true },
    objectives_summary: { type: String, trim: true },
    family_goals: { type: String, trim: true },
    parent_involvement_notes: { type: String, trim: true },
    home_program_instructions: { type: String, trim: true },
    specialist_notes: { type: String, trim: true },

    // ── الحالة ───────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'draft',
        'active',
        'under_review',
        'approved',
        'completed',
        'archived',
        'reviewed',
        'closed',
      ],
      default: 'draft',
      index: true,
    },

    // ── الاعتماد ─────────────────────────────────────────────
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },

    // ── الخطة السابقة (للمراجعات) ────────────────────────────
    previous_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabPlan' },

    // ── الإنشاء والتحديث ─────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── الحذف الناعم ─────────────────────────────────────────
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'rehab_plans',
  }
);

planSchema.index({ beneficiary_id: 1, program_id: 1, status: 1 });
planSchema.index({ specialist_id: 1, status: 1 });
planSchema.index({ next_review_date: 1, status: 1 });

// ── Pre-save: توليد رقم الخطة ────────────────────────────────
planSchema.pre('save', async function (next) {
  if (!this.plan_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      beneficiary_id: this.beneficiary_id,
      program_id: this.program_id,
    });
    const benefRef = this.beneficiary_id?.toString().slice(-4) || '0000';
    const progRef = this.program_id?.toString().slice(-4) || '0000';
    this.plan_number = `IRP-${benefRef}-${progRef}-${year}-${String(count + 1).padStart(2, '0')}`;
  }
  // تعيين تاريخ المراجعة التالي تلقائياً (كل 3 أشهر إذا لم يُحدد)
  if (!this.next_review_date && this.start_date) {
    const d = new Date(this.start_date);
    d.setMonth(d.getMonth() + 3);
    this.next_review_date = d;
  }
  next();
});

const RehabPlan = mongoose.models.RehabPlan || mongoose.model('RehabPlan', planSchema);

module.exports = { RehabPlan, RehabPlanGoal };
