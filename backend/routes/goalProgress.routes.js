/**
 * Goal Progress History Routes — مسارات سجل تقدم الأهداف
 * Track goal progress snapshots over time
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const GoalProgressHistory = require('../models/GoalProgressHistory');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/goal-progress — list progress records (filter by planId, goalId) */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { planId, goalId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = { ...branchFilter(req) };
    if (planId) filter.planId = planId;
    if (goalId) filter.goalId = goalId;
    if (startDate || endDate) {
      filter.recordedDate = {};
      if (startDate) filter.recordedDate.$gte = new Date(startDate);
      if (endDate) filter.recordedDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      GoalProgressHistory.find(filter)
        .populate('planId', 'beneficiary status')
        .populate('recordedBy', 'name')
        .populate('sessionRef', 'date status')
        .sort({ recordedDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      GoalProgressHistory.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'goalProgress list error');
  }
});

/** GET /api/goal-progress/:id — get single record */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const record = await GoalProgressHistory.findOne({ _id: req.params.id, ...branchFilter(req) })
      .populate('planId')
      .populate('recordedBy', 'name')
      .populate('sessionRef');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    safeError(res, err, 'goalProgress get error');
  }
});

/** GET /api/goal-progress/plan/:planId/trend — get progress trend for a plan */
router.get('/plan/:planId/trend', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { goalId } = req.query;
    const filter = { planId: req.params.planId, ...branchFilter(req) };
    if (goalId) filter.goalId = goalId;

    const records = await GoalProgressHistory.find(filter)
      .sort({ recordedDate: 1 })
      .select('goalId percentage recordedDate note');
    res.json({ success: true, data: records });
  } catch (err) {
    safeError(res, err, 'goalProgress trend error');
  }
});

/** POST /api/goal-progress — create progress record */
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const data = { ...req.body, recordedBy: req.user?._id || req.user?.id };
    if (req.branchScope && req.branchScope.branchId) {
      data.branchId = req.branchScope.branchId;
    }
    const record = await GoalProgressHistory.create(data);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    logger.error('goalProgress create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/goal-progress/:id — update progress record */
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const record = await GoalProgressHistory.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    logger.error('goalProgress update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/goal-progress/:id — delete progress record (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const record = await GoalProgressHistory.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Record deleted' });
    } catch (err) {
      safeError(res, err, 'goalProgress delete error');
    }
  }
);

module.exports = router;
