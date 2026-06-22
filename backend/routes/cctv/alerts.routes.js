/**
 * CCTV alert routes.
 *   GET   /                       — list open alerts
 *   POST  /:id/acknowledge        — acknowledge
 *   POST  /:id/resolve            — resolve or false-positive
 *   POST  /:id/escalate           — escalate to incident
 */
'use strict';

const express = require('express');
const alertService = require('../../services/cctv/alertService');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);

router.get('/', async (req, res) => {
  const rows = await alertService.listOpen(req.query.branchCode || req.user?.branchCode, {
    severity: req.query.severity,
    category: req.query.category,
    limit: Number(req.query.limit) || 200,
  });
  res.json({ success: true, data: rows });
});

router.post('/:id/acknowledge', async (req, res) => {
  const a = await alertService.acknowledge(req.params.id, req.user?.id);
  if (!a) return res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
  res.json({ success: true, data: a });
});

router.post(
  '/:id/resolve',
  requireRole(['admin', 'manager', 'security_officer', 'quality_officer']),
  async (req, res) => {
    const a = await alertService.resolve(req.params.id, {
      userId: req.user?.id,
      resolution: req.body.resolution,
      status: req.body.status || 'resolved',
    });
    if (!a) return res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
    res.json({ success: true, data: a });
  }
);

router.post(
  '/:id/escalate',
  requireRole(['admin', 'manager', 'security_officer']),
  async (req, res) => {
    const a = await alertService.escalate(req.params.id, req.user?.id, req.body.incidentId);
    if (!a) return res.status(404).json({ success: false, message: 'ALERT_NOT_FOUND' });
    res.json({ success: true, data: a });
  }
);

module.exports = router;
