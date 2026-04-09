/**
 * Tele-Rehabilitation Routes — مسارات API للتأهيل عن بُعد
 */

const express = require('express');
const router = express.Router();
const { teleRehabService } = require('../services/TeleRehabService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

// Schedule
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.scheduleSession({
      ...req.body,
      createdBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);

// List
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await teleRehabService.listSessions({
      beneficiaryId: req.query.beneficiaryId,
      therapistId: req.query.therapistId,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);

// Dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);

// Get single
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.getSession(req.params.id);
    res.json({ success: true, data });
  })
);

// Start
router.put(
  '/:id/start',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.startSession(req.params.id);
    res.json({ success: true, data });
  })
);

// Complete
router.put(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.completeSession(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Cancel
router.put(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.cancelSession(req.params.id, req.body.reason);
    res.json({ success: true, data });
  })
);

// Connection quality
router.put(
  '/:id/quality',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.recordQuality(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Satisfaction
router.put(
  '/:id/satisfaction',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.submitSatisfaction(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

module.exports = router;
