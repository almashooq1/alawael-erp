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

let carePlansService;
try {
  ({ carePlansService } = require('../services/CarePlansService'));
} catch (_e) {
  carePlansService = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireService = (req, res, next) => {
  if (!carePlansService) {
    return res.status(503).json({ success: false, message: 'CarePlansService unavailable' });
  }
  next();
};

/* ─── POST /care-plans — Create care plan ────────────────────────────────── */
router.post(
  '/',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.createPlan(req.body);
    res.status(201).json({ success: true, data: plan });
  })
);

/* ─── GET /care-plans — List care plans ─────────────────────────────────── */
router.get(
  '/',
  requireService,
  asyncHandler(async (req, res) => {
    const { limit = 20, skip = 0, ...filter } = req.query;
    const result = await carePlansService.listPlans(filter, { limit, skip });
    res.json({ success: true, ...result, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /care-plans/dashboard — Stats ─────────────────────────────────── */
router.get(
  '/dashboard',
  requireService,
  asyncHandler(async (req, res) => {
    const data = await carePlansService.getDashboard();
    res.json({ success: true, data });
  })
);

/* ─── GET /care-plans/beneficiary/:id — By beneficiary ──────────────────── */
router.get(
  '/beneficiary/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await carePlansService.getBeneficiaryPlans(req.params.id);
    res.json({ success: true, ...result });
  })
);

/* ─── GET /care-plans/:id ────────────────────────────────────────────────── */
router.get(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.getPlanById(req.params.id);
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:id — Update ──────────────────────────────────────── */
router.put(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.updatePlan(req.params.id, req.body);
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:id/activate — Activate care plan ─────────────────── */
router.put(
  '/:id/activate',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.activatePlan(req.params.id);
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:id/complete — Complete care plan ─────────────────── */
router.put(
  '/:id/complete',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.completePlan(req.params.id, req.body);
    res.json({ success: true, data: plan });
  })
);

/* ─── POST /care-plans/:id/goals — Add goal to plan ─────────────────────── */
router.post(
  '/:id/goals',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.addGoal(req.params.id, req.body);
    res.json({ success: true, data: plan });
  })
);

module.exports = router;
