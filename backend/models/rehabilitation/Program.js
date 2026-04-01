/**
 * Program.js — نموذج البرامج التأهيلية
 * Rehabilitation Programs Model
 *
 * أنواع البرامج:
 *  - pt          : العلاج الطبيعي (Physical Therapy)
 *  - ot          : العلاج الوظيفي (Occupational Therapy)
 *  - speech      : النطق واللغة (Speech & Language Therapy)
 *  - aba         : تحليل السلوك التطبيقي (Applied Behavior Analysis)
 *  - psychology  : التأهيل النفسي
 *  - special_ed  : التربية الخاصة
 *  - vocational  : التأهيل المهني (لا يتجاوز 3 سنوات حسب اللائحة)
 *  - group       : نشاط جماعي
 *  - other       : أخرى
 */

'use strict';

const mongoose = require('mongoose');

const PROGRAM_TYPES = [
  'pt',
  'ot',
  'speech',
  'aba',
  'psychology',
  'special_education',
  'vocational',
  'group_activity',
  'other',
];

const DISABILITY_TYPES = [
  'autism',
  'intellectual_disability',
  'cerebral_palsy',
  'down_syndrome',
  'speech_language',
  'hearing_impairment',
  'visual_impairment',
  'learning_disability',
  'adhd',
  'multiple_disabilities',
  'physical',
  'all',
];

const programSchema = new mongoose.Schema(
  {
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'الفرع مطلوب'],
      index: true,
    },

    // ── الأسماء ──────────────────────────────────────────────
    name_ar: { type: String, required: [true, 'اسم البرنامج بالعربية مطلوب'], trim: true },
    name_en: { type: String, trim: true },

    // ── نوع البرنامج ─────────────────────────────────────────
    program_type: {
      type: String,
      enum: { values: PROGRAM_TYPES, message: 'نوع البرنامج غير صحيح' },
      required: [true, 'نوع البرنامج مطلوب'],
      index: true,
    },

    // ── الوصف والأهداف ───────────────────────────────────────
    description: { type: String },
    objectives: { type: String },

    // ── الفئة المستهدفة ──────────────────────────────────────
    target_disabilities: [
      {
        type: String,
        enum: DISABILITY_TYPES,
      },
    ],
    min_age: { type: Number, min: 0, max: 120 },
    max_age: { type: Number, min: 0, max: 120 },

    // ── إعدادات الجلسات ──────────────────────────────────────
    max_participants: { type: Number, default: 1, min: 1 },
    session_duration_minutes: { type: Number, default: 45, min: 5 },
    sessions_per_week: { type: Number, default: 2, min: 1, max: 7 },
    program_duration_months: { type: Number, min: 1 },

    /** حسب اللائحة الأساسية لبرامج تأهيل المعوقين لا يتجاوز 3 سنوات */
    max_duration_years: { type: Number, default: 3, min: 1, max: 3 },

    // ── الحالة ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'rehab_programs',
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
programSchema.index({ branch_id: 1, program_type: 1, status: 1 });
programSchema.index({ status: 1, is_deleted: 1 });
programSchema.index({ name_ar: 'text', name_en: 'text' });

// ── Virtuals ─────────────────────────────────────────────────────────────────
programSchema.virtual('type_label').get(function () {
  const labels = {
    pt: 'العلاج الطبيعي',
    ot: 'العلاج الوظيفي',
    speech: 'النطق واللغة',
    aba: 'تحليل السلوك التطبيقي',
    psychology: 'التأهيل النفسي',
    special_education: 'التربية الخاصة',
    vocational: 'التأهيل المهني',
    group_activity: 'النشاط الجماعي',
    other: 'أخرى',
  };
  return labels[this.program_type] || this.program_type;
});

// ── Pre-save ──────────────────────────────────────────────────────────────────
programSchema.pre('save', function (next) {
  // تأكد من أن مدة البرامج المهنية لا تتجاوز 3 سنوات
  if (this.program_type === 'vocational') {
    this.max_duration_years = 3;
  }
  next();
});

// ── Statics ───────────────────────────────────────────────────────────────────
programSchema.statics.PROGRAM_TYPES = PROGRAM_TYPES;
programSchema.statics.DISABILITY_TYPES = DISABILITY_TYPES;

const Program = mongoose.models.RehabProgram || mongoose.model('RehabProgram', programSchema);
module.exports = Program;
