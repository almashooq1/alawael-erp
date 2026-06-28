/**
 * biAnalytics.service.js — خدمة التحليلات المتقدمة وذكاء الأعمال (BI Analytics Service)
 * ════════════════════════════════════════════════════════════════════════════════════
 * خدمة شاملة لبناء التقارير المخصصة، التصدير، الجدولة، والتحليلات التنبؤية.
 *
 * الدوال الرئيسية:
 *   1. getReportBuilderConfig()    — إعدادات منشئ التقارير
 *   2. buildCustomReport(config)   — بناء تقرير مخصص
 *   3. getReportData(...)        — جلب بيانات التقرير
 *   4. exportToExcel(...)        — تصدير Excel
 *   5. exportToPDF(...)          — تصدير PDF
 *   6. exportToPowerBI(...)      — تصدير بيانات Power BI
 *   7. scheduleReport(...)       — جدولة التقرير
 *   8. getScheduledReports()     — قائمة التقارير المجدولة
 *   9. getDataWarehouseSummary() — ملخص مستودع البيانات
 *   10. getPredictiveAnalytics(...) — تحليلات تنبؤية
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* ─── Lazy model getters (avoid circular deps) ─────────────────────────── */
function getModels() {
  try {
    return {
      ReportTemplate: mongoose.models.ReportTemplate || require('../models/analytics/ReportTemplate'),
      Beneficiary: mongoose.models.Beneficiary || require('../models/Beneficiary'),
      TherapySession: mongoose.models.TherapySession || require('../models/TherapySession'),
      ICFAssessment: mongoose.models.ICFAssessment || require('../models/icf/ICFAssessment.model'),
      Employee: mongoose.models.Employee || require('../models/Employee'),
      Invoice: mongoose.models.AccountingInvoice || require('../models/AccountingInvoice'),
      Payment: mongoose.models.AccountingPayment || require('../models/AccountingPayment'),
      Goal: mongoose.models.Goal || require('../models/Goal'),
      GoalProgressEntry: mongoose.models.GoalProgressEntry || require('../models/GoalProgressEntry'),
      User: mongoose.models.User || require('../models/User'),
    };
  } catch (err) {
    logger.warn('[BIAnalytics] Model load warning:', err.message);
    return {};
  }
}

/* ─── Configuration: Available Data Sources ──────────────────────────────── */
const REPORT_BUILDER_CONFIG = {
  sources: [
    {
      id: 'icf',
      name: 'تقييمات ICF',
      nameEn: 'ICF Assessments',
      model: 'ICFAssessment',
      fields: [
        { field: 'beneficiaryId', label: 'المستفيد', type: 'reference', ref: 'Beneficiary' },
        { field: 'assessorId', label: 'المقيم', type: 'reference', ref: 'User' },
        { field: 'assessmentDate', label: 'تاريخ التقييم', type: 'date' },
        { field: 'domainCode', label: 'مجال التقييم', type: 'enum' },
        { field: 'score', label: 'الدرجة', type: 'number' },
        { field: 'level', label: 'المستوى', type: 'enum' },
        { field: 'branchId', label: 'الفرع', type: 'string' },
      ],
      dimensions: ['assessmentDate', 'domainCode', 'level', 'branchId', 'assessorId'],
      metrics: [
        { field: 'score', label: 'متوسط الدرجة', aggregation: 'avg' },
        { field: 'score', label: 'أقل درجة', aggregation: 'min' },
        { field: 'score', label: 'أعلى درجة', aggregation: 'max' },
        { field: '_id', label: 'عدد التقييمات', aggregation: 'count' },
      ],
    },
    {
      id: 'sessions',
      name: 'الجلسات العلاجية',
      nameEn: 'Therapy Sessions',
      model: 'TherapySession',
      fields: [
        { field: 'beneficiaryId', label: 'المستفيد', type: 'reference', ref: 'Beneficiary' },
        { field: 'therapistId', label: 'المعالج', type: 'reference', ref: 'User' },
        { field: 'sessionDate', label: 'تاريخ الجلسة', type: 'date' },
        { field: 'status', label: 'الحالة', type: 'enum' },
        { field: 'duration', label: 'المدة (دقيقة)', type: 'number' },
        { field: 'sessionType', label: 'نوع الجلسة', type: 'string' },
        { field: 'branchId', label: 'الفرع', type: 'string' },
        { field: 'isGroup', label: 'جلسة جماعية', type: 'boolean' },
      ],
      dimensions: ['sessionDate', 'status', 'sessionType', 'branchId', 'therapistId', 'isGroup'],
      metrics: [
        { field: 'duration', label: 'إجمالي المدة', aggregation: 'sum' },
        { field: 'duration', label: 'متوسط المدة', aggregation: 'avg' },
        { field: '_id', label: 'عدد الجلسات', aggregation: 'count' },
      ],
    },
    {
      id: 'beneficiaries',
      name: 'المستفيدون',
      nameEn: 'Beneficiaries',
      model: 'Beneficiary',
      fields: [
        { field: 'fullName', label: 'الاسم', type: 'string' },
        { field: 'dateOfBirth', label: 'تاريخ الميلاد', type: 'date' },
        { field: 'gender', label: 'الجنس', type: 'enum' },
        { field: 'disabilityType', label: 'نوع الإعاقة', type: 'string' },
        { field: 'enrollmentDate', label: 'تاريخ التسجيل', type: 'date' },
        { field: 'status', label: 'الحالة', type: 'enum' },
        { field: 'branchId', label: 'الفرع', type: 'string' },
        { field: 'category', label: 'الفئة', type: 'string' },
      ],
      dimensions: ['gender', 'disabilityType', 'status', 'branchId', 'category', 'enrollmentDate'],
      metrics: [
        { field: '_id', label: 'عدد المستفيدين', aggregation: 'count' },
        { field: 'age', label: 'متوسط العمر', aggregation: 'avg' },
      ],
    },
    {
      id: 'finance',
      name: 'المالية',
      nameEn: 'Finance',
      model: 'Invoice',
      fields: [
        { field: 'invoiceNumber', label: 'رقم الفاتورة', type: 'string' },
        { field: 'issueDate', label: 'تاريخ الإصدار', type: 'date' },
        { field: 'dueDate', label: 'تاريخ الاستحقاق', type: 'date' },
        { field: 'totalAmount', label: 'المبلغ الإجمالي', type: 'number' },
        { field: 'paidAmount', label: 'المبلغ المدفوع', type: 'number' },
        { field: 'status', label: 'الحالة', type: 'enum' },
        { field: 'branchId', label: 'الفرع', type: 'string' },
        { field: 'beneficiaryId', label: 'المستفيد', type: 'reference', ref: 'Beneficiary' },
      ],
      dimensions: ['issueDate', 'status', 'branchId', 'beneficiaryId'],
      metrics: [
        { field: 'totalAmount', label: 'إجمالي الإيرادات', aggregation: 'sum' },
        { field: 'paidAmount', label: 'إجمالي المدفوعات', aggregation: 'sum' },
        { field: 'totalAmount', label: 'متوسط القيمة', aggregation: 'avg' },
        { field: '_id', label: 'عدد الفواتير', aggregation: 'count' },
      ],
    },
    {
      id: 'hr',
      name: 'الموارد البشرية',
      nameEn: 'Human Resources',
      model: 'Employee',
      fields: [
        { field: 'fullName', label: 'الاسم', type: 'string' },
        { field: 'department', label: 'القسم', type: 'string' },
        { field: 'jobTitle', label: 'المسمى الوظيفي', type: 'string' },
        { field: 'hireDate', label: 'تاريخ التعيين', type: 'date' },
        { field: 'status', label: 'الحالة', type: 'enum' },
        { field: 'branchId', label: 'الفرع', type: 'string' },
        { field: 'nationality', label: 'الجنسية', type: 'string' },
        { field: 'gender', label: 'الجنس', type: 'enum' },
      ],
      dimensions: ['department', 'jobTitle', 'status', 'branchId', 'nationality', 'gender', 'hireDate'],
      metrics: [
        { field: '_id', label: 'عدد الموظفين', aggregation: 'count' },
        { field: 'salary', label: 'إجمالي الرواتب', aggregation: 'sum' },
        { field: 'salary', label: 'متوسط الراتب', aggregation: 'avg' },
      ],
    },
  ],
  commonFilters: [
    { field: 'startDate', label: 'من تاريخ', type: 'date', defaultValue: '' },
    { field: 'endDate', label: 'إلى تاريخ', type: 'date', defaultValue: '' },
    { field: 'branchId', label: 'الفرع', type: 'enum', defaultValue: 'all' },
  ],
};

/* ─── 1. getReportBuilderConfig ─────────────────────────────────────────── */
function getReportBuilderConfig() {
  return {
    ...REPORT_BUILDER_CONFIG,
    chartTypes: [
      { id: 'table', name: 'جدول', icon: 'table' },
      { id: 'bar', name: 'أعمدة', icon: 'bar-chart' },
      { id: 'line', name: 'خطي', icon: 'line-chart' },
      { id: 'pie', name: 'دائري', icon: 'pie-chart' },
      { id: 'radar', name: 'راداري', icon: 'radar-chart' },
      { id: 'funnel', name: 'قمعي', icon: 'funnel-chart' },
      { id: 'scatter', name: 'انتشار', icon: 'scatter-chart' },
    ],
    colorPalettes: [
      ['#1e3a5f', '#2e7d32', '#c62828', '#f9a825', '#6a1b9a', '#00838f'],
      ['#1565c0', '#388e3c', '#d32f2f', '#fbc02d', '#7b1fa2', '#0097a7'],
      ['#0d47a1', '#1b5e20', '#b71c1c', '#f57f17', '#4a148c', '#006064'],
    ],
  };
}

/* ─── 2. buildCustomReport ──────────────────────────────────────────────── */
async function buildCustomReport(config) {
  const {
    sourceId,
    dimensions = [],
    metrics = [],
    filters = {},
    startDate,
    endDate,
    branchId,
    limit = 5000,
  } = config;

  const source = REPORT_BUILDER_CONFIG.sources.find(s => s.id === sourceId);
  if (!source) throw new Error(`مصدر البيانات غير معروف: ${sourceId}`);

  const models = getModels();
  const Model = models[source.model];
  if (!Model) throw new Error(`النموذج غير متاح: ${source.model}`);

  // Build query
  const query = {};
  if (startDate || endDate) {
    const dateField = source.fields.find(f => f.type === 'date')?.field || 'createdAt';
    query[dateField] = {};
    if (startDate) query[dateField].$gte = new Date(startDate);
    if (endDate) query[dateField].$lte = new Date(endDate);
  }
  if (branchId && branchId !== 'all') {
    const branchField = source.fields.find(f => f.field === 'branchId');
    if (branchField) query.branchId = branchId;
  }
  // Apply custom filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      query[key] = value;
    }
  });

  // Build aggregation pipeline
  const pipeline = [{ $match: query }];

  // Group stage
  const groupId = {};
  dimensions.forEach(dim => {
    groupId[dim] = `$${dim}`;
  });
  if (dimensions.length === 0) groupId._all = 'all';

  const groupStage = { $group: { _id: groupId } };
  metrics.forEach(m => {
    const safeField = m.field.replace(/[^a-zA-Z0-9_]/g, '_');
    switch (m.aggregation) {
      case 'sum':
        groupStage.$group[`agg_${safeField}_sum`] = { $sum: `$${m.field}` };
        break;
      case 'avg':
        groupStage.$group[`agg_${safeField}_avg`] = { $avg: `$${m.field}` };
        break;
      case 'count':
        groupStage.$group[`agg_${safeField}_count`] = { $sum: 1 };
        break;
      case 'min':
        groupStage.$group[`agg_${safeField}_min`] = { $min: `$${m.field}` };
        break;
      case 'max':
        groupStage.$group[`agg_${safeField}_max`] = { $max: `$${m.field}` };
        break;
      case 'distinct':
        groupStage.$group[`agg_${safeField}_distinct`] = { $addToSet: `$${m.field}` };
        break;
      default:
        groupStage.$group[`agg_${safeField}_value`] = { $first: `$${m.field}` };
    }
  });
  pipeline.push(groupStage);

  // Sort and limit
  pipeline.push({ $sort: { '_id': 1 } });
  if (limit) pipeline.push({ $limit: limit });

  const results = await Model.aggregate(pipeline).allowDiskUse(true);

  // Format output
  const formatted = results.map(row => {
    const out = {};
    dimensions.forEach(dim => {
      out[dim] = row._id?.[dim] || row._id;
    });
    metrics.forEach(m => {
      const safeField = m.field.replace(/[^a-zA-Z0-9_]/g, '_');
      const aggKey = `agg_${safeField}_${m.aggregation}`;
      out[m.label] = row[aggKey];
      if (m.aggregation === 'distinct') out[m.label] = (row[aggKey] || []).length;
    });
    return out;
  });

  return {
    source: sourceId,
    sourceName: source.name,
    dimensions,
    metrics,
    rowCount: formatted.length,
    data: formatted,
    generatedAt: new Date().toISOString(),
  };
}

/* ─── 3. getReportData ────────────────────────────────────────────────── */
async function getReportData(templateId, userFilters = {}, startDate, endDate) {
  const models = getModels();
  const template = await models.ReportTemplate?.findOne({ templateId }).lean();
  if (!template) throw new Error('القالب غير موجود');

  const config = {
    sourceId: template.dataSources[0],
    dimensions: template.dimensions.map(d => d.field),
    metrics: template.metrics.map(m => ({
      field: m.field,
      aggregation: m.aggregation,
      label: m.label,
    })),
    filters: userFilters,
    startDate,
    endDate,
  };

  return buildCustomReport(config);
}

/* ─── 4. exportToExcel ──────────────────────────────────────────────────── */
async function exportToExcel(reportData) {
  try {
    // Fallback JSON if xlsx library not available
    const xlsx = require('xlsx');
    const ws = xlsx.utils.json_to_sheet(reportData.data || []);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Report');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      format: 'excel',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `report_${Date.now()}.xlsx`,
      buffer: buf,
    };
  } catch (err) {
    logger.warn('[BIAnalytics] Excel export failed, falling back to JSON:', err.message);
    const jsonStr = JSON.stringify(reportData, null, 2);
    return {
      format: 'json',
      mimeType: 'application/json',
      filename: `report_${Date.now()}.json`,
      buffer: Buffer.from(jsonStr, 'utf-8'),
    };
  }
}

/* ─── 5. exportToPDF ──────────────────────────────────────────────────────── */
async function exportToPDF(reportData) {
  try {
    const puppeteer = require('puppeteer');
    const html = generateReportHTML(reportData);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
    await browser.close();
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      filename: `report_${Date.now()}.pdf`,
      buffer: pdf,
    };
  } catch (err) {
    logger.warn('[BIAnalytics] PDF export failed, falling back to HTML:', err.message);
    const html = generateReportHTML(reportData);
    return {
      format: 'html',
      mimeType: 'text/html',
      filename: `report_${Date.now()}.html`,
      buffer: Buffer.from(html, 'utf-8'),
    };
  }
}

/* ─── HTML Generator for PDF fallback ──────────────────────────────────── */
function generateReportHTML(reportData) {
  const rows = reportData.data || [];
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const dir = 'rtl';
  const title = 'تقرير التحليلات';

  const headerRow = keys.map(k => `<th style="border:1px solid #ccc;padding:8px;background:#1e3a5f;color:#fff;font-family:tahoma;">${k}</th>`).join('');
  const bodyRows = rows.map(row =>
    `<tr>${keys.map(k => `<td style="border:1px solid #ccc;padding:8px;font-family:tahoma;text-align:center;">${row[k] ?? '-'}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="ar">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family:tahoma;direction:rtl;padding:20px;">
  <h2 style="color:#1e3a5f;text-align:center;">${title}</h2>
  <p style="text-align:center;color:#666;">${reportData.sourceName || ''} — ${new Date().toLocaleString('ar-SA')}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:20px;">
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p style="text-align:center;color:#999;margin-top:20px;font-size:12px;">تم إنشاء هذا التقرير بواسطة نظام Al-Awael ERP</p>
</body>
</html>`;
}

/* ─── 6. exportToPowerBI ──────────────────────────────────────────────── */
async function exportToPowerBI(reportData) {
  // Power BI expects flat JSON arrays
  const flatData = (reportData.data || []).map(row => {
    const flat = {};
    Object.entries(row).forEach(([key, value]) => {
      // Flatten nested objects if any
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([subKey, subVal]) => {
          flat[`${key}_${subKey}`] = subVal;
        });
      } else {
        flat[key] = value;
      }
    });
    return flat;
  });

  return {
    format: 'powerbi',
    mimeType: 'application/json',
    filename: `powerbi_${Date.now()}.json`,
    buffer: Buffer.from(JSON.stringify(flatData, null, 2), 'utf-8'),
    metadata: {
      datasetName: reportData.sourceName || 'AlAwael Dataset',
      columnTypes: flatData.length > 0
        ? Object.entries(flatData[0]).map(([k, v]) => ({ name: k, type: typeof v }))
        : [],
      rowCount: flatData.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

/* ─── 7. scheduleReport ───────────────────────────────────────────────── */
async function scheduleReport(templateId, scheduleConfig) {
  const models = getModels();
  if (!models.ReportTemplate) throw new Error('نموذج قوالب التقارير غير متاح');

  const template = await models.ReportTemplate.findOne({ templateId });
  if (!template) throw new Error('القالب غير موجود');

  template.schedule = {
    enabled: true,
    ...scheduleConfig,
    lastRunAt: null,
    nextRunAt: template.calculateNextRun(),
    runCount: 0,
    lastRunStatus: 'pending',
    lastError: '',
  };

  await template.save();
  return {
    templateId,
    schedule: template.schedule,
    message: 'تم جدولة التقرير بنجاح',
  };
}

/* ─── 8. getScheduledReports ────────────────────────────────────────────── */
async function getScheduledReports() {
  const models = getModels();
  if (!models.ReportTemplate) return [];

  const templates = await models.ReportTemplate.find({
    'schedule.enabled': true,
  })
    .select('templateId name category schedule createdAt')
    .sort({ 'schedule.nextRunAt': 1 })
    .lean();

  return templates.map(t => ({
    templateId: t.templateId,
    name: t.name,
    category: t.category,
    frequency: t.schedule.frequency,
    recipients: t.schedule.recipients,
    lastRunAt: t.schedule.lastRunAt,
    nextRunAt: t.schedule.nextRunAt,
    lastRunStatus: t.schedule.lastRunStatus,
    runCount: t.schedule.runCount,
    isActive: t.isActive,
  }));
}

/* ─── 9. getDataWarehouseSummary ──────────────────────────────────────────── */
async function getDataWarehouseSummary() {
  const models = getModels();
  const summary = {
    generatedAt: new Date().toISOString(),
    tables: [],
  };

  const counts = await Promise.allSettled([
    models.Beneficiary?.countDocuments().then(c => ({ name: 'المستفيدون', count: c, icon: 'people' })),
    models.TherapySession?.countDocuments().then(c => ({ name: 'الجلسات', count: c, icon: 'sessions' })),
    models.ICFAssessment?.countDocuments().then(c => ({ name: 'تقييمات ICF', count: c, icon: 'assessment' })),
    models.Employee?.countDocuments().then(c => ({ name: 'الموظفون', count: c, icon: 'employees' })),
    models.Invoice?.countDocuments().then(c => ({ name: 'الفواتير', count: c, icon: 'invoices' })),
    models.Goal?.countDocuments().then(c => ({ name: 'الأهداف العلاجية', count: c, icon: 'goals' })),
  ]);

  summary.tables = counts
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(Boolean);

  // Add recent activity stats
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  try {
    const [newBeneficiaries, newSessions] = await Promise.all([
      models.Beneficiary?.countDocuments({ createdAt: { $gte: lastMonth } }) || 0,
      models.TherapySession?.countDocuments({ sessionDate: { $gte: lastMonth } }) || 0,
    ]);
    summary.recentActivity = { newBeneficiaries, newSessions, period: 'lastMonth' };
  } catch {
    summary.recentActivity = { newBeneficiaries: 0, newSessions: 0, period: 'lastMonth' };
  }

  return summary;
}

/* ─── 10. getPredictiveAnalytics ──────────────────────────────────────── */
async function getPredictiveAnalytics(type, _params = {}) {
  const models = getModels();
  const now = new Date();

  switch (type) {
    case 'revenue': {
      // Simple linear regression on monthly revenue
      const invoices = await models.Invoice?.find({ issueDate: { $gte: new Date(now.getFullYear() - 1, 0, 1) } }).lean() || [];
      const monthly = {};
      invoices.forEach(inv => {
        const m = new Date(inv.issueDate).getMonth();
        monthly[m] = (monthly[m] || 0) + (inv.totalAmount || 0);
      });
      const points = Array.from({ length: 12 }, (_, i) => monthly[i] || 0);
      const { slope, intercept, r2 } = linearRegression(points);
      const next3 = [0, 1, 2].map(i => Math.max(0, slope * (12 + i) + intercept));
      return {
        type: 'revenue',
        forecast: next3,
        confidence: r2,
        trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
        message: `التوقع: ${next3[0].toFixed(0)} ر.س للشهر القادم`,
      };
    }

    case 'staffing': {
      const employees = await models.Employee?.find({ status: 'active' }).lean() || [];
      const byDept = {};
      employees.forEach(e => {
        byDept[e.department || 'غير محدد'] = (byDept[e.department || 'غير محدد'] || 0) + 1;
      });
      const total = employees.length;
      const growthRate = 0.05; // افتراض 5% نمو سنوي
      const forecast = {
        nextQuarter: Math.round(total * (1 + growthRate / 4)),
        nextYear: Math.round(total * (1 + growthRate)),
        byDepartment: byDept,
      };
      return {
        type: 'staffing',
        forecast,
        message: `الاحتياج المتوقع: ${forecast.nextQuarter} موظف للربع القادم`,
      };
    }

    case 'expansion': {
      const beneficiaries = await models.Beneficiary?.find({ status: 'active' }).lean() || [];
      const waitlist = await models.Beneficiary?.countDocuments({ status: 'waitlist' }) || 0;
      const capacity = beneficiaries.length * 1.2; // افتراض 20% زيادة سعة
      return {
        type: 'expansion',
        currentCapacity: beneficiaries.length,
        waitlist,
        recommendedCapacity: Math.round(capacity),
        expansionNeeded: waitlist > capacity * 0.1,
        message: waitlist > capacity * 0.1
          ? 'يوصى بالتوسع: قائمة الانتظار تتجاوز 10% من السعة'
          : 'السعة الحالية كافية للطلب الحالي',
      };
    }

    case 'goalAchievement': {
      const _goals = await models.Goal?.find({ status: { $in: ['active', 'completed'] } }).lean() || [];
      const progressEntries = await models.GoalProgressEntry?.find().sort({ createdAt: -1 }).lean() || [];
      const points = progressEntries.map(p => p.progressPercent || 0);
      const { slope, _intercept, r2 } = linearRegression(points.slice(0, 30));
      const projectedCompletion = slope > 0 ? Math.ceil((100 - (points[0] || 0)) / slope) : null;
      return {
        type: 'goalAchievement',
        currentProgress: points[0] || 0,
        projectedCompletionDays: projectedCompletion,
        confidence: r2,
        trend: slope > 0 ? 'up' : 'down',
        message: projectedCompletion
          ? `الإنجاز المتوقع خلال ${projectedCompletion} يوم`
          : 'البيانات غير كافية للتنبؤ',
      };
    }

    default:
      return { type, message: 'نوع التحليل غير مدعوم' };
  }
}

/* ─── Statistical helpers ─────────────────────────────────────────────── */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const x = points.map((_, i) => i);
  const y = points;

  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const ssTot = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssRes = y.reduce((sum, yi, i) => sum + (yi - (slope * x[i] + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/* ─── Service Export ────────────────────────────────────────────────────── */
const biAnalyticsService = {
  getReportBuilderConfig,
  buildCustomReport,
  getReportData,
  exportToExcel,
  exportToPDF,
  exportToPowerBI,
  scheduleReport,
  getScheduledReports,
  getDataWarehouseSummary,
  getPredictiveAnalytics,
};

module.exports = biAnalyticsService;
