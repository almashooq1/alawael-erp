/**
 * CCTV PDPL audit routes — view who watched what.
 *
 *   GET   /                  — list audit rows (admin/DPO only)
 *   GET   /by-user/:userId   — for a single user
 *   GET   /by-camera/:id     — for a single camera
 *   GET   /by-beneficiary/:id — for a single beneficiary
 *
 *   GET   /grants            — list access grants
 *   POST  /grants            — create a grant
 *   POST  /grants/:id/revoke — revoke a grant
 */
'use strict';

const express = require('express');
const { CctvViewAudit, CctvAccessGrant } = require('../../models/cctv');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const auditRoles = ['admin', 'dpo', 'auditor', 'security_officer'];

router.get('/', requireRole(auditRoles), async (req, res) => {
  const q = {};
  if (req.query.branchCode) q.branchCode = String(req.query.branchCode).toUpperCase();
  if (req.query.action) q.action = req.query.action;
  if (req.query.success != null) q.success = req.query.success === 'true';
  if (req.query.from) q.createdAt = { ...(q.createdAt || {}), $gte: new Date(req.query.from) };
  if (req.query.to) q.createdAt = { ...(q.createdAt || {}), $lte: new Date(req.query.to) };
  const rows = await CctvViewAudit.find(q)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 500, 2000)) // W1182 — DoS cap
    .lean();
  res.json({ success: true, data: rows });
});

router.get('/by-user/:userId', requireRole(auditRoles), async (req, res) => {
  const rows = await CctvViewAudit.find({ userId: req.params.userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 200, 2000)) // W1182 — DoS cap
    .lean();
  res.json({ success: true, data: rows });
});

router.get('/by-camera/:id', requireRole(auditRoles), async (req, res) => {
  const rows = await CctvViewAudit.find({ cameraId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 200, 2000)) // W1182 — DoS cap
    .lean();
  res.json({ success: true, data: rows });
});

router.get('/by-beneficiary/:id', requireRole([...auditRoles, 'parent']), async (req, res) => {
  if (req.user?.role === 'parent') {
    const ok = req.user.beneficiaryIds?.includes(String(req.params.id));
    if (!ok) return res.status(403).json({ success: false, message: 'NOT_YOUR_BENEFICIARY' });
  }
  const rows = await CctvViewAudit.find({ beneficiaryId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 200, 2000)) // W1182 — DoS cap
    .lean();
  res.json({ success: true, data: rows });
});

router.get('/grants', requireRole(auditRoles), async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.branchCode) q['scope.branchCode'] = String(req.query.branchCode).toUpperCase();
  const rows = await CctvAccessGrant.find(q).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: rows });
});

router.post('/grants', requireRole(['admin', 'dpo', 'manager']), async (req, res) => {
  try {
    const g = await CctvAccessGrant.create({
      ...req.body,
      grantedBy: req.user?.id,
      status: 'active',
    });
    res.status(201).json({ success: true, data: g });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/grants/:id/revoke', requireRole(['admin', 'dpo', 'manager']), async (req, res) => {
  const g = await CctvAccessGrant.findByIdAndUpdate(
    req.params.id,
    {
      status: 'revoked',
      revokedBy: req.user?.id,
      revokedAt: new Date(),
      revokedReason: req.body.reason,
    },
    { returnDocument: 'after' }
  );
  if (!g) return res.status(404).json({ success: false, message: 'GRANT_NOT_FOUND' });
  res.json({ success: true, data: g });
});

module.exports = router;
