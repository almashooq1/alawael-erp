/**
 * ActivityLibrary.js
 * مكتبة الأنشطة التأهيلية — Phase 27.
 *
 * Catalogue of pre-built therapy activities (speech, OT, PT, behavior,
 * special-ed, psychology) that therapists can assign to clinical sessions
 * or attach to IEP goals. Each activity is tagged with target domains,
 * difficulty, age range, materials, and step-by-step Arabic instructions.
 */

'use strict';

const mongoose = require('mongoose');

const DISCIPLINES = [
  'speech',
  'ot',
  'pt',
  'behavior',
  'special_ed',
  'psychology',
  'aac',
  'feeding',
  'play',
  'social_skills',
];

// Mirrors the IEP goal domains so therapists can pick activities aligned to a
// SmartIEP goal without translation.
const DOMAINS = [
  'communication',
  'daily_living',
  'socialization',
  'motor_gross',
  'motor_fine',
  'cognitive',
  'behavioral',
  'self_care',
  'vocational',
  'academic',
  'sensory',
  'play',
  'emotional',
];

const DIFFICULTY = ['beginner', 'intermediate', 'advanced'];

const activitySchema = new mongoose.Schema(
  {
    activity_code: { type: String, unique: true, required: true }, // e.g. "SPEECH-ART-001"
    name_ar: { type: String, required: true },
    name_en: { type: String },
    description_ar: { type: String },

    discipline: { type: String, enum: DISCIPLINES, required: true },
    target_domains: [{ type: String, enum: DOMAINS }],
    difficulty: { type: String, enum: DIFFICULTY, default: 'beginner' },

    age_range: {
      min_months: { type: Number, default: 12 },
      max_months: { type: Number, default: 216 }, // 18y
    },

    duration_minutes: { type: Number, default: 15 },

    materials: [{ type: String }], // الأدوات/المواد المطلوبة
    instructions_steps: [{ type: String }], // خطوات التنفيذ
    mastery_indicators: [{ type: String }], // معايير الإتقان
    family_carryover_ar: { type: String }, // كيف تستكمل الأسرة في المنزل

    // Adaptations per disability profile (free-form Arabic notes per type).
    adaptations: [
      {
        disability_type: { type: String },
        adaptation_ar: { type: String },
      },
    ],

    media: {
      image_url: { type: String },
      video_url: { type: String },
      pdf_url: { type: String },
    },

    // Progression — codes of next-level activities.
    progression_to: [{ type: String }],

    evidence_reference: { type: String },
    tags: [{ type: String }],

    is_built_in: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },

    usage_count: { type: Number, default: 0 },
    avg_session_rating: { type: Number, default: 0, min: 0, max: 5 },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'activity_library',
  }
);

activitySchema.index({ discipline: 1, target_domains: 1, difficulty: 1 });
activitySchema.index({ tags: 1 });
activitySchema.index({ name_ar: 'text', description_ar: 'text' });

const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

module.exports = { Activity, DISCIPLINES, DOMAINS, DIFFICULTY };
