/**
 * ReportTemplate — نموذج قوالب التقارير
 *
 * يُعرّف قالب تقرير قابل لإعادة الاستخدام مع مصادر البيانات
 * ومنطق التجميع والجدولة والصلاحيات
 *
 * @module domains/reports/models/ReportTemplate
 */

const mongoose = require('mongoose');

// ─── Data Source Sub-Schema ─────────────────────────────────────────────────
const dataSourceSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      required: true,
      enum: [
        'Beneficiary',
        'EpisodeOfCare',
        'ClinicalSession',
        'ClinicalAssessment',
        'TherapeuticGoal',
        'UnifiedCarePlan',
        'CareTimeline',
        'Measure',
        'MeasureApplication',
        'Program',
        'ProgramEnrollment',
        'ClinicalRiskScore',
        'Recommendation',
        'QualityAudit',
        'CorrectiveAction',
        'FamilyMember',
        'FamilyCommunication',
        'WorkflowTask',
        'WorkflowTransitionLog',
      ],
    },
    fields: [String],
    filters: mongoose.Schema.Types.Mixed,
    aggregation: {
      type: String,
      enum: ['count', 'sum', 'avg', 'min', 'max', 'group', 'pipeline', 'none'],
      default: 'none',
    },
    groupBy: String,
    sortBy: String,
    limit: Number,
  },
  { _id: false }
);

// ─── Section Sub-Schema ─────────────────────────────────────────────────────
const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['summary', 'table', 'chart', 'kpi', 'narrative', 'timeline', 'comparison', 'list'],
      default: 'table',
    },
    dataSource: dataSourceSchema,
    chartConfig: {
      chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'donut', 'radar', 'heatmap', 'progress'],
      },
      xAxis: String,
      yAxis: String,
      colors: [String],
    },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const reportTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: String,

    // ── Classification ──────────────────────────────────────────────────────
    category: {
      type: String,
      required: true,
      enum: [
        'clinical', // تقرير سريري
        'operational', // تقرير تشغيلي
        'quality', // تقرير جودة
        'outcomes', // تقرير نتائج
        'financial', // تقرير مالي
        'executive', // تقرير تنفيذي
        'beneficiary', // تقرير مستفيد
        'therapist', // تقرير أخصائي
        'program', // تقرير برنامج
        'family', // تقرير أسري
        'compliance', // تقرير امتثال
      ],
      index: true,
    },

    scope: {
      type: String,
      enum: ['beneficiary', 'therapist', 'team', 'program', 'branch', 'organization', 'system'],
      required: true,
    },

    frequency: {
      type: String,
      enum: ['on_demand', 'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'],
      default: 'on_demand',
    },

    // ── Content ─────────────────────────────────────────────────────────────
    sections: [sectionSchema],

    // ── Scheduling ──────────────────────────────────────────────────────────
    schedule: {
      enabled: { type: Boolean, default: false },
      cronExpression: String,
      dayOfWeek: Number,
      dayOfMonth: Number,
      time: String, // HH:mm
      timezone: { type: String, default: 'Asia/Riyadh' },
      recipients: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId },
          email: String,
          role: String,
        },
      ],
    },

    // ── Access Control ──────────────────────────────────────────────────────
    accessControl: {
      roles: [String],
      minAccessLevel: {
        type: String,
        enum: ['therapist', 'supervisor', 'manager', 'director', 'admin'],
        default: 'supervisor',
      },
    },

    // ── Output ──────────────────────────────────────────────────────────────
    outputFormats: [
      {
        type: String,
        enum: ['json', 'pdf', 'excel', 'csv', 'html'],
      },
    ],

    // ── Metadata ────────────────────────────────────────────────────────────
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'report_templates',
  }
);

module.exports =
  mongoose.models.ReportTemplate || mongoose.model('ReportTemplate', reportTemplateSchema);
