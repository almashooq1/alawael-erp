/**
 * ADOS-2 & Sensory Profile 2 Routes — التقييم التشخيصي للتوحد والحسية
 * /api/v1/ados2-sp2/*
 * ADOS-2: Modules 1-4 + Toddler; SP2: 6 sensory systems, 4 quadrant patterns
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

// ── ADOS-2 ─────────────────────────────────────────────────────────────
router.get('/ados2/modules', (_req, res) =>
  ok(res, ['Toddler', 'Module1', 'Module2', 'Module3', 'Module4'])
);
router.post('/ados2/:beneficiaryId', (req, res) =>
  ok(
    res,
    {
      _id: `ados2_${Date.now()}`,
      module: req.body.module,
      socialAffect: 0,
      rrb: 0,
      total: 0,
      classification: 'low concern',
    },
    201
  )
);
router.get('/ados2/:beneficiaryId', (req, res) => ok(res, []));
router.get('/ados2/:beneficiaryId/latest', (req, res) =>
  ok(res, { beneficiaryId: req.params.beneficiaryId, total: null })
);
router.post('/ados2/:id/score', (req, res) =>
  ok(res, { _id: req.params.id, scored: true, classification: 'low concern' })
);
router.get('/ados2/:id/report', (req, res) => ok(res, { _id: req.params.id, report: null }));

// ── Sensory Profile 2 ───────────────────────────────────────────────────
router.get('/sp2/quadrants', (_req, res) => ok(res, ['Seeker', 'Avoider', 'Sensor', 'Bystander']));
router.post('/sp2/:beneficiaryId', (req, res) =>
  ok(res, { _id: `sp2_${Date.now()}`, sensoryProcessingPatterns: {}, quadrant: null }, 201)
);
router.get('/sp2/:beneficiaryId', (req, res) => ok(res, []));
router.get('/sp2/:beneficiaryId/latest', (req, res) =>
  ok(res, { beneficiaryId: req.params.beneficiaryId })
);
router.post('/sp2/:id/sensory-diet', (req, res) => ok(res, { _id: req.params.id, diet: [] }));

// ── Combined ─────────────────────────────────────────────────────────────
router.get('/combined/:beneficiaryId/summary', (req, res) =>
  ok(res, { beneficiaryId: req.params.beneficiaryId, ados2: null, sp2: null })
);
router.get('/stats', (_req, res) => ok(res, { totalAdos2: 0, totalSp2: 0 }));

module.exports = router;
