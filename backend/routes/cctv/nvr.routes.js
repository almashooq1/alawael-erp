/**
 * CCTV NVR routes.
 *   GET    /                       — list all
 *   GET    /by-branch/:code        — list per branch
 *   GET    /:id                    — get one
 *   POST   /                       — create
 *   PATCH  /:id                    — update
 *   POST   /:id/discover-channels  — pull channel list and auto-create cameras
 */
'use strict';

const express = require('express');
const nvrService = require('../../services/cctv/nvrService');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { callerCctvBranchCode, branchCodeVisible } = require('../../middleware/cctvBranchScope');
const { stripUpdateMeta } = require('../../utils/sanitize');

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);
router.use(requireBranchAccess);

// NVR docs carry device credentials + the webhook HMAC secret. Never return them.
function redactNvr(n) {
  if (!n) return n;
  const o = n.toObject ? n.toObject() : { ...n };
  delete o.auth;
  if (o.eventPush && o.eventPush.webhookSecret) delete o.eventPush.webhookSecret;
  return o;
}

router.get('/', requireRole(['admin', 'manager', 'security_officer']), async (req, res) => {
  const callerCode = await callerCctvBranchCode(req);
  const rows = callerCode ? await nvrService.listForBranch(callerCode) : await nvrService.listAll();
  res.json({ success: true, data: (rows || []).map(redactNvr) });
});

router.get('/by-branch/:code', async (req, res) => {
  const callerCode = await callerCctvBranchCode(req);
  if (callerCode && String(req.params.code).toUpperCase() !== callerCode) {
    return res.status(403).json({ success: false, message: 'CROSS_BRANCH_DENIED' });
  }
  const rows = await nvrService.listForBranch(req.params.code);
  res.json({ success: true, data: (rows || []).map(redactNvr) });
});

router.get('/:id', async (req, res) => {
  const n = await nvrService.getById(req.params.id);
  if (!n) return res.status(404).json({ success: false, message: 'NVR_NOT_FOUND' });
  const callerCode = await callerCctvBranchCode(req);
  if (!branchCodeVisible(callerCode, n.branchCode)) {
    return res.status(403).json({ success: false, message: 'CROSS_BRANCH_DENIED' });
  }
  res.json({ success: true, data: redactNvr(n) });
});

router.post('/', requireRole(['admin', 'security_officer']), async (req, res) => {
  try {
    const n = await nvrService.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: redactNvr(n) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id', requireRole(['admin', 'security_officer']), async (req, res) => {
  const n = await nvrService.update(req.params.id, req.body);
  if (!n) return res.status(404).json({ success: false, message: 'NVR_NOT_FOUND' });
  res.json({ success: true, data: redactNvr(n) });
});

router.post(
  '/:id/discover-channels',
  requireRole(['admin', 'security_officer']),
  async (req, res) => {
    const r = await nvrService.discoverChannels(req.params.id);
    res.status(r.ok ? 200 : 502).json({ success: r.ok, ...r });
  }
);

module.exports = router;
