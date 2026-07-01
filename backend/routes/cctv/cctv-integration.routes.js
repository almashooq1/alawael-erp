/**
 * cctv-integration.routes.js — CCTV Monitoring Integration Routes
 * ═════════════════════════════════════════════════════════════════
 * Simplified monitoring endpoints for the CCTV dashboard.
 * Mounted under /api/v1/cctv/integration via the CCTV registry.
 *
 * Endpoints:
 *   GET /cameras              — list cameras
 *   GET /cameras/:id/feed     — live feed URL
 *   GET /recordings           — list recordings
 *   GET /face-recognition     — face recognition log
 *   GET /attendance           — attendance from CCTV
 *   GET /alerts               — security alerts
 *   GET /analytics            — analytics
 */
'use strict';

const express = require('express');
const cctvIntegrationService = require('../../services/cctvIntegration.service');
const { CctvCamera } = require('../../models/cctv');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { callerCctvBranchCode, branchCodeVisible } = require('../../middleware/cctvBranchScope');

const router = require('./asyncRouter')(express.Router());

router.use(authenticateToken);
router.use(requireBranchAccess);

const ROLES = ['admin', 'super_admin', 'manager', 'security_officer'];

// Assert the caller may access the given camera's branch (keyed by cameraId).
// Returns true, or sends 404/403 and returns false.
async function assertCameraBranch(req, res, cameraId) {
  const cam = await CctvCamera.findById(cameraId).select('branchCode').lean();
  if (!cam) {
    res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
    return false;
  }
  const callerCode = await callerCctvBranchCode(req);
  if (!branchCodeVisible(callerCode, cam.branchCode)) {
    res.status(403).json({ success: false, message: 'CROSS_BRANCH_DENIED' });
    return false;
  }
  return true;
}

/**
 * GET /cameras
 * List cameras by branch (or all if no branchId)
 */
router.get('/cameras', requireRole(ROLES), async (req, res) => {
  // Restricted callers pinned to their own branch; cross-branch may pass a code.
  const callerCode = await callerCctvBranchCode(req);
  const cameras = await cctvIntegrationService.getCameraList(callerCode || req.query.branchId);
  res.json({ success: true, data: cameras });
});

/**
 * GET /cameras/:cameraId/feed
 * Live feed URL for a camera
 */
router.get('/cameras/:cameraId/feed', requireRole(ROLES), async (req, res) => {
  if (!(await assertCameraBranch(req, res, req.params.cameraId))) return undefined;
  const feed = await cctvIntegrationService.getLiveFeed(req.params.cameraId);
  return res.json({ success: true, data: feed });
});

/**
 * GET /recordings
 * List recordings for a camera within a date range
 */
router.get('/recordings', requireRole(ROLES), async (req, res) => {
  // Recordings are keyed by cameraId — verify the camera is in the caller's branch.
  if (req.query.cameraId && !(await assertCameraBranch(req, res, req.query.cameraId))) {
    return undefined;
  }
  const recordings = await cctvIntegrationService.getRecordingList(
    req.query.cameraId,
    req.query.startDate,
    req.query.endDate
  );
  return res.json({ success: true, data: recordings });
});

/**
 * GET /face-recognition
 * Face recognition log for a beneficiary
 */
router.get('/face-recognition', requireRole(ROLES), async (req, res) => {
  const logs = await cctvIntegrationService.getFaceRecognitionLog(
    req.query.beneficiaryId,
    req.query.startDate,
    req.query.endDate
  );
  res.json({ success: true, data: logs });
});

/**
 * GET /attendance
 * Attendance check via face recognition for a specific date
 */
router.get('/attendance', requireRole(ROLES), async (req, res) => {
  const attendance = await cctvIntegrationService.getAttendanceFromCCTV(
    req.query.beneficiaryId,
    req.query.date || new Date().toISOString().slice(0, 10)
  );
  res.json({ success: true, data: attendance });
});

/**
 * GET /alerts
 * Security alerts
 */
router.get('/alerts', requireRole(ROLES), async (req, res) => {
  const callerCode = await callerCctvBranchCode(req);
  const alerts = await cctvIntegrationService.getSecurityAlerts(
    req.query.startDate,
    req.query.endDate,
    callerCode || req.query.branchCode
  );
  res.json({ success: true, data: alerts });
});

/**
 * GET /analytics
 * Analytics: people count, heatmap, peak hours
 */
router.get('/analytics', requireRole(ROLES), async (req, res) => {
  const callerCode = await callerCctvBranchCode(req);
  const analytics = await cctvIntegrationService.getAnalytics(
    callerCode || req.query.branchId,
    req.query.period || 'today'
  );
  res.json({ success: true, data: analytics });
});

module.exports = router;
