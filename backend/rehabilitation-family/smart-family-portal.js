/**
 * Smart Family Portal Routes — بوابة الأسرة الذكية
 * /api/v1/family-portal/*
 * Digital notebook, weekly home activities, simplified reports, engagement index
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

// Dashboard
router.get('/dashboard', (_req, res) =>
  ok(res, { engagementIndex: 0, pendingTasks: 0, upcomingAppointments: [], recentNotes: [] })
);

// Digital Notebook — الدفتر الرقمي
router.get('/notebook/:beneficiaryId', (req, res) => ok(res, []));
router.post('/notebook/:beneficiaryId', (req, res) =>
  ok(res, { _id: `nb_${Date.now()}`, ...req.body }, 201)
);
router.put('/notebook/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.delete('/notebook/:id', (req, res) => ok(res, { deleted: true }));

// Weekly Home Activities — الأنشطة المنزلية الأسبوعية
router.get('/activities/:beneficiaryId', (req, res) => ok(res, []));
router.post('/activities/:beneficiaryId', (req, res) =>
  ok(res, { _id: `act_${Date.now()}`, ...req.body }, 201)
);
router.put('/activities/:id/complete', (req, res) =>
  ok(res, { _id: req.params.id, completed: true })
);

// Simplified Clinical Reports — التقارير المبسّطة
router.get('/reports/:beneficiaryId', (req, res) => ok(res, []));
router.get('/reports/:beneficiaryId/latest', (req, res) =>
  ok(res, { beneficiaryId: req.params.beneficiaryId, summary: null })
);

// Appointments — المواعيد
router.get('/appointments/:beneficiaryId', (req, res) => ok(res, []));

// Engagement Index
router.get('/engagement/:beneficiaryId', (req, res) =>
  ok(res, { score: 0, trend: 'stable', factors: [] })
);

// Messaging — الرسائل
router.get('/messages', (_req, res) => ok(res, []));
router.post('/messages', (req, res) => ok(res, { _id: `msg_${Date.now()}`, ...req.body }, 201));

// Goals progress — تقدم الأهداف
router.get('/goals/:beneficiaryId', (req, res) => ok(res, []));

module.exports = router;
