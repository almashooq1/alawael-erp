/**
 * KPI Reports Routes — مسارات تقارير KPI
 * النظام 36: لوحة KPIs الذكية
 * Endpoints: /api/kpi-reports/*
 */
'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const router = express.Router();

// 🔒 All KPI Reports routes require authentication
router.use(authenticate);
router.use(requireBranchAccess);
const KpiReport = require('../models/KpiReport');
const KpiValue = require('../models/KpiValue');
const KpiScorecard = require('../models/KpiScorecard');
const safeError = require('../utils/safeError');

// ─── قائمة التقارير ──────────────────────────────────────────────────────────

// GET /api/kpi-reports — قائمة التقارير
router.get('/', async (req, res) => {
  try {
    const { branchId, reportType, status, page = 1, perPage = 15 } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const [data, total] = await Promise.all([
      KpiReport.find(query)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(perPage))
        .limit(parseInt(perPage)),
      KpiReport.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(perPage)),
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /api/kpi-reports/:id — تفاصيل تقرير
router.get('/:id', async (req, res) => {
  try {
    const report = await KpiReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data: report });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/kpi-reports/generate — إنشاء تقرير جديد
router.post('/generate', async (req, res) => {
  try {
    const {
      branchId,
      reportType = 'monthly',
      periodFrom,
      periodTo,
      format = 'pdf',
      includedKpis,
      includedDepartments,
      recipients,
    } = req.body;

    if (!branchId || !periodFrom || !periodTo) {
      return res.status(400).json({ success: false, message: 'الحقول المطلوبة ناقصة' });
    }

    // إنشاء سجل التقرير
    const report = await KpiReport.create({
      branchId,
      title: `KPI Report - ${reportType} - ${periodFrom}`,
      titleAr: `تقرير مؤشرات الأداء - ${reportType} - ${periodFrom}`,
      reportType,
      status: 'generating',
      periodFrom: new Date(periodFrom),
      periodTo: new Date(periodTo),
      format,
      includedKpis: includedKpis || null,
      includedDepartments: includedDepartments || null,
      recipients: recipients || null,
      isAuto: false,
      createdBy: req.user?._id,
    });

    // جمع البيانات للتقرير
    const [values, scorecard] = await Promise.all([
      KpiValue.find({
        branchId,
        periodDate: { $gte: new Date(periodFrom), $lte: new Date(periodTo) },
        ...(includedKpis?.length ? { kpiDefinitionId: { $in: includedKpis } } : {}),
      }).populate({ path: 'kpiDefinitionId', populate: { path: 'categoryId' } }),
      KpiScorecard.findOne({ branchId, periodDate: { $gte: new Date(periodFrom) } }).sort({
        periodDate: -1,
      }),
    ]);

    // محاكاة إنشاء الملف (في الإنتاج يُستبدل بـ PDF/Excel generator)
    const simulatedPath = `reports/kpi_report_${report._id}_${branchId}.${format}`;

    await KpiReport.findByIdAndUpdate(report._id, {
      status: 'ready',
      filePath: simulatedPath,
      fileSize: values.length * 512,
      generationTimeMs: 1200,
      generatedAt: new Date(),
    });

    const updated = await KpiReport.findById(report._id);

    res.json({
      success: true,
      message: 'تم إنشاء التقرير بنجاح',
      data: updated,
      summary: {
        kpisCount: values.length,
        overallScore: scorecard?.overallScore || null,
        rating: scorecard?.rating || null,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /api/kpi-reports/:id/download — تحميل التقرير
router.get('/:id/download', async (req, res) => {
  try {
    const report = await KpiReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    if (report.status !== 'ready') {
      return res.status(422).json({ success: false, message: 'التقرير غير جاهز بعد' });
    }

    await KpiReport.findByIdAndUpdate(report._id, { $inc: { downloadCount: 1 } });

    // في الإنتاج: return res.download(report.filePath)
    res.json({
      success: true,
      message: 'رابط التحميل',
      filePath: report.filePath,
      downloadCount: report.downloadCount + 1,
    });
  } catch (err) {
    safeError(res, err);
  }
});

// DELETE /api/kpi-reports/:id — حذف تقرير
router.delete('/:id', async (req, res) => {
  try {
    await KpiReport.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /api/kpi-reports/stats/summary — إحصائيات التقارير
router.get('/stats/summary', async (req, res) => {
  try {
    const { branchId } = req.query;
    const query = branchId ? { branchId } : {};

    const [total, ready, generating, failed] = await Promise.all([
      KpiReport.countDocuments(query),
      KpiReport.countDocuments({ ...query, status: 'ready' }),
      KpiReport.countDocuments({ ...query, status: 'generating' }),
      KpiReport.countDocuments({ ...query, status: 'failed' }),
    ]);

    res.json({ success: true, data: { total, ready, generating, failed } });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;
