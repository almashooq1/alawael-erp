/**
 * CCTV alert routes.
 *   GET   /                       — list open alerts
 *   POST  /:id/acknowledge        — acknowledge
 *   POST  /:id/resolve            — resolve or false-positive
 *   POST  /:id/escalate           — escalate to incident
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const alertService = require('../../services/cctv/alertService');
const { CctvAlert } = require('../../models/cctv');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { callerCctvBranchCode, branchCodeVisible } = require('../../middleware/cctvBranchScope');

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);
router.use(requireBranchAccess);

// Load the target alert and assert the caller's branch may act on it. CCTV
// alerts key on `branchCode` (String), so we resolve the caller's own code and
// compare. Returns true, or sends 404/403 and returns false. `:id` mutations
// had no branch check — a restricted caller could ack/resolve/escalate another
// branch's child-camera alerts.
async function assertAlertBranch(req, res, alertId) {
  if (!mongoose.isValidObjectId(alertId)) {
    res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
    return false;
  }
  const doc = await CctvAlert.findById(alertId).select('branchCode').lean();
  if (!doc) {
    res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
    return false;
  }
  const callerCode = await callerCctvBranchCode(req);
  if (!branchCodeVisible(callerCode, doc.branchCode)) {
    res.status(403).json({ success: false, message: 'CROSS_BRANCH_DENIED' });
    return false;
  }
  return true;
}

router.get('/', async (req, res) => {
  // Pin a restricted caller to their own branch code (the old
  // `req.user?.branchCode` was never populated → cross-branch alert leak).
  const callerCode = await callerCctvBranchCode(req);
  const rows = await alertService.listOpen(callerCode || req.query.branchCode, {
    severity: req.query.severity,
    category: req.query.category,
    limit: Number(req.query.limit) || 200,
  });
  res.json({ success: true, data: rows });
});

router.post('/:id/acknowledge', async (req, res) => {
  if (!(await assertAlertBranch(req, res, req.params.id))) return undefined;
  const a = await alertService.acknowledge(req.params.id, req.user?.id);
  if (!a) return res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
  return res.json({ success: true, data: a });
});

router.post(
  '/:id/resolve',
  requireRole(['admin', 'manager', 'security_officer', 'quality_officer']),
  async (req, res) => {
    if (!(await assertAlertBranch(req, res, req.params.id))) return undefined;
    const a = await alertService.resolve(req.params.id, {
      userId: req.user?.id,
      resolution: req.body.resolution,
      status: req.body.status || 'resolved',
    });
    if (!a) return res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
    return res.json({ success: true, data: a });
  }
);

router.post(
  '/:id/escalate',
  requireRole(['admin', 'manager', 'security_officer']),
  async (req, res) => {
    if (!(await assertAlertBranch(req, res, req.params.id))) return undefined;
    const a = await alertService.escalate(req.params.id, req.user?.id, req.body.incidentId);
    if (!a) return res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
    return res.json({ success: true, data: a });
  }
);

module.exports = router;
