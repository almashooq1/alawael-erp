/**
 * Care Plans Routes — مسارات API لخطط الرعاية الموحدة
 *
 * الهدف السريري: إدارة خطط الرعاية المتكاملة المرتبطة
 * بالمستفيد والحلقة العلاجية والأهداف والتدخلات.
 *
 * @module domains/care-plans/routes/care-plans.routes
 */

const express = require('express');
const router = express.Router();

let UnifiedCarePlan;
try {
  ({ UnifiedCarePlan } = require('../models/UnifiedCarePlan'));
} catch (_e) {
  UnifiedCarePlan = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireModel = (req, res, next) => {
  if (!UnifiedCarePlan) {
    return res.status(503).json({ success: false, message: 'CarePlan model unavailable' });
  }
  next();
};

/* ─── POST /care-plans — Create care plan ────────────────────────────────── */
router.post(
  '/',
  requireModel,
  asyncHandler(async (req, res) => {
    const { beneficiaryId, episodeId, type, goals, interventions, primaryTherapistId } = req.body;
    if (!beneficiaryId) {
      return res.status(400).json({ success: false, message: 'beneficiaryId is required' });
    }
    const plan = await UnifiedCarePlan.create({
      beneficiaryId,
      episodeId,
      type: type || 'rehabilitation',
      goals: goals || [],
      interventions: interventions || [],
      primaryTherapistId,
      status: 'draft',
    });
    res.status(201).json({ success: true, data: plan });
  })
);

/* ─── GET /care-plans — List care plans ─────────────────────────────────── */
router.get(
  '/',
  requireModel,
  asyncHandler(async (req, res) => {
    const { beneficiaryId, episodeId, status, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (episodeId) filter.episodeId = episodeId;
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      UnifiedCarePlan.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      UnifiedCarePlan.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /care-plans/dashboard — Stats ─────────────────────────────────── */
router.get(
  '/dashboard',
  requireModel,
  asyncHandler(async (req, res) => {
    const [total, byStatus, active] = await Promise.all([
      UnifiedCarePlan.countDocuments({}),
      UnifiedCarePlan.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      UnifiedCarePlan.countDocuments({ status: 'active' }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        active,
        byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      },
    });
  })
);

/* ─── GET /care-plans/beneficiary/:id — By beneficiary ──────────────────── */
router.get(
  '/beneficiary/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const data = await UnifiedCarePlan.find({ beneficiaryId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

/* ─── GET /care-plans/:id ────────────────────────────────────────────────── */
router.get(
  '/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const plan = await UnifiedCarePlan.findById(req.params.id).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Care plan not found' });
    }
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:id — Update ──────────────────────────────────────── */
router.put(
  '/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Care plan not found' });
    }
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:id/activate — Activate care plan ─────────────────── */
router.put(
  '/:id/activate',
  requireModel,
  asyncHandler(async (req, res) => {
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'active', activatedDate: new Date() } },
      { new: true }
    ).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Care plan not found' });
    }
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:id/complete — Complete care plan ─────────────────── */
router.put(
  '/:id/complete',
  requireModel,
  asyncHandler(async (req, res) => {
    const { summary, outcomeRating } = req.body;
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'completed', completedDate: new Date(), summary, outcomeRating } },
      { new: true }
    ).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Care plan not found' });
    }
    res.json({ success: true, data: plan });
  })
);

/* ─── POST /care-plans/:id/goals — Add goal to plan ─────────────────────── */
router.post(
  '/:id/goals',
  requireModel,
  asyncHandler(async (req, res) => {
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      req.params.id,
      { $push: { goals: req.body } },
      { new: true }
    ).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Care plan not found' });
    }
    res.json({ success: true, data: plan });
  })
);

module.exports = router;
