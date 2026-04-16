'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const assessmentToolSchema = new Schema(
  {
    tool_id: {
      type: String,
      unique: true,
      default: () => `TOOL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    name_ar: { type: String, required: true },
    name_en: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'cognitive', // معرفي
        'behavioral', // سلوكي
        'motor', // حركي
        'sensory', // حسي
        'communication', // تواصلي
        'social', // اجتماعي
        'adaptive', // تكيفي
        'academic', // أكاديمي
        'vocational', // مهني
        'developmental', // نمائي
      ],
      required: true,
    },
    target_disabilities: [
      {
        type: String,
        enum: [
          'physical',
          'visual',
          'hearing',
          'intellectual',
          'autism',
          'learning',
          'multiple',
          'speech',
          'behavioral',
          'developmental',
        ],
      },
    ],
    age_range: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 99 },
    },
    administration_time: { type: Number }, // بالدقائق
    materials_needed: [String],
    scoring_method: {
      type: String,
      enum: [
        'standardized',
        'criterion_referenced',
        'norm_referenced',
        'curriculum_based',
        'observational',
      ],
    },
    standardization_info: {
      standardized: { type: Boolean, default: false },
      population: String,
      sample_size: Number,
      reliability: Number,
      validity: Number,
    },
    domains: [
      {
        domain_name_ar: String,
        domain_name_en: String,
        subdomains: [String],
        max_score: Number,
        weight: { type: Number, default: 1 },
      },
    ],
    interpretation_guide: [
      {
        score_range: { min: Number, max: Number },
        interpretation_ar: String,
        interpretation_en: String,
        recommendation: String,
      },
    ],
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const AssessmentTool =
  mongoose.models.AssessmentTool || mongoose.model('AssessmentTool', assessmentToolSchema);

module.exports = AssessmentTool;
