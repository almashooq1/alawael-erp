/**
 * KPI Dashboard Routes — مسارات لوحة KPIs الذكية
 * النظام 36: لوحة KPIs الذكية
 * Endpoints: /api/kpi-dashboard/*
 */
'use strict';

const express = require('express');
const router = express.Router();

const KpiDefinition = require('../models/KpiDefinition');
const KpiCategory = require('../models/KpiCategory');
const KpiValue = require('../models/KpiValue');
const KpiTarget = require('../models/KpiTarget');
const KpiAlert = require('../models/KpiAlert');
const KpiScorecard = require('../models/KpiScorecard');
const kpiService = require('../services/kpiCalculation.service');

// ─── فئات KPI ────────────────────────────────────────────────────────────────

// GET /api/kpi-dashboard/categories — قائمة الفئات
router.get('/categories', async (req, res) => {
  try {
    const { branchId, isActive } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const categories = await KpiCategory.find(query).sort({ sortOrder: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/kpi-dashboard/categories — إنشاء فئة
router.post('/categories', async (req, res) => {
  try {
    const category = await KpiCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/kpi-dashboard/categories/:id — تعديل فئة
router.put('/categories/:id', async (req, res) => {
  try {
    const category = await KpiCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'الفئة غير موجودة' });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/kpi-dashboard/categories/:id — حذف فئة
router.delete('/categories/:id', async (req, res) => {
  try {
    await KpiCategory.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── تعريفات KPI ─────────────────────────────────────────────────────────────

// GET /api/kpi-dashboard/definitions — قائمة التعريفات
router.get('/definitions', async (req, res) => {
  try {
    const { branchId, categoryId, isActive, showOnDashboard } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (categoryId) query.categoryId = categoryId;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (showOnDashboard !== undefined) query.showOnDashboard = showOnDashboard === 'true';

    const definitions = await KpiDefinition.find(query)
      .populate('categoryId', 'name nameAr code color icon')
      .sort({ sortOrder: 1 });
    res.json({ success: true, data: definitions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/kpi-dashboard/definitions — إنشاء تعريف KPI
router.post('/definitions', async (req, res) => {
  try {
    const definition = await KpiDefinition.create(req.body);
    res.status(201).json({ success: true, data: definition });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/kpi-dashboard/definitions/:id — تعديل تعريف KPI
router.put('/definitions/:id', async (req, res) => {
  try {
    const definition = await KpiDefinition.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!definition) return res.status(404).json({ success: false, message: 'التعريف غير موجود' });
    res.json({ success: true, data: definition });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/kpi-dashboard/definitions/:id — حذف تعريف KPI
router.delete('/definitions/:id', async (req, res) => {
  try {
    await KpiDefinition.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── لوحة التحكم الرئيسية ──────────────────────────────────────────────────

// GET /api/kpi-dashboard/dashboard — بيانات لوحة التحكم
router.get('/dashboard', async (req, res) => {
  try {
    const { branchId, periodType = 'monthly' } = req.query;
    if (!branchId) return res.status(400).json({ success: false, message: 'branchId مطلوب' });

    const data = await kpiService.getDashboardData(branchId, periodType);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/kpi-dashboard/year-over-year/:code — مقارنة سنة بسنة
router.get('/year-over-year/:code', async (req, res) => {
  try {
    const { branchId, years = 3 } = req.query;
    if (!branchId) return res.status(400).json({ success: false, message: 'branchId مطلوب' });

    const data = await kpiService.getYearOverYearComparison(
      branchId,
      req.params.code,
      parseInt(years)
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/kpi-dashboard/branch-benchmark — مقارنة الفروع
router.get('/branch-benchmark', async (req, res) => {
  try {
    const { periodType = 'monthly', year, period } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const p = parseInt(period) || new Date().getMonth() + 1;

    const scorecards = await KpiScorecard.find({
      periodType,
      periodYear: y,
      periodNumber: p,
    })
      .populate('branchId', 'name nameAr')
      .sort({ overallScore: -1 });

    res.json({ success: true, data: scorecards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/kpi-dashboard/calculate — حساب KPIs يدوياً
router.post('/calculate', async (req, res) => {
  try {
    const { branchId, periodType = 'monthly', year, period } = req.body;
    if (!branchId) return res.status(400).json({ success: false, message: 'branchId مطلوب' });

    const y = parseInt(year) || new Date().getFullYear();
    const p = parseInt(period) || new Date().getMonth() + 1;

    const results = await kpiService.calculateAll(branchId, periodType, y, p);
    res.json({ success: true, message: `تم حساب ${results.length} مؤشر`, count: results.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── أهداف KPI ──────────────────────────────────────────────────────────────

// GET /api/kpi-dashboard/targets — قائمة الأهداف
router.get('/targets', async (req, res) => {
  try {
    const { branchId, kpiDefinitionId, periodType, year } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (kpiDefinitionId) query.kpiDefinitionId = kpiDefinitionId;
    if (periodType) query.periodType = periodType;
    if (year) query.periodYear = parseInt(year);

    const targets = await KpiTarget.find(query)
      .populate('kpiDefinitionId', 'name nameAr code unit')
      .sort({ periodYear: -1, periodNumber: -1 });
    res.json({ success: true, data: targets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/kpi-dashboard/set-target — تعيين أو تحديث هدف KPI
router.post('/set-target', async (req, res) => {
  try {
    const {
      kpiDefinitionId,
      branchId,
      periodType,
      periodYear,
      periodNumber,
      targetValue,
      minimumValue,
      stretchValue,
    } = req.body;

    if (
      !kpiDefinitionId ||
      !branchId ||
      !periodType ||
      !periodYear ||
      !periodNumber ||
      targetValue === undefined
    ) {
      return res.status(400).json({ success: false, message: 'الحقول المطلوبة ناقصة' });
    }

    const target = await KpiTarget.findOneAndUpdate(
      {
        kpiDefinitionId,
        branchId,
        periodType,
        periodYear: parseInt(periodYear),
        periodNumber: parseInt(periodNumber),
        departmentId: null,
      },
      { targetValue, minimumValue, stretchValue, setBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'تم تحديث الهدف بنجاح', data: target });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── قيم KPI ────────────────────────────────────────────────────────────────

// GET /api/kpi-dashboard/values — قائمة قيم KPI
router.get('/values', async (req, res) => {
  try {
    const { branchId, kpiDefinitionId, periodType, year, period, status } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (kpiDefinitionId) query.kpiDefinitionId = kpiDefinitionId;
    if (periodType) query.periodType = periodType;
    if (year) query.periodYear = parseInt(year);
    if (period) query.periodNumber = parseInt(period);
    if (status) query.status = status;

    const values = await KpiValue.find(query)
      .populate({ path: 'kpiDefinitionId', populate: { path: 'categoryId' } })
      .sort({ periodDate: -1 })
      .limit(100);
    res.json({ success: true, data: values });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── تنبيهات KPI ─────────────────────────────────────────────────────────────

// GET /api/kpi-dashboard/alerts — قائمة التنبيهات
router.get('/alerts', async (req, res) => {
  try {
    const { branchId, status = 'active', severity, page = 1, perPage = 20 } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const [data, total] = await Promise.all([
      KpiAlert.find(query)
        .populate('kpiDefinitionId', 'name nameAr')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(perPage))
        .limit(parseInt(perPage)),
      KpiAlert.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(perPage)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/kpi-dashboard/alerts/:id/acknowledge — إقرار تنبيه
router.put('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alert = await KpiAlert.findByIdAndUpdate(
      req.params.id,
      {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user?._id,
        isRead: true,
      },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── بطاقات الأداء ──────────────────────────────────────────────────────────

// GET /api/kpi-dashboard/scorecards — قائمة بطاقات الأداء
router.get('/scorecards', async (req, res) => {
  try {
    const { branchId, periodType, year, period, rating } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (periodType) query.periodType = periodType;
    if (year) query.periodYear = parseInt(year);
    if (period) query.periodNumber = parseInt(period);
    if (rating) query.rating = rating;

    const scorecards = await KpiScorecard.find(query)
      .populate('branchId', 'name nameAr')
      .sort({ periodDate: -1 })
      .limit(50);
    res.json({ success: true, data: scorecards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/kpi-dashboard/scorecards/generate — إنشاء بطاقة أداء يدوياً
router.post('/scorecards/generate', async (req, res) => {
  try {
    const { branchId, periodType = 'monthly', year, period } = req.body;
    const y = parseInt(year) || new Date().getFullYear();
    const p = parseInt(period) || new Date().getMonth() + 1;

    const scorecard = await kpiService.generateScorecard(branchId, periodType, y, p);
    res.json({ success: true, data: scorecard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── إحصائيات عامة ──────────────────────────────────────────────────────────

// GET /api/kpi-dashboard/stats — إحصائيات سريعة
router.get('/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const query = branchId ? { branchId } : {};

    const [totalKpis, activeKpis, activeAlerts, criticalAlerts] = await Promise.all([
      KpiDefinition.countDocuments(query),
      KpiDefinition.countDocuments({ ...query, isActive: true }),
      KpiAlert.countDocuments({ ...query, status: 'active' }),
      KpiAlert.countDocuments({ ...query, status: 'active', severity: 'critical' }),
    ]);

    res.json({
      success: true,
      data: { totalKpis, activeKpis, activeAlerts, criticalAlerts },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
