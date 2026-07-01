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
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { callerCctvBranchCode } = require('../../middleware/cctvBranchScope');

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);
router.use(requireBranchAccess);

const auditRoles = ['admin', 'dpo', 'auditor', 'security_officer'];

// A CctvAccessGrant is the authorization primitive for viewing child footage.
// Spreading `...req.body` into create() let any authorized issuer set arbitrary
// grant fields — and injected keys the schema might gain later. Whitelist the
// intended fields only. `grantedBy`/`status` are set by the route.
const GRANT_CREATABLE = [
  'grantType',
  'grantedTo',
  'grantedToRole',
  'coGrantedBy',
  'scope',
  'purpose',
  'legalBasis',
  'consentSignatureRef',
  'incidentRef',
  'validFrom',
  'validUntil',
  'maxConcurrentSessions',
  'requireWatermark',
  'allowDownload',
  'allowPlayback',
];

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
    const payload = {};
    for (const k of GRANT_CREATABLE) {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    }
    // Pin the grant scope to the issuer's own branch when they are restricted
    // (a branch manager must not mint a grant scoped to another branch's child
    // cameras). Cross-branch issuers (admin/dpo → resolver null) keep their scope.
    const callerCode = await callerCctvBranchCode(req);
    if (callerCode) {
      payload.scope = { ...(payload.scope || {}), branchCode: callerCode };
    }
    const g = await CctvAccessGrant.create({
      ...payload,
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
