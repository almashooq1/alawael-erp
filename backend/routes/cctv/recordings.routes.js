/**
 * CCTV recording metadata routes.
 *   GET    /                       — list (filter: branchCode, cameraId, from, to)
 *   GET    /:id                    — get one
 *   POST   /:id/legal-hold         — set legal hold flag
 *   DELETE /:id/legal-hold         — clear legal hold
 */
'use strict';

const express = require('express');
const { CctvRecording } = require('../../models/cctv');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  const q = {};
  if (req.query.branchCode) q.branchCode = String(req.query.branchCode).toUpperCase();
  if (req.query.cameraId) q.cameraId = req.query.cameraId;
  if (req.query.from) q.startTime = { ...(q.startTime || {}), $gte: new Date(req.query.from) };
  if (req.query.to) q.startTime = { ...(q.startTime || {}), $lte: new Date(req.query.to) };
  if (req.query.kind) q.kind = req.query.kind;
  const rows = await CctvRecording.find(q)
    .sort({ startTime: -1 })
    .limit(Number(req.query.limit) || 200)
    .lean();
  res.json({ success: true, data: rows });
});

router.get('/:id', async (req, res) => {
  const r = await CctvRecording.findById(req.params.id).lean();
  if (!r) return res.status(404).json({ success: false, message: 'NOT_FOUND' });
  res.json({ success: true, data: r });
});

router.post(
  '/:id/legal-hold',
  requireRole(['admin', 'dpo', 'security_officer']),
  async (req, res) => {
    const r = await CctvRecording.findByIdAndUpdate(
      req.params.id,
      { legalHold: true },
      { returnDocument: 'after' }
    );
    if (!r) return res.status(404).json({ success: false, message: 'NOT_FOUND' });
    res.json({ success: true, data: r });
  }
);

router.delete('/:id/legal-hold', requireRole(['admin', 'dpo']), async (req, res) => {
  const r = await CctvRecording.findByIdAndUpdate(
    req.params.id,
    { legalHold: false },
    { returnDocument: 'after' }
  );
  if (!r) return res.status(404).json({ success: false, message: 'NOT_FOUND' });
  res.json({ success: true, data: r });
});

module.exports = router;
