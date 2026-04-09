/**
 * AR/VR Rehabilitation Routes — مسارات API لتأهيل الواقع الافتراضي / المعزز
 */

const express = require('express');
const router = express.Router();
const { arvrService } = require('../services/ARVRService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

// Create
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = await arvrService.createSession({
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
    const result = await arvrService.listSessions({
      beneficiaryId: req.query.beneficiaryId,
      therapistId: req.query.therapistId,
      status: req.query.status,
      technologyType: req.query.technologyType,
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
    const data = await arvrService.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);

// Beneficiary progress
router.get(
  '/progress/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await arvrService.getBeneficiaryProgress(
      req.params.beneficiaryId,
      req.query.scenarioId
    );
    res.json({ success: true, data, total: data.length });
  })
);

// Get single
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await arvrService.getSession(req.params.id);
    res.json({ success: true, data });
  })
);

// Start
router.put(
  '/:id/start',
  asyncHandler(async (req, res) => {
    const data = await arvrService.startSession(req.params.id);
    res.json({ success: true, data });
  })
);

// Pause / Resume
router.put(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const data = await arvrService.pauseSession(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const data = await arvrService.resumeSession(req.params.id);
    res.json({ success: true, data });
  })
);

// Complete
router.put(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const data = await arvrService.completeSession(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Abort
router.put(
  '/:id/abort',
  asyncHandler(async (req, res) => {
    const data = await arvrService.abortSession(req.params.id, req.body.reason);
    res.json({ success: true, data });
  })
);

// Safety report
router.put(
  '/:id/safety',
  asyncHandler(async (req, res) => {
    const data = await arvrService.recordSafety(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

module.exports = router;
