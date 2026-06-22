/**
 * CCTV live / playback / control routes.
 *
 *   POST  /live                    — start live session (returns HLS url)
 *   POST  /playback                — start playback session
 *   POST  /:sessionId/heartbeat    — viewer heartbeat
 *   POST  /:sessionId/stop         — end session
 *   POST  /:cameraId/snapshot      — capture snapshot now
 *   POST  /:cameraId/ptz           — PTZ continuous { pan, tilt, zoom }
 *   POST  /:cameraId/ptz/stop      — stop PTZ
 *   POST  /:cameraId/preset/:n     — goto preset
 *   GET   /active                  — list active sessions (admin)
 */
'use strict';

const express = require('express');
const streamService = require('../../services/cctv/streamService');
const cameraService = require('../../services/cctv/cameraService');
const { CctvViewAudit } = require('../../models/cctv');
const adapter = require('../../services/cctv/adapter');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);

function ipMetaOf(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

router.post('/live', async (req, res) => {
  const r = await streamService.startLive({
    userId: req.user?.id,
    cameraId: req.body.cameraId,
    watermarkText: req.user?.email || req.user?.id,
    requireGrant: req.body.requireGrant !== false,
    ipMeta: ipMetaOf(req),
  });
  res.status(r.ok ? 200 : 403).json({ success: r.ok, ...r });
});

router.post(
  '/playback',
  requireRole(['admin', 'manager', 'security_officer', 'quality_officer', 'auditor']),
  async (req, res) => {
    const { cameraId, from, to } = req.body;
    if (!cameraId || !from || !to) {
      return res.status(400).json({ success: false, message: 'cameraId/from/to required' });
    }
    const r = await streamService.startPlayback({
      userId: req.user?.id,
      cameraId,
      from,
      to,
      ipMeta: ipMetaOf(req),
    });
    res.status(r.ok ? 200 : 403).json({ success: r.ok, ...r });
  }
);

router.post('/:sessionId/heartbeat', async (req, res) => {
  const s = await streamService.heartbeat(req.params.sessionId);
  if (!s) return res.status(404).json({ success: false, message: 'SESSION_NOT_FOUND' });
  res.json({ success: true, data: { lastHeartbeatAt: s.lastHeartbeatAt } });
});

router.post('/:sessionId/stop', async (req, res) => {
  const s = await streamService.stop(req.params.sessionId);
  res.json({ success: true, data: s });
});

router.post('/snapshot/:cameraId', async (req, res) => {
  const cam = await cameraService.getById(req.params.cameraId);
  if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
  const r = await adapter.snapshot({
    ip: cam.ip,
    port: cam.port,
    channel: cam.channel,
    username: cam.auth?.username,
    password: process.env[cam.auth?.passwordRef || ''] || '',
  });
  if (!r.ok) return res.status(502).json({ success: false, ...r });
  await CctvViewAudit.create({
    userId: req.user?.id,
    branchCode: cam.branchCode,
    cameraId: cam._id,
    cameraCode: cam.code,
    action: 'snapshot_view',
    sourceIp: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.setHeader('Content-Type', r.data.contentType || 'image/jpeg');
  res.send(r.data.bytes);
});

router.post('/ptz/:cameraId', requireRole(['admin', 'security_officer']), async (req, res) => {
  const cam = await cameraService.getById(req.params.cameraId);
  if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
  if (!cam.capabilities?.ptz)
    return res.status(400).json({ success: false, message: 'NOT_PTZ_CAPABLE' });
  const r = await adapter.ptzContinuous({
    ip: cam.ip,
    port: cam.port,
    channel: cam.channel,
    username: cam.auth?.username,
    password: process.env[cam.auth?.passwordRef || ''] || '',
    pan: req.body.pan,
    tilt: req.body.tilt,
    zoom: req.body.zoom,
  });
  await CctvViewAudit.create({
    userId: req.user?.id,
    branchCode: cam.branchCode,
    cameraId: cam._id,
    cameraCode: cam.code,
    action: 'ptz_control',
    sourceIp: req.ip,
  });
  res.status(r.ok ? 200 : 502).json({ success: r.ok, ...r });
});

router.post('/ptz/:cameraId/stop', requireRole(['admin', 'security_officer']), async (req, res) => {
  const cam = await cameraService.getById(req.params.cameraId);
  if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
  const r = await adapter.ptzStop({ ip: cam.ip, port: cam.port, channel: cam.channel });
  res.status(r.ok ? 200 : 502).json({ success: r.ok, ...r });
});

router.post(
  '/preset/:cameraId/:n',
  requireRole(['admin', 'security_officer']),
  async (req, res) => {
    const cam = await cameraService.getById(req.params.cameraId);
    if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
    const r = await adapter.gotoPreset({
      ip: cam.ip,
      port: cam.port,
      channel: cam.channel,
      username: cam.auth?.username,
      password: process.env[cam.auth?.passwordRef || ''] || '',
      presetId: Number(req.params.n),
    });
    res.status(r.ok ? 200 : 502).json({ success: r.ok, ...r });
  }
);

router.get('/active', requireRole(['admin', 'manager', 'security_officer']), async (req, res) => {
  const rows = await streamService.listActive({ branchCode: req.query.branchCode });
  res.json({ success: true, data: rows });
});

module.exports = router;
