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
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = require('./asyncRouter')(express.Router());

router.use(authenticateToken);

const ROLES = ['admin', 'super_admin', 'manager', 'security_officer'];

/**
 * GET /cameras
 * List cameras by branch (or all if no branchId)
 */
router.get('/cameras', requireRole(ROLES), async (req, res) => {
  const cameras = await cctvIntegrationService.getCameraList(req.query.branchId);
  res.json({ success: true, data: cameras });
});

/**
 * GET /cameras/:cameraId/feed
 * Live feed URL for a camera
 */
router.get('/cameras/:cameraId/feed', requireRole(ROLES), async (req, res) => {
  const feed = await cctvIntegrationService.getLiveFeed(req.params.cameraId);
  res.json({ success: true, data: feed });
});

/**
 * GET /recordings
 * List recordings for a camera within a date range
 */
router.get('/recordings', requireRole(ROLES), async (req, res) => {
  const recordings = await cctvIntegrationService.getRecordingList(
    req.query.cameraId,
    req.query.startDate,
    req.query.endDate
  );
  res.json({ success: true, data: recordings });
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
  const alerts = await cctvIntegrationService.getSecurityAlerts(
    req.query.startDate,
    req.query.endDate
  );
  res.json({ success: true, data: alerts });
});

/**
 * GET /analytics
 * Analytics: people count, heatmap, peak hours
 */
router.get('/analytics', requireRole(ROLES), async (req, res) => {
  const analytics = await cctvIntegrationService.getAnalytics(
    req.query.branchId,
    req.query.period || 'today'
  );
  res.json({ success: true, data: analytics });
});

module.exports = router;
