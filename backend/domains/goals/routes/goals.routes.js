/**
 * Therapeutic Goals Routes — مسارات API للأهداف العلاجية
 *
 * CRUD كامل للأهداف العلاجية مرتبطة بالمستفيد والحلقة وخطة الرعاية.
 * يدعم: الإنشاء، القراءة، التحديث، تسجيل التقدم، البحث بالمستفيد.
 *
 * @module domains/goals/routes/goals.routes
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { TherapeuticGoal } = require('../models/TherapeuticGoal');
const {
  validateCreateGoal,
  validateUpdateGoal,
  validateLogProgress,
  validate,
} = require('../validators/goals.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /goals/beneficiary/:beneficiaryId — list by beneficiary (must be before /:id)
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  '/goals/beneficiary/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const { beneficiaryId } = req.params;
    const { episodeId, status, type, page = 1, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'Invalid beneficiaryId' });
    }

    const filter = { beneficiaryId };
    if (episodeId && mongoose.Types.ObjectId.isValid(episodeId)) filter.episodeId = episodeId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [goals, total] = await Promise.all([
      TherapeuticGoal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      TherapeuticGoal.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: goals,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /goals — create therapeutic goal
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  '/goals',
  validate(validateCreateGoal),
  asyncHandler(async (req, res) => {
    const goal = new TherapeuticGoal(req.body);
    await goal.save();
    return res.status(201).json({ success: true, data: goal });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /goals — list with filters
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  '/goals',
  asyncHandler(async (req, res) => {
    const { beneficiaryId, episodeId, carePlanId, status, type, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (beneficiaryId && mongoose.Types.ObjectId.isValid(beneficiaryId))
      filter.beneficiaryId = beneficiaryId;
    if (episodeId && mongoose.Types.ObjectId.isValid(episodeId)) filter.episodeId = episodeId;
    if (carePlanId && mongoose.Types.ObjectId.isValid(carePlanId)) filter.carePlanId = carePlanId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [goals, total] = await Promise.all([
      TherapeuticGoal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      TherapeuticGoal.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: goals,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /goals/:id — get single goal
// ═══════════════════════════════════════════════════════════════════════════════
router.get(
  '/goals/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid goal id' });
    }
    const goal = await TherapeuticGoal.findById(req.params.id).lean();
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    return res.json({ success: true, data: goal });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /goals/:id — update goal
// ═══════════════════════════════════════════════════════════════════════════════
router.put(
  '/goals/:id',
  validate(validateUpdateGoal),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid goal id' });
    }
    const goal = await TherapeuticGoal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    return res.json({ success: true, data: goal });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /goals/:id/progress — record progress entry
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  '/goals/:id/progress',
  validate(validateLogProgress),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid goal id' });
    }
    const goal = await TherapeuticGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    goal.progressHistory = goal.progressHistory || [];
    goal.progressHistory.push({ ...req.body, date: req.body.date || new Date() });

    if (typeof req.body.progress === 'number') {
      goal.progress = req.body.progress;
    }

    await goal.save();
    return res.status(201).json({ success: true, data: goal });
  })
);

module.exports = router;
