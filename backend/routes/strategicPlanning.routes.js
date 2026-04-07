/**
 * مسارات التخطيط الاستراتيجي
 * Strategic Planning Routes — Goals, Initiatives, KPIs, Dashboard, BSC
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const StrategicGoal = require('../models/StrategicGoal');
const StrategicInitiative = require('../models/StrategicInitiative');
const StrategicKPI = require('../models/StrategicKPI');
const { stripUpdateMeta } = require('../utils/sanitize');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
//  GOALS (الأهداف الاستراتيجية)
// ═══════════════════════════════════════════════════════════════

// GET / — List goals (paginated, filterable)
router.get('/goals', async (req, res) => {
  try {
    const { perspective, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (perspective) filter.perspective = perspective;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      StrategicGoal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      StrategicGoal.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error('Strategic goals list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الأهداف الاستراتيجية' });
  }
});

// GET /goals/:id
router.get('/goals/:id', async (req, res) => {
  try {
    const goal = await StrategicGoal.findById(req.params.id).lean();
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    res.json({ success: true, data: goal });
  } catch (err) {
    logger.error('Strategic goal detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الهدف' });
  }
});

// POST /goals
router.post(
  '/goals',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان الهدف مطلوب'),
    body('perspective')
      .isIn(['financial', 'customer', 'internal_processes', 'learning_growth'])
      .withMessage('منظور BSC غير صالح'),
  ]),
  async (req, res) => {
    try {
      const goal = new StrategicGoal({ ...req.body, createdBy: req.user._id || req.userId });
      await goal.save();
      res.status(201).json({ success: true, data: goal, message: 'تم إنشاء الهدف بنجاح' });
    } catch (err) {
      logger.error('Strategic goal create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء الهدف' });
    }
  }
);

// PUT /goals/:id
router.put('/goals/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const goal = await StrategicGoal.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    res.json({ success: true, data: goal, message: 'تم تحديث الهدف بنجاح' });
  } catch (err) {
    logger.error('Strategic goal update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الهدف' });
  }
});

// DELETE /goals/:id
router.delete('/goals/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const goal = await StrategicGoal.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    // Cascade: remove related initiatives and KPIs
    await Promise.all([
      StrategicInitiative.deleteMany({ goalId: req.params.id }),
      StrategicKPI.deleteMany({ goalId: req.params.id }),
    ]);
    res.json({ success: true, message: 'تم حذف الهدف بنجاح' });
  } catch (err) {
    logger.error('Strategic goal delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف الهدف' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  INITIATIVES (المبادرات)
// ═══════════════════════════════════════════════════════════════

router.get('/initiatives', async (req, res) => {
  try {
    const { goalId, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (goalId) filter.goalId = goalId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      StrategicInitiative.find(filter)
        .populate('goalId', 'title perspective')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      StrategicInitiative.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error('Initiatives list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المبادرات' });
  }
});

router.get('/initiatives/:id', async (req, res) => {
  try {
    const doc = await StrategicInitiative.findById(req.params.id)
      .populate('goalId', 'title perspective')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'المبادرة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Initiative detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المبادرة' });
  }
});

router.post(
  '/initiatives',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان المبادرة مطلوب'),
    body('goalId').notEmpty().withMessage('الهدف المرتبط مطلوب'),
  ]),
  async (req, res) => {
    try {
      const doc = new StrategicInitiative({ ...req.body, createdBy: req.user._id || req.userId });
      await doc.save();
      res.status(201).json({ success: true, data: doc, message: 'تم إنشاء المبادرة بنجاح' });
    } catch (err) {
      logger.error('Initiative create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء المبادرة' });
    }
  }
);

router.put('/initiatives/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const doc = await StrategicInitiative.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'المبادرة غير موجودة' });
    res.json({ success: true, data: doc, message: 'تم تحديث المبادرة بنجاح' });
  } catch (err) {
    logger.error('Initiative update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المبادرة' });
  }
});

router.delete('/initiatives/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const doc = await StrategicInitiative.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'المبادرة غير موجودة' });
    res.json({ success: true, message: 'تم حذف المبادرة بنجاح' });
  } catch (err) {
    logger.error('Initiative delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف المبادرة' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  KPIs (مؤشرات الأداء)
// ═══════════════════════════════════════════════════════════════

router.get('/kpis', async (req, res) => {
  try {
    const { goalId, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (goalId) filter.goalId = goalId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      StrategicKPI.find(filter)
        .populate('goalId', 'title perspective')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      StrategicKPI.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error('KPIs list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب مؤشرات الأداء' });
  }
});

router.post(
  '/kpis',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    body('name').trim().notEmpty().withMessage('اسم المؤشر مطلوب'),
    body('goalId').notEmpty().withMessage('الهدف المرتبط مطلوب'),
    body('targetValue').isNumeric().withMessage('القيمة المستهدفة مطلوبة'),
  ]),
  async (req, res) => {
    try {
      const doc = new StrategicKPI({ ...req.body, createdBy: req.user._id || req.userId });
      await doc.save();
      res.status(201).json({ success: true, data: doc, message: 'تم إنشاء المؤشر بنجاح' });
    } catch (err) {
      logger.error('KPI create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء المؤشر' });
    }
  }
);

router.put('/kpis/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const doc = await StrategicKPI.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data: doc, message: 'تم تحديث المؤشر بنجاح' });
  } catch (err) {
    logger.error('KPI update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المؤشر' });
  }
});

router.delete('/kpis/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const doc = await StrategicKPI.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, message: 'تم حذف المؤشر بنجاح' });
  } catch (err) {
    logger.error('KPI delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف المؤشر' });
  }
});

// POST /kpis/:id/record — Record a KPI measurement
router.post(
  '/kpis/:id/record',
  authorize(['admin', 'super_admin', 'manager']),
  async (req, res) => {
    try {
      const { value, note } = req.body;
      const kpi = await StrategicKPI.findById(req.params.id);
      if (!kpi) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });

      kpi.records.push({ value, note, recordedBy: req.user._id || req.userId });
      kpi.currentValue = value;

      // Auto-update status
      const pct = (value / kpi.targetValue) * 100;
      if (pct >= 100) kpi.status = 'exceeded';
      else if (pct >= 75) kpi.status = 'on_track';
      else if (pct >= 50) kpi.status = 'at_risk';
      else kpi.status = 'behind';

      await kpi.save();
      res.json({ success: true, data: kpi, message: 'تم تسجيل القيمة بنجاح' });
    } catch (err) {
      logger.error('KPI record error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تسجيل القيمة' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════════════

// GET /dashboard — Aggregated strategic dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [
      goalsByPerspective,
      initiativesByStatus,
      kpisByStatus,
      totalGoals,
      totalInitiatives,
      totalKPIs,
    ] = await Promise.all([
      StrategicGoal.aggregate([
        { $group: { _id: '$perspective', count: { $sum: 1 }, avgProgress: { $avg: '$progress' } } },
      ]),
      StrategicInitiative.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      StrategicKPI.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      StrategicGoal.countDocuments(),
      StrategicInitiative.countDocuments(),
      StrategicKPI.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        totals: { goals: totalGoals, initiatives: totalInitiatives, kpis: totalKPIs },
        goalsByPerspective,
        initiativesByStatus,
        kpisByStatus,
      },
    });
  } catch (err) {
    logger.error('Strategic dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب لوحة المعلومات' });
  }
});

// GET /balanced-scorecard — BSC radar data
router.get('/balanced-scorecard', async (req, res) => {
  try {
    const perspectives = ['financial', 'customer', 'internal_processes', 'learning_growth'];
    const bscData = await Promise.all(
      perspectives.map(async p => {
        const goals = await StrategicGoal.find({ perspective: p }).lean();
        const avgProgress = goals.length
          ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length
          : 0;
        return { perspective: p, goalsCount: goals.length, avgProgress: Math.round(avgProgress) };
      })
    );
    res.json({ success: true, data: bscData });
  } catch (err) {
    logger.error('BSC error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات BSC' });
  }
});

// GET /progress-report — Overall progress report
router.get('/progress-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

    const goals = await StrategicGoal.find(filter).lean();
    const initiatives = await StrategicInitiative.find(filter).lean();

    const overallProgress = goals.length
      ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length)
      : 0;

    res.json({
      success: true,
      data: {
        overallProgress,
        goalsCompleted: goals.filter(g => g.status === 'completed').length,
        goalsTotal: goals.length,
        initiativesCompleted: initiatives.filter(i => i.status === 'completed').length,
        initiativesTotal: initiatives.length,
      },
    });
  } catch (err) {
    logger.error('Progress report error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقرير التقدم' });
  }
});

module.exports = router;
