'use strict';
/**
 * DddReportBuilder Model
 * Auto-extracted from services/dddReportBuilder.js
 */
const mongoose = require('mongoose');

const reportDefSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    description: { type: String, maxlength: 1000 },
    category: {
      type: String,
      enum: ['clinical', 'operational', 'financial', 'quality', 'research', 'custom'],
      default: 'custom',
    },
    isBuiltin: { type: Boolean, default: false },

    // Data source
    primaryModel: { type: String, required: true },
    domain: { type: String, required: true },

    // Field definitions
    fields: [
      {
        key: String,
        label: String,
        labelAr: String,
        type: { type: String, enum: ['string', 'number', 'date', 'boolean', 'objectId'] },
        aggregate: {
          type: String,
          enum: ['none', 'count', 'sum', 'avg', 'min', 'max'],
          default: 'none',
        },
      },
    ],

    // Default filters
    defaultFilters: mongoose.Schema.Types.Mixed,
    defaultSort: { type: String, default: '-createdAt' },
    defaultLimit: { type: Number, default: 1000 },

    // Grouping
    groupBy: [String],

    // Access control
    roles: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'ddd_report_definitions' }
);

const DDDReportDefinition =
  mongoose.models.DDDReportDefinition || mongoose.model('DDDReportDefinition', reportDefSchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  Report Execution History
// ═══════════════════════════════════════════════════════════════════════════════

const reportHistorySchema = new mongoose.Schema(
  {
    reportDefinition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDReportDefinition',
      index: true,
    },
    reportName: String,
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filters: mongoose.Schema.Types.Mixed,
    format: { type: String, enum: ['json', 'csv', 'pdf'], default: 'json' },
    rowCount: Number,
    executionTimeMs: Number,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    error: String,
    outputPath: String,
  },
  { timestamps: true, collection: 'ddd_report_history' }
);

reportHistorySchema.index({ createdAt: -1 });

const DDDReportHistory =
  mongoose.models.DDDReportHistory || mongoose.model('DDDReportHistory', reportHistorySchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  Built-in Report Definitions
// ═══════════════════════════════════════════════════════════════════════════════

const BUILTIN_REPORTS = [
  {
    name: 'Active Beneficiary Registry',
    nameAr: 'سجل المستفيدين النشطين',
    category: 'clinical',
    domain: 'core',
    primaryModel: 'Beneficiary',
    fields: [
      { key: 'mrn', label: 'MRN', labelAr: 'رقم الملف', type: 'string' },
      { key: 'firstName', label: 'First Name', labelAr: 'الاسم الأول', type: 'string' },
      { key: 'lastName', label: 'Last Name', labelAr: 'اسم العائلة', type: 'string' },
      { key: 'disabilityType', label: 'Disability', labelAr: 'نوع الإعاقة', type: 'string' },
      { key: 'disabilityLevel', label: 'Level', labelAr: 'المستوى', type: 'string' },
      { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'string' },
      { key: 'createdAt', label: 'Registered', labelAr: 'تاريخ التسجيل', type: 'date' },
    ],
    defaultFilters: { status: 'active' },
    defaultSort: 'lastName',
  },
  {
    name: 'Session Attendance Report',
    nameAr: 'تقرير حضور الجلسات',
    category: 'clinical',
    domain: 'sessions',
    primaryModel: 'ClinicalSession',
    fields: [
      { key: 'beneficiary', label: 'Beneficiary', labelAr: 'المستفيد', type: 'objectId' },
      { key: 'therapist', label: 'Therapist', labelAr: 'الأخصائي', type: 'objectId' },
      { key: 'sessionType', label: 'Type', labelAr: 'النوع', type: 'string' },
      { key: 'scheduledDate', label: 'Date', labelAr: 'التاريخ', type: 'date' },
      { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'string' },
      { key: 'attendance', label: 'Attendance', labelAr: 'الحضور', type: 'string' },
      { key: 'duration', label: 'Duration', labelAr: 'المدة', type: 'number' },
    ],
    defaultSort: '-scheduledDate',
  },
  {
    name: 'Episode Phase Summary',
    nameAr: 'ملخص مراحل الحلقات العلاجية',
    category: 'clinical',
    domain: 'episodes',
    primaryModel: 'EpisodeOfCare',
    fields: [
      { key: 'beneficiary', label: 'Beneficiary', labelAr: 'المستفيد', type: 'objectId' },
      { key: 'phase', label: 'Phase', labelAr: 'المرحلة', type: 'string' },
      { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'string' },
      { key: 'referralDate', label: 'Referral Date', labelAr: 'تاريخ الإحالة', type: 'date' },
      { key: 'primaryDiagnosis', label: 'Diagnosis', labelAr: 'التشخيص', type: 'string' },
    ],
    defaultSort: '-referralDate',
  },
  {
    name: 'Goal Achievement Report',
    nameAr: 'تقرير تحقيق الأهداف',
    category: 'clinical',
    domain: 'goals',
    primaryModel: 'TherapeuticGoal',
    fields: [
      { key: 'beneficiary', label: 'Beneficiary', labelAr: 'المستفيد', type: 'objectId' },
      { key: 'title', label: 'Goal', labelAr: 'الهدف', type: 'string' },
      { key: 'priority', label: 'Priority', labelAr: 'الأولوية', type: 'string' },
      { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'string' },
      { key: 'targetDate', label: 'Target Date', labelAr: 'التاريخ المستهدف', type: 'date' },
      { key: 'baseline', label: 'Baseline', labelAr: 'خط الأساس', type: 'number' },
      { key: 'target', label: 'Target', labelAr: 'المستهدف', type: 'number' },
    ],
    groupBy: ['priority'],
    defaultSort: '-targetDate',
  },
  {
    name: 'Quality Compliance Report',
    nameAr: 'تقرير الالتزام بالجودة',
    category: 'quality',
    domain: 'quality',
    primaryModel: 'QualityAudit',
    fields: [
      { key: 'auditType', label: 'Audit Type', labelAr: 'نوع المراجعة', type: 'string' },
      { key: 'auditor', label: 'Auditor', labelAr: 'المراجع', type: 'objectId' },
      { key: 'status', label: 'Result', labelAr: 'النتيجة', type: 'string' },
      { key: 'scheduledDate', label: 'Date', labelAr: 'التاريخ', type: 'date' },
    ],
    defaultSort: '-scheduledDate',
  },
  {
    name: 'Overdue Tasks Report',
    nameAr: 'تقرير المهام المتأخرة',
    category: 'operational',
    domain: 'workflow',
    primaryModel: 'WorkflowTask',
    fields: [
      { key: 'title', label: 'Task', labelAr: 'المهمة', type: 'string' },
      { key: 'taskType', label: 'Type', labelAr: 'النوع', type: 'string' },
      { key: 'priority', label: 'Priority', labelAr: 'الأولوية', type: 'string' },
      { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'string' },
      { key: 'assignee', label: 'Assignee', labelAr: 'المسؤول', type: 'objectId' },
      { key: 'dueDate', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date' },
    ],
    defaultFilters: { status: { $in: ['pending', 'in-progress'] }, dueDate: { $lt: '{{now}}' } },
    defaultSort: 'dueDate',
  },
  {
    name: 'Behavior Incidents Summary',
    nameAr: 'ملخص الحوادث السلوكية',
    category: 'clinical',
    domain: 'behavior',
    primaryModel: 'BehaviorRecord',
    fields: [
      { key: 'beneficiary', label: 'Beneficiary', labelAr: 'المستفيد', type: 'objectId' },
      { key: 'behaviorType', label: 'Type', labelAr: 'النوع', type: 'string' },
      { key: 'severity', label: 'Severity', labelAr: 'الشدة', type: 'string' },
      { key: 'description', label: 'Description', labelAr: 'الوصف', type: 'string' },
      { key: 'createdAt', label: 'Date', labelAr: 'التاريخ', type: 'date' },
    ],
    groupBy: ['severity'],
    defaultSort: '-createdAt',
  },
  {
    name: 'Family Engagement Report',
    nameAr: 'تقرير مشاركة الأسرة',
    category: 'clinical',
    domain: 'family',
    primaryModel: 'FamilyCommunication',
    fields: [
      { key: 'beneficiary', label: 'Beneficiary', labelAr: 'المستفيد', type: 'objectId' },
      { key: 'familyMember', label: 'Family Member', labelAr: 'فرد الأسرة', type: 'objectId' },
      { key: 'type', label: 'Type', labelAr: 'النوع', type: 'string' },
      { key: 'direction', label: 'Direction', labelAr: 'الاتجاه', type: 'string' },
      { key: 'subject', label: 'Subject', labelAr: 'الموضوع', type: 'string' },
      { key: 'createdAt', label: 'Date', labelAr: 'التاريخ', type: 'date' },
    ],
    defaultSort: '-createdAt',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  Report Execution Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a report definition and return results.
 *
 * @param {object} reportDef  - Report definition document
 * @param {object} options
 * @param {object}  [options.filters]   - Override / merge filters
 * @param {string}  [options.sort]
 * @param {number}  [options.limit]
 * @param {number}  [options.page]
 * @param {string}  [options.startDate]
 * @param {string}  [options.endDate]
 * @param {string}  [options.executedBy]
 * @returns {Promise<object>}
 */
async function executeReport(reportDef, options = {}) {
  const start = Date.now();
  const Model = mongoose.models[reportDef.primaryModel];
  if (!Model) throw new Error(`Model not found: ${reportDef.primaryModel}`);

  const { filters = {}, sort, limit, page = 1, startDate, endDate, executedBy } = options;

  // Build query filter
  const query = { ...reportDef.defaultFilters, ...filters };

  // Soft-delete aware
  if (Model.schema.paths.isDeleted) {
    query.isDeleted = { $ne: true };
  }

  // Date range
  if (startDate || endDate) {
    query.createdAt = query.createdAt || {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Resolve dynamic filter values like {{now}}
  resolveFilterPlaceholders(query);

  const effectiveLimit = Math.min(limit || reportDef.defaultLimit || 1000, 10000);
  const effectiveSort = sort || reportDef.defaultSort || '-createdAt';

  // Select only defined fields
  const selectFields = reportDef.fields ? reportDef.fields.map(f => f.key).join(' ') : '';

  const [data, total] = await Promise.all([
    Model.find(query)
      .select(selectFields || undefined)
      .sort(effectiveSort)
      .skip((page - 1) * effectiveLimit)
      .limit(effectiveLimit)
      .lean(),
    Model.countDocuments(query),
  ]);

  const executionTimeMs = Date.now() - start;

  // Log execution
  try {
    await DDDReportHistory.create({
      reportDefinition: reportDef._id,
      reportName: reportDef.name,
      executedBy,
      filters: query,
      format: 'json',
      rowCount: data.length,
      executionTimeMs,
      status: 'completed',
    });
  } catch (logErr) {
    logger.warn(`[DDD-ReportBuilder] History log error: ${logErr.message}`);
  }

  return {
    reportName: reportDef.name,
    reportNameAr: reportDef.nameAr,
    domain: reportDef.domain,
    model: reportDef.primaryModel,
    fields: reportDef.fields,
    data,
    total,
    page,
    limit: effectiveLimit,
    pages: Math.ceil(total / effectiveLimit),
    executionTimeMs,
  };
}

module.exports = {
  DDDReportDefinition,
  DDDReportHistory,
};
