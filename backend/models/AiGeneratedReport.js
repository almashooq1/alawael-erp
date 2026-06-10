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

// ── W1043: unified-core producer — AI-generated report sent ─────────
// When an AiGeneratedReport reaches status 'sent', publish a domain event so the
// cross-module subscriber records a communication milestone on the beneficiary's
// longitudinal CareTimeline. Non-callback hook style (W483-safe).
aiGeneratedReportSchema.pre('save', function () {
  this.$__aiReportSentNow = this.status === 'sent' && (this.isNew || this.isModified('status'));
});

aiGeneratedReportSchema.post('save', function emitAiReportSent(doc) {
  if (!doc || !doc.$__aiReportSentNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    Promise.resolve(
      integrationBus.publish('ai-report', 'ai_report.sent', {
        reportId: String(doc._id),
        beneficiaryId: doc.beneficiary_id ? String(doc.beneficiary_id) : null,
        ...(doc.branch_id ? { branchId: String(doc.branch_id) } : {}),
        reportType: doc.report_type || null,
        sentVia: doc.sent_via || null,
        sentAt: doc.sent_at || doc.updated_at || new Date(),
      })
    ).catch(() => {});
  } catch (_e) {
    /* bus optional — never block persistence */
  }
});

module.exports =
  mongoose.models.AiGeneratedReport || mongoose.model('AiGeneratedReport', aiGeneratedReportSchema);
