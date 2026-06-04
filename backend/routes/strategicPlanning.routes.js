/**
 * مسارات التخطيط الاستراتيجي
 * Strategic Planning Routes — Goals, Initiatives, KPIs, Dashboard, BSC
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const _logger = require('../utils/logger');
const StrategicGoal = require('../models/StrategicGoal');
const StrategicInitiative = require('../models/StrategicInitiative');
const StrategicKPI = require('../models/StrategicKPI');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

function mergeStrategicFilter(req, base = {}) {
  return { ...base, ...branchFilter(req) };
}

function scopedStrategicById(req, id) {
  return { _id: id, ...branchFilter(req) };
}

async function loadScopedGoal(req, res, goalId) {
  if (!mongoose.isValidObjectId(goalId)) {
    res.status(400).json({ success: false, message: 'معرّف الهدف غير صالح' });
    return null;
  }
  const goal = await StrategicGoal.findOne(scopedStrategicById(req, goalId))
    .select('_id branchId')
    .lean();
  if (!goal) {
    res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    return null;
  }
  return goal;
}

// ═══════════════════════════════════════════════════════════════
//  GOALS (الأهداف الاستراتيجية)
// ═══════════════════════════════════════════════════════════════

// GET / — List goals (paginated, filterable)
router.get('/goals', async (req, res) => {
  try {
    const { perspective, status, page = 1, limit = 50 } = req.query;
    const filter = mergeStrategicFilter(req, {});
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
    safeError(res, err, 'Strategic goals list error');
  }
});

// GET /goals/:id
router.get('/goals/:id', async (req, res) => {
  try {
    const goal = await StrategicGoal.findOne(scopedStrategicById(req, req.params.id)).lean();
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    res.json({ success: true, data: goal });
  } catch (err) {
    safeError(res, err, 'Strategic goal detail error');
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
      const payload = stripUpdateMeta(req.body);
      delete payload.branchId;
      const goal = new StrategicGoal({
        ...payload,
        createdBy: req.user._id || req.userId,
        ...(req.branchScope?.branchId && { branchId: req.branchScope.branchId }),
      });
      await goal.save();
      res.status(201).json({ success: true, data: goal, message: 'تم إنشاء الهدف بنجاح' });
    } catch (err) {
      safeError(res, err, 'Strategic goal create error');
    }
  }
);

// PUT /goals/:id
router.put('/goals/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const body = stripUpdateMeta(req.body);
    delete body.branchId;
    const goal = await StrategicGoal.findOneAndUpdate(
      scopedStrategicById(req, req.params.id),
      body,
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    res.json({ success: true, data: goal, message: 'تم تحديث الهدف بنجاح' });
  } catch (err) {
    safeError(res, err, 'Strategic goal update error');
  }
});

// DELETE /goals/:id
router.delete('/goals/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const goal = await StrategicGoal.findOneAndDelete(scopedStrategicById(req, req.params.id));
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    // Cascade: remove related initiatives and KPIs
    await Promise.all([
      StrategicInitiative.deleteMany({ goalId: req.params.id }),
      StrategicKPI.deleteMany({ goalId: req.params.id }),
    ]);
    res.json({ success: true, message: 'تم حذف الهدف بنجاح' });
  } catch (err) {
    safeError(res, err, 'Strategic goal delete error');
  }
});

// ═══════════════════════════════════════════════════════════════
//  INITIATIVES (المبادرات)
// ═══════════════════════════════════════════════════════════════

router.get('/initiatives', async (req, res) => {
  try {
    const { goalId, status, page = 1, limit = 50 } = req.query;
    const filter = mergeStrategicFilter(req, {});
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
    safeError(res, err, 'Initiatives list error');
  }
});

router.get('/initiatives/:id', async (req, res) => {
  try {
    const doc = await StrategicInitiative.findOne(scopedStrategicById(req, req.params.id))
      .populate('goalId', 'title perspective')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'المبادرة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'Initiative detail error');
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
      const goal = await loadScopedGoal(req, res, req.body.goalId);
      if (!goal) return;
      const payload = stripUpdateMeta(req.body);
      delete payload.branchId;
      const doc = new StrategicInitiative({
        ...payload,
        branchId: goal.branchId || req.branchScope?.branchId,
        createdBy: req.user._id || req.userId,
      });
      await doc.save();
      res.status(201).json({ success: true, data: doc, message: 'تم إنشاء المبادرة بنجاح' });
    } catch (err) {
      safeError(res, err, 'Initiative create error');
    }
  }
);

router.put('/initiatives/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const body = stripUpdateMeta(req.body);
    delete body.branchId;
    const doc = await StrategicInitiative.findOneAndUpdate(
      scopedStrategicById(req, req.params.id),
      body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'المبادرة غير موجودة' });
    res.json({ success: true, data: doc, message: 'تم تحديث المبادرة بنجاح' });
  } catch (err) {
    safeError(res, err, 'Initiative update error');
  }
});

router.delete('/initiatives/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const doc = await StrategicInitiative.findOneAndDelete(scopedStrategicById(req, req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: 'المبادرة غير موجودة' });
    res.json({ success: true, message: 'تم حذف المبادرة بنجاح' });
  } catch (err) {
    safeError(res, err, 'Initiative delete error');
  }
});

// ═══════════════════════════════════════════════════════════════
//  KPIs (مؤشرات الأداء)
// ═══════════════════════════════════════════════════════════════

router.get('/kpis', async (req, res) => {
  try {
    const { goalId, status, page = 1, limit = 50 } = req.query;
    const filter = mergeStrategicFilter(req, {});
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
    safeError(res, err, 'KPIs list error');
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
      const goal = await loadScopedGoal(req, res, req.body.goalId);
      if (!goal) return;
      const payload = stripUpdateMeta(req.body);
      delete payload.branchId;
      const doc = new StrategicKPI({
        ...payload,
        branchId: goal.branchId || req.branchScope?.branchId,
        createdBy: req.user._id || req.userId,
      });
      await doc.save();
      res.status(201).json({ success: true, data: doc, message: 'تم إنشاء المؤشر بنجاح' });
    } catch (err) {
      safeError(res, err, 'KPI create error');
    }
  }
);

router.put('/kpis/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const body = stripUpdateMeta(req.body);
    delete body.branchId;
    const doc = await StrategicKPI.findOneAndUpdate(scopedStrategicById(req, req.params.id), body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, data: doc, message: 'تم تحديث المؤشر بنجاح' });
  } catch (err) {
    safeError(res, err, 'KPI update error');
  }
});

router.delete('/kpis/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const doc = await StrategicKPI.findOneAndDelete(scopedStrategicById(req, req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: 'المؤشر غير موجود' });
    res.json({ success: true, message: 'تم حذف المؤشر بنجاح' });
  } catch (err) {
    safeError(res, err, 'KPI delete error');
  }
});

// POST /kpis/:id/record — Record a KPI measurement
router.post(
  '/kpis/:id/record',
  authorize(['admin', 'super_admin', 'manager']),
  async (req, res) => {
    try {
      const { value, note } = req.body;
      const kpi = await StrategicKPI.findOne(scopedStrategicById(req, req.params.id));
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
      safeError(res, err, 'KPI record error');
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
        { $match: mergeStrategicFilter(req, {}) },
        { $group: { _id: '$perspective', count: { $sum: 1 }, avgProgress: { $avg: '$progress' } } },
      ]),
      StrategicInitiative.aggregate([
        { $match: mergeStrategicFilter(req, {}) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      StrategicKPI.aggregate([
        { $match: mergeStrategicFilter(req, {}) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      StrategicGoal.countDocuments(mergeStrategicFilter(req, {})),
      StrategicInitiative.countDocuments(mergeStrategicFilter(req, {})),
      StrategicKPI.countDocuments(mergeStrategicFilter(req, {})),
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
    safeError(res, err, 'Strategic dashboard error');
  }
});

// GET /balanced-scorecard — BSC radar data
router.get('/balanced-scorecard', async (req, res) => {
  try {
    const perspectives = ['financial', 'customer', 'internal_processes', 'learning_growth'];
    const bscData = await Promise.all(
      perspectives.map(async p => {
        const goals = await StrategicGoal.find(
          mergeStrategicFilter(req, { perspective: p })
        ).lean();
        const avgProgress = goals.length
          ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length
          : 0;
        return { perspective: p, goalsCount: goals.length, avgProgress: Math.round(avgProgress) };
      })
    );
    res.json({ success: true, data: bscData });
  } catch (err) {
    safeError(res, err, 'BSC error');
  }
});

// GET /progress-report — Overall progress report
router.get('/progress-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = mergeStrategicFilter(req, {});
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
    safeError(res, err, 'Progress report error');
  }
});

module.exports = router;
