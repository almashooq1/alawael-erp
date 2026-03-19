/* eslint-disable no-unused-vars */
/**
 * KPI Dashboard Routes
 * مسارات لوحة مؤشرات الأداء
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const KPI = require('../models/KPI');

router.use(authenticate);

// ─── Dashboard overview (before /:id) ────────────────────────────────────────
router.get('/dashboard/overview', async (req, res) => {
  try {
    const kpis = await KPI.find({}).lean();
    let onTarget = 0,
      atRisk = 0,
      belowTarget = 0;
    kpis.forEach(k => {
      const pct = k.target > 0 ? (k.actual / k.target) * 100 : 0;
      if (pct >= 90) onTarget++;
      else if (pct >= 70) atRisk++;
      else belowTarget++;
    });
    res.json({
      success: true,
      data: {
        total: kpis.length,
        onTarget,
        atRisk,
        belowTarget,
        avgCompletion:
          kpis.length > 0
            ? (
                kpis.reduce((sum, k) => sum + (k.target > 0 ? (k.actual / k.target) * 100 : 0), 0) /
                kpis.length
              ).toFixed(1)
            : 0,
      },
      message: 'نظرة عامة على المؤشرات',
    });
  } catch (error) {
    logger.error('Error fetching KPI overview:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب النظرة العامة' });
  }
});

// ─── Periodic reports (before /:id) ──────────────────────────────────────────
router.get('/reports/periodic', async (req, res) => {
  try {
    const { period = 'monthly', department } = req.query;
    const filter = {};
    if (department) filter.department = department;
    const kpis = await KPI.find(filter).lean();
    const report = kpis.map(k => ({
      kpiId: k.kpiId,
      name: k.name,
      category: k.category,
      target: k.target,
      actual: k.actual,
      achievement: k.target > 0 ? ((k.actual / k.target) * 100).toFixed(1) : 0,
      trend: k.trend || 'stable',
    }));
    res.json({ success: true, data: { period, report }, message: 'التقرير الدوري' });
  } catch (error) {
    logger.error('Error fetching periodic report:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التقرير' });
  }
});

// ─── List KPIs ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (department) filter.department = department;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      KPI.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      KPI.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total },
      message: 'قائمة المؤشرات',
    });
  } catch (error) {
    logger.error('Error fetching KPIs:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المؤشرات' });
  }
});

// ─── Get single KPI ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id).lean();
    if (!kpi) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data: kpi, message: 'بيانات المؤشر' });
  } catch (error) {
    logger.error('Error fetching KPI:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المؤشر' });
  }
});

// ─── Create KPI ──────────────────────────────────────────────────────────────
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, category, department, target, unit, frequency, direction } = req.body;
    if (!name || !target) {
      return res.status(400).json({ success: false, message: 'الاسم والهدف مطلوبان' });
    }
    const count = await KPI.countDocuments();
    const kpiId = `KPI-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const kpi = await KPI.create({
      kpiId,
      name,
      category: category || 'operational',
      department,
      target,
      actual: 0,
      unit: unit || '%',
      frequency: frequency || 'monthly',
      direction: direction || 'higher_is_better',
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: kpi, message: 'تم إنشاء المؤشر بنجاح' });
  } catch (error) {
    logger.error('Error creating KPI:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المؤشر' });
  }
});

// ─── Update KPI ──────────────────────────────────────────────────────────────
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const {
      name,
      category,
      department,
      target,
      actual,
      unit,
      frequency,
      direction,
      status,
      notes,
    } = req.body;
    const kpi = await KPI.findByIdAndUpdate(
      req.params.id,
      { name, category, department, target, actual, unit, frequency, direction, status, notes },
      { new: true, runValidators: true }
    ).lean();
    if (!kpi) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data: kpi, message: 'تم تحديث المؤشر بنجاح' });
  } catch (error) {
    logger.error('Error updating KPI:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المؤشر' });
  }
});

// ─── Add measurement ─────────────────────────────────────────────────────────
router.post('/:id/measurement', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id);
    if (!kpi) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    const { value, notes } = req.body;
    if (value === undefined)
      return res.status(400).json({ success: false, message: 'القيمة مطلوبة' });
    kpi.measurements.push({ value, date: new Date(), recordedBy: req.user.id, notes });
    kpi.actual = value;
    // Calculate trend
    if (kpi.measurements.length >= 2) {
      const prev = kpi.measurements[kpi.measurements.length - 2].value;
      kpi.trend = value > prev ? 'improving' : value < prev ? 'declining' : 'stable';
    }
    await kpi.save();
    res.json({ success: true, data: kpi, message: 'تم إضافة القياس' });
  } catch (error) {
    logger.error('Error adding measurement:', error);
    res.status(500).json({ success: false, message: 'خطأ في إضافة القياس' });
  }
});

module.exports = router;
