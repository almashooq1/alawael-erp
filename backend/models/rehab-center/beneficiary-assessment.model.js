'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const beneficiaryAssessmentSchema = new Schema(
  {
    assessment_id: {
      type: String,
      unique: true,
      default: () => `ASSESS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات التقييم
    assessment_type: {
      type: String,
      enum: ['initial', 'periodic', 'progress', 'discharge', 're_evaluation', 'follow_up'],
      required: true,
    },
    assessment_date: { type: Date, default: Date.now },

    // أداة التقييم المستخدمة
    assessment_tool: {
      tool_id: { type: Schema.Types.ObjectId, ref: 'AssessmentTool' },
      tool_name: String,
      version: String,
    },

    // الفريق المقيّم
    assessment_team: [
      {
        evaluator_id: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: String,
        specialization: String,
      },
    ],

    // نتائج التقييم حسب المجالات
    domain_scores: [
      {
        domain_name: String,
        subdomain: String,
        raw_score: Number,
        standard_score: Number,
        percentile: Number,
        age_equivalent: String,
        grade_equivalent: String,
        interpretation: String,
        observations: String,
      },
    ],

    // النتائج الإجمالية
    overall_results: {
      total_raw_score: Number,
      total_standard_score: Number,
      overall_percentile: Number,
      functional_level: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'profound', 'within_normal_limits', 'borderline'],
      },
      summary_ar: String,
      summary_en: String,
    },

    // نقاط القوة
    strengths: [
      {
        area: String,
        description: String,
        evidence: String,
      },
    ],

    // نقاط الاحتياج
    needs: [
      {
        area: String,
        description: String,
        priority: { type: String, enum: ['high', 'medium', 'low'] },
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
      },
    ],

    // التوصيات
    recommendations: [
      {
        category: String,
        recommendation_text: String,
        responsible_party: String,
        timeframe: String,
        priority: { type: String, enum: ['high', 'medium', 'low'] },
      },
    ],

    // الأهداف المقترحة
    suggested_goals: [
      {
        goal_area: String,
        goal_description: String,
        measurable_criteria: String,
        suggested_timeline: String,
      },
    ],

    // التشخيص
    diagnosis: {
      primary_diagnosis: {
        code: String, // ICD-10 or DSM-5 code
        name_ar: String,
        name_en: String,
        description: String,
      },
      secondary_diagnoses: [
        {
          code: String,
          name_ar: String,
          name_en: String,
          description: String,
        },
      ],
      differential_diagnosis: [String],
      diagnostic_confidence: { type: String, enum: ['confirmed', 'probable', 'suspected'] },
    },

    // محاضر الاجتماع
    meeting_minutes: {
      meeting_date: Date,
      attendees: [String],
      discussion_summary: String,
      decisions_made: [String],
      action_items: [
        {
          action: String,
          responsible: String,
          deadline: Date,
        },
      ],
    },

    // المرفقات
    attachments: [
      {
        file_name: String,
        file_url: String,
        file_type: String,
        upload_date: { type: Date, default: Date.now },
        uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // الموافقات
    approvals: {
      guardian_approval: {
        approved: { type: Boolean, default: false },
        approval_date: Date,
        guardian_name: String,
        signature_url: String,
      },
      supervisor_approval: {
        approved: { type: Boolean, default: false },
        approval_date: Date,
        supervisor_id: { type: Schema.Types.ObjectId, ref: 'User' },
        comments: String,
      },
    },

    // حالة التقييم
    status: {
      type: String,
      enum: ['draft', 'in_review', 'approved', 'finalized', 'archived'],
      default: 'draft',
    },

    notes: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

beneficiaryAssessmentSchema.index({ beneficiary_id: 1, assessment_date: -1 });
beneficiaryAssessmentSchema.index({ assessment_type: 1, status: 1 });

const BeneficiaryAssessment =
  mongoose.models.BeneficiaryAssessment ||
  mongoose.model('BeneficiaryAssessment', beneficiaryAssessmentSchema);

module.exports = BeneficiaryAssessment;
