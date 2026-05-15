/**
 * CCTV admin/ops routes — health + system probes.
 *
 *   GET  /health/summary       — recent reachability counts
 *   GET  /health/by-branch     — per-branch up/down counts
 *   POST /probe                — trigger a probe tick now (admin)
 *   GET  /config               — adapter mode + breaker snapshot
 *   POST /reap-streams         — reap idle sessions now
 */
'use strict';

const express = require('express');
const healthMonitor = require('../../services/cctv/healthMonitor.service');
const streamService = require('../../services/cctv/streamService');
const cameraService = require('../../services/cctv/cameraService');
const adapter = require('../../services/cctv/adapter');
const eventQueue = require('../../services/cctv/eventQueue.service');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole(['admin', 'manager', 'security_officer']));

router.get('/health/summary', async (req, res) => {
  res.json({ success: true, data: await healthMonitor.summary(req.query.branchCode) });
});

router.get('/health/by-branch', async (req, res) => {
  res.json({ success: true, data: await cameraService.countByBranch() });
});

router.post('/probe', async (req, res) => {
  const r = await healthMonitor.tick();
  res.json({ success: r.ok, ...r });
});

router.get('/config', (req, res) => {
  res.json({ success: true, data: adapter.getConfig() });
});

router.post('/reap-streams', async (req, res) => {
  res.json({ success: true, data: await streamService.reapIdle() });
});

router.get('/queue', (req, res) => {
  res.json({ success: true, data: eventQueue.snapshot() });
});

router.post('/queue/flush', async (req, res) => {
  const r = await eventQueue.flush();
  res.json({ success: true, data: r });
});

router.post('/breakers/reset/:target?', (req, res) => {
  adapter.resetBreaker?.(req.params.target);
  res.json({ success: true, data: adapter.getConfig().breakers });
});

module.exports = router;
