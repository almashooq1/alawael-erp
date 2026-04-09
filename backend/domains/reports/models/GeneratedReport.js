/**
 * GeneratedReport — نموذج التقارير المُنشأة
 *
 * يسجّل كل تقرير تم توليده مع بياناته المُجمّعة
 * والملخص السردي ومعلومات التصدير
 *
 * @module domains/reports/models/GeneratedReport
 */

const mongoose = require('mongoose');

// ─── Section Result Sub-Schema ──────────────────────────────────────────────
const sectionResultSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: String,
    type: String, // summary, table, chart, kpi, narrative, etc.
    data: mongoose.Schema.Types.Mixed, // aggregated results
    chartData: mongoose.Schema.Types.Mixed, // formatted for frontend charts
    narrative: String, // auto-generated textual summary for this section
    rowCount: Number,
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const generatedReportSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: true,
      index: true,
    },
    templateCode: { type: String, required: true, index: true },

    // ── Scope Parameters ────────────────────────────────────────────────────
    scope: {
      type: String,
      enum: ['beneficiary', 'therapist', 'team', 'program', 'branch', 'organization', 'system'],
      required: true,
    },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    // ── Period ──────────────────────────────────────────────────────────────
    period: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
      label: String, // e.g. "يناير 2025", "الربع الأول 2025"
    },

    // ── Content ─────────────────────────────────────────────────────────────
    title: { type: String, required: true },
    sections: [sectionResultSchema],
    executiveSummary: String, // ملخص تنفيذي
    narrativeSummary: String, // ملخص سردي ذكي
    keyFindings: [
      {
        type: { type: String, enum: ['positive', 'negative', 'neutral', 'alert'] },
        text: String,
        metric: String,
        value: mongoose.Schema.Types.Mixed,
      },
    ],

    // ── Aggregated KPIs ─────────────────────────────────────────────────────
    kpis: [
      {
        code: String,
        name: String,
        value: Number,
        previousValue: Number,
        target: Number,
        trend: { type: String, enum: ['up', 'down', 'stable'] },
        unit: { type: String, default: '%' },
      },
    ],

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed', 'expired'],
      default: 'generating',
      index: true,
    },
    errorMessage: String,

    // ── Files ───────────────────────────────────────────────────────────────
    exports: [
      {
        format: { type: String, enum: ['json', 'pdf', 'excel', 'csv', 'html'] },
        fileUrl: String,
        fileName: String,
        fileSize: Number,
        generatedAt: Date,
      },
    ],

    // ── Generation Metadata ─────────────────────────────────────────────────
    generatedBy: { type: mongoose.Schema.Types.ObjectId },
    generationMethod: {
      type: String,
      enum: ['on_demand', 'scheduled', 'event_triggered'],
      default: 'on_demand',
    },
    generationDuration: Number, // ms
    dataPointsCount: Number,

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'generated_reports',
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
generatedReportSchema.index({ templateCode: 1, 'period.from': -1 });
generatedReportSchema.index({ beneficiaryId: 1, templateCode: 1, createdAt: -1 });
generatedReportSchema.index({ branchId: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.GeneratedReport || mongoose.model('GeneratedReport', generatedReportSchema);
