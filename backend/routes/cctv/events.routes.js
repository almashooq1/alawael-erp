/**
 * CCTV event routes.
 *   GET   /                         — list events (filters: branchCode, type, severity, from, to)
 *   GET   /:eventId                 — get one
 *   POST  /:eventId/acknowledge     — acknowledge
 *   POST  /:eventId/link-incident   — link to incident
 *   GET   /stats/last-hour          — counts by type/severity in last hour
 */
'use strict';

const express = require('express');
const eventService = require('../../services/cctv/eventService');
const { CctvEvent } = require('../../models/cctv');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);

router.get('/', async (req, res) => {
  const rows = await eventService.listForBranch(
    req.query.branchCode || req.user?.branchCode || '',
    {
      type: req.query.type,
      severity: req.query.severity,
      cameraId: req.query.cameraId,
      from: req.query.from,
      to: req.query.to,
      limit: Number(req.query.limit) || 200,
    }
  );
  res.json({ success: true, data: rows });
});

router.get('/stats/last-hour', async (req, res) => {
  res.json({ success: true, data: await eventService.countsLastHour(req.query.branchCode) });
});

router.get('/:eventId', async (req, res) => {
  const ev = await CctvEvent.findOne({ eventId: req.params.eventId }).lean();
  if (!ev) return res.status(404).json({ success: false, message: 'EVENT_NOT_FOUND' });
  res.json({ success: true, data: ev });
});

router.post('/:eventId/acknowledge', async (req, res) => {
  const ev = await eventService.acknowledge(req.params.eventId, req.user?.id);
  if (!ev) return res.status(404).json({ success: false, message: 'EVENT_NOT_FOUND' });
  res.json({ success: true, data: ev });
});

router.post(
  '/:eventId/link-incident',
  requireRole(['admin', 'manager', 'quality_officer', 'security_officer']),
  async (req, res) => {
    const ev = await eventService.linkIncident(req.params.eventId, req.body.incidentId);
    if (!ev) return res.status(404).json({ success: false, message: 'EVENT_NOT_FOUND' });
    res.json({ success: true, data: ev });
  }
);

module.exports = router;
