/**
 * Unified Dashboard Routes — لوحة المعلومات الموحدة
 * /api/v1/dashboard-unified/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

// Main overview — cross-module aggregation
router.get('/overview', (_req, res) =>
  ok(res, {
    beneficiaries: { total: 0, active: 0 },
    sessions: { today: 0, week: 0 },
    staff: { present: 0, total: 0 },
    alerts: [],
  })
);

// Widgets
router.get('/widgets', (_req, res) => ok(res, []));
router.post('/widgets', (req, res) => ok(res, { _id: `wgt_${Date.now()}`, ...req.body }, 201));
router.post('/widgets/reorder', (req, res) =>
  ok(res, { reordered: true, order: req.body.order || [] })
);
router.delete('/widgets/:id', (req, res) => ok(res, { deleted: true }));

// Stats
router.get('/stats', (_req, res) => ok(res, { clinical: {}, operational: {}, financial: {} }));

// Recent Activity
router.get('/recent-activity', (_req, res) => ok(res, []));

// Notifications & Alerts
router.get('/notifications', (_req, res) => ok(res, []));
router.get('/alerts', (_req, res) => ok(res, []));

// Quick Actions metadata
router.get('/quick-actions', (_req, res) => ok(res, []));

// Module summaries
router.get('/module/:module', (req, res) => ok(res, { module: req.params.module, summary: null }));

module.exports = router;
