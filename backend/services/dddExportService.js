/**
 * DDD Data Export Service — خدمة تصدير البيانات للدومينات العلاجية
 *
 * Generates CSV, Excel (XLSX), and PDF exports for any DDD domain.
 * Supports:
 *  - Domain-scoped exports (Beneficiaries, Sessions, etc.)
 *  - Custom column mapping with Arabic headers
 *  - Date-range filtering
 *  - Streaming for large datasets
 *
 * @module services/dddExportService
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Domain column definitions (Arabic + English headers) ────────────────

const EXPORT_COLUMNS = {
  Beneficiary: [
    { key: 'mrn', headerAr: 'رقم الملف', headerEn: 'MRN' },
    { key: 'firstName', headerAr: 'الاسم الأول', headerEn: 'First Name' },
    { key: 'lastName', headerAr: 'اسم العائلة', headerEn: 'Last Name' },
    { key: 'nationalId', headerAr: 'الهوية الوطنية', headerEn: 'National ID' },
    { key: 'gender', headerAr: 'الجنس', headerEn: 'Gender' },
    { key: 'dateOfBirth', headerAr: 'تاريخ الميلاد', headerEn: 'Date of Birth' },
    { key: 'disabilityType', headerAr: 'نوع الإعاقة', headerEn: 'Disability Type' },
    { key: 'disabilityLevel', headerAr: 'مستوى الإعاقة', headerEn: 'Disability Level' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'contactPhone', headerAr: 'الهاتف', headerEn: 'Phone' },
    { key: 'createdAt', headerAr: 'تاريخ التسجيل', headerEn: 'Registration Date' },
  ],

  EpisodeOfCare: [
    { key: 'beneficiary', headerAr: 'المستفيد', headerEn: 'Beneficiary' },
    { key: 'phase', headerAr: 'المرحلة', headerEn: 'Phase' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'referralSource', headerAr: 'مصدر الإحالة', headerEn: 'Referral Source' },
    { key: 'referralDate', headerAr: 'تاريخ الإحالة', headerEn: 'Referral Date' },
    { key: 'primaryDiagnosis', headerAr: 'التشخيص الأولي', headerEn: 'Primary Diagnosis' },
    { key: 'createdAt', headerAr: 'تاريخ الإنشاء', headerEn: 'Created' },
  ],

  ClinicalSession: [
    { key: 'beneficiary', headerAr: 'المستفيد', headerEn: 'Beneficiary' },
    { key: 'therapist', headerAr: 'الأخصائي', headerEn: 'Therapist' },
    { key: 'sessionType', headerAr: 'نوع الجلسة', headerEn: 'Session Type' },
    { key: 'scheduledDate', headerAr: 'التاريخ المحدد', headerEn: 'Scheduled Date' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'duration', headerAr: 'المدة (دقائق)', headerEn: 'Duration (min)' },
    { key: 'actualDuration', headerAr: 'المدة الفعلية', headerEn: 'Actual Duration' },
    { key: 'attendance', headerAr: 'الحضور', headerEn: 'Attendance' },
  ],

  ClinicalAssessment: [
    { key: 'beneficiary', headerAr: 'المستفيد', headerEn: 'Beneficiary' },
    { key: 'type', headerAr: 'نوع التقييم', headerEn: 'Assessment Type' },
    { key: 'assessor', headerAr: 'المقيّم', headerEn: 'Assessor' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'scheduledDate', headerAr: 'تاريخ التقييم', headerEn: 'Scheduled Date' },
    { key: 'createdAt', headerAr: 'تاريخ الإنشاء', headerEn: 'Created' },
  ],

  TherapeuticGoal: [
    { key: 'beneficiary', headerAr: 'المستفيد', headerEn: 'Beneficiary' },
    { key: 'title', headerAr: 'العنوان', headerEn: 'Title' },
    { key: 'priority', headerAr: 'الأولوية', headerEn: 'Priority' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'baseline', headerAr: 'خط الأساس', headerEn: 'Baseline' },
    { key: 'target', headerAr: 'المستهدف', headerEn: 'Target' },
    { key: 'targetDate', headerAr: 'التاريخ المستهدف', headerEn: 'Target Date' },
  ],

  QualityAudit: [
    { key: 'auditType', headerAr: 'نوع المراجعة', headerEn: 'Audit Type' },
    { key: 'auditor', headerAr: 'المراجع', headerEn: 'Auditor' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'scheduledDate', headerAr: 'التاريخ المحدد', headerEn: 'Scheduled Date' },
    { key: 'createdAt', headerAr: 'تاريخ الإنشاء', headerEn: 'Created' },
  ],

  BehaviorRecord: [
    { key: 'beneficiary', headerAr: 'المستفيد', headerEn: 'Beneficiary' },
    { key: 'behaviorType', headerAr: 'نوع السلوك', headerEn: 'Behavior Type' },
    { key: 'severity', headerAr: 'الشدة', headerEn: 'Severity' },
    { key: 'description', headerAr: 'الوصف', headerEn: 'Description' },
    { key: 'antecedent', headerAr: 'المقدمة', headerEn: 'Antecedent' },
    { key: 'consequence', headerAr: 'العاقبة', headerEn: 'Consequence' },
    { key: 'createdAt', headerAr: 'التاريخ', headerEn: 'Date' },
  ],

  WorkflowTask: [
    { key: 'title', headerAr: 'العنوان', headerEn: 'Title' },
    { key: 'taskType', headerAr: 'نوع المهمة', headerEn: 'Task Type' },
    { key: 'priority', headerAr: 'الأولوية', headerEn: 'Priority' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'assignee', headerAr: 'المسؤول', headerEn: 'Assignee' },
    { key: 'dueDate', headerAr: 'تاريخ الاستحقاق', headerEn: 'Due Date' },
    { key: 'createdAt', headerAr: 'تاريخ الإنشاء', headerEn: 'Created' },
  ],

  FamilyMember: [
    { key: 'beneficiary', headerAr: 'المستفيد', headerEn: 'Beneficiary' },
    { key: 'name', headerAr: 'الاسم', headerEn: 'Name' },
    { key: 'relation', headerAr: 'صلة القرابة', headerEn: 'Relation' },
    { key: 'phone', headerAr: 'الهاتف', headerEn: 'Phone' },
    { key: 'email', headerAr: 'البريد', headerEn: 'Email' },
    { key: 'isPrimary', headerAr: 'رئيسي', headerEn: 'Primary' },
  ],

  ResearchStudy: [
    { key: 'title', headerAr: 'العنوان', headerEn: 'Title' },
    { key: 'principalInvestigator', headerAr: 'الباحث الرئيسي', headerEn: 'PI' },
    { key: 'status', headerAr: 'الحالة', headerEn: 'Status' },
    { key: 'startDate', headerAr: 'تاريخ البدء', headerEn: 'Start Date' },
    { key: 'endDate', headerAr: 'تاريخ الانتهاء', headerEn: 'End Date' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Core export functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch data for export
 */
async function fetchExportData(modelName, options = {}) {
  const Model = mongoose.models[modelName];
  if (!Model) throw new Error(`Model not found: ${modelName}`);

  const { filter = {}, startDate, endDate, limit = 5000, sort = '-createdAt' } = options;

  const query = { ...filter };

  // Soft-delete aware
  if (Model.schema.paths.isDeleted) {
    query.isDeleted = { $ne: true };
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const columns = EXPORT_COLUMNS[modelName];
  const selectFields = columns ? columns.map(c => c.key).join(' ') : '';

  return Model.find(query)
    .select(selectFields || undefined)
    .sort(sort)
    .limit(Math.min(limit, 10000))
    .lean();
}

/**
 * Format a value for export (dates, ObjectIds, etc.)
 */
function formatValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'object' && value._id) return String(value._id);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Generate CSV string from data
 */
function toCSV(data, modelName, lang = 'ar') {
  const columns = EXPORT_COLUMNS[modelName];
  if (!columns) {
    // Auto-generate from first document
    if (data.length === 0) return '';
    const keys = Object.keys(data[0]).filter(k => k !== '_id' && k !== '__v');
    const header = keys.join(',');
    const rows = data.map(doc => keys.map(k => `"${formatValue(doc[k])}"`).join(','));
    return [header, ...rows].join('\n');
  }

  const headerKey = lang === 'ar' ? 'headerAr' : 'headerEn';
  const header = columns.map(c => `"${c[headerKey]}"`).join(',');
  const rows = data.map(doc => columns.map(c => `"${formatValue(doc[c.key])}"`).join(','));

  // Add BOM for Excel Arabic compatibility
  return '\uFEFF' + [header, ...rows].join('\n');
}

/**
 * Generate Excel workbook buffer
 */
async function toExcel(data, modelName, lang = 'ar') {
  let ExcelJS;
  try {
    ExcelJS = require('exceljs');
  } catch {
    throw new Error('exceljs package not installed');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'منصة التأهيل الموحدة';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(modelName, {
    views: [{ rightToLeft: lang === 'ar' }],
  });

  const columns = EXPORT_COLUMNS[modelName];
  const headerKey = lang === 'ar' ? 'headerAr' : 'headerEn';

  if (columns) {
    sheet.columns = columns.map(c => ({
      header: c[headerKey],
      key: c.key,
      width: 20,
    }));
  } else if (data.length > 0) {
    const keys = Object.keys(data[0]).filter(k => k !== '_id' && k !== '__v');
    sheet.columns = keys.map(k => ({ header: k, key: k, width: 18 }));
  }

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2196F3' } };
  headerRow.alignment = { horizontal: 'center' };

  // Add data rows
  for (const doc of data) {
    const row = {};
    const cols =
      columns ||
      Object.keys(doc)
        .filter(k => k !== '_id' && k !== '__v')
        .map(k => ({ key: k }));
    for (const col of cols) {
      row[col.key] = formatValue(doc[col.key]);
    }
    sheet.addRow(row);
  }

  return workbook.xlsx.writeBuffer();
}

/**
 * Generate PDF buffer (summary table)
 */
async function toPDF(data, modelName, options = {}) {
  let PDFDocument;
  try {
    PDFDocument = require('pdfkit');
  } catch {
    throw new Error('pdfkit package not installed');
  }

  const { title, lang = 'ar' } = options;
  const columns = EXPORT_COLUMNS[modelName];
  const headerKey = lang === 'ar' ? 'headerAr' : 'headerEn';

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Title
      doc.fontSize(16).text(title || `${modelName} Export — تصدير ${modelName}`, {
        align: 'center',
      });
      doc.moveDown();
      doc
        .fontSize(8)
        .text(`Generated: ${new Date().toISOString()} | Records: ${data.length}`, {
          align: 'center',
        });
      doc.moveDown();

      // Simple table
      const cols = columns
        ? columns.slice(0, 8) // Limit columns for PDF
        : Object.keys(data[0] || {})
            .filter(k => k !== '_id' && k !== '__v')
            .slice(0, 8)
            .map(k => ({ key: k, [headerKey]: k }));

      const colWidth = (doc.page.width - 60) / cols.length;
      const startX = 30;
      let y = doc.y;

      // Header
      doc.fontSize(7).font('Helvetica-Bold');
      cols.forEach((col, i) => {
        doc.text(col[headerKey] || col.key, startX + i * colWidth, y, {
          width: colWidth - 4,
          align: 'center',
        });
      });

      y += 15;
      doc
        .moveTo(startX, y)
        .lineTo(doc.page.width - 30, y)
        .stroke();
      y += 5;

      // Rows
      doc.font('Helvetica').fontSize(6);
      const maxRows = Math.min(data.length, 200); // PDF limit

      for (let r = 0; r < maxRows; r++) {
        if (y > doc.page.height - 40) {
          doc.addPage();
          y = 30;
        }

        const row = data[r];
        cols.forEach((col, i) => {
          const val = formatValue(row[col.key]);
          doc.text(val.substring(0, 30), startX + i * colWidth, y, {
            width: colWidth - 4,
            align: 'center',
          });
        });
        y += 12;
      }

      if (data.length > maxRows) {
        doc.moveDown();
        doc.fontSize(8).text(`... and ${data.length - maxRows} more records`, { align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Express Router
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');

function createExportRouter() {
  const router = express.Router();

  /**
   * GET /api/v1/platform/export/:model
   * Query: format=csv|xlsx|pdf, lang=ar|en, startDate, endDate, limit
   */
  router.get('/export/:model', async (req, res) => {
    try {
      const { model } = req.params;
      const { format = 'csv', lang = 'ar', startDate, endDate, limit } = req.query;

      const Model = mongoose.models[model];
      if (!Model) {
        return res.status(404).json({ success: false, message: `Model not found: ${model}` });
      }

      const data = await fetchExportData(model, {
        startDate,
        endDate,
        limit: parseInt(limit, 10) || 5000,
      });

      if (format === 'xlsx') {
        const buffer = await toExcel(data, model, lang);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${model}_export.xlsx"`);
        return res.send(buffer);
      }

      if (format === 'pdf') {
        const buffer = await toPDF(data, model, { lang });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${model}_export.pdf"`);
        return res.send(buffer);
      }

      // Default: CSV
      const csv = toCSV(data, model, lang);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${model}_export.csv"`);
      return res.send(csv);
    } catch (err) {
      logger.error(`[DDD-Export] Error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/platform/export — List exportable models
   */
  router.get('/export', (_req, res) => {
    const models = Object.keys(EXPORT_COLUMNS);
    const available = models.filter(m => !!mongoose.models[m]);
    res.json({
      success: true,
      models: available,
      formats: ['csv', 'xlsx', 'pdf'],
    });
  });

  return router;
}

module.exports = {
  EXPORT_COLUMNS,
  fetchExportData,
  toCSV,
  toExcel,
  toPDF,
  formatValue,
  createExportRouter,
};
