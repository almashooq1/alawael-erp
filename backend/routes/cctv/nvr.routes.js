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

const router = express.Router();
router.use(authenticateToken);

router.get('/', requireRole(['admin', 'manager', 'security_officer']), async (req, res) => {
  res.json({ success: true, data: await nvrService.listAll() });
});

router.get('/by-branch/:code', async (req, res) => {
  res.json({ success: true, data: await nvrService.listForBranch(req.params.code) });
});

router.get('/:id', async (req, res) => {
  const n = await nvrService.getById(req.params.id);
  if (!n) return res.status(404).json({ success: false, message: 'NVR_NOT_FOUND' });
  res.json({ success: true, data: n });
});

router.post('/', requireRole(['admin', 'security_officer']), async (req, res) => {
  try {
    const n = await nvrService.create(req.body);
    res.status(201).json({ success: true, data: n });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id', requireRole(['admin', 'security_officer']), async (req, res) => {
  const n = await nvrService.update(req.params.id, req.body);
  if (!n) return res.status(404).json({ success: false, message: 'NVR_NOT_FOUND' });
  res.json({ success: true, data: n });
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
