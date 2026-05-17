/**
 * AI Rehabilitation Recommendation Engine Routes — محرك التوصيات العلاجية الذكي
 * /api/v1/rehab-recommendations/*
 * ABA, PECS, TEACCH, DIR, PRT, SI scoring; goal prioritization; red flags
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

// ── Core Recommendations ─────────────────────────────────────────────────
router.get('/:beneficiaryId', (req, res) =>
  ok(res, { beneficiaryId: req.params.beneficiaryId, recommendations: [], generatedAt: null })
);
router.post('/:beneficiaryId/generate', (req, res) =>
  ok(res, {
    beneficiaryId: req.params.beneficiaryId,
    recommendations: [],
    approachScores: { ABA: 0, PECS: 0, TEACCH: 0, DIR: 0, PRT: 0, SI: 0 },
  })
);

// ── Approach Scoring ─────────────────────────────────────────────────────
router.get('/:beneficiaryId/approach-scores', (req, res) =>
  ok(res, { ABA: 0, PECS: 0, TEACCH: 0, DIR: 0, PRT: 0, SI: 0 })
);
router.post('/:beneficiaryId/score-approach', (req, res) =>
  ok(res, { approach: req.body.approach, score: 0, rationale: [] })
);

// ── Goal Prioritization ──────────────────────────────────────────────────
router.get('/:beneficiaryId/priority-goals', (req, res) => ok(res, []));
router.post('/:beneficiaryId/prioritize-goals', (req, res) =>
  ok(res, { prioritized: [], criteria: req.body.criteria || [] })
);

// ── Red Flags ────────────────────────────────────────────────────────────
router.get('/:beneficiaryId/red-flags', (req, res) => ok(res, []));

// ── Intervention Plans ───────────────────────────────────────────────────
router.get('/:beneficiaryId/intervention-plan', (req, res) =>
  ok(res, { beneficiaryId: req.params.beneficiaryId, phases: [] })
);
router.post('/:beneficiaryId/accept', (req, res) =>
  ok(res, { _id: `rplan_${Date.now()}`, accepted: true })
);

// ── History & Analytics ──────────────────────────────────────────────────
router.get('/:beneficiaryId/history', (req, res) => ok(res, []));
router.get('/stats/overview', (_req, res) =>
  ok(res, { totalGenerated: 0, accepted: 0, topApproach: null })
);

module.exports = router;
