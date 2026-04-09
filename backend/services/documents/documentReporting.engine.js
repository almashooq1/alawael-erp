/**
 * Document Reporting Engine — محرك التقارير المتقدم
 * ──────────────────────────────────────────────────────────────
 * إنشاء تقارير مخصصة، قوالب جاهزة، جدولة تلقائية،
 * تصدير متعدد الصيغ، رسوم بيانية، لوحات بيانات
 *
 * @module documentReporting.engine
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const EventEmitter = require('events');

/* ─── Report Template Model ──────────────────────────────────── */
const reportTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    key: { type: String, unique: true },
    description: String,
    descriptionAr: String,
    category: {
      type: String,
      enum: [
        'usage',
        'compliance',
        'workflow',
        'storage',
        'user_activity',
        'financial',
        'audit',
        'custom',
      ],
      default: 'usage',
    },
    type: {
      type: String,
      enum: ['tabular', 'summary', 'chart', 'dashboard', 'detailed', 'comparison'],
      default: 'tabular',
    },
    dataSource: {
      collection: String,
      pipeline: [mongoose.Schema.Types.Mixed],
      filters: mongoose.Schema.Types.Mixed,
    },
    columns: [
      {
        key: String,
        label: String,
        labelAr: String,
        type: {
          type: String,
          enum: ['string', 'number', 'date', 'boolean', 'currency', 'percentage'],
        },
        sortable: { type: Boolean, default: true },
        filterable: { type: Boolean, default: true },
        width: Number,
        format: String,
        aggregate: {
          type: String,
          enum: ['sum', 'avg', 'count', 'min', 'max', 'none'],
          default: 'none',
        },
      },
    ],
    charts: [
      {
        type: {
          type: String,
          enum: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap'],
        },
        title: String,
        titleAr: String,
        dataKey: String,
        categoryKey: String,
        colors: [String],
      },
    ],
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      },
      dayOfWeek: Number,
      dayOfMonth: Number,
      time: String,
      recipients: [{ email: String, name: String }],
      format: {
        type: String,
        enum: ['pdf', 'excel', 'csv', 'html'],
        default: 'pdf',
      },
      lastRun: Date,
      nextRun: Date,
    },
    isSystem: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_report_templates' }
);

const ReportTemplate =
  mongoose.models.ReportTemplate || mongoose.model('ReportTemplate', reportTemplateSchema);

/* ─── Generated Report Model ─────────────────────────────────── */
const generatedReportSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      index: true,
    },
    name: String,
    nameAr: String,
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed', 'expired'],
      default: 'generating',
    },
    parameters: mongoose.Schema.Types.Mixed,
    result: {
      data: [mongoose.Schema.Types.Mixed],
      summary: mongoose.Schema.Types.Mixed,
      charts: [mongoose.Schema.Types.Mixed],
      totalRows: Number,
      generatedAt: Date,
      processingTime: Number,
    },
    exportFormat: {
      type: String,
      enum: ['json', 'csv', 'excel', 'pdf', 'html'],
      default: 'json',
    },
    exportUrl: String,
    expiresAt: Date,
    error: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_generated_reports' }
);

generatedReportSchema.index({ createdBy: 1, createdAt: -1 });
generatedReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GeneratedReport =
  mongoose.models.GeneratedReport || mongoose.model('GeneratedReport', generatedReportSchema);

/* ─── Default Templates ──────────────────────────────────────── */
const DEFAULT_TEMPLATES = [
  {
    key: 'doc_usage_monthly',
    name: 'Monthly Document Usage',
    nameAr: 'تقرير الاستخدام الشهري',
    category: 'usage',
    type: 'dashboard',
    descriptionAr: 'ملخص شهري لاستخدام المستندات: إنشاء، تعديل، حذف، مشاركة',
    columns: [
      { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'date', sortable: true },
      { key: 'created', label: 'Created', labelAr: 'مُنشأة', type: 'number', aggregate: 'sum' },
      { key: 'modified', label: 'Modified', labelAr: 'معدّلة', type: 'number', aggregate: 'sum' },
      { key: 'shared', label: 'Shared', labelAr: 'مشتركة', type: 'number', aggregate: 'sum' },
      { key: 'deleted', label: 'Deleted', labelAr: 'محذوفة', type: 'number', aggregate: 'sum' },
    ],
    charts: [
      { type: 'line', titleAr: 'اتجاه الاستخدام', dataKey: 'created', categoryKey: 'date' },
      { type: 'bar', titleAr: 'مقارنة العمليات', dataKey: 'created', categoryKey: 'date' },
    ],
    isSystem: true,
  },
  {
    key: 'compliance_status',
    name: 'Compliance Status',
    nameAr: 'حالة الامتثال',
    category: 'compliance',
    type: 'summary',
    descriptionAr: 'حالة الامتثال لجميع المستندات المؤرشفة مع إطار الامتثال',
    columns: [
      { key: 'framework', label: 'Framework', labelAr: 'الإطار', type: 'string' },
      { key: 'compliant', label: 'Compliant', labelAr: 'متوافق', type: 'number', aggregate: 'sum' },
      {
        key: 'nonCompliant',
        label: 'Non-Compliant',
        labelAr: 'غير متوافق',
        type: 'number',
        aggregate: 'sum',
      },
      { key: 'percentage', label: 'Rate', labelAr: 'النسبة', type: 'percentage' },
    ],
    charts: [
      { type: 'pie', titleAr: 'نسبة الامتثال', dataKey: 'compliant', categoryKey: 'framework' },
    ],
    isSystem: true,
  },
  {
    key: 'workflow_performance',
    name: 'Workflow Performance',
    nameAr: 'أداء سير العمل',
    category: 'workflow',
    type: 'detailed',
    descriptionAr: 'تحليل أداء سير العمل: أوقات المعالجة، التأخيرات، الاختناقات',
    columns: [
      { key: 'workflow', label: 'Workflow', labelAr: 'سير العمل', type: 'string' },
      { key: 'avgTime', label: 'Avg Time', labelAr: 'متوسط الوقت', type: 'number' },
      { key: 'completed', label: 'Completed', labelAr: 'مكتمل', type: 'number', aggregate: 'sum' },
      { key: 'overdue', label: 'Overdue', labelAr: 'متأخر', type: 'number', aggregate: 'sum' },
      { key: 'efficiency', label: 'Efficiency', labelAr: 'الكفاءة', type: 'percentage' },
    ],
    isSystem: true,
  },
  {
    key: 'storage_analysis',
    name: 'Storage Analysis',
    nameAr: 'تحليل التخزين',
    category: 'storage',
    type: 'chart',
    descriptionAr: 'تحليل مساحة التخزين: حسب النوع، القسم، الحجم',
    columns: [
      { key: 'category', label: 'Category', labelAr: 'الفئة', type: 'string' },
      { key: 'count', label: 'Count', labelAr: 'العدد', type: 'number', aggregate: 'sum' },
      { key: 'size', label: 'Size', labelAr: 'الحجم', type: 'number', aggregate: 'sum' },
      { key: 'percentage', label: '%', labelAr: 'النسبة', type: 'percentage' },
    ],
    charts: [
      { type: 'pie', titleAr: 'توزيع التخزين', dataKey: 'size', categoryKey: 'category' },
      { type: 'bar', titleAr: 'عدد المستندات', dataKey: 'count', categoryKey: 'category' },
    ],
    isSystem: true,
  },
  {
    key: 'user_activity',
    name: 'User Activity',
    nameAr: 'نشاط المستخدمين',
    category: 'user_activity',
    type: 'tabular',
    descriptionAr: 'تقرير نشاط المستخدمين: تسجيلات الدخول، العمليات، الأكثر نشاطاً',
    columns: [
      { key: 'user', label: 'User', labelAr: 'المستخدم', type: 'string' },
      { key: 'actions', label: 'Actions', labelAr: 'العمليات', type: 'number', aggregate: 'sum' },
      {
        key: 'documents',
        label: 'Documents',
        labelAr: 'المستندات',
        type: 'number',
        aggregate: 'sum',
      },
      { key: 'lastActive', label: 'Last Active', labelAr: 'آخر نشاط', type: 'date' },
    ],
    isSystem: true,
  },
  {
    key: 'audit_trail',
    name: 'Audit Trail',
    nameAr: 'مسار التدقيق',
    category: 'audit',
    type: 'detailed',
    descriptionAr: 'سجل كامل لجميع العمليات على المستندات مع التفاصيل',
    columns: [
      { key: 'timestamp', label: 'Time', labelAr: 'الوقت', type: 'date', sortable: true },
      { key: 'user', label: 'User', labelAr: 'المستخدم', type: 'string' },
      { key: 'action', label: 'Action', labelAr: 'العملية', type: 'string' },
      { key: 'document', label: 'Document', labelAr: 'المستند', type: 'string' },
      { key: 'details', label: 'Details', labelAr: 'التفاصيل', type: 'string' },
    ],
    isSystem: true,
  },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentReportingEngine extends EventEmitter {
  constructor() {
    super();
  }

  /* ─── Initialize Defaults ─────────────────────────────────── */
  async initDefaults() {
    for (const tpl of DEFAULT_TEMPLATES) {
      await ReportTemplate.findOneAndUpdate(
        { key: tpl.key },
        { $setOnInsert: tpl },
        { upsert: true }
      );
    }
    return { success: true, initialized: DEFAULT_TEMPLATES.length };
  }

  /* ─── Get Templates ───────────────────────────────────────── */
  async getTemplates(options = {}) {
    const { category, type, page = 1, limit = 50 } = options;
    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;

    let templates = await ReportTemplate.find(filter)
      .sort({ isSystem: -1, order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (templates.length === 0) {
      await this.initDefaults();
      templates = await ReportTemplate.find(filter).sort({ isSystem: -1 }).lean();
    }

    return { success: true, templates, total: templates.length };
  }

  /* ─── Create Template ─────────────────────────────────────── */
  async createTemplate(data) {
    const key = data.key || `custom_${data.name?.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const template = new ReportTemplate({ ...data, key, isSystem: false });
    await template.save();
    return { success: true, template };
  }

  /* ─── Update Template ─────────────────────────────────────── */
  async updateTemplate(templateId, updates) {
    const template = await ReportTemplate.findByIdAndUpdate(
      templateId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!template) return { success: false, error: 'القالب غير موجود' };
    return { success: true, template };
  }

  /* ─── Delete Template ─────────────────────────────────────── */
  async deleteTemplate(templateId) {
    const template = await ReportTemplate.findById(templateId);
    if (!template) return { success: false, error: 'القالب غير موجود' };
    if (template.isSystem) return { success: false, error: 'لا يمكن حذف قالب النظام' };
    await template.deleteOne();
    return { success: true };
  }

  /* ─── Generate Report ─────────────────────────────────────── */
  async generate(templateId, parameters = {}, userId) {
    const template = await ReportTemplate.findById(templateId).lean();
    if (!template) return { success: false, error: 'القالب غير موجود' };

    const report = new GeneratedReport({
      templateId,
      name: template.name,
      nameAr: template.nameAr,
      parameters,
      status: 'generating',
      exportFormat: parameters.format || 'json',
      expiresAt: new Date(Date.now() + 7 * 86400000),
      createdBy: userId,
    });
    await report.save();

    try {
      const startTime = Date.now();
      const data = await this._executeReport(template, parameters);

      report.result = {
        data: data.rows,
        summary: data.summary,
        charts: data.charts,
        totalRows: data.rows.length,
        generatedAt: new Date(),
        processingTime: Date.now() - startTime,
      };
      report.status = 'completed';
      await report.save();

      this.emit('reportGenerated', {
        reportId: report._id,
        templateKey: template.key,
        rows: data.rows.length,
      });

      return { success: true, report };
    } catch (err) {
      report.status = 'failed';
      report.error = err.message;
      await report.save();
      return { success: false, error: err.message };
    }
  }

  /* ─── Execute Report Data Query ───────────────────────────── */
  async _executeReport(template, parameters) {
    const { startDate, endDate, department, category, limit: rowLimit } = parameters;

    // Simulate data generation based on template
    const rows = [];
    const numRows = rowLimit || 30;

    for (let i = 0; i < numRows; i++) {
      const row = {};
      for (const col of template.columns || []) {
        switch (col.type) {
          case 'date':
            row[col.key] = new Date(Date.now() - Math.random() * 30 * 86400000).toISOString();
            break;
          case 'number':
            row[col.key] = Math.floor(Math.random() * 100);
            break;
          case 'percentage':
            row[col.key] = Math.round(Math.random() * 100 * 10) / 10;
            break;
          case 'currency':
            row[col.key] = Math.round(Math.random() * 10000 * 100) / 100;
            break;
          case 'boolean':
            row[col.key] = Math.random() > 0.5;
            break;
          default:
            row[col.key] = `${col.labelAr || col.label} ${i + 1}`;
        }
      }
      rows.push(row);
    }

    // Generate summary
    const summary = {};
    for (const col of (template.columns || []).filter(c => c.aggregate && c.aggregate !== 'none')) {
      const values = rows.map(r => r[col.key]).filter(v => typeof v === 'number');
      if (values.length === 0) continue;
      switch (col.aggregate) {
        case 'sum':
          summary[col.key] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          summary[col.key] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'count':
          summary[col.key] = values.length;
          break;
        case 'min':
          summary[col.key] = Math.min(...values);
          break;
        case 'max':
          summary[col.key] = Math.max(...values);
          break;
      }
    }

    // Generate chart data
    const charts = (template.charts || []).map(chart => ({
      ...chart,
      data: rows.slice(0, 12).map(r => ({
        category: r[chart.categoryKey],
        value: r[chart.dataKey],
      })),
    }));

    return { rows, summary, charts };
  }

  /* ─── Get Generated Reports ───────────────────────────────── */
  async getReports(options = {}) {
    const { userId, templateId, status, page = 1, limit = 20 } = options;
    const filter = {};
    if (userId) filter.createdBy = userId;
    if (templateId) filter.templateId = templateId;
    if (status) filter.status = status;

    const [reports, total] = await Promise.all([
      GeneratedReport.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('templateId', 'name nameAr category')
        .lean(),
      GeneratedReport.countDocuments(filter),
    ]);

    return { success: true, reports, total, page, limit };
  }

  /* ─── Get Report by ID ────────────────────────────────────── */
  async getReport(reportId) {
    const report = await GeneratedReport.findById(reportId)
      .populate('templateId')
      .populate('createdBy', 'name')
      .lean();
    if (!report) return { success: false, error: 'التقرير غير موجود' };
    return { success: true, report };
  }

  /* ─── Export Report ───────────────────────────────────────── */
  async exportReport(reportId, format = 'csv') {
    const report = await GeneratedReport.findById(reportId).populate('templateId').lean();
    if (!report) return { success: false, error: 'التقرير غير موجود' };

    let content;
    switch (format) {
      case 'csv':
        content = this._toCSV(report);
        break;
      case 'html':
        content = this._toHTML(report);
        break;
      default:
        content = JSON.stringify(report.result, null, 2);
    }

    return {
      success: true,
      format,
      content,
      filename: `${report.nameAr || report.name}_${new Date().toISOString().slice(0, 10)}.${format}`,
    };
  }

  _toCSV(report) {
    const columns = report.templateId?.columns || [];
    const header = columns.map(c => c.labelAr || c.label).join(',');
    const rows = (report.result?.data || []).map(row =>
      columns.map(c => `"${row[c.key] ?? ''}"`).join(',')
    );
    return [header, ...rows].join('\n');
  }

  _toHTML(report) {
    const columns = report.templateId?.columns || [];
    const headerCells = columns.map(c => `<th>${c.labelAr || c.label}</th>`).join('');
    const bodyRows = (report.result?.data || [])
      .map(row => `<tr>${columns.map(c => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`)
      .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${report.nameAr || report.name}</title>
<style>body{font-family:Cairo,sans-serif;direction:rtl}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#3b82f6;color:white}</style></head>
<body><h1>${report.nameAr || report.name}</h1>
<p>تاريخ التوليد: ${new Date().toLocaleDateString('ar-SA')}</p>
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;
  }

  /* ─── Schedule Report ─────────────────────────────────────── */
  async scheduleReport(templateId, schedule) {
    const template = await ReportTemplate.findByIdAndUpdate(
      templateId,
      {
        $set: {
          schedule: {
            ...schedule,
            enabled: true,
            nextRun: this._calculateNextRun(schedule),
          },
        },
      },
      { new: true }
    ).lean();
    if (!template) return { success: false, error: 'القالب غير موجود' };
    return { success: true, template };
  }

  _calculateNextRun(schedule) {
    const now = new Date();
    switch (schedule.frequency) {
      case 'daily':
        return new Date(now.getTime() + 86400000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 86400000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, schedule.dayOfMonth || 1);
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, 1);
      case 'yearly':
        return new Date(now.getFullYear() + 1, 0, 1);
      default:
        return new Date(now.getTime() + 86400000);
    }
  }

  /* ─── Get Categories ──────────────────────────────────────── */
  getCategories() {
    return [
      { key: 'usage', labelAr: 'الاستخدام', icon: '📊' },
      { key: 'compliance', labelAr: 'الامتثال', icon: '✅' },
      { key: 'workflow', labelAr: 'سير العمل', icon: '🔄' },
      { key: 'storage', labelAr: 'التخزين', icon: '💾' },
      { key: 'user_activity', labelAr: 'نشاط المستخدمين', icon: '👥' },
      { key: 'financial', labelAr: 'مالي', icon: '💰' },
      { key: 'audit', labelAr: 'التدقيق', icon: '🔍' },
      { key: 'custom', labelAr: 'مخصص', icon: '⚙️' },
    ];
  }

  /* ─── Statistics ──────────────────────────────────────────── */
  async getStats() {
    const [totalTemplates, totalReports, byCategory, scheduled] = await Promise.all([
      ReportTemplate.countDocuments(),
      GeneratedReport.countDocuments(),
      ReportTemplate.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      ReportTemplate.countDocuments({ 'schedule.enabled': true }),
    ]);

    return {
      success: true,
      stats: {
        totalTemplates,
        totalReports,
        byCategory: byCategory.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
        scheduled,
      },
    };
  }
}

module.exports = new DocumentReportingEngine();
