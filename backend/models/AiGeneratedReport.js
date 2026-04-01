/**
 * AiGeneratedReport Model — نموذج التقارير المولّدة بالذكاء الاصطناعي
 * Prompt 20: AI & Predictive Analytics Module
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiGeneratedReportSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    report_type: {
      type: String,
      enum: ['monthly_parent', 'quarterly_parent', 'regulatory', 'progress_summary', 'discharge'],
      required: true,
    },
    language: {
      type: String,
      enum: ['ar', 'en', 'both'],
      default: 'ar',
    },
    period_type: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'custom'],
      required: true,
    },
    period_start: {
      type: Date,
      required: true,
    },
    period_end: {
      type: Date,
      required: true,
    },
    content_ar: {
      type: String,
      default: null,
    },
    content_en: {
      type: String,
      default: null,
    },
    sections: {
      type: Schema.Types.Mixed,
      default: null,
    },
    charts_data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    pdf_path: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'generated', 'reviewed', 'approved', 'sent'],
      default: 'draft',
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approved_at: {
      type: Date,
      default: null,
    },
    sent_at: {
      type: Date,
      default: null,
    },
    sent_via: {
      type: String,
      enum: ['email', 'sms', 'app', 'whatsapp', null],
      default: null,
    },
    model_version: {
      type: String,
      default: null,
    },
    generation_metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
aiGeneratedReportSchema.index({ beneficiary_id: 1, report_type: 1 });
aiGeneratedReportSchema.index({ status: 1, report_type: 1 });
aiGeneratedReportSchema.index({ period_start: 1, period_end: 1 });
aiGeneratedReportSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.AiGeneratedReport || mongoose.model('AiGeneratedReport', aiGeneratedReportSchema);
