/**
 * CCTV camera routes — CRUD + status + sync.
 *
 *   GET    /                — list all (admin)
 *   GET    /by-branch/:code — list per branch
 *   GET    /:id             — get one
 *   POST   /                — create
 *   PATCH  /:id             — update
 *   DELETE /:id             — soft delete
 *   POST   /:id/sync        — pull device info / metadata
 *   GET    /stats/by-branch — counts per branch
 *   GET    /stats/by-status — counts per status
 */
'use strict';

const express = require('express');
const cameraService = require('../../services/cctv/cameraService');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { stripUpdateMeta } = require('../../utils/sanitize');

const router = require('./asyncRouter')(express.Router());

router.use(authenticateToken);

router.get('/', requireRole(['admin', 'manager', 'security_officer']), async (req, res) => {
  const rows = await cameraService.listAll({
    status: req.query.status,
    limit: Number(req.query.limit) || 500,
  });
  res.json({ success: true, data: rows });
});

router.get('/by-branch/:code', async (req, res) => {
  const rows = await cameraService.listForBranch(req.params.code, {
    status: req.query.status,
    purpose: req.query.purpose,
    capability: req.query.capability,
    limit: Number(req.query.limit) || 500,
  });
  res.json({ success: true, data: rows });
});

router.get('/stats/by-branch', requireRole(['admin', 'manager']), async (req, res) => {
  res.json({ success: true, data: await cameraService.countByBranch() });
});

router.get('/stats/by-status', async (req, res) => {
  res.json({ success: true, data: await cameraService.countByStatus(req.query.branchCode) });
});

router.get('/:id', async (req, res) => {
  const cam = await cameraService.getById(req.params.id);
  if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
  res.json({ success: true, data: cam });
});

router.post('/', requireRole(['admin', 'security_officer']), async (req, res) => {
  try {
    const cam = await cameraService.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: cam });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id', requireRole(['admin', 'security_officer']), async (req, res) => {
  const cam = await cameraService.update(req.params.id, req.body);
  if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
  res.json({ success: true, data: cam });
});

router.delete('/:id', requireRole(['admin']), async (req, res) => {
  const cam = await cameraService.softDelete(req.params.id, req.user?.id);
  if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
  res.json({ success: true, data: cam });
});

router.post('/:id/sync', requireRole(['admin', 'security_officer']), async (req, res) => {
  const cam = await cameraService.getById(req.params.id);
  if (!cam) return res.status(404).json({ success: false, message: 'CAMERA_NOT_FOUND' });
  const r = await cameraService.trySyncMetadata(cam);
  res.status(r.ok ? 200 : 502).json({ success: r.ok, ...r });
});

module.exports = router;
