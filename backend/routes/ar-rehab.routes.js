/**
 * AR/XR Rehabilitation Routes — إعادة التأهيل بالواقع المعزز والافتراضي
 * /api/v1/ar-rehab/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

// Sessions
router.get('/sessions', (_req, res) => ok(res, []));
router.post('/sessions', (req, res) =>
  ok(res, { _id: `ars_${Date.now()}`, status: 'scheduled', ...req.body }, 201)
);
router.get('/sessions/:id', (req, res) => ok(res, { _id: req.params.id }));
router.put('/sessions/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.delete('/sessions/:id', (req, res) => ok(res, { deleted: true }));
router.post('/sessions/:id/start', (req, res) => ok(res, { _id: req.params.id, status: 'active' }));
router.post('/sessions/:id/end', (req, res) =>
  ok(res, { _id: req.params.id, status: 'completed', duration: 0 })
);
router.get('/sessions/:id/metrics', (req, res) =>
  ok(res, { sessionId: req.params.id, engagementScore: 0, accuracy: 0 })
);

// Exercises / Content Library
router.get('/exercises', (_req, res) => ok(res, []));
router.get('/exercises/:id', (req, res) => ok(res, { _id: req.params.id }));

// Beneficiary AR progress
router.get('/beneficiaries/:id/progress', (req, res) =>
  ok(res, { beneficiaryId: req.params.id, sessions: 0, avgScore: 0 })
);
router.get('/beneficiaries/:id/sessions', (req, res) => ok(res, []));

// Dashboard
router.get('/dashboard', (_req, res) =>
  ok(res, { totalSessions: 0, activeSessions: 0, avgEngagement: 0 })
);

module.exports = router;
