/**
 * Behavior Management Routes — مسارات API لإدارة السلوك
 */

const express = require('express');
const router = express.Router();
const { behaviorService } = require('../services/BehaviorService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

/* ── Records ── */
router.post(
  '/records',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.createRecord({
      ...req.body,
      reportedBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/records',
  asyncHandler(async (req, res) => {
    const result = await behaviorService.listRecords({
      beneficiaryId: req.query.beneficiaryId,
      behaviorPlanId: req.query.behaviorPlanId,
      topography: req.query.topography,
      severity: req.query.severity,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/records/:id',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.getRecord(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/records/:id/review',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.reviewRecord(req.params.id, {
      reviewerId: getUserId(req),
      notes: req.body.notes,
    });
    res.json({ success: true, data });
  })
);

/* ── Plans ── */
router.post(
  '/plans',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.createPlan({
      ...req.body,
      createdBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const result = await behaviorService.listPlans({
      beneficiaryId: req.query.beneficiaryId,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/plans/:id',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.getPlan(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/plans/:id',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.updatePlan(req.params.id, req.body);
    res.json({ success: true, data });
  })
);
router.put(
  '/plans/:id/approve',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.approvePlan(req.params.id, getUserId(req));
    res.json({ success: true, data });
  })
);
router.post(
  '/plans/:id/reviews',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.addReview(req.params.id, {
      ...req.body,
      reviewedBy: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Analytics ── */
router.get(
  '/analytics/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.getBeneficiaryAnalytics(
      req.params.beneficiaryId,
      parseInt(req.query.days) || 90
    );
    res.json({ success: true, data });
  })
);
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);

module.exports = router;
