/**
 * Executive Dashboard Routes — لوحة قيادة الرئيس التنفيذي
 * /api/v1/executive-dashboard/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

router.get('/overview', (_req, res) =>
  ok(res, {
    totalBeneficiaries: 0,
    activeSessions: 0,
    revenueMonth: 0,
    qualityScore: 0,
    alerts: [],
  })
);
router.get('/kpis', (_req, res) =>
  ok(res, { clinical: {}, operational: {}, financial: {}, hr: {} })
);
router.get('/financial', (_req, res) =>
  ok(res, { revenue: 0, expenses: 0, surplus: 0, trend: [] })
);
router.get('/clinical', (_req, res) =>
  ok(res, { outcomes: {}, satisfactionScore: 0, goalAchievementRate: 0 })
);
router.get('/operational', (_req, res) =>
  ok(res, { sessionUtilization: 0, staffProductivity: 0, waitlistCount: 0 })
);
router.get('/hr', (_req, res) => ok(res, { headcount: 0, turnoverRate: 0, trainingCompliance: 0 }));
router.get('/alerts', (_req, res) => ok(res, []));
router.get('/trend/:metric', (req, res) =>
  ok(res, { metric: req.params.metric, labels: [], values: [] })
);
router.get('/scorecard', (_req, res) => ok(res, { categories: [] }));
router.get('/benchmarks', (_req, res) => ok(res, { national: {}, international: {} }));

module.exports = router;
