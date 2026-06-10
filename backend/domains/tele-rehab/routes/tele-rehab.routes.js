/**
 * Tele-Rehabilitation Routes — مسارات API للتأهيل عن بُعد
 */

const express = require('express');
const router = express.Router();
// W1157 — cross-branch isolation (W269 doctrine). This file previously had NO
// guards at all: no beneficiaryId hook, no body guard, and 6 session-keyed :id
// routes (get/start/complete/cancel/quality/satisfaction) loaded TeleSession
// with NO branch ownership check; the list was unscoped and the dashboard
// trusted raw ?branchId= spoofing. Now:
//   - beneficiaryId param hook + body guard (W1140 pattern)
//   - /:id → /:teleSessionId so the ownership hook fires before handlers
//   - list + dashboard pinned via effectiveBranchScope(req)
const {
  branchScopedBeneficiaryParam,
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.param(
  'teleSessionId',
  branchScopedResourceParam({
    modelName: 'TeleSession',
    label: 'tele-rehab session',
    loadModel: () => require('../models/TeleSession'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const { teleRehabService } = require('../services/TeleRehabService');
const {
  validateScheduleSession,
  validateCompleteSession,
  validateRecordQuality,
  validateSubmitSatisfaction,
  validate,
} = require('../validators/tele-rehab.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// Schedule
router.post(
  '/',
  validate(validateScheduleSession),
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
      // W1157 — restricted callers are pinned to their own branch
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, ...result });
  })
);

// Dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    // W1157 — effectiveBranchScope ignores ?branchId= spoofing for restricted callers
    const data = await teleRehabService.getDashboard(
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

// Get single
router.get(
  '/:teleSessionId',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.getSession(req.params.teleSessionId);
    res.json({ success: true, data });
  })
);

// Start
router.put(
  '/:teleSessionId/start',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.startSession(req.params.teleSessionId);
    res.json({ success: true, data });
  })
);

// Complete
router.put(
  '/:teleSessionId/complete',
  validate(validateCompleteSession),
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.completeSession(req.params.teleSessionId, req.body);
    res.json({ success: true, data });
  })
);

// Cancel
router.put(
  '/:teleSessionId/cancel',
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.cancelSession(req.params.teleSessionId, req.body.reason);
    res.json({ success: true, data });
  })
);

// Connection quality
router.put(
  '/:teleSessionId/quality',
  validate(validateRecordQuality),
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.recordQuality(req.params.teleSessionId, req.body);
    res.json({ success: true, data });
  })
);

// Satisfaction
router.put(
  '/:teleSessionId/satisfaction',
  validate(validateSubmitSatisfaction),
  asyncHandler(async (req, res) => {
    const data = await teleRehabService.submitSatisfaction(req.params.teleSessionId, req.body);
    res.json({ success: true, data });
  })
);

module.exports = router;
