/**
 * CCTV AI sub-resource routes — face registry, ANPR, zones.
 *
 *   GET    /faces                  — list face identities
 *   POST   /faces                  — add new identity (employee/parent/visitor/banned)
 *   PATCH  /faces/:id              — update
 *   DELETE /faces/:id              — disable
 *
 *   GET    /anpr                   — list registered plates
 *   POST   /anpr                   — add plate
 *   DELETE /anpr/:id               — revoke
 *
 *   GET    /zones/:cameraId        — list zones for a camera
 *   POST   /zones                  — create zone
 *   PATCH  /zones/:id              — update
 *   DELETE /zones/:id              — disable
 *
 *   POST   /dispatch               — manually feed an event into AI pipeline (admin)
 */
'use strict';

const express = require('express');
const { CctvFaceIdentity, CctvAnpr, CctvZone, CctvEvent } = require('../../models/cctv');
const aiDispatcher = require('../../services/cctv/ai');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { stripUpdateMeta } = require('../../utils/sanitize'); // W451

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);

// ─── Faces ─────────────────────────────────────────────────────────────
router.get('/faces', requireRole(['admin', 'security_officer']), async (req, res) => {
  const rows = await CctvFaceIdentity.find({
    status: req.query.status || 'active',
    kind: req.query.kind || undefined,
  })
    .limit(Math.min(Number(req.query.limit) || 500, 2000)) // W1182 — DoS cap
    .lean();
  res.json({ success: true, data: rows });
});

router.post('/faces', requireRole(['admin', 'security_officer']), async (req, res) => {
  try {
    // W451: sanitize before create — even admin shouldn't be able to
    // mass-assign _id/__v/__proto__/etc into a biometric face record.
    const f = await CctvFaceIdentity.create(stripUpdateMeta(req.body || {}));
    res.status(201).json({ success: true, data: f });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/faces/:id', requireRole(['admin', 'security_officer']), async (req, res) => {
  // W451: sanitize meta-fields before mass-assign on biometric face data
  const f = await CctvFaceIdentity.findByIdAndUpdate(
    req.params.id,
    stripUpdateMeta(req.body || {}),
    { returnDocument: 'after' }
  );
  if (!f) return res.status(404).json({ success: false, message: 'FACE_NOT_FOUND' });
  res.json({ success: true, data: f });
});

router.delete('/faces/:id', requireRole(['admin']), async (req, res) => {
  const f = await CctvFaceIdentity.findByIdAndUpdate(
    req.params.id,
    { status: 'disabled' },
    { returnDocument: 'after' }
  );
  res.json({ success: true, data: f });
});

// ─── ANPR ──────────────────────────────────────────────────────────────
router.get('/anpr', requireRole(['admin', 'security_officer']), async (req, res) => {
  const rows = await CctvAnpr.find({ status: req.query.status || 'active' })
    .limit(Math.min(Number(req.query.limit) || 500, 2000)) // W1182 — DoS cap
    .lean();
  res.json({ success: true, data: rows });
});

router.post('/anpr', requireRole(['admin', 'security_officer']), async (req, res) => {
  try {
    // W451: sanitize meta-fields before create
    const r = await CctvAnpr.create(stripUpdateMeta(req.body || {}));
    res.status(201).json({ success: true, data: r });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/anpr/:id', requireRole(['admin', 'security_officer']), async (req, res) => {
  const r = await CctvAnpr.findByIdAndUpdate(
    req.params.id,
    { status: 'revoked' },
    { returnDocument: 'after' }
  );
  res.json({ success: true, data: r });
});

// ─── Zones ─────────────────────────────────────────────────────────────
router.get('/zones/:cameraId', async (req, res) => {
  const rows = await CctvZone.find({ cameraId: req.params.cameraId }).lean();
  res.json({ success: true, data: rows });
});

router.post('/zones', requireRole(['admin', 'security_officer']), async (req, res) => {
  try {
    // W451: sanitize meta-fields before create
    const z = await CctvZone.create(stripUpdateMeta(req.body || {}));
    res.status(201).json({ success: true, data: z });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/zones/:id', requireRole(['admin', 'security_officer']), async (req, res) => {
  // W451: sanitize meta-fields before update
  const z = await CctvZone.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body || {}), {
    returnDocument: 'after',
  });
  if (!z) return res.status(404).json({ success: false, message: 'ZONE_NOT_FOUND' });
  res.json({ success: true, data: z });
});

router.delete('/zones/:id', requireRole(['admin']), async (req, res) => {
  const z = await CctvZone.findByIdAndUpdate(
    req.params.id,
    { enabled: false },
    { returnDocument: 'after' }
  );
  res.json({ success: true, data: z });
});

// ─── Manual AI dispatch (admin debug) ──────────────────────────────────
router.post('/dispatch', requireRole(['admin']), async (req, res) => {
  const ev = await CctvEvent.findOne({ eventId: req.body.eventId });
  if (!ev) return res.status(404).json({ success: false, message: 'EVENT_NOT_FOUND' });
  const r = await aiDispatcher.dispatch(ev);
  res.json({ success: true, data: r });
});

module.exports = router;
