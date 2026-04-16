/**
 * ═══════════════════════════════════════════════════════════════
 *  prompt_09 — وحدة التقارير والتحليلات
 *  Reports & Analytics Module
 * ═══════════════════════════════════════════════════════════════
 *
 *  المسارات:
 *  ── قوالب التقارير (Report Templates) ──────────────────────────
 *  GET    /templates                   — قائمة القوالب
 *  GET    /templates/:id               — تفاصيل قالب
 *  POST   /templates                   — إنشاء قالب
 *  PUT    /templates/:id               — تعديل قالب
 *  DELETE /templates/:id               — حذف ناعم
 *
 *  ── تشغيل التقارير (Report Jobs) ────────────────────────────────
 *  POST   /jobs                        — تشغيل تقرير جديد
 *  GET    /jobs                        — سجل التقارير المُولَّدة
 *  GET    /jobs/:id                    — حالة / نتيجة تقرير
 *  GET    /jobs/:id/download           — تحميل ملف التقرير
 *  DELETE /jobs/:id                    — حذف تقرير
 *
 *  ── الجدولة التلقائية (Report Schedules) ───────────────────────
 *  GET    /schedules                   — قائمة الجدولات
 *  POST   /schedules                   — إنشاء جدولة
 *  PUT    /schedules/:id               — تعديل جدولة
 *  PATCH  /schedules/:id/toggle        — تفعيل / إيقاف
 *  DELETE /schedules/:id               — حذف جدولة
 *
 *  ── التحليلات التنفيذية (Executive Analytics) ──────────────────
 *  GET    /analytics/executive         — لوحة الإدارة التنفيذية
 *  GET    /analytics/beneficiaries     — تحليلات المستفيدين
 *  GET    /analytics/clinical          — التحليلات السريرية
 *  GET    /analytics/financial         — التحليلات المالية
 *  GET    /analytics/hr                — تحليلات الموارد البشرية
 *  GET    /analytics/operational       — التحليلات التشغيلية
 *  GET    /analytics/quality           — تحليلات الجودة
 *
 *  ── التقارير الجاهزة (Built-in Reports) ────────────────────────
 *  GET    /built-in/beneficiary-list          — قائمة المستفيدين
 *  GET    /built-in/beneficiary-progress      — تقدم المستفيدين
 *  GET    /built-in/assessments-summary       — ملخص التقييمات
 *  GET    /built-in/sessions-log              — سجل الجلسات
 *  GET    /built-in/attendance                — تقرير الحضور
 *  GET    /built-in/financial-summary         — الملخص المالي
 *  GET    /built-in/hr-headcount              — تعداد الموظفين
 *  GET    /built-in/inventory-status          — حالة المخزون
 *  GET    /built-in/quality-indicators        — مؤشرات الجودة
 *
 *  ── الإحصاءات العامة (Stats) ────────────────────────────────────
 *  GET    /stats                       — إحصاءات وحدة التقارير
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const ReportTemplate = require('../models/reports/ReportTemplate');
const ReportJob = require('../models/reports/ReportJob');
const ReportSchedule = require('../models/reports/ReportSchedule');
const safeError = require('../utils/safeError');
const escapeRegex = require('../utils/escapeRegex');
const { stripUpdateMeta } = require('../utils/sanitize');

// ══════════════════════════════════════════════════════════════════
//  مساعدات داخلية
// ══════════════════════════════════════════════════════════════════

/**
 * تنفيذ Aggregation pipeline ديناميكي على أي مجموعة
 * مع دعم فلاتر التاريخ، الفرع، والحالة
 */
async function runPipeline(collection, basePipeline = [], params = {}) {
  const db = mongoose.connection.db;
  const { date_from, date_to, branch_id, date_field = 'createdAt' } = params;

  const matchStage = { deleted_at: null };
  if (date_from || date_to) {
    matchStage[date_field] = {};
    if (date_from) matchStage[date_field].$gte = new Date(date_from);
    if (date_to) matchStage[date_field].$lte = new Date(date_to + 'T23:59:59.999Z');
  }
  if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
    matchStage.branch_id = new mongoose.Types.ObjectId(branch_id);
  }

  const pipeline = [{ $match: matchStage }, ...basePipeline];
  const result = await db.collection(collection).aggregate(pipeline).toArray();
  return result;
}

/**
 * بناء pipeline بسيط للتجميع حسب حقل
 */
function groupByField(field, countField = 'count') {
  return [
    { $group: { _id: `$${field}`, [countField]: { $sum: 1 } } },
    { $sort: { [countField]: -1 } },
    { $project: { _id: 0, label: '$_id', [countField]: 1 } },
  ];
}

// ══════════════════════════════════════════════════════════════════
//  1. قوالب التقارير — Report Templates
// ══════════════════════════════════════════════════════════════════

// GET /templates — قائمة القوالب
router.get('/templates', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { category, search, is_active, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (search) {
      filter.$or = [
        { name_ar: { $regex: escapeRegex(search), $options: 'i' } },
        { code: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [templates, total] = await Promise.all([
      ReportTemplate.find(filter)
        .select(
          'code name_ar category is_active is_schedulable supports_export export_formats createdAt'
        )
        .sort({ category: 1, name_ar: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReportTemplate.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /templates/:id — تفاصيل قالب
router.get('/templates/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const template = await ReportTemplate.findById(req.params.id)
      .populate('created_by', 'name email')
      .lean();
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /templates — إنشاء قالب
router.post('/templates', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const template = await ReportTemplate.create({
      ...req.body,
      created_by: req.user?._id,
    });
    res.status(201).json({ success: true, data: template, message: 'تم إنشاء القالب بنجاح' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'كود القالب مكرر' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /templates/:id — تعديل قالب
router.put('/templates/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const template = await ReportTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    if (template.is_system) {
      return res.status(403).json({ success: false, message: 'لا يمكن تعديل قوالب النظام' });
    }

    Object.assign(template, { ...stripUpdateMeta(req.body), updated_by: req.user?._id });
    template.version = (template.version || 1) + 1;
    await template.save();
    res.json({ success: true, data: template, message: 'تم تعديل القالب بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /templates/:id — حذف ناعم
router.delete('/templates/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const template = await ReportTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    if (template.is_system) {
      return res.status(403).json({ success: false, message: 'لا يمكن حذف قوالب النظام' });
    }
    await template.softDelete(req.user?._id);
    res.json({ success: true, message: 'تم حذف القالب' });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════
//  2. تشغيل التقارير — Report Jobs
// ══════════════════════════════════════════════════════════════════

// POST /jobs — تشغيل تقرير
router.post('/jobs', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { template_id, parameters = {}, export_format = 'preview' } = req.body;
    if (!template_id) {
      return res.status(400).json({ success: false, message: 'template_id مطلوب' });
    }

    const template = await ReportTemplate.findById(template_id);
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });

    // إنشاء مهمة التقرير
    const job = await ReportJob.create({
      template_id,
      requested_by: req.user?._id,
      branch_id: parameters.branch_id || req.user?.branch_id || null,
      parameters,
      export_format,
      triggered_by: 'manual',
      ip_address: req.ip,
      status: 'running',
      started_at: new Date(),
    });

    // تنفيذ التقرير فوراً (sync للـ preview، async للـ export)
    try {
      const result = await executeReport(template, parameters, export_format);
      const updateData = {
        status: 'completed',
        completed_at: new Date(),
        duration_ms: Date.now() - job.started_at.getTime(),
        total_rows: result.total_rows,
      };

      if (export_format === 'preview') {
        updateData.preview_data = result.data.slice(0, 500);
      } else {
        updateData.file_path = result.file_path || null;
        updateData.file_size_bytes = result.file_size || 0;
      }

      await ReportJob.findByIdAndUpdate(job._id, updateData);
      const finalJob = await ReportJob.findById(job._id).lean();

      return res.status(201).json({
        success: true,
        data: finalJob,
        message: 'تم تشغيل التقرير بنجاح',
      });
    } catch (execErr) {
      await ReportJob.findByIdAndUpdate(job._id, {
        status: 'failed',
        completed_at: new Date(),
        error_message: execErr.message,
      });
      safeError(res, error, 'reports-analytics-module');
        job_id: job._id,
      });
    }
  } catch (err) {
    safeError(res, err);
  }
});

// GET /jobs — سجل التقارير
router.get('/jobs', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { template_id, status, export_format, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (template_id) filter.template_id = template_id;
    if (status) filter.status = status;
    if (export_format) filter.export_format = export_format;

    // المستخدم العادي يرى تقاريره فقط؛ المسؤول يرى الكل
    if (req.user?.role !== 'admin' && req.user?.role !== 'director') {
      filter.requested_by = req.user?._id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      ReportJob.find(filter)
        .populate('template_id', 'name_ar category code')
        .populate('requested_by', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReportJob.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /jobs/:id — حالة / نتيجة تقرير
router.get('/jobs/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const job = await ReportJob.findById(req.params.id)
      .populate('template_id', 'name_ar category code columns')
      .populate('requested_by', 'name email')
      .lean();
    if (!job) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data: job });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /jobs/:id/download — تحميل ملف التقرير
router.get('/jobs/:id/download', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const job = await ReportJob.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    if (job.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'التقرير لم يكتمل بعد' });
    }
    if (!job.file_path) {
      return res.status(400).json({ success: false, message: 'لا يوجد ملف للتحميل (preview فقط)' });
    }

    const path = require('path');
    const fs = require('fs');
    const { pipeline } = require('stream');

    // Path-traversal guard: resolve and verify containment
    const reportsDir = path.resolve(__dirname, '..', 'generated_reports');
    const filePath = path.resolve(reportsDir, path.basename(job.file_path));
    if (!filePath.startsWith(reportsDir)) {
      return res.status(400).json({ success: false, message: 'مسار الملف غير صالح' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود على الخادم' });
    }

    const ext = job.export_format || 'pdf';
    const mimeTypes = {
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="report-${job.job_number}.${ext}"`);
    pipeline(fs.createReadStream(filePath), res, err => {
      if (err && !res.headersSent) {
        safeError(res, error, 'reports-analytics-module');
      }
    });
  } catch (err) {
    safeError(res, err);
  }
});

// DELETE /jobs/:id — حذف تقرير
router.delete('/jobs/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const job = await ReportJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    job.deleted_at = new Date();
    await job.save();
    res.json({ success: true, message: 'تم حذف التقرير' });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════
//  3. جدولة التقارير — Report Schedules
// ══════════════════════════════════════════════════════════════════

// GET /schedules
router.get('/schedules', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { is_active, template_id, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (template_id) filter.template_id = template_id;

    const skip = (Number(page) - 1) * Number(limit);
    const [schedules, total] = await Promise.all([
      ReportSchedule.find(filter)
        .populate('template_id', 'name_ar code category')
        .populate('created_by', 'name')
        .sort({ next_run_at: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReportSchedule.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: schedules,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /schedules
router.post('/schedules', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const schedule = await ReportSchedule.create({
      ...req.body,
      created_by: req.user?._id,
    });
    res.status(201).json({ success: true, data: schedule, message: 'تم إنشاء الجدولة بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /schedules/:id
router.put('/schedules/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'الجدولة غير موجودة' });
    Object.assign(schedule, { ...stripUpdateMeta(req.body), updated_by: req.user?._id });
    await schedule.save();
    res.json({ success: true, data: schedule, message: 'تم تعديل الجدولة بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /schedules/:id/toggle — تفعيل / إيقاف
router.patch('/schedules/:id/toggle', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'الجدولة غير موجودة' });
    schedule.is_active = !schedule.is_active;
    schedule.updated_by = req.user?._id;
    await schedule.save();
    res.json({
      success: true,
      data: { is_active: schedule.is_active },
      message: schedule.is_active ? 'تم تفعيل الجدولة' : 'تم إيقاف الجدولة',
    });
  } catch (err) {
    safeError(res, err);
  }
});

// DELETE /schedules/:id
router.delete('/schedules/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'الجدولة غير موجودة' });
    schedule.deleted_at = new Date();
    schedule.updated_by = req.user?._id;
    await schedule.save();
    res.json({ success: true, message: 'تم حذف الجدولة' });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════
//  4. التحليلات التنفيذية — Executive Analytics
// ══════════════════════════════════════════════════════════════════

// GET /analytics/executive — لوحة الإدارة التنفيذية
router.get('/analytics/executive', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const params = { date_from, date_to, branch_id };
    const db = mongoose.connection.db;

    const buildMatch = (extra = {}) => {
      const m = { deleted_at: null, ...extra };
      if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
        m.branch_id = new mongoose.Types.ObjectId(branch_id);
      }
      return m;
    };

    const [
      totalBeneficiaries,
      activeBeneficiaries,
      totalEmployees,
      totalSessions,
      pendingAssessments,
      openIncidents,
    ] = await Promise.all([
      db.collection('beneficiaries').countDocuments(buildMatch()),
      db.collection('beneficiaries').countDocuments(buildMatch({ status: 'active' })),
      db.collection('users').countDocuments({ deleted_at: null, is_active: true }),
      db.collection('rehab_sessions').countDocuments(buildMatch()),
      db
        .collection('assessments')
        .countDocuments(buildMatch({ status: { $in: ['draft', 'in_progress'] } })),
      db
        .collection('incident_reports')
        .countDocuments(buildMatch({ status: { $in: ['reported', 'under_investigation'] } })),
    ]);

    // تقدم المستفيدين حسب الشهر (آخر 6 أشهر)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRegistrations = await db
      .collection('beneficiaries')
      .aggregate([
        { $match: { deleted_at: null, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ])
      .toArray();

    // توزيع المستفيدين حسب نوع الإعاقة
    const disabilityDistribution = await db
      .collection('beneficiaries')
      .aggregate([{ $match: buildMatch() }, ...groupByField('disability_type')])
      .toArray();

    // إجمالي الإيرادات (من الفواتير المدفوعة)
    const revenueAgg = await db
      .collection('invoices')
      .aggregate([
        { $match: { deleted_at: null, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ])
      .toArray();
    const totalRevenue = revenueAgg[0]?.total || 0;

    res.json({
      success: true,
      data: {
        kpis: {
          total_beneficiaries: totalBeneficiaries,
          active_beneficiaries: activeBeneficiaries,
          total_employees: totalEmployees,
          total_sessions: totalSessions,
          pending_assessments: pendingAssessments,
          open_incidents: openIncidents,
          total_revenue: totalRevenue,
        },
        charts: {
          monthly_registrations: monthlyRegistrations,
          disability_distribution: disabilityDistribution,
        },
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /analytics/beneficiaries — تحليلات المستفيدين
router.get('/analytics/beneficiaries', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      match.branch_id = new mongoose.Types.ObjectId(branch_id);
    }
    if (date_from || date_to) {
      match.createdAt = {};
      if (date_from) match.createdAt.$gte = new Date(date_from);
      if (date_to) match.createdAt.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const [byDisabilityType, bySeverity, byGender, byAgeGroup, byStatus, byNationality] =
      await Promise.all([
        db
          .collection('beneficiaries')
          .aggregate([{ $match: match }, ...groupByField('disability_type')])
          .toArray(),

        db
          .collection('beneficiaries')
          .aggregate([{ $match: match }, ...groupByField('disability_severity')])
          .toArray(),

        db
          .collection('beneficiaries')
          .aggregate([{ $match: match }, ...groupByField('gender')])
          .toArray(),

        // توزيع حسب الفئة العمرية
        db
          .collection('beneficiaries')
          .aggregate([
            { $match: { ...match, date_of_birth: { $exists: true, $ne: null } } },
            {
              $addFields: {
                age_years: {
                  $floor: {
                    $divide: [
                      { $subtract: [new Date(), '$date_of_birth'] },
                      1000 * 60 * 60 * 24 * 365,
                    ],
                  },
                },
              },
            },
            {
              $bucket: {
                groupBy: '$age_years',
                boundaries: [0, 3, 6, 12, 18, 25, 40, 60, 100],
                default: 'أخرى',
                output: { count: { $sum: 1 } },
              },
            },
          ])
          .toArray(),

        db
          .collection('beneficiaries')
          .aggregate([{ $match: match }, ...groupByField('status')])
          .toArray(),

        db
          .collection('beneficiaries')
          .aggregate([{ $match: match }, ...groupByField('nationality')])
          .toArray(),
      ]);

    res.json({
      success: true,
      data: {
        by_disability_type: byDisabilityType,
        by_severity: bySeverity,
        by_gender: byGender,
        by_age_group: byAgeGroup,
        by_status: byStatus,
        by_nationality: byNationality,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /analytics/clinical — التحليلات السريرية
router.get('/analytics/clinical', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const db = mongoose.connection.db;

    const matchBase = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      matchBase.branch_id = new mongoose.Types.ObjectId(branch_id);
    }
    if (date_from || date_to) {
      matchBase.createdAt = {};
      if (date_from) matchBase.createdAt.$gte = new Date(date_from);
      if (date_to) matchBase.createdAt.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const [
      sessionsByType,
      sessionsByStatus,
      sessionsBySpecialization,
      assessmentsByTool,
      assessmentsByType,
      goalCompletionRate,
      avgSessionsPerBeneficiary,
    ] = await Promise.all([
      // جلسات حسب النوع
      db
        .collection('rehab_sessions')
        .aggregate([{ $match: matchBase }, ...groupByField('session_type')])
        .toArray(),

      // جلسات حسب الحالة
      db
        .collection('rehab_sessions')
        .aggregate([{ $match: matchBase }, ...groupByField('status')])
        .toArray(),

      // جلسات حسب التخصص
      db
        .collection('rehab_sessions')
        .aggregate([{ $match: matchBase }, ...groupByField('specialization')])
        .toArray(),

      // التقييمات حسب الأداة
      db
        .collection('assessments')
        .aggregate([
          { $match: matchBase },
          {
            $lookup: {
              from: 'assessment_tools',
              localField: 'tool_id',
              foreignField: '_id',
              as: 'tool',
            },
          },
          { $unwind: { path: '$tool', preserveNullAndEmptyArrays: true } },
          { $group: { _id: '$tool.abbreviation', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, label: '$_id', count: 1 } },
        ])
        .toArray(),

      // التقييمات حسب النوع
      db
        .collection('assessments')
        .aggregate([{ $match: matchBase }, ...groupByField('assessment_type')])
        .toArray(),

      // معدل إتمام الأهداف
      db
        .collection('rehab_goals')
        .aggregate([
          { $match: { deleted_at: null } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ])
        .toArray(),

      // متوسط الجلسات لكل مستفيد
      db
        .collection('rehab_sessions')
        .aggregate([
          { $match: matchBase },
          { $group: { _id: '$beneficiary_id', sessions: { $sum: 1 } } },
          { $group: { _id: null, avg: { $avg: '$sessions' }, total_beneficiaries: { $sum: 1 } } },
          { $project: { _id: 0, avg_sessions: { $round: ['$avg', 1] }, total_beneficiaries: 1 } },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      data: {
        sessions: {
          by_type: sessionsByType,
          by_status: sessionsByStatus,
          by_specialization: sessionsBySpecialization,
          avg_per_beneficiary: avgSessionsPerBeneficiary[0] || {
            avg_sessions: 0,
            total_beneficiaries: 0,
          },
        },
        assessments: {
          by_tool: assessmentsByTool,
          by_type: assessmentsByType,
        },
        goals: {
          completion_rate: goalCompletionRate,
        },
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /analytics/financial — التحليلات المالية
router.get('/analytics/financial', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const db = mongoose.connection.db;

    const matchInvoice = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      matchInvoice.branch_id = new mongoose.Types.ObjectId(branch_id);
    }
    if (date_from || date_to) {
      matchInvoice.invoice_date = {};
      if (date_from) matchInvoice.invoice_date.$gte = new Date(date_from);
      if (date_to) matchInvoice.invoice_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const [
      revenueSummary,
      revenueByMonth,
      revenueByPaymentMethod,
      invoicesByStatus,
      expensesByCategory,
      vatSummary,
    ] = await Promise.all([
      // ملخص الإيرادات
      db
        .collection('invoices')
        .aggregate([
          { $match: matchInvoice },
          {
            $group: {
              _id: null,
              total_invoiced: { $sum: '$total_amount' },
              total_paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total_amount', 0] } },
              total_outstanding: {
                $sum: { $cond: [{ $ne: ['$status', 'paid'] }, '$total_amount', 0] },
              },
              total_vat: { $sum: '$vat_amount' },
              invoice_count: { $sum: 1 },
            },
          },
          { $project: { _id: 0 } },
        ])
        .toArray(),

      // الإيرادات الشهرية
      db
        .collection('invoices')
        .aggregate([
          { $match: { deleted_at: null, status: 'paid' } },
          {
            $group: {
              _id: { year: { $year: '$invoice_date' }, month: { $month: '$invoice_date' } },
              revenue: { $sum: '$total_amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
          {
            $project: {
              _id: 0,
              year: '$_id.year',
              month: '$_id.month',
              revenue: { $round: ['$revenue', 2] },
              count: 1,
            },
          },
        ])
        .toArray(),

      // الإيرادات حسب طريقة الدفع
      db
        .collection('finance_payments')
        .aggregate([
          { $match: { deleted_at: null } },
          {
            $group: {
              _id: '$payment_method',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
          { $project: { _id: 0, method: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
        ])
        .toArray(),

      // الفواتير حسب الحالة
      db
        .collection('invoices')
        .aggregate([{ $match: { deleted_at: null } }, ...groupByField('status')])
        .toArray(),

      // المصروفات حسب الفئة
      db
        .collection('expenses')
        .aggregate([
          { $match: { deleted_at: null } },
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $project: { _id: 0, category: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
        ])
        .toArray(),

      // ملخص الضريبة (ZATCA)
      db
        .collection('invoices')
        .aggregate([
          { $match: { deleted_at: null, status: 'paid' } },
          {
            $group: {
              _id: null,
              total_vat_collected: { $sum: '$vat_amount' },
              taxable_invoices: { $sum: { $cond: [{ $gt: ['$vat_amount', 0] }, 1, 0] } },
            },
          },
          { $project: { _id: 0 } },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      data: {
        summary: revenueSummary[0] || {
          total_invoiced: 0,
          total_paid: 0,
          total_outstanding: 0,
          total_vat: 0,
          invoice_count: 0,
        },
        revenue_by_month: revenueByMonth,
        revenue_by_payment_method: revenueByPaymentMethod,
        invoices_by_status: invoicesByStatus,
        expenses_by_category: expensesByCategory,
        vat_summary: vatSummary[0] || { total_vat_collected: 0, taxable_invoices: 0 },
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /analytics/hr — تحليلات الموارد البشرية
router.get('/analytics/hr', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const db = mongoose.connection.db;

    const matchHR = { deleted_at: null, is_active: true };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      matchHR.branch_id = new mongoose.Types.ObjectId(branch_id);
    }

    const [
      headcountByDept,
      headcountByNationality,
      headcountByContractType,
      leavesByType,
      avgAttendanceRate,
      newHiresThisMonth,
    ] = await Promise.all([
      db
        .collection('users')
        .aggregate([{ $match: matchHR }, ...groupByField('department')])
        .toArray(),

      db
        .collection('users')
        .aggregate([{ $match: matchHR }, ...groupByField('nationality')])
        .toArray(),

      db
        .collection('users')
        .aggregate([{ $match: matchHR }, ...groupByField('contract_type')])
        .toArray(),

      // الإجازات حسب النوع
      db
        .collection('leave_requests')
        .aggregate([{ $match: { deleted_at: null } }, ...groupByField('leave_type')])
        .toArray(),

      // متوسط نسبة الحضور
      db
        .collection('attendance_records')
        .aggregate([
          { $match: { deleted_at: null } },
          {
            $group: {
              _id: '$employee_id',
              present_days: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
              total_days: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: null,
              avg_attendance_pct: {
                $avg: {
                  $multiply: [{ $divide: ['$present_days', { $max: ['$total_days', 1] }] }, 100],
                },
              },
            },
          },
          { $project: { _id: 0, avg_attendance_pct: { $round: ['$avg_attendance_pct', 1] } } },
        ])
        .toArray(),

      // الموظفون الجدد هذا الشهر
      db.collection('users').countDocuments({
        deleted_at: null,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        headcount: {
          by_department: headcountByDept,
          by_nationality: headcountByNationality,
          by_contract_type: headcountByContractType,
          new_hires_this_month: newHiresThisMonth,
        },
        leaves_by_type: leavesByType,
        avg_attendance_rate: avgAttendanceRate[0]?.avg_attendance_pct || 0,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /analytics/operational — التحليلات التشغيلية
router.get('/analytics/operational', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const db = mongoose.connection.db;

    const matchBase = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      matchBase.branch_id = new mongoose.Types.ObjectId(branch_id);
    }

    const [
      appointmentsByStatus,
      appointmentsByDay,
      transportTripsByStatus,
      inventoryLowStock,
      filesStats,
      pendingApprovals,
    ] = await Promise.all([
      // المواعيد حسب الحالة
      db
        .collection('appointments')
        .aggregate([{ $match: matchBase }, ...groupByField('status')])
        .toArray(),

      // المواعيد حسب اليوم (آخر 30 يوم)
      db
        .collection('appointments')
        .aggregate([
          {
            $match: {
              ...matchBase,
              appointment_date: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
            },
          },
          {
            $group: {
              _id: { $dayOfWeek: '$appointment_date' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, day_of_week: '$_id', count: 1 } },
        ])
        .toArray(),

      // رحلات النقل حسب الحالة
      db
        .collection('transport_trips')
        .aggregate([{ $match: matchBase }, ...groupByField('status')])
        .toArray(),

      // أصناف المخزون منخفضة
      db.collection('inventory_items').countDocuments({
        deleted_at: null,
        $expr: { $lte: ['$quantity_available', '$reorder_point'] },
      }),

      // إحصاءات الملفات
      db
        .collection('file_records')
        .aggregate([
          { $match: matchBase },
          {
            $group: {
              _id: null,
              total_files: { $sum: 1 },
              total_size_mb: { $sum: { $divide: [{ $ifNull: ['$file_size', 0] }, 1048576] } },
            },
          },
          {
            $project: { _id: 0, total_files: 1, total_size_mb: { $round: ['$total_size_mb', 2] } },
          },
        ])
        .toArray(),

      // الموافقات المعلقة
      db.collection('approval_requests').countDocuments({ deleted_at: null, status: 'pending' }),
    ]);

    res.json({
      success: true,
      data: {
        appointments: {
          by_status: appointmentsByStatus,
          by_day_of_week: appointmentsByDay,
        },
        transport: {
          trips_by_status: transportTripsByStatus,
        },
        inventory: {
          low_stock_items: inventoryLowStock,
        },
        files: filesStats[0] || { total_files: 0, total_size_mb: 0 },
        pending_approvals: pendingApprovals,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /analytics/quality — تحليلات الجودة
router.get('/analytics/quality', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const db = mongoose.connection.db;

    const matchBase = { deleted_at: null };
    if (date_from || date_to) {
      matchBase.createdAt = {};
      if (date_from) matchBase.createdAt.$gte = new Date(date_from);
      if (date_to) matchBase.createdAt.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const [
      indicatorsByCategory,
      measurementsByPerformance,
      incidentsBySeverity,
      incidentsByStatus,
      topIndicators,
    ] = await Promise.all([
      db
        .collection('quality_indicators')
        .aggregate([{ $match: matchBase }, ...groupByField('category')])
        .toArray(),

      db
        .collection('quality_measurements')
        .aggregate([{ $match: matchBase }, ...groupByField('performance_status')])
        .toArray(),

      db
        .collection('incident_reports')
        .aggregate([{ $match: matchBase }, ...groupByField('severity')])
        .toArray(),

      db
        .collection('incident_reports')
        .aggregate([{ $match: matchBase }, ...groupByField('status')])
        .toArray(),

      // أفضل مؤشرات الجودة (حسب آخر قياس)
      db
        .collection('quality_measurements')
        .aggregate([
          { $match: { deleted_at: null } },
          { $sort: { measurement_date: -1 } },
          {
            $group: {
              _id: '$indicator_id',
              latest_value: { $first: '$actual_value' },
              performance_status: { $first: '$performance_status' },
            },
          },
          {
            $lookup: {
              from: 'quality_indicators',
              localField: '_id',
              foreignField: '_id',
              as: 'indicator',
            },
          },
          { $unwind: { path: '$indicator', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              name_ar: '$indicator.name_ar',
              category: '$indicator.category',
              latest_value: 1,
              performance_status: 1,
              target: '$indicator.target_value',
            },
          },
          { $limit: 10 },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      data: {
        indicators_by_category: indicatorsByCategory,
        measurements_by_performance: measurementsByPerformance,
        incidents: {
          by_severity: incidentsBySeverity,
          by_status: incidentsByStatus,
        },
        top_indicators: topIndicators,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════
//  5. التقارير الجاهزة — Built-in Reports
// ══════════════════════════════════════════════════════════════════

// GET /built-in/beneficiary-list — قائمة المستفيدين
router.get('/built-in/beneficiary-list', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const {
      status,
      disability_type,
      branch_id,
      gender,
      date_from,
      date_to,
      page = 1,
      limit = 50,
    } = req.query;

    const db = mongoose.connection.db;
    const match = { deleted_at: null };
    if (status) match.status = status;
    if (disability_type) match.disability_type = disability_type;
    if (gender) match.gender = gender;
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      match.branch_id = new mongoose.Types.ObjectId(branch_id);
    }
    if (date_from || date_to) {
      match.createdAt = {};
      if (date_from) match.createdAt.$gte = new Date(date_from);
      if (date_to) match.createdAt.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      db
        .collection('beneficiaries')
        .aggregate([
          { $match: match },
          {
            $lookup: {
              from: 'branches',
              localField: 'branch_id',
              foreignField: '_id',
              as: 'branch',
            },
          },
          { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              file_number: 1,
              full_name_ar: 1,
              gender: 1,
              date_of_birth: 1,
              disability_type: 1,
              disability_severity: 1,
              status: 1,
              nationality: 1,
              branch_name: '$branch.name_ar',
              createdAt: 1,
            },
          },
          { $sort: { full_name_ar: 1 } },
          { $skip: skip },
          { $limit: Number(limit) },
        ])
        .toArray(),
      db.collection('beneficiaries').countDocuments(match),
    ]);

    res.json({
      success: true,
      report: 'قائمة المستفيدين',
      data,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/beneficiary-progress — تقدم المستفيدين
router.get('/built-in/beneficiary-progress', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { branch_id, date_from, date_to, page = 1, limit = 50 } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      match.branch_id = new mongoose.Types.ObjectId(branch_id);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const data = await db
      .collection('beneficiaries')
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'rehab_plans',
            localField: '_id',
            foreignField: 'beneficiary_id',
            as: 'plans',
          },
        },
        {
          $lookup: {
            from: 'assessments',
            let: { bid: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$beneficiary_id', '$$bid'] }, deleted_at: null } },
              { $sort: { assessment_date: -1 } },
              { $limit: 1 },
            ],
            as: 'latest_assessment',
          },
        },
        {
          $project: {
            full_name_ar: 1,
            file_number: 1,
            disability_type: 1,
            active_plans: {
              $size: { $filter: { input: '$plans', cond: { $eq: ['$$this.status', 'active'] } } },
            },
            total_plans: { $size: '$plans' },
            latest_assessment_date: { $arrayElemAt: ['$latest_assessment.assessment_date', 0] },
            latest_classification: {
              $arrayElemAt: ['$latest_assessment.overall_classification', 0],
            },
          },
        },
        { $sort: { full_name_ar: 1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ])
      .toArray();

    const total = await db.collection('beneficiaries').countDocuments(match);

    res.json({
      success: true,
      report: 'تقدم المستفيدين',
      data,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/assessments-summary — ملخص التقييمات
router.get('/built-in/assessments-summary', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id, tool_id, page = 1, limit = 50 } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      match.branch_id = new mongoose.Types.ObjectId(branch_id);
    }
    if (tool_id && mongoose.Types.ObjectId.isValid(tool_id)) {
      match.tool_id = new mongoose.Types.ObjectId(tool_id);
    }
    if (date_from || date_to) {
      match.assessment_date = {};
      if (date_from) match.assessment_date.$gte = new Date(date_from);
      if (date_to) match.assessment_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      db
        .collection('assessments')
        .aggregate([
          { $match: match },
          {
            $lookup: {
              from: 'beneficiaries',
              localField: 'beneficiary_id',
              foreignField: '_id',
              as: 'beneficiary',
            },
          },
          {
            $lookup: {
              from: 'assessment_tools',
              localField: 'tool_id',
              foreignField: '_id',
              as: 'tool',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'assessor_id',
              foreignField: '_id',
              as: 'assessor',
            },
          },
          {
            $project: {
              assessment_number: 1,
              assessment_date: 1,
              assessment_type: 1,
              status: 1,
              total_standard_score: 1,
              overall_classification: 1,
              completion_percentage: 1,
              beneficiary_name: { $arrayElemAt: ['$beneficiary.full_name_ar', 0] },
              file_number: { $arrayElemAt: ['$beneficiary.file_number', 0] },
              tool_name: { $arrayElemAt: ['$tool.abbreviation', 0] },
              assessor_name: { $arrayElemAt: ['$assessor.name', 0] },
            },
          },
          { $sort: { assessment_date: -1 } },
          { $skip: skip },
          { $limit: Number(limit) },
        ])
        .toArray(),
      db.collection('assessments').countDocuments(match),
    ]);

    res.json({
      success: true,
      report: 'ملخص التقييمات',
      data,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/sessions-log — سجل الجلسات
router.get('/built-in/sessions-log', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id, therapist_id, status, page = 1, limit = 50 } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      match.branch_id = new mongoose.Types.ObjectId(branch_id);
    }
    if (therapist_id && mongoose.Types.ObjectId.isValid(therapist_id)) {
      match.therapist_id = new mongoose.Types.ObjectId(therapist_id);
    }
    if (status) match.status = status;
    if (date_from || date_to) {
      match.session_date = {};
      if (date_from) match.session_date.$gte = new Date(date_from);
      if (date_to) match.session_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      db
        .collection('rehab_sessions')
        .aggregate([
          { $match: match },
          {
            $lookup: {
              from: 'beneficiaries',
              localField: 'beneficiary_id',
              foreignField: '_id',
              as: 'beneficiary',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'therapist_id',
              foreignField: '_id',
              as: 'therapist',
            },
          },
          {
            $project: {
              session_number: 1,
              session_date: 1,
              session_type: 1,
              status: 1,
              duration_minutes: 1,
              attendance_status: 1,
              goal_progress_percentage: 1,
              beneficiary_name: { $arrayElemAt: ['$beneficiary.full_name_ar', 0] },
              therapist_name: { $arrayElemAt: ['$therapist.name', 0] },
            },
          },
          { $sort: { session_date: -1 } },
          { $skip: skip },
          { $limit: Number(limit) },
        ])
        .toArray(),
      db.collection('rehab_sessions').countDocuments(match),
    ]);

    res.json({
      success: true,
      report: 'سجل الجلسات',
      data,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/attendance — تقرير الحضور
router.get('/built-in/attendance', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id, employee_id, page = 1, limit = 50 } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      match.branch_id = new mongoose.Types.ObjectId(branch_id);
    }
    if (employee_id && mongoose.Types.ObjectId.isValid(employee_id)) {
      match.employee_id = new mongoose.Types.ObjectId(employee_id);
    }
    if (date_from || date_to) {
      match.attendance_date = {};
      if (date_from) match.attendance_date.$gte = new Date(date_from);
      if (date_to) match.attendance_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total, summary] = await Promise.all([
      db
        .collection('attendance_records')
        .aggregate([
          { $match: match },
          {
            $lookup: {
              from: 'users',
              localField: 'employee_id',
              foreignField: '_id',
              as: 'employee',
            },
          },
          {
            $project: {
              attendance_date: 1,
              status: 1,
              check_in: 1,
              check_out: 1,
              late_minutes: 1,
              employee_name: { $arrayElemAt: ['$employee.name', 0] },
              employee_dept: { $arrayElemAt: ['$employee.department', 0] },
            },
          },
          { $sort: { attendance_date: -1 } },
          { $skip: skip },
          { $limit: Number(limit) },
        ])
        .toArray(),
      db.collection('attendance_records').countDocuments(match),
      db
        .collection('attendance_records')
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      report: 'تقرير الحضور',
      data,
      summary,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/financial-summary — الملخص المالي
router.get('/built-in/financial-summary', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const db = mongoose.connection.db;

    const matchInv = { deleted_at: null };
    if (date_from || date_to) {
      matchInv.invoice_date = {};
      if (date_from) matchInv.invoice_date.$gte = new Date(date_from);
      if (date_to) matchInv.invoice_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      matchInv.branch_id = new mongoose.Types.ObjectId(branch_id);
    }

    const [invoices, payments, expenses] = await Promise.all([
      db
        .collection('invoices')
        .aggregate([
          { $match: matchInv },
          {
            $group: {
              _id: '$status',
              total_amount: { $sum: '$total_amount' },
              total_vat: { $sum: '$vat_amount' },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              total_amount: { $round: ['$total_amount', 2] },
              total_vat: { $round: ['$total_vat', 2] },
              count: 1,
            },
          },
        ])
        .toArray(),

      db
        .collection('finance_payments')
        .aggregate([
          { $match: { deleted_at: null } },
          {
            $group: {
              _id: '$payment_method',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              method: '$_id',
              total: { $round: ['$total', 2] },
              count: 1,
            },
          },
        ])
        .toArray(),

      db
        .collection('expenses')
        .aggregate([
          { $match: { deleted_at: null } },
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $project: { _id: 0, category: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
          { $sort: { total: -1 } },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      report: 'الملخص المالي',
      data: { invoices, payments, expenses },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/hr-headcount — تعداد الموظفين
router.get('/built-in/hr-headcount', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null, is_active: true };
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      match.branch_id = new mongoose.Types.ObjectId(branch_id);
    }

    const [byDept, byRole, byNationality, byGender, total] = await Promise.all([
      db
        .collection('users')
        .aggregate([{ $match: match }, ...groupByField('department')])
        .toArray(),
      db
        .collection('users')
        .aggregate([{ $match: match }, ...groupByField('role')])
        .toArray(),
      db
        .collection('users')
        .aggregate([{ $match: match }, ...groupByField('nationality')])
        .toArray(),
      db
        .collection('users')
        .aggregate([{ $match: match }, ...groupByField('gender')])
        .toArray(),
      db.collection('users').countDocuments(match),
    ]);

    res.json({
      success: true,
      report: 'تعداد الموظفين',
      data: {
        total,
        by_department: byDept,
        by_role: byRole,
        by_nationality: byNationality,
        by_gender: byGender,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/inventory-status — حالة المخزون
router.get('/built-in/inventory-status', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null };
    if (category) match.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, lowStock, outOfStock] = await Promise.all([
      db
        .collection('inventory_items')
        .aggregate([
          { $match: match },
          {
            $addFields: {
              stock_status: {
                $switch: {
                  branches: [
                    { case: { $lte: ['$quantity_available', 0] }, then: 'نفد المخزون' },
                    { case: { $lte: ['$quantity_available', '$reorder_point'] }, then: 'منخفض' },
                  ],
                  default: 'جيد',
                },
              },
            },
          },
          {
            $project: {
              item_code: 1,
              name_ar: 1,
              category: 1,
              quantity_on_hand: 1,
              quantity_reserved: 1,
              quantity_available: 1,
              reorder_point: 1,
              unit: 1,
              stock_status: 1,
            },
          },
          { $sort: { quantity_available: 1 } },
          { $skip: skip },
          { $limit: Number(limit) },
        ])
        .toArray(),
      db.collection('inventory_items').countDocuments(match),
      db.collection('inventory_items').countDocuments({
        ...match,
        $expr: {
          $and: [
            { $gt: ['$quantity_available', 0] },
            { $lte: ['$quantity_available', '$reorder_point'] },
          ],
        },
      }),
      db.collection('inventory_items').countDocuments({
        ...match,
        $expr: { $lte: ['$quantity_available', 0] },
      }),
    ]);

    res.json({
      success: true,
      report: 'حالة المخزون',
      data: items,
      summary: { total_items: total, low_stock: lowStock, out_of_stock: outOfStock },
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /built-in/quality-indicators — مؤشرات الجودة
router.get('/built-in/quality-indicators', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { category, performance_status, page = 1, limit = 50 } = req.query;
    const db = mongoose.connection.db;

    const match = { deleted_at: null };
    if (category) match.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const data = await db
      .collection('quality_indicators')
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'quality_measurements',
            let: { indId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$indicator_id', '$$indId'] },
                  deleted_at: null,
                },
              },
              { $sort: { measurement_date: -1 } },
              { $limit: 1 },
            ],
            as: 'latest_measurement',
          },
        },
        {
          $addFields: {
            latest_value: { $arrayElemAt: ['$latest_measurement.actual_value', 0] },
            latest_status: { $arrayElemAt: ['$latest_measurement.performance_status', 0] },
            latest_date: { $arrayElemAt: ['$latest_measurement.measurement_date', 0] },
            variance: { $arrayElemAt: ['$latest_measurement.variance', 0] },
          },
        },
        {
          $match: performance_status ? { latest_status: performance_status } : {},
        },
        {
          $project: {
            indicator_code: 1,
            name_ar: 1,
            category: 1,
            target_value: 1,
            unit: 1,
            latest_value: 1,
            latest_status: 1,
            latest_date: 1,
            variance: 1,
          },
        },
        { $sort: { category: 1, name_ar: 1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ])
      .toArray();

    const total = await db.collection('quality_indicators').countDocuments(match);

    res.json({
      success: true,
      report: 'مؤشرات الجودة',
      data,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════
//  6. إحصاءات وحدة التقارير — Stats
// ══════════════════════════════════════════════════════════════════

router.get('/stats', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const [totalTemplates, activeSchedules, jobsToday, jobsThisMonth, failedJobs, topTemplates] =
      await Promise.all([
        ReportTemplate.countDocuments({ is_active: true }),
        ReportSchedule.countDocuments({ is_active: true }),
        ReportJob.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        }),
        ReportJob.countDocuments({
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        }),
        ReportJob.countDocuments({ status: 'failed' }),
        ReportJob.aggregate([
          { $match: { deleted_at: null } },
          { $group: { _id: '$template_id', runs: { $sum: 1 } } },
          { $sort: { runs: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'report_templates',
              localField: '_id',
              foreignField: '_id',
              as: 'template',
            },
          },
          { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              template_name: '$template.name_ar',
              template_code: '$template.code',
              runs: 1,
            },
          },
        ]),
      ]);

    res.json({
      success: true,
      data: {
        total_templates: totalTemplates,
        active_schedules: activeSchedules,
        jobs_today: jobsToday,
        jobs_this_month: jobsThisMonth,
        failed_jobs: failedJobs,
        top_templates: topTemplates,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════
//  دالة مساعدة: تنفيذ التقرير
// ══════════════════════════════════════════════════════════════════

async function executeReport(template, parameters = {}, exportFormat = 'preview') {
  const db = mongoose.connection.db;
  const { date_from, date_to, branch_id } = parameters;

  // بناء مرحلة المطابقة الأساسية
  const match = { deleted_at: null };
  if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
    match.branch_id = new mongoose.Types.ObjectId(branch_id);
  }
  if (date_from || date_to) {
    const dateField = template.data_source?.date_field || 'createdAt';
    match[dateField] = {};
    if (date_from) match[dateField].$gte = new Date(date_from);
    if (date_to) match[dateField].$lte = new Date(date_to + 'T23:59:59.999Z');
  }

  // إضافة فلاتر إضافية من parameters
  const allowedFilterKeys = (template.filters || []).map(f => f.key);
  for (const key of allowedFilterKeys) {
    if (parameters[key] !== undefined && parameters[key] !== '') {
      match[key] = parameters[key];
    }
  }

  // تجميع الـ pipeline
  const pipeline = [{ $match: match }, ...(template.data_source?.pipeline || [])];

  // حد الصفوف
  const maxRows = template.max_rows || 10000;
  pipeline.push({ $limit: maxRows });

  const data = await db.collection(template.data_source.collection).aggregate(pipeline).toArray();

  return {
    data,
    total_rows: data.length,
    file_path: null, // في حالة الـ preview لا يوجد ملف
  };
}

module.exports = router;
